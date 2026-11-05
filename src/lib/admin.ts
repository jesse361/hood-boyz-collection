import "server-only"
import { getSql } from "@/lib/db"

export async function pendingOrderCount() {
  const rows = await getSql()<Array<{ count: number }>>`
    select count(*)::int as count from orders where payment_status = 'pending'
  `
  return rows[0]?.count ?? 0
}

export async function dashboard(days = 30) {
  const span = [7, 30, 90, 365].includes(days) ? days : 30
  const sql = getSql()
  const [totals, recent, series, products, categories, activity, low] = await Promise.all([
    sql<Array<{
      revenue_now: number
      revenue_prev: number
      orders_now: number
      orders_prev: number
      customers: number
      customers_now: number
      customers_prev: number
      pending_orders: number
    }>>`
      select
        coalesce(sum(total_amount) filter (
          where payment_status = 'paid' and created_at >= now() - make_interval(days => ${span})
        ), 0)::float8 as revenue_now,
        coalesce(sum(total_amount) filter (
          where payment_status = 'paid'
            and created_at < now() - make_interval(days => ${span})
            and created_at >= now() - make_interval(days => ${span * 2})
        ), 0)::float8 as revenue_prev,
        count(*) filter (where created_at >= now() - make_interval(days => ${span}))::int as orders_now,
        count(*) filter (
          where created_at < now() - make_interval(days => ${span})
            and created_at >= now() - make_interval(days => ${span * 2})
        )::int as orders_prev,
        (select count(*)::int from profiles) as customers,
        (select count(*)::int from profiles where created_at >= now() - make_interval(days => ${span})) as customers_now,
        (select count(*)::int from profiles
          where created_at < now() - make_interval(days => ${span})
            and created_at >= now() - make_interval(days => ${span * 2})
        ) as customers_prev,
        count(*) filter (where payment_status = 'pending')::int as pending_orders
      from orders
    `,
    sql<Array<{
      id: string
      order_number: string
      customer_name: string
      total_amount: string
      currency: string
      payment_status: string
      fulfillment_status: string
      created_at: Date
      items: number
    }>>`
      select o.id, o.order_number, o.customer_name, o.total_amount::text, o.currency,
        o.payment_status, o.fulfillment_status, o.created_at,
        coalesce((select sum(quantity)::int from order_items i where i.order_id = o.id), 0) as items
      from orders o
      order by o.created_at desc
      limit 5
    `,
    sql<Array<{ day: string; revenue: number; orders: number; customers: number }>>`
      select to_char(d::date, 'YYYY-MM-DD') as day,
        coalesce(sum(o.total_amount) filter (where o.payment_status = 'paid'), 0)::float8 as revenue,
        count(o.id)::int as orders,
        (select count(*)::int from profiles p where p.created_at::date = d::date) as customers
      from generate_series(
        current_date - make_interval(days => ${span - 1}),
        current_date,
        interval '1 day'
      ) as d
      left join orders o on o.created_at::date = d::date
      group by d
      order by d
    `,
    sql<Array<{ name: string; units: number; revenue: string; image: string | null }>>`
      select oi.product_name_snapshot as name,
        sum(oi.quantity)::int as units,
        sum(oi.line_total)::text as revenue,
        max(pi.image_url) as image
      from order_items oi
      join orders o on o.id = oi.order_id
      left join lateral (
        select image_url from product_images
        where product_id = oi.product_id
        order by is_primary desc, display_order
        limit 1
      ) pi on true
      where o.created_at >= now() - make_interval(days => ${span})
        and o.payment_status <> 'failed'
      group by oi.product_name_snapshot
      order by units desc, sum(oi.line_total) desc
      limit 5
    `,
    sql<Array<{ name: string; revenue: number }>>`
      select coalesce(c.name, 'Other') as name,
        coalesce(sum(oi.line_total), 0)::float8 as revenue
      from order_items oi
      join orders o on o.id = oi.order_id
      left join products p on p.id = oi.product_id
      left join categories c on c.id = p.category_id
      where o.created_at >= now() - make_interval(days => ${span})
        and o.payment_status <> 'failed'
      group by 1
      having sum(oi.line_total) > 0
      order by revenue desc
      limit 6
    `,
    sql<Array<{ id: string; at: Date; title: string; detail: string }>>`
      select id::text, created_at as at,
        'Order ' || order_number as title,
        customer_name || ' · ' || payment_status as detail
      from orders
      union all
      select id::text, created_at,
        subject,
        name || ' · ' || email
      from contact_messages
      order by at desc
      limit 5
    `,
    sql<Array<{ sku: string; size: string; color: string; stock_quantity: number; name: string }>>`
      select v.sku, v.size, v.color, v.stock_quantity, p.name
      from product_variants v
      join products p on p.id = v.product_id
      where v.is_active and v.stock_quantity <= v.low_stock_threshold
      order by v.stock_quantity, p.name
      limit 8
    `,
  ])
  return { days: span, totals: totals[0], recent, series, products, categories, activity, low }
}

