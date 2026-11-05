import "server-only"
import { createHash, randomBytes } from "node:crypto"
import { ensureGuestId, getCurrentUser, readGuestId } from "@/lib/auth"
import { getSql, withTx, type Tx } from "@/lib/db"
import { CommerceError } from "@/lib/errors"
import { fromPesewas, toPesewas } from "@/lib/money"
import { quoteDiscount, quoteTotals, type DiscountRule } from "@/lib/pricing"
import { getSettings } from "@/lib/settings"
import type { Quote, QuoteLine } from "@/types/store"

type Owner = { userId: string | null; guestId: string | null }

function tokenPepper(token: string) {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error("SESSION_SECRET is not set.")
  return createHash("sha256").update(`${secret}:${token}`).digest("hex")
}

async function owner(): Promise<Owner> {
  const user = await getCurrentUser()
  return { userId: user?.id ?? null, guestId: user ? null : await readGuestId() }
}

async function cartId(tx: Tx, who: Owner, create: boolean) {
  if (!who.userId && !who.guestId) return null
  const rows = who.userId
    ? await tx<Array<{ id: string }>>`select id from carts where user_id = ${who.userId} limit 1`
    : await tx<Array<{ id: string }>>`select id from carts where session_id = ${who.guestId} and user_id is null limit 1`
  if (rows[0]) return rows[0].id
  if (!create) return null
  const created = await tx<Array<{ id: string }>>`
    insert into carts (user_id, session_id) values (${who.userId}, ${who.userId ? null : who.guestId})
    returning id
  `
  return created[0].id
}

export async function cartCount() {
  const who = await owner()
  if (!who.userId && !who.guestId) return 0
  const rows = await getSql()<Array<{ count: number }>>`
    select coalesce(sum(ci.quantity), 0)::int as count
    from carts c
    join cart_items ci on ci.cart_id = c.id
    where ${who.userId ? getSql()`c.user_id = ${who.userId}` : getSql()`c.session_id = ${who.guestId} and c.user_id is null`}
  `
  return rows[0]?.count ?? 0
}

export async function wishlistCount() {
  const who = await owner()
  if (!who.userId && !who.guestId) return 0
  const rows = await getSql()<Array<{ count: number }>>`
    select count(*)::int as count
    from wishlists w
    join wishlist_items wi on wi.wishlist_id = w.id
    where ${who.userId ? getSql()`w.user_id = ${who.userId}` : getSql()`w.session_id = ${who.guestId} and w.user_id is null`}
  `
  return rows[0]?.count ?? 0
}

async function loadLines(tx: Tx, id: string) {
  return tx<
    Array<{
      item_id: string
      variant_id: string
      product_id: string
      quantity: number
      name: string
      sku: string
      size: string
      color: string
      color_code: string | null
      stock: number
      active: boolean
      status: string
      unit_price: string
      image: string | null
      sample_data: boolean
      product_sku: string
    }>
  >`
    select ci.id as item_id, ci.variant_id, ci.product_id, ci.quantity,
      p.name, p.sku as product_sku, p.status, p.sample_data,
      v.sku, v.size, v.color, v.color_code, v.stock_quantity as stock, v.is_active as active,
      coalesce(v.price_override, p.base_price)::text as unit_price,
      (
        select i.image_url from product_images i
        where i.product_id = p.id
        order by i.is_primary desc, i.display_order
        limit 1
      ) as image
    from cart_items ci
    join product_variants v on v.id = ci.variant_id
    join products p on p.id = ci.product_id
    where ci.cart_id = ${id}
    order by ci.created_at
  `
}

export async function getCart() {
  const who = await owner()
  const settings = await getSettings()
  return withTx(async (tx) => {
    const id = await cartId(tx, who, false)
    if (!id) {
      return emptyQuote(settings.commerce.currency, settings.commerce.pricesAreSamples, settings.commerce.inventoryIsDemonstration)
    }
    const cart = await tx<Array<{ coupon_code: string | null }>>`select coupon_code from carts where id = ${id}`
    return priceLines(tx, await loadLines(tx, id), cart[0]?.coupon_code ?? null, null, settings)
  })
}

