import "server-only"
import postgres from "postgres"

const globalForSql = globalThis as unknown as { sql?: postgres.Sql }

export function getSql() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and run npm run db:setup.")
  }
  if (!globalForSql.sql) {
    globalForSql.sql = postgres(url, { max: 10, idle_timeout: 20 })
  }
  return globalForSql.sql
}

export type Tx = postgres.TransactionSql

export async function withTx<T>(
  fn: (tx: Tx) => Promise<T>,
  settings: Record<string, string> = {},
) {
  return getSql().begin(async (tx) => {
    for (const [key, value] of Object.entries(settings)) {
      await tx`select set_config(${key}, ${value}, true)`
    }
    return fn(tx)
  })
}
