import "server-only"
import { createHash, randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

const dummyHash = bcrypt.hashSync("hood-boyz-unused-login", 4)
import { getSql, withTx } from "@/lib/db"
import { CommerceError } from "@/lib/errors"
import { safeNext } from "@/lib/utils"

export type SessionUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: "customer" | "admin" | "super_admin"
  emailVerified: boolean
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
}

function pepper(token: string) {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error("SESSION_SECRET is not set. Run npm run db:setup.")
  return createHash("sha256").update(`${secret}:${token}`).digest("hex")
}

export function newToken() {
  return randomBytes(32).toString("base64url")
}

export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000)
  const rows = await getSql()<Array<{ count: number }>>`
    insert into rate_limits (key, window_start, count)
    values (${key}, ${windowStart}, 1)
    on conflict (key, window_start)
    do update set count = rate_limits.count + 1
    returning count
  `
  if ((rows[0]?.count ?? 0) > limit) {
    throw new CommerceError("Too many attempts. Please wait and try again.", 429)
  }
}

async function roleFor(userId: string) {
  const rows = await getSql()<Array<{ role: SessionUser["role"] }>>`
    select role from user_roles
    where user_id = ${userId}
    order by case role when 'super_admin' then 0 when 'admin' then 1 else 2 end
    limit 1
  `
  return rows[0]?.role ?? "customer"
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get("hb_session")?.value
  if (!token) return null
  const rows = await getSql()<
    Array<{
      id: string
      email: string
      first_name: string
      last_name: string
      phone: string | null
      email_verified_at: string | null
    }>
  >`
    select p.id, p.email, p.first_name, p.last_name, p.phone, p.email_verified_at
    from sessions s
    join profiles p on p.id = s.user_id
    where s.token_hash = ${pepper(token)} and s.expires_at > now()
    limit 1
  `
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    role: await roleFor(row.id),
    emailVerified: Boolean(row.email_verified_at),
  }
}

async function startSession(userId: string) {
  const token = newToken()
  await getSql()`
    insert into sessions (user_id, token_hash, expires_at)
    values (${userId}, ${pepper(token)}, now() + interval '30 days')
  `
  const jar = await cookies()
  jar.set("hb_session", token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 })
}

export async function registerUser(input: {
  firstName: string
  lastName: string
  email: string
  password: string
}) {
  const email = input.email.toLowerCase()
  const existing = await getSql()<Array<{ id: string }>>`select id from profiles where lower(email) = ${email}`
  if (existing.length) throw new CommerceError("An account with that email already exists.")
  const passwordHash = await bcrypt.hash(input.password, 12)
  const userId = crypto.randomUUID()
  await withTx(
    async (tx) => {
      await tx`
        insert into profiles (id, email, password_hash, first_name, last_name)
        values (${userId}, ${email}, ${passwordHash}, ${input.firstName}, ${input.lastName})
      `
      await tx`
        insert into user_roles (user_id, role) values (${userId}, 'customer')
      `
    },
    { "app.allow_customer_role": "on" },
  )
  const verify = await createEmailToken(userId, "verify")
  await startSession(userId)
  return { userId, devLink: devLink("/account/verify", verify) }
}

export async function loginUser(email: string, password: string) {
  const rows = await getSql()<Array<{ id: string; password_hash: string | null }>>`
    select id, password_hash from profiles where lower(email) = ${email.toLowerCase()} limit 1
  `
  const row = rows[0]
  const stored = row?.password_hash
  const hash = stored && stored.startsWith("$2") ? stored : dummyHash
  const matches = await bcrypt.compare(password, hash)
  if (!row || !stored || !matches) throw new CommerceError("Email or password is incorrect.")
  await startSession(row.id)
  return row.id
}

export async function logoutUser() {
  const token = (await cookies()).get("hb_session")?.value
  if (token) await getSql()`delete from sessions where token_hash = ${pepper(token)}`
  ;(await cookies()).delete("hb_session")
}

export async function createEmailToken(userId: string, purpose: "verify" | "reset") {
  const token = newToken()
  await getSql()`
    insert into email_tokens (user_id, purpose, token_hash, expires_at)
    values (${userId}, ${purpose}, ${pepper(token)}, now() + interval '2 hours')
  `
  return token
}

export async function requestPasswordReset(email: string) {
  const rows = await getSql()<Array<{ id: string }>>`
    select id from profiles where lower(email) = ${email.toLowerCase()} limit 1
  `
  if (!rows[0]) return { devLink: null as string | null }
  const token = await createEmailToken(rows[0].id, "reset")
  return { devLink: devLink("/account/reset-password", token) }
}

export async function resetPassword(token: string, password: string) {
  const rows = await getSql()<Array<{ id: string; user_id: string }>>`
    select id, user_id from email_tokens
    where token_hash = ${pepper(token)} and purpose = 'reset' and used_at is null and expires_at > now()
    limit 1
  `
  if (!rows[0]) throw new CommerceError("This reset link is invalid or expired.")
  const passwordHash = await bcrypt.hash(password, 12)
  await getSql().begin(async (tx) => {
    await tx`update profiles set password_hash = ${passwordHash} where id = ${rows[0].user_id}`
    await tx`update email_tokens set used_at = now() where id = ${rows[0].id}`
    await tx`delete from sessions where user_id = ${rows[0].user_id}`
  })
}

export async function verifyEmail(token: string) {
  const rows = await getSql()<Array<{ id: string; user_id: string }>>`
    select id, user_id from email_tokens
    where token_hash = ${pepper(token)} and purpose = 'verify' and used_at is null and expires_at > now()
    limit 1
  `
  if (!rows[0]) throw new CommerceError("This verification link is invalid or expired.")
  await getSql().begin(async (tx) => {
    await tx`update profiles set email_verified_at = now() where id = ${rows[0].user_id}`
    await tx`update email_tokens set used_at = now() where id = ${rows[0].id}`
  })
}

export async function updateProfile(userId: string, input: { firstName: string; lastName: string; phone: string }) {
  await getSql()`
    update profiles
    set first_name = ${input.firstName}, last_name = ${input.lastName}, phone = ${input.phone || null}
    where id = ${userId}
  `
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/account/login?next=/account")
  return user
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) redirect("/account/login?next=/admin")
  if (user.role !== "admin" && user.role !== "super_admin") redirect("/account")
  return user
}

export function destinationFor(user: SessionUser, next: string | null | undefined) {
  const safe = safeNext(next)
  if (safe) return safe
  if (user.role === "admin" || user.role === "super_admin") return "/admin"
  return "/account"
}

function devLink(path: string, token: string) {
  if (process.env.NODE_ENV === "production") return null
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${base}${path}?token=${encodeURIComponent(token)}`
}

export async function readGuestId() {
  return (await cookies()).get("hb_guest")?.value ?? null
}

export async function ensureGuestId() {
  const jar = await cookies()
  const existing = jar.get("hb_guest")?.value
  if (existing) return existing
  const id = crypto.randomUUID()
  jar.set("hb_guest", id, { ...cookieOptions, maxAge: 60 * 60 * 24 * 180 })
  return id
}