function emptyQuote(currency: string, pricesAreSamples: boolean, inventoryIsDemonstration: boolean): Quote {
  return {
    lines: [],
    subtotal: "0.00",
    discount: "0.00",
    shipping: "0.00",
    tax: "0.00",
    total: "0.00",
    currency,
    coupon: null,
    couponError: null,
    shippingName: null,
    shippingEta: null,
    pricesAreSamples,
    inventoryIsDemonstration,
  }
}

async function priceLines(
  tx: Tx,
  rows: Awaited<ReturnType<typeof loadLines>>,
  couponCode: string | null,
  shippingMethodId: string | null,
  settings: Awaited<ReturnType<typeof getSettings>>,
): Promise<Quote> {
  const lines: QuoteLine[] = []
  let subtotal = 0
  for (const row of rows) {
    if (row.status !== "active" || !row.active) continue
    const unit = toPesewas(row.unit_price)
    const quantity = Math.min(row.quantity, Math.max(row.stock, 0), 10)
    if (quantity < 1) continue
    subtotal += unit * quantity
    lines.push({
      itemId: row.item_id,
      variantId: row.variant_id,
      productId: row.product_id,
      name: row.name,
      sku: row.sku,
      size: row.size,
      color: row.color,
      quantity,
      unitPrice: fromPesewas(unit),
      lineTotal: fromPesewas(unit * quantity),
      image: row.image,
      sampleData: row.sample_data,
    })
  }

  let discount = 0
  let couponError: string | null = null
  let applied: string | null = null
  if (couponCode) {
    const coupon = await loadCoupon(tx, couponCode)
    if (!coupon) couponError = "That coupon is not recognised."
    else {
      const quoted = quoteDiscount(subtotal, coupon)
      if (quoted.error) couponError = quoted.error
      else {
        discount = quoted.discount
        applied = coupon.code ?? null
      }
    }
  } else {
    const automatic = await loadAutomatic(tx, subtotal)
    if (automatic) discount = quoteDiscount(subtotal, automatic).discount
  }

  let shipping = 0
  let shippingName: string | null = null
  let shippingEta: string | null = null
  if (shippingMethodId) {
    const methods = await tx<
      Array<{ name: string; amount: string; eta: string; eligible_for_free_shipping: boolean }>
    >`select name, amount::text, eta, eligible_for_free_shipping from shipping_methods where id = ${shippingMethodId} and is_active limit 1`
    const method = methods[0]
    if (!method) throw new CommerceError("Choose a delivery method.")
    shippingName = method.name
    shippingEta = method.eta
    const threshold = settings.commerce.freeShippingThreshold
    const qualifies =
      method.eligible_for_free_shipping &&
      threshold != null &&
      subtotal - discount >= toPesewas(threshold)
    shipping = qualifies ? 0 : toPesewas(method.amount)
  }

  const totals = quoteTotals({
    subtotalPesewas: subtotal,
    discountPesewas: discount,
    shippingPesewas: shipping,
    taxRatePercent: Number(settings.commerce.taxRatePercent) || 0,
  })
  return {
    lines,
    ...totals,
    currency: settings.commerce.currency,
    coupon: applied,
    couponError,
    shippingName,
    shippingEta,
    pricesAreSamples: settings.commerce.pricesAreSamples,
    inventoryIsDemonstration: settings.commerce.inventoryIsDemonstration,
  }
}

async function loadCoupon(tx: Tx, code: string): Promise<DiscountRule | null> {
  const rows = await tx<
    Array<{
      code: string
      discount_type: "percentage" | "fixed"
      discount_value: string
      minimum_order_amount: string
      maximum_discount: string | null
      usage_limit: number | null
      usage_count: number
      starts_at: string | null
      expires_at: string | null
      is_active: boolean
    }>
  >`
    select code, discount_type, discount_value::text, minimum_order_amount::text, maximum_discount::text,
      usage_limit, usage_count, starts_at, expires_at, is_active
    from coupons
    where upper(code) = upper(${code})
    limit 1
  `
  const row = rows[0]
  if (!row) return null
  return {
    code: row.code,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minimumOrderAmount: row.minimum_order_amount,
    maximumDiscount: row.maximum_discount,
    usageLimit: row.usage_limit,
    usageCount: row.usage_count,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
  }
}

