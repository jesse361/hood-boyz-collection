import { config } from "dotenv"
import postgres from "postgres"
import { afterAll, describe, expect, it } from "vitest"

config({ path: ".env.local" })
config({ path: ".env" })

const url = process.env.DATABASE_URL
const sql = url ? postgres(url, { max: 1, onnotice: () => {} }) : null

afterAll(async () => {
  await sql?.end()
})

describe("row level security", () => {
  it("lets anonymous shoppers read active products and blocks orders", async () => {
    if (!sql) throw new Error("DATABASE_URL is required for the RLS test.")
    const products = await sql.begin(async (tx) => {
      await tx.unsafe("set local role anon")
      return tx<Array<{ count: number }>>`select count(*)::int as count from products`
    })
    expect(products[0].count).toBeGreaterThanOrEqual(6)
    await expect(
      sql.begin(async (tx) => {
        await tx.unsafe("set local role anon")
        await tx`select id from orders`
      }),
    ).rejects.toThrow()
  })

  it("hides every order from an authenticated customer who does not own one", async () => {
    if (!sql) throw new Error("DATABASE_URL is required for the RLS test.")
    const rows = await sql.begin(async (tx) => {
      await tx.unsafe("set local role authenticated")
      await tx`select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000aa', true)`
      return tx<Array<{ count: number }>>`select count(*)::int as count from orders`
    })
    expect(rows[0].count).toBe(0)
  })

  it("refuses to mark an order paid without the server payment flag", async () => {
    if (!sql) throw new Error("DATABASE_URL is required for the RLS test.")
    await expect(
      sql.begin(async (tx) => {
        const created = await tx<Array<{ id: string }>>`
          insert into orders (
            order_number, customer_email, customer_name, subtotal, total_amount, currency,
            payment_status, shipping_address, idempotency_key
          ) values (
            ${`HB-TEST-${Date.now()}`}, 'rls@hoodboyz.local', 'RLS Test', 10, 10, 'GHS',
            'pending', ${tx.json({ street: "Test" })}, ${crypto.randomUUID()}
          )
          returning id
        `
        await tx`update orders set payment_status = 'paid' where id = ${created[0].id}`
      }),
    ).rejects.toThrow(/payment status/)
  })
})