export async function adminProducts() {
  return getSql()<
    Array<{ id: string; name: string; slug: string; sku: string; status: string; base_price: string; sample_data: boolean; stock: number; low_stock: boolean; category: string | null; image: string | null }>
  >`
    select p.id, p.name, p.slug, p.sku, p.status, p.base_price::text, p.sample_data,
      c.name as category,
      coalesce((select sum(stock_quantity) from product_variants v where v.product_id = p.id), 0)::int as stock,
      exists (
        select 1 from product_variants v
        where v.product_id = p.id and v.is_active and v.stock_quantity <= v.low_stock_threshold
      ) as low_stock,
      (
        select i.image_url from product_images i
        where i.product_id = p.id
        order by i.is_primary desc, i.display_order
        limit 1
      ) as image
    from products p
    left join categories c on c.id = p.category_id
    order by p.updated_at desc
  `
}

export async function adminProduct(id: string) {
  const rows = await getSql()<
    Array<{
      id: string
      name: string
      slug: string
      short_description: string
      description: string
      details: string
      materials: string
      care_instructions: string
      fit_notes: string
      base_price: string
      compare_at_price: string | null
      sku: string
      category_id: string
      status: string
      featured: boolean
      is_new: boolean
      is_limited_edition: boolean
      sample_data: boolean
      seo_title: string | null
      seo_description: string | null
    }>
  >`
    select id, name, slug, short_description, description, details, materials, care_instructions, fit_notes,
      base_price::text, compare_at_price::text, sku, category_id, status, featured, is_new, is_limited_edition,
      sample_data, seo_title, seo_description
    from products where id = ${id} limit 1
  `
  if (!rows[0]) return null
  const sql = getSql()
  const [images, variants, collections] = await Promise.all([
    sql<Array<{ id: string; image_url: string; alt_text: string; is_primary: boolean }>>`
      select id, image_url, alt_text, is_primary from product_images where product_id = ${id} order by is_primary desc, display_order
    `,
    sql<Array<{ id: string; sku: string; size: string; color: string; color_code: string | null; stock_quantity: number; low_stock_threshold: number; is_active: boolean }>>`
      select id, sku, size, color, color_code, stock_quantity, low_stock_threshold, is_active
      from product_variants where product_id = ${id} order by color, size
    `,
    sql<Array<{ collection_id: string }>>`select collection_id from collection_products where product_id = ${id}`,
  ])
  return { ...rows[0], images, variants, collectionIds: collections.map((row) => row.collection_id) }
}

export async function adminCategories() {
  return getSql()<Array<{ id: string; name: string; slug: string; description: string; is_active: boolean; display_order: number; products: number }>>`
    select c.id, c.name, c.slug, c.description, c.is_active, c.display_order,
      (select count(*)::int from products p where p.category_id = c.id) as products
    from categories c order by c.display_order, c.name
  `
}

export async function adminCollections() {
  return getSql()<Array<{ id: string; name: string; slug: string; description: string; image_url: string | null; is_active: boolean; is_featured: boolean; products: number }>>`
    select c.id, c.name, c.slug, c.description, c.image_url, c.is_active, c.is_featured,
      (select count(*)::int from collection_products cp where cp.collection_id = c.id) as products
    from collections c order by c.display_order, c.name
  `
}

export async function adminOrders() {
  return getSql()<
    Array<{ id: string; order_number: string; customer_name: string; customer_email: string; total_amount: string; currency: string; payment_status: string; fulfillment_status: string; payment_method: string | null; created_at: Date }>
  >`
    select id, order_number, customer_name, customer_email, total_amount::text, currency,
      payment_status, fulfillment_status, payment_method, created_at
    from orders order by created_at desc
  `
}

export async function adminOrder(id: string) {
  const rows = await getSql()<Array<Record<string, unknown>>>`
    select o.*,
      coalesce((
        select json_agg(json_build_object(
          'name', product_name_snapshot, 'sku', product_sku_snapshot, 'variant', variant_snapshot,
          'quantity', quantity, 'unitPrice', unit_price::text, 'lineTotal', line_total::text, 'variantId', variant_id
        )) from order_items where order_id = o.id
      ), '[]'::json) as items,
      coalesce((
        select json_agg(json_build_object('id', id, 'event', event_type, 'note', note, 'to', to_status, 'at', created_at) order by created_at)
        from order_events where order_id = o.id
      ), '[]'::json) as events,
      coalesce((
        select json_agg(json_build_object('carrier', carrier, 'tracking', tracking_number, 'notes', notes, 'at', shipped_at) order by created_at)
        from shipments where order_id = o.id
      ), '[]'::json) as shipments,
      coalesce((
        select json_agg(json_build_object('amount', amount::text, 'status', status, 'reason', reason, 'method', method, 'at', created_at) order by created_at)
        from refunds where order_id = o.id
      ), '[]'::json) as refunds
    from orders o where o.id = ${id} limit 1
  `
  return rows[0] ?? null
}

export async function adminCustomers() {
  return getSql()<
    Array<{ id: string; email: string; first_name: string; last_name: string; phone: string | null; orders: number; spent: string; created_at: Date }>
  >`
    select p.id, p.email, p.first_name, p.last_name, p.phone, p.created_at,
      (select count(*)::int from orders o where o.user_id = p.id) as orders,
      coalesce((select sum(total_amount) from orders o where o.user_id = p.id and o.payment_status = 'paid'), 0)::text as spent
    from profiles p
    order by p.created_at desc
  `
}