async function loadAutomatic(tx: Tx, subtotal: number): Promise<DiscountRule | null> {
  const rows = await tx<
    Array<{
      name: string
      discount_type: "percentage" | "fixed"
      discount_value: string
      minimum_order_amount: string
      maximum_discount: string | null
      starts_at: string | null
      expires_at: string | null
      is_active: boolean
    }>
  >`
    select name, discount_type, discount_value::text, minimum_order_amount::text, maximum_discount::text,
      starts_at, expires_at, is_active
    from automatic_discounts
    where is_active
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at > now())
      and minimum_order_amount <= ${fromPesewas(subtotal)}::numeric
    order by discount_value desc
    limit 1
  `
  const row = rows[0]
  if (!row) return null
  return {
    name: row.name,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minimumOrderAmount: row.minimum_order_amount,
    maximumDiscount: row.maximum_discount,
    isActive: row.is_active,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
  }
}

export async function shippingMethods() {
  return getSql()<
    Array<{ id: string; name: string; description: string; amount: string; eta: string }>
  >`
    select id, name, description, amount::text, eta
    from shipping_methods
    where is_active
    order by display_order, amount
  `
}

export async function addToCart(variantId: string, quantity: number) {
  const qty = Math.max(1, Math.min(10, Math.floor(quantity)))
  const guestId = await ensureGuestId()
  const user = await getCurrentUser()
  await withTx(async (tx) => {
    const id = await cartId(tx, { userId: user?.id ?? null, guestId: user ? null : guestId }, true)
    const variants = await tx<Array<{ stock: number; active: boolean; status: string; product_id: string }>>`
      select v.stock_quantity as stock, v.is_active as active, p.status, p.id as product_id
      from product_variants v
      join products p on p.id = v.product_id
      where v.id = ${variantId}
      limit 1
    `
    const variant = variants[0]
    if (!variant || !variant.active || variant.status !== "active") throw new CommerceError("That option is not available.")
    if (variant.stock < 1) throw new CommerceError("That option is out of stock.")
    await tx`
      insert into cart_items (cart_id, product_id, variant_id, quantity)
      values (${id}, ${variant.product_id}, ${variantId}, ${Math.min(qty, variant.stock)})
      on conflict (cart_id, variant_id)
      do update set quantity = least(10, cart_items.quantity + ${Math.min(qty, variant.stock)}, ${variant.stock})
    `
  })
}

export async function updateCartQuantity(itemId: string, quantity: number) {
  const who = await owner()
  if (quantity < 1) return removeCartItem(itemId)
  await withTx(async (tx) => {
    const id = await cartId(tx, who, false)
    if (!id) return
    const rows = await tx<Array<{ stock: number }>>`
      select v.stock_quantity as stock
      from cart_items ci
      join product_variants v on v.id = ci.variant_id
      where ci.id = ${itemId} and ci.cart_id = ${id}
    `
    if (!rows[0]) throw new CommerceError("That bag item was not found.")
    if (quantity > rows[0].stock) throw new CommerceError("There isn't enough stock for that quantity.")
    await tx`update cart_items set quantity = ${Math.min(10, quantity)} where id = ${itemId} and cart_id = ${id}`
  })
}

export async function updateCartVariant(itemId: string, variantId: string) {
  const who = await owner()
  await withTx(async (tx) => {
    const id = await cartId(tx, who, false)
    if (!id) return
    const current = await tx<Array<{ product_id: string; quantity: number }>>`
      select product_id, quantity from cart_items where id = ${itemId} and cart_id = ${id}
    `
    if (!current[0]) throw new CommerceError("That bag item was not found.")
    const next = await tx<Array<{ stock: number; product_id: string }>>`
      select stock_quantity as stock, product_id from product_variants
      where id = ${variantId} and is_active and stock_quantity > 0
    `
    if (!next[0] || next[0].product_id !== current[0].product_id) {
      throw new CommerceError("That option is not available.")
    }
    await tx`delete from cart_items where cart_id = ${id} and variant_id = ${variantId} and id <> ${itemId}`
    await tx`
      update cart_items
      set variant_id = ${variantId}, quantity = least(quantity, ${next[0].stock})
      where id = ${itemId} and cart_id = ${id}
    `
  })
}

export async function removeCartItem(itemId: string) {
  const who = await owner()
  await withTx(async (tx) => {
    const id = await cartId(tx, who, false)
    if (!id) return
    await tx`delete from cart_items where id = ${itemId} and cart_id = ${id}`
  })
}

