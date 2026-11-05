import "server-only"
import { getSql } from "@/lib/db"

export async function listAddresses(userId: string) {
  return getSql()<
    Array<{
      id: string
      label: string
      first_name: string
      last_name: string
      phone: string
      country: string
      region: string
      city: string
      street: string
      postal_code: string | null
      is_default: boolean
    }>
  >`
    select id, label, first_name, last_name, phone, country, region, city, street, postal_code, is_default
    from addresses
    where user_id = ${userId}
    order by is_default desc, created_at desc
  `
}

export async function listAccountOrders(userId: string) {
  return getSql()<
    Array<{
      id: string
      order_number: string
      total_amount: string
      currency: string
      payment_status: string
      fulfillment_status: string
      created_at: Date
    }>
  >`
    select id, order_number, total_amount::text, currency, payment_status, fulfillment_status, created_at
    from orders
    where user_id = ${userId}
    order by created_at desc
  `
}

export async function getAccountOrder(userId: string, id: string) {
  const rows = await getSql()<Array<Record<string, unknown>>>`
    select o.*,
      coalesce((
        select json_agg(json_build_object(
          'name', product_name_snapshot,
          'sku', product_sku_snapshot,
          'variant', variant_snapshot,
          'quantity', quantity,
          'unitPrice', unit_price::text,
          'lineTotal', line_total::text
        ))
        from order_items where order_id = o.id
      ), '[]'::json) as items,
      coalesce((
        select json_agg(json_build_object(
          'carrier', carrier,
          'tracking', tracking_number,
          'shippedAt', shipped_at
        ) order by created_at)
        from shipments where order_id = o.id
      ), '[]'::json) as shipments
    from orders o
    where o.id = ${id} and o.user_id = ${userId}
    limit 1
  `
  return rows[0] ?? null
}

export async function exportAccount(userId: string) {
  const sql = getSql()
  const [profile, addresses, orders, wishlist] = await Promise.all([
    sql`select id, email, first_name, last_name, phone, created_at from profiles where id = ${userId}`,
    sql`select label, first_name, last_name, phone, country, region, city, street, postal_code from addresses where user_id = ${userId}`,
    sql`select order_number, total_amount::text, currency, payment_status, fulfillment_status, created_at from orders where user_id = ${userId} order by created_at desc`,
    sql`
      select p.name, p.slug
      from wishlist_items wi
      join wishlists w on w.id = wi.wishlist_id
      join products p on p.id = wi.product_id
      where w.user_id = ${userId}
    `,
  ])
  return { profile: profile[0] ?? null, addresses, orders, wishlist }
}