export async function adminInventory() {
  return getSql()<
    Array<{ id: string; product_id: string; sku: string; size: string; color: string; stock_quantity: number; low_stock_threshold: number; name: string; sample_data: boolean; image: string | null }>
  >`
    select v.id, v.product_id, v.sku, v.size, v.color, v.stock_quantity, v.low_stock_threshold, p.name, p.sample_data,
      (
        select i.image_url from product_images i
        where i.product_id = p.id
        order by i.is_primary desc, i.display_order
        limit 1
      ) as image
    from product_variants v
    join products p on p.id = v.product_id
    order by p.name, v.color, v.size
  `
}

export async function inventoryLog(variantId?: string) {
  const sql = getSql()
  const where = variantId ? sql`where t.variant_id = ${variantId}` : sql``
  return sql<Array<{ id: string; transaction_type: string; quantity: number; notes: string | null; created_at: Date; sku: string | null; name: string | null; color: string | null; size: string | null }>>`
    select t.id, t.transaction_type, t.quantity, t.notes, t.created_at, v.sku, p.name, v.color, v.size
    from inventory_transactions t
    left join product_variants v on v.id = t.variant_id
    left join products p on p.id = v.product_id
    ${where}
    order by t.created_at desc
    limit 40
  `
}

export async function adminCoupons() {
  return getSql()<
    Array<{ id: string; code: string; description: string; discount_type: string; discount_value: string; minimum_order_amount: string; usage_limit: number | null; usage_count: number; is_active: boolean }>
  >`
    select id, code, description, discount_type, discount_value::text, minimum_order_amount::text, usage_limit, usage_count, is_active
    from coupons order by created_at desc
  `
}

export async function adminDiscounts() {
  return getSql()<Array<{ id: string; name: string; discount_type: string; discount_value: string; minimum_order_amount: string; is_active: boolean }>>`
    select id, name, discount_type, discount_value::text, minimum_order_amount::text, is_active
    from automatic_discounts order by created_at desc
  `
}

export async function adminReviews() {
  return getSql()<Array<{ id: string; rating: number; title: string; comment: string; is_approved: boolean; is_verified_purchase: boolean; product: string; author: string; created_at: Date }>>`
    select r.id, r.rating, r.title, r.comment, r.is_approved, r.is_verified_purchase, p.name as product,
      pr.first_name || ' ' || pr.last_name as author, r.created_at
    from reviews r
    join products p on p.id = r.product_id
    join profiles pr on pr.id = r.user_id
    order by r.created_at desc
  `
}

export async function adminNewsletter() {
  return getSql()<Array<{ id: string; email: string; status: string; subscribed_at: Date }>>`
    select id, email, status, subscribed_at from newsletter_subscribers order by subscribed_at desc
  `
}

export async function adminTeam() {
  return getSql()<Array<{ id: string; email: string; first_name: string; last_name: string; role: string | null }>>`
    select p.id, p.email, p.first_name, p.last_name,
      (select role from user_roles r where r.user_id = p.id order by case role when 'super_admin' then 0 when 'admin' then 1 else 2 end limit 1) as role
    from profiles p
    order by p.created_at
  `
}

export async function analytics() {
  const sql = getSql()
  const [summary, days, products] = await Promise.all([
    sql<Array<{ paid_orders: number; revenue: string; units: number; pending: number }>>`
      select
        count(distinct o.id) filter (where o.payment_status = 'paid')::int as paid_orders,
        coalesce(sum(o.total_amount) filter (where o.payment_status = 'paid'), 0)::text as revenue,
        coalesce(sum(oi.quantity) filter (where o.payment_status = 'paid'), 0)::int as units,
        count(distinct o.id) filter (where o.payment_status = 'pending')::int as pending
      from orders o
      left join order_items oi on oi.order_id = o.id
    `,
    sql<Array<{ day: string; revenue: string; orders: number }>>`
      select to_char(created_at, 'YYYY-MM-DD') as day,
        coalesce(sum(total_amount), 0)::text as revenue,
        count(*)::int as orders
      from orders
      where payment_status = 'paid'
      group by 1
      order by 1 desc
      limit 14
    `,
    sql<Array<{ name: string; units: number; revenue: string }>>`
      select oi.product_name_snapshot as name, sum(oi.quantity)::int as units, sum(oi.line_total)::text as revenue
      from order_items oi
      join orders o on o.id = oi.order_id and o.payment_status = 'paid'
      group by oi.product_name_snapshot
      order by units desc
      limit 8
    `,
  ])
  return { summary: summary[0], days, products }
}

export async function shippingRows() {
  return getSql()<Array<{ id: string; name: string; description: string; amount: string; eta: string; is_active: boolean; eligible_for_free_shipping: boolean }>>`
    select id, name, description, amount::text, eta, is_active, eligible_for_free_shipping
    from shipping_methods order by display_order, name
  `
}