export async function setCoupon(code: string) {
  const who = await owner()
  const guestId = who.guestId ?? (await ensureGuestId())
  await withTx(async (tx) => {
    const id = await cartId(tx, { userId: who.userId, guestId: who.userId ? null : guestId }, true)
    await tx`update carts set coupon_code = ${code.trim() || null} where id = ${id}`
  })
}

async function wishlistId(tx: Tx, who: Owner, create: boolean) {
  if (!who.userId && !who.guestId) return null
  const rows = who.userId
    ? await tx<Array<{ id: string }>>`select id from wishlists where user_id = ${who.userId} limit 1`
    : await tx<Array<{ id: string }>>`select id from wishlists where session_id = ${who.guestId} and user_id is null limit 1`
  if (rows[0]) return rows[0].id
  if (!create) return null
  const created = await tx<Array<{ id: string }>>`
    insert into wishlists (user_id, session_id) values (${who.userId}, ${who.userId ? null : who.guestId})
    returning id
  `
  return created[0].id
}

export async function toggleWishlist(productId: string) {
  const user = await getCurrentUser()
  const guestId = user ? null : await ensureGuestId()
  return withTx(async (tx) => {
    const id = await wishlistId(tx, { userId: user?.id ?? null, guestId }, true)
    const existing = await tx<Array<{ id: string }>>`
      select id from wishlist_items where wishlist_id = ${id} and product_id = ${productId}
    `
    if (existing[0]) {
      await tx`delete from wishlist_items where id = ${existing[0].id}`
      return false
    }
    await tx`insert into wishlist_items (wishlist_id, product_id) values (${id}, ${productId})`
    return true
  })
}

export async function wishlistProductIds() {
  const who = await owner()
  if (!who.userId && !who.guestId) return [] as string[]
  const rows = await getSql()<Array<{ product_id: string }>>`
    select wi.product_id
    from wishlists w
    join wishlist_items wi on wi.wishlist_id = w.id
    where ${who.userId ? getSql()`w.user_id = ${who.userId}` : getSql()`w.session_id = ${who.guestId} and w.user_id is null`}
  `
  return rows.map((row) => row.product_id)
}

export async function getWishlistProducts() {
  const ids = await wishlistProductIds()
  if (!ids.length) return []
  const { listProducts } = await import("@/lib/catalog")
  const all = await listProducts({ page: 1, sort: "featured" })
  const sql = getSql()
  const extra = await sql<Array<{ slug: string }>>`
    select slug from products where id in ${sql(ids)} and status = 'active'
  `
  const slugs = new Set(extra.map((row) => row.slug))
  const first = all.products.filter((product) => slugs.has(product.slug))
  if (first.length === extra.length) return first
  const pages = []
  for (let page = 1; page <= 5; page += 1) {
    const result = await listProducts({ page, sort: "newest" })
    pages.push(...result.products.filter((product) => slugs.has(product.slug)))
  }
  const seen = new Set<string>()
  return pages.filter((product) => (seen.has(product.id) ? false : (seen.add(product.id), true)))
}

export async function mergeGuestBag(userId: string) {
  const guestId = await readGuestId()
  if (!guestId) return
  await withTx(async (tx) => {
    const guestCart = await tx<Array<{ id: string; coupon_code: string | null }>>`
      select id, coupon_code from carts where session_id = ${guestId} and user_id is null limit 1
    `
    const userCart = await cartId(tx, { userId, guestId: null }, true)
    if (guestCart[0] && userCart && guestCart[0].id !== userCart) {
      const items = await tx<Array<{ product_id: string; variant_id: string; quantity: number }>>`
        select product_id, variant_id, quantity from cart_items where cart_id = ${guestCart[0].id}
      `
      for (const item of items) {
        await tx`
          insert into cart_items (cart_id, product_id, variant_id, quantity)
          values (${userCart}, ${item.product_id}, ${item.variant_id}, ${item.quantity})
          on conflict (cart_id, variant_id)
          do update set quantity = least(10, cart_items.quantity + excluded.quantity)
        `
      }
      if (guestCart[0].coupon_code) {
        await tx`update carts set coupon_code = coalesce(coupon_code, ${guestCart[0].coupon_code}) where id = ${userCart}`
      }
      await tx`delete from carts where id = ${guestCart[0].id}`
    }
    const guestWish = await tx<Array<{ id: string }>>`
      select id from wishlists where session_id = ${guestId} and user_id is null limit 1
    `
    const userWish = await wishlistId(tx, { userId, guestId: null }, true)
    if (guestWish[0] && userWish && guestWish[0].id !== userWish) {
      await tx`
        insert into wishlist_items (wishlist_id, product_id)
        select ${userWish}, product_id from wishlist_items where wishlist_id = ${guestWish[0].id}
        on conflict (wishlist_id, product_id) do nothing
      `
      await tx`delete from wishlists where id = ${guestWish[0].id}`
    }
  })
}

