import { spawn } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import net from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { setTimeout as delay } from "node:timers/promises"

const port = 54351
const user = "hood"
const password = "hood_local_password"
const database = "hoodboyz"
const directory = path.join(process.cwd(), ".data", "postgres")

function listening() {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" }, () => {
      socket.end()
      resolve(true)
    })
    socket.on("error", () => resolve(false))
  })
}

function ensureEnv() {
  const file = path.join(process.cwd(), ".env.local")
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
  const lines = []
  if (!/^DATABASE_URL=/m.test(text)) {
    lines.push(`DATABASE_URL=postgres://${user}:${password}@127.0.0.1:${port}/${database}`)
  }
  if (!/^SESSION_SECRET=/m.test(text)) {
    lines.push(`SESSION_SECRET=${crypto.randomBytes(32).toString("hex")}`)
  }
  if (!/^NEXT_PUBLIC_APP_URL=/m.test(text)) {
    lines.push("NEXT_PUBLIC_APP_URL=http://localhost:3000")
  }
  if (!/^INITIAL_ADMIN_EMAIL=/m.test(text)) {
    lines.push("INITIAL_ADMIN_EMAIL=admin@hoodboyz.local")
  }
  let adminPassword = text.match(/^INITIAL_ADMIN_PASSWORD=(.*)$/m)?.[1]
  if (!adminPassword) {
    adminPassword = crypto.randomBytes(9).toString("base64url")
    lines.push(`INITIAL_ADMIN_PASSWORD=${adminPassword}`)
  }
  if (lines.length) {
    fs.appendFileSync(file, `${text.endsWith("\n") || text.length === 0 ? "" : "\n"}${lines.join("\n")}\n`)
  }
  fs.mkdirSync(path.join(process.cwd(), ".local"), { recursive: true })
  const creds = path.join(process.cwd(), ".local", "admin-credentials.txt")
  if (!fs.existsSync(creds)) {
    fs.writeFileSync(
      creds,
      `email=${text.match(/^INITIAL_ADMIN_EMAIL=(.*)$/m)?.[1] || "admin@hoodboyz.local"}\npassword=${adminPassword}\n`,
      { mode: 0o600 },
    )
  }
}

async function hold() {
  const { default: EmbeddedPostgres } = await import("embedded-postgres")
  fs.mkdirSync(path.dirname(directory), { recursive: true })
  const postgres = new EmbeddedPostgres({
    databaseDir: directory,
    user,
    password,
    port,
    persistent: true,
  })
  if (!fs.existsSync(path.join(directory, "PG_VERSION"))) await postgres.initialise()
  await postgres.start()
  try {
    await postgres.createDatabase(database)
  } catch (error) {
    if (!String(error).toLowerCase().includes("already")) throw error
  }
  console.log(`PostgreSQL is listening on 127.0.0.1:${port}`)
  setInterval(() => {}, 60 * 60 * 1000)
}

ensureEnv()

if (process.argv.includes("--hold")) {
  await hold()
} else if (!(await listening())) {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--hold"], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
  })
  child.unref()
  for (let attempt = 0; attempt < 120 && !(await listening()); attempt += 1) await delay(500)
  if (!(await listening())) {
    console.error("Local PostgreSQL did not start.")
    process.exit(1)
  }
  console.log(`PostgreSQL is listening on 127.0.0.1:${port}`)
} else {
  console.log(`PostgreSQL is already listening on 127.0.0.1:${port}`)
}
