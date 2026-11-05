import fs from "node:fs"
import path from "node:path"
import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Run npm run db:up first.")
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} })

await sql.unsafe(`
  create table if not exists schema_migrations (
    id text primary key,
    applied_at timestamptz not null default now()
  )
`)

const directory = path.join(process.cwd(), "supabase", "migrations")
const files = fs.readdirSync(directory).filter((file) => file.endsWith(".sql")).sort()

for (const file of files) {
  const done = await sql`select 1 from schema_migrations where id = ${file}`
  if (done.length) continue
  const body = fs.readFileSync(path.join(directory, file), "utf8")
  await sql.begin(async (tx) => {
    await tx.unsafe(body)
    await tx`insert into schema_migrations (id) values (${file})`
  })
  console.log(`applied ${file}`)
}

await sql.end()