export async function quoteCheckout(shippingMethodId: string, couponCode?: string) {
  const who = await owner()
  const settings = await getSettings()
  return withTx(async (tx) => {
    const id = await cartId(tx, who, false)
    if (!id) return emptyQuote(settings.commerce.currency, settings.commerce.pricesAreSamples, settings.commerce.inventoryIsDemonstration)
    const cart = await tx<Array<{ coupon_code: string | null }>>`select coupon_code from carts where id = ${id}`
    return priceLines(tx, await loadLines(tx, id), couponCode ?? cart[0]?.coupon_code ?? null, shippingMethodId, settings)
  })
}

async function releaseExpired(tx: Tx) {
  const expired = await tx<Array<{ id: string }>>`
    select id from orders
    where payment_status = 'pending'
      and payment_method = 'paystack'
      and payment_expires_at is not null
      and payment_expires_at < now()
      and stock_state = 'reserved'
    for update
  `
  for (const order of expired) await releaseStock(tx, order.id, "Payment window expired.")
}

async function releaseStock(tx: Tx, orderId: string, note: string) {
  const orders = await tx<Array<{ coupon_code: string | null; stock_state: string }>>`
    select coupon_code, stock_state from orders where id = ${orderId} for update
  `
  if (!orders[0] || orders[0].stock_state !== "reserved") return
  if (orders[0].coupon_code) {
    await tx`
      update coupons
      set usage_count = greatest(usage_count - 1, 0)
      where upper(code) = upper(${orders[0].coupon_code})
    `
  }
  const items = await tx<Array<{ variant_id: string | null; quantity: number }>>`
    select variant_id, quantity from order_items where order_id = ${orderId}
  `
  for (const item of items) {
    if (!item.variant_id) continue
    await tx`
      update product_variants set stock_quantity = stock_quantity + ${item.quantity}
      where id = ${item.variant_id}
    `
    await tx`
      insert into inventory_transactions (variant_id, transaction_type, quantity, reference, notes)
      values (${item.variant_id}, 'release', ${item.quantity}, ${orderId}, ${note})
    `
  }
  await tx`select set_config('app.payment_transition', 'on', true)`
  await tx`
    update orders
    set stock_state = 'released', payment_status = 'failed', fulfillment_status = 'cancelled'
    where id = ${orderId} and payment_status = 'pending'
  `
  await tx`
    insert into order_events (order_id, event_type, to_status, note)
    values (${orderId}, 'stock_released', 'failed', ${note})
  `
}

export async function placeOrder(input: {
  email: string
  firstName: string
  lastName: string
  phone: string
  country: string
  region: string
  city: string
  street: string
  postalCode?: string
  deliveryInstructions?: string
  shippingMethodId: string
  paymentMethod: "paystack" | "pay_on_delivery"
  couponCode?: string
  idempotencyKey: string
}) {
  const settings = await getSettings()
  if (!settings.commerce.acceptOrders) throw new CommerceError("The studio is not taking orders right now.")
  if (input.paymentMethod === "paystack" && !process.env.PAYSTACK_SECRET_KEY) {
    throw new CommerceError("Paystack is not configured. Choose pay on delivery, or add PAYSTACK_SECRET_KEY.")
  }
  const user = await getCurrentUser()
  const guestId = user ? null : await ensureGuestId()
  const accessToken = randomBytes(24).toString("base64url")

  const order = await withTx(async (tx) => {
    await releaseExpired(tx)
    const existing = await tx<Array<{ order_number: string; payment_method: string | null }>>`
      select order_number, payment_method from orders where idempotency_key = ${input.idempotencyKey} limit 1
    `
    if (existing[0]) {
      const full = await tx<
        Array<{ order_number: string; payment_method: string | null; customer_email: string; total_amount: string; currency: string; payment_status: string }>
      >`
        select order_number, payment_method, customer_email, total_amount::text, currency, payment_status
        from orders where idempotency_key = ${input.idempotencyKey} limit 1
      `
      const row = full[0]
      return {
        orderNumber: row.order_number,
        paymentMethod: row.payment_method,
        reused: true,
        accessToken: null as string | null,
        email: row.customer_email,
        total: row.total_amount,
        currency: row.currency,
        paymentStatus: row.payment_status,
      }
    }

    const id = await cartId(tx, { userId: user?.id ?? null, guestId }, false)
    if (!id) throw new CommerceError("Your bag is empty.")
    const locked = await tx<Array<{ variant_id: string; quantity: number }>>`
      select variant_id, quantity from cart_items where cart_id = ${id} for update
    `
    if (!locked.length) throw new CommerceError("Your bag is empty.")

    const quote = await priceLines(
      tx,
      await loadLines(tx, id),
      input.couponCode || null,
      input.shippingMethodId,
      settings,
    )
    if (!quote.lines.length) throw new CommerceError("Nothing in your bag is still available.")

    for (const line of quote.lines) {
      const updated = await tx<Array<{ id: string }>>`
        update product_variants
        set stock_quantity = stock_quantity - ${line.quantity}
        where id = ${line.variantId} and is_active and stock_quantity >= ${line.quantity}
        returning id
      `
      if (!updated.length) throw new CommerceError(`${line.name} does not have enough stock.`)
      await tx`
        insert into inventory_transactions (variant_id, transaction_type, quantity, reference, notes)
        values (${line.variantId}, 'reservation', ${-line.quantity}, ${input.idempotencyKey}, 'Reserved for checkout')
      `
    }

    if (quote.coupon) {
      const used = await tx<Array<{ code: string }>>`
        update coupons
        set usage_count = usage_count + 1
        where upper(code) = upper(${quote.coupon})
          and is_active
          and (usage_limit is null or usage_count < usage_limit)
        returning code
      `
      if (!used.length) throw new CommerceError("This coupon has reached its usage limit.")
    }

    const numbers = await tx<Array<{ next: string }>>`select nextval('order_number_seq')::text as next`
    const orderNumber = `HB-${numbers[0].next}`
    const address = {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      country: input.country,
      region: input.region,
      city: input.city,
      street: input.street,
      postalCode: input.postalCode || "",
      instructions: input.deliveryInstructions || "",
    }
    const created = await tx<Array<{ id: string }>>`
      insert into orders (
        order_number, user_id, customer_email, customer_name, customer_phone,
        subtotal, discount_amount, shipping_amount, tax_amount, total_amount, currency,
        payment_status, fulfillment_status, stock_state, shipping_address, billing_address,
        shipping_method, shipping_method_id, payment_method, coupon_code, idempotency_key,
        access_token_hash, expected_delivery, payment_expires_at
      ) values (
        ${orderNumber}, ${user?.id ?? null}, ${input.email.toLowerCase()}, ${`${input.firstName} ${input.lastName}`}, ${input.phone},
        ${quote.subtotal}, ${quote.discount}, ${quote.shipping}, ${quote.tax}, ${quote.total}, ${quote.currency},
        'pending', 'unfulfilled', 'reserved', ${getSql().json(address)}, ${getSql().json(address)},
        ${quote.shippingName}, ${input.shippingMethodId}, ${input.paymentMethod}, ${quote.coupon}, ${input.idempotencyKey},
        ${tokenPepper(accessToken)}, ${quote.shippingEta},
        ${input.paymentMethod === "paystack" ? new Date(Date.now() + 60 * 60 * 1000) : null}
      )
      returning id
    `
    for (const line of quote.lines) {
      await tx`
        insert into order_items (
          order_id, product_id, variant_id, product_name_snapshot, product_sku_snapshot,
          variant_snapshot, unit_price, quantity, line_total
        ) values (
          ${created[0].id}, ${line.productId}, ${line.variantId}, ${line.name}, ${line.sku},
          ${getSql().json({ size: line.size, color: line.color })}, ${line.unitPrice}, ${line.quantity}, ${line.lineTotal}
        )
      `
    }
    await tx`
      insert into payments (order_id, provider, amount, currency, status)
      values (${created[0].id}, ${input.paymentMethod}, ${quote.total}, ${quote.currency}, 'pending')
    `
    await tx`
      insert into order_events (order_id, event_type, to_status, note, actor_id)
      values (${created[0].id}, 'created', 'pending', 'Order placed. Payment is not confirmed.', ${user?.id ?? null})
    `
    await tx`delete from cart_items where cart_id = ${id}`
    return {
      orderNumber,
      paymentMethod: input.paymentMethod,
      reused: false,
      accessToken,
      orderId: created[0].id,
      email: input.email,
      total: quote.total,
      currency: quote.currency,
      paymentStatus: "pending",
    }
  })

  return order
}

export async function rememberOrderAccess(orderNumber: string, token: string) {
  const { cookies } = await import("next/headers")
  ;(await cookies()).set(`hb_order_${orderNumber}`, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  })
}

export async function getOrderForViewer(orderNumber: string, email?: string) {
  const user = await getCurrentUser()
  const { cookies } = await import("next/headers")
  const jar = await cookies()
  const token = jar.get(`hb_order_${orderNumber}`)?.value
  const submitted = email || jar.get("hb_track_email")?.value
  const rows = await getSql()<Array<Record<string, unknown>>>`
    select o.*, 
      coalesce((
        select json_agg(json_build_object(
          'name', product_name_snapshot,
          'sku', product_sku_snapshot,
          'variant', variant_snapshot,
          'unitPrice', unit_price::text,
          'quantity', quantity,
          'lineTotal', line_total::text
        ))
        from order_items where order_id = o.id
      ), '[]'::json) as items,
      coalesce((
        select json_agg(json_build_object(
          'carrier', carrier,
          'tracking', tracking_number,
          'notes', notes,
          'shippedAt', shipped_at
        ) order by created_at)
        from shipments where order_id = o.id
      ), '[]'::json) as shipments
    from orders o
    where o.order_number = ${orderNumber}
    limit 1
  `
  const order = rows[0] as {
    id: string
    user_id: string | null
    customer_email: string
    access_token_hash: string | null
    order_number: string
  } | undefined
  if (!order) return null
  const owns =
    (user && order.user_id === user.id) ||
    (submitted && submitted.toLowerCase() === order.customer_email) ||
    (token && order.access_token_hash === tokenPepper(token))
  if (!owns) return null
  return rows[0]
}

export async function applyVerifiedPayment(reference: string, amountPesewas: number, currency: string) {
  return withTx(async (tx) => {
    await tx`select set_config('app.payment_transition', 'on', true)`
    const payments = await tx<Array<{ id: string; order_id: string; status: string }>>`
      select id, order_id, status from payments
      where provider = 'paystack' and provider_reference = ${reference}
      for update
    `
    const payment = payments[0]
    if (!payment) throw new CommerceError("Payment reference was not found.")
    const orders = await tx<Array<{ id: string; payment_status: string; total_amount: string; currency: string; stock_state: string }>>`
      select id, payment_status, total_amount::text, currency, stock_state from orders where id = ${payment.order_id} for update
    `
    const order = orders[0]
    if (!order) throw new CommerceError("Order was not found.")
    if (order.payment_status === "paid") return { already: true, orderId: order.id }
    if (toPesewas(order.total_amount) !== amountPesewas || order.currency !== currency) {
      throw new CommerceError("The verified amount does not match the order.")
    }
    await tx`
      update payments set status = 'success', verified_at = now() where id = ${payment.id}
    `
    await tx`
      update orders set payment_status = 'paid', stock_state = 'committed' where id = ${order.id}
    `
    await tx`
      insert into order_events (order_id, event_type, from_status, to_status, note)
      values (${order.id}, 'payment_verified', 'pending', 'paid', ${`Paystack reference ${reference}`})
    `
    return { already: false, orderId: order.id }
  })
}

export async function attachPaystackReference(orderNumber: string, reference: string) {
  await withTx(async (tx) => {
    const orders = await tx<Array<{ id: string; total_amount: string; currency: string }>>`
      select id, total_amount::text, currency from orders where order_number = ${orderNumber} limit 1
    `
    if (!orders[0]) throw new CommerceError("Order was not found.")
    await tx`
      update payments
      set provider = 'paystack', provider_reference = ${reference}, amount = ${orders[0].total_amount}, currency = ${orders[0].currency}
      where order_id = ${orders[0].id} and status = 'pending'
    `
  })
}

export { releaseExpired, releaseStock }
