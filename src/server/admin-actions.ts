"use server"

import { revalidatePath } from "next/cache"
import { unlink } from "node:fs/promises"
import path from "node:path"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { releaseStock } from "@/lib/commerce"
import { getSql, withTx } from "@/lib/db"
import { CommerceError, publicError } from "@/lib/errors"
import { toPesewas } from "@/lib/money"
import { refundPaystack } from "@/lib/payments/paystack"
import { getSettings } from "@/lib/settings"
import { slugify } from "@/lib/utils"
import { couponSchema } from "@/lib/validators"

function refresh() {
  revalidatePath("/", "layout")
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true"
}

export async function saveProductAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  try {
    const actor = await requireAdmin()
    const name = String(formData.get("name") ?? "").trim()
    const slug = slugify(String(formData.get("slug") ?? name))
    const sku = String(formData.get("sku") ?? "").trim()
    const categoryId = String(formData.get("categoryId") ?? "")
    const status = String(formData.get("status") ?? "draft")
    const basePrice = String(formData.get("basePrice") ?? "").trim()
    const compareAt = String(formData.get("compareAt") ?? "").trim()
    if (!name || !slug || !sku || !categoryId) return { error: "Name, slug, SKU and category are required." }
    if (!["draft", "active", "archived"].includes(status)) return { error: "Choose a valid status." }
    if (!/^\d+(\.\d{1,2})?$/.test(basePrice)) return { error: "Enter a price in cedis, such as 240.00." }
    const images = JSON.parse(String(formData.get("images") || "[]")) as Array<{ url: string; alt: string; primary?: boolean }>
    if (!Array.isArray(images) || images.some((image) => !image.url || !image.alt?.trim())) {
      return { error: "Every image needs a file and alt text." }
    }
    const variantLines = String(formData.get("variants") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    const variants = variantLines.map((line) => {
      const [variantSku, size, color, colorCode, stock, low] = line.split("|").map((part) => part.trim())
      const quantity = Number(stock)
      const threshold = Number(low || "2")
      if (!size || !color || !Number.isInteger(quantity) || quantity < 0) {
        throw new CommerceError("Each variant line is SKU|size|color|hex|stock|threshold.")
      }
      return {
        sku: variantSku || `${sku}-${size}`,
        size,
        color,
        colorCode: colorCode || null,
        stock: quantity,
        low: Number.isInteger(threshold) && threshold >= 0 ? threshold : 2,
      }
    })
    const collectionIds = formData.getAll("collectionId").map(String).filter(Boolean)
    const id = String(formData.get("id") ?? "")

    const saved = await withTx(async (tx) => {
      let productId = id
      if (productId) {
        const current = await tx<Array<{ slug: string }>>`select slug from products where id = ${productId}`
        if (!current[0]) throw new CommerceError("That product was not found.")
        if (current[0].slug !== slug) {
          await tx`
            insert into redirects (from_path, to_path)
            values (${`/products/${current[0].slug}`}, ${`/products/${slug}`})
            on conflict (from_path) do update set to_path = excluded.to_path
          `
        }
        await tx`
          update products set
            name = ${name}, slug = ${slug}, short_description = ${String(formData.get("short") ?? "")},
            description = ${String(formData.get("description") ?? "")}, details = ${String(formData.get("details") ?? "")},
            materials = ${String(formData.get("materials") ?? "")}, care_instructions = ${String(formData.get("care") ?? "")},
            fit_notes = ${String(formData.get("fit") ?? "")}, base_price = ${basePrice},
            compare_at_price = ${compareAt || null}, sku = ${sku}, category_id = ${categoryId}, status = ${status},
            featured = ${checked(formData, "featured")}, is_new = ${checked(formData, "isNew")},
            is_limited_edition = ${checked(formData, "limited")}, sample_data = ${checked(formData, "sampleData")},
            seo_title = ${String(formData.get("seoTitle") ?? "") || null},
            seo_description = ${String(formData.get("seoDescription") ?? "") || null}
          where id = ${productId}
        `
      } else {
        const created = await tx<Array<{ id: string }>>`
          insert into products (
            name, slug, short_description, description, details, materials, care_instructions, fit_notes,
            base_price, compare_at_price, sku, category_id, status, featured, is_new, is_limited_edition,
            sample_data, seo_title, seo_description
          ) values (
            ${name}, ${slug}, ${String(formData.get("short") ?? "")}, ${String(formData.get("description") ?? "")},
            ${String(formData.get("details") ?? "")}, ${String(formData.get("materials") ?? "")},
            ${String(formData.get("care") ?? "")}, ${String(formData.get("fit") ?? "")}, ${basePrice}, ${compareAt || null},
            ${sku}, ${categoryId}, ${status}, ${checked(formData, "featured")}, ${checked(formData, "isNew")},
            ${checked(formData, "limited")}, ${checked(formData, "sampleData")},
            ${String(formData.get("seoTitle") ?? "") || null}, ${String(formData.get("seoDescription") ?? "") || null}
          ) returning id
        `
        productId = created[0].id
      }

      await tx`delete from product_images where product_id = ${productId}`
      for (const [index, image] of images.entries()) {
        await tx`
          insert into product_images (product_id, image_url, alt_text, display_order, is_primary)
          values (${productId}, ${image.url}, ${image.alt.trim()}, ${index}, ${index === 0 || Boolean(image.primary)})
        `
      }
      const existing = await tx<Array<{ id: string; sku: string; stock_quantity: number }>>`
        select id, sku, stock_quantity from product_variants where product_id = ${productId}
      `
      const seen = new Set<string>()
      for (const variant of variants) {
        seen.add(variant.sku)
        const match = existing.find((row) => row.sku === variant.sku)
        if (match) {
          const delta = variant.stock - match.stock_quantity
          await tx`
            update product_variants set
              size = ${variant.size}, color = ${variant.color}, color_code = ${variant.colorCode},
              stock_quantity = ${variant.stock}, low_stock_threshold = ${variant.low}, is_active = true
            where id = ${match.id}
          `
          if (delta !== 0) {
            await tx`
              insert into inventory_transactions (variant_id, transaction_type, quantity, reference, notes, actor_id)
              values (${match.id}, 'adjustment', ${delta}, ${productId}, 'Stock edited in admin', ${actor.id})
            `
          }
        } else {
          const created = await tx<Array<{ id: string }>>`
            insert into product_variants (product_id, sku, size, color, color_code, stock_quantity, low_stock_threshold, is_active)
            values (${productId}, ${variant.sku}, ${variant.size}, ${variant.color}, ${variant.colorCode}, ${variant.stock}, ${variant.low}, true)
            returning id
          `
          await tx`
            insert into inventory_transactions (variant_id, transaction_type, quantity, reference, notes, actor_id)
            values (${created[0].id}, 'adjustment', ${variant.stock}, ${productId}, 'Variant opened in admin', ${actor.id})
          `
        }
      }
      for (const row of existing) {
        if (!seen.has(row.sku)) {
          await tx`update product_variants set is_active = false where id = ${row.id}`
        }
      }
      await tx`delete from collection_products where product_id = ${productId}`
      for (const [index, collectionId] of collectionIds.entries()) {
        await tx`
          insert into collection_products (collection_id, product_id, display_order)
          values (${collectionId}, ${productId}, ${index})
          on conflict do nothing
        `
      }
      return productId
    })
    refresh()
    redirect(`/admin/products/${saved}`)
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error
    return { error: publicError(error) }
  }
}

export async function archiveProductAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get("id") ?? "")
  await getSql()`update products set status = 'archived' where id = ${id}`
  refresh()
  redirect("/admin/products")
}

export async function saveCategoryAction(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get("name") ?? "").trim()
  const slug = slugify(String(formData.get("slug") ?? name))
  const description = String(formData.get("description") ?? "")
  const order = Number(formData.get("displayOrder") || 0)
  const id = String(formData.get("id") ?? "")
  if (!name || !slug) return
  if (id) {
    await getSql()`
      update categories set name = ${name}, slug = ${slug}, description = ${description},
        display_order = ${order}, is_active = ${checked(formData, "active")}
      where id = ${id}
    `
  } else {
    await getSql()`
      insert into categories (name, slug, description, display_order, is_active)
      values (${name}, ${slug}, ${description}, ${order}, ${checked(formData, "active")})
    `
  }
  refresh()
}

export async function saveCollectionAction(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get("name") ?? "").trim()
  const slug = slugify(String(formData.get("slug") ?? name))
  const id = String(formData.get("id") ?? "")
  const image = String(formData.get("image") ?? "") || null
  const description = String(formData.get("description") ?? "")
  if (!name || !slug) return
  if (id) {
    await getSql()`
      update collections set name = ${name}, slug = ${slug}, description = ${description}, image_url = ${image},
        is_active = ${checked(formData, "active")}, is_featured = ${checked(formData, "featured")}
      where id = ${id}
    `
  } else {
    await getSql()`
      insert into collections (name, slug, description, image_url, is_active, is_featured)
      values (${name}, ${slug}, ${description}, ${image}, ${checked(formData, "active")}, ${checked(formData, "featured")})
    `
  }
  refresh()
}

export async function saveCouponAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin()
    const parsed = couponSchema.parse({
      code: formData.get("code"),
      description: formData.get("description") ?? "",
      discountType: formData.get("discountType"),
      discountValue: formData.get("discountValue"),
      minimumOrderAmount: formData.get("minimumOrderAmount") || 0,
      isActive: checked(formData, "isActive"),
    })
    if (parsed.discountType === "percentage" && parsed.discountValue > 100) {
      return { error: "A percentage coupon cannot exceed 100." }
    }
    const id = String(formData.get("id") ?? "")
    if (id) {
      await getSql()`
        update coupons set code = ${parsed.code}, description = ${parsed.description ?? ""},
          discount_type = ${parsed.discountType}, discount_value = ${parsed.discountValue},
          minimum_order_amount = ${parsed.minimumOrderAmount}, is_active = ${parsed.isActive}
        where id = ${id}
      `
    } else {
      await getSql()`
        insert into coupons (code, description, discount_type, discount_value, minimum_order_amount, is_active)
        values (${parsed.code}, ${parsed.description ?? ""}, ${parsed.discountType}, ${parsed.discountValue}, ${parsed.minimumOrderAmount}, ${parsed.isActive})
      `
    }
    refresh()
    return {}
  } catch (error) {
    return { error: publicError(error) }
  }
}

export async function saveDiscountAction(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get("name") ?? "").trim()
  const discountType = String(formData.get("discountType") ?? "percentage")
  const discountValue = Number(formData.get("discountValue"))
  const minimum = Number(formData.get("minimumOrderAmount") || 0)
  if (!name || !Number.isFinite(discountValue) || discountValue <= 0) return
  if (discountType === "percentage" && discountValue > 100) return
  const id = String(formData.get("id") ?? "")
  if (id) {
    await getSql()`
      update automatic_discounts set name = ${name}, discount_type = ${discountType}, discount_value = ${discountValue},
        minimum_order_amount = ${minimum}, is_active = ${checked(formData, "isActive")}
      where id = ${id}
    `
  } else {
    await getSql()`
      insert into automatic_discounts (name, discount_type, discount_value, minimum_order_amount, is_active)
      values (${name}, ${discountType}, ${discountValue}, ${minimum}, ${checked(formData, "isActive")})
    `
  }
  refresh()
}

export async function fulfillmentAction(formData: FormData) {
  const actor = await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const status = String(formData.get("status") ?? "")
  const note = String(formData.get("note") ?? "")
  if (!["unfulfilled", "processing", "shipped", "delivered", "cancelled"].includes(status)) return
  await withTx(async (tx) => {
    const rows = await tx<Array<{ payment_status: string; stock_state: string }>>`
      select payment_status, stock_state from orders where id = ${id} for update
    `
    const order = rows[0]
    if (!order) throw new CommerceError("Order was not found.")
    if (status === "cancelled" && order.payment_status === "pending" && order.stock_state === "reserved") {
      await releaseStock(tx, id, note || "Cancelled by staff.")
    } else {
      await tx`update orders set fulfillment_status = ${status} where id = ${id}`
    }
    await tx`
      insert into order_events (order_id, event_type, to_status, note, actor_id)
      values (${id}, 'fulfillment', ${status}, ${note || "Fulfillment updated."}, ${actor.id})
    `
  })
  refresh()
}

export async function shipmentAction(formData: FormData) {
  const actor = await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const carrier = String(formData.get("carrier") ?? "").trim()
  const tracking = String(formData.get("tracking") ?? "").trim()
  const notes = String(formData.get("notes") ?? "")
  if (!carrier || !tracking) return
  await withTx(async (tx) => {
    await tx`
      insert into shipments (order_id, carrier, tracking_number, notes, shipped_at)
      values (${id}, ${carrier}, ${tracking}, ${notes}, now())
    `
    await tx`update orders set fulfillment_status = 'shipped' where id = ${id} and fulfillment_status in ('unfulfilled', 'processing')`
    await tx`
      insert into order_events (order_id, event_type, to_status, note, actor_id)
      values (${id}, 'shipped', 'shipped', ${`${carrier} ${tracking}`}, ${actor.id})
    `
  })
  refresh()
}

export async function confirmDeliveryPaymentAction(formData: FormData) {
  const actor = await requireAdmin()
  const id = String(formData.get("id") ?? "")
  await withTx(
    async (tx) => {
      const rows = await tx<Array<{ payment_method: string | null; payment_status: string; stock_state: string }>>`
        select payment_method, payment_status, stock_state from orders where id = ${id} for update
      `
      const order = rows[0]
      if (!order) throw new CommerceError("Order was not found.")
      if (order.payment_method !== "pay_on_delivery" || order.payment_status !== "pending") {
        throw new CommerceError("Only a pending pay-on-delivery order can be confirmed here.")
      }
      await tx`update orders set payment_status = 'paid', stock_state = 'committed' where id = ${id}`
      await tx`update payments set status = 'success', verified_at = now() where order_id = ${id} and status = 'pending'`
      await tx`
        insert into order_events (order_id, event_type, from_status, to_status, note, actor_id)
        values (${id}, 'delivery_payment', 'pending', 'paid', 'Staff confirmed pay on delivery.', ${actor.id})
      `
    },
    { "app.payment_transition": "on" },
  )
  refresh()
}

export async function refundAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  try {
    const actor = await requireAdmin()
    const id = String(formData.get("id") ?? "")
    const amount = String(formData.get("amount") ?? "").trim()
    const reason = String(formData.get("reason") ?? "").trim()
    const method = String(formData.get("method") ?? "manual")
    const returnStock = checked(formData, "returnStock")
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || toPesewas(amount) <= 0) return { error: "Enter a refund amount." }
    if (reason.length < 3) return { error: "Add a reason." }
    await withTx(
      async (tx) => {
        const orders = await tx<
          Array<{ total_amount: string; currency: string; payment_status: string; stock_state: string; payment_method: string | null }>
        >`
          select total_amount::text, currency, payment_status, stock_state, payment_method
          from orders where id = ${id} for update
        `
        const order = orders[0]
        if (!order || order.payment_status === "pending" || order.payment_status === "failed") {
          throw new CommerceError("Refund a paid order only.")
        }
        const payments = await tx<Array<{ id: string; provider_reference: string | null }>>`
          select id, provider_reference from payments where order_id = ${id} and status = 'success' limit 1
        `
        let providerReference: string | null = null
        const status = "succeeded" as const
        if (method === "provider") {
          if (!payments[0]?.provider_reference) throw new CommerceError("This order has no Paystack reference to refund.")
          providerReference = await refundPaystack(payments[0].provider_reference, toPesewas(amount))
        }
        await tx`
          insert into refunds (order_id, payment_id, amount, currency, status, provider_reference, reason, method)
          values (${id}, ${payments[0]?.id ?? null}, ${amount}, ${order.currency}, ${status}, ${providerReference}, ${reason}, ${method === "provider" ? "provider" : "manual"})
        `
        const refunded = await tx<Array<{ total: string }>>`
          select coalesce(sum(amount), 0)::text as total from refunds where order_id = ${id} and status = 'succeeded'
        `
        const next = toPesewas(refunded[0]?.total ?? "0") >= toPesewas(order.total_amount) ? "refunded" : "partially_refunded"
        await tx`update orders set payment_status = ${next} where id = ${id}`
        if (returnStock && order.stock_state === "committed") {
          const items = await tx<Array<{ variant_id: string | null; quantity: number }>>`
            select variant_id, quantity from order_items where order_id = ${id}
          `
          for (const item of items) {
            if (!item.variant_id) continue
            await tx`update product_variants set stock_quantity = stock_quantity + ${item.quantity} where id = ${item.variant_id}`
            await tx`
              insert into inventory_transactions (variant_id, transaction_type, quantity, reference, notes, actor_id)
              values (${item.variant_id}, 'return', ${item.quantity}, ${id}, ${reason}, ${actor.id})
            `
          }
          await tx`update orders set stock_state = 'released' where id = ${id}`
        }
        await tx`
          insert into order_events (order_id, event_type, to_status, note, actor_id)
          values (${id}, 'refund', ${next}, ${reason}, ${actor.id})
        `
      },
      { "app.payment_transition": "on" },
    )
    refresh()
    return {}
  } catch (error) {
    return { error: publicError(error) }
  }
}

export async function adjustStockAction(formData: FormData) {
  const actor = await requireAdmin()
  const variantId = String(formData.get("variantId") ?? "")
  const delta = Number(formData.get("delta"))
  const notes = String(formData.get("notes") ?? "").trim() || "Manual adjustment"
  if (!Number.isInteger(delta) || delta === 0) return
  await withTx(async (tx) => {
    const rows = await tx<Array<{ stock_quantity: number }>>`
      select stock_quantity from product_variants where id = ${variantId} for update
    `
    if (!rows[0]) throw new CommerceError("Variant was not found.")
    if (rows[0].stock_quantity + delta < 0) throw new CommerceError("Stock cannot go below zero.")
    await tx`update product_variants set stock_quantity = stock_quantity + ${delta} where id = ${variantId}`
    await tx`
      insert into inventory_transactions (variant_id, transaction_type, quantity, notes, actor_id)
      values (${variantId}, 'adjustment', ${delta}, ${notes}, ${actor.id})
    `
  })
  refresh()
}

export async function reviewModerationAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const decision = String(formData.get("decision") ?? "")
  if (decision === "approve") await getSql()`update reviews set is_approved = true where id = ${id}`
  if (decision === "reject") await getSql()`delete from reviews where id = ${id}`
  refresh()
}

export async function newsletterStatusAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const status = String(formData.get("status") ?? "")
  if (status !== "subscribed" && status !== "unsubscribed") return
  await getSql()`
    update newsletter_subscribers
    set status = ${status}, unsubscribed_at = case when ${status} = 'unsubscribed' then now() else null end
    where id = ${id}
  `
  refresh()
}

export async function roleAction(formData: FormData) {
  const actor = await requireAdmin()
  if (actor.role !== "super_admin") return
  const userId = String(formData.get("userId") ?? "")
  const role = String(formData.get("role") ?? "")
  if (!["customer", "admin", "super_admin"].includes(role)) return
  if (userId === actor.id && role !== "super_admin") return
  await withTx(
    async (tx) => {
      await tx`delete from user_roles where user_id = ${userId}`
      await tx`insert into user_roles (user_id, role) values (${userId}, ${role})`
    },
    { "app.role_admin": "super_admin" },
  )
  refresh()
}

export async function revokeSessionsAction(formData: FormData) {
  await requireAdmin()
  const userId = String(formData.get("userId") ?? "")
  await getSql()`delete from sessions where user_id = ${userId}`
  refresh()
}

export async function saveContentAction(formData: FormData) {
  await requireAdmin()
  const brand = {
    name: String(formData.get("brandName") ?? ""),
    legalName: String(formData.get("legalName") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    description: String(formData.get("description") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    logoText: String(formData.get("logoText") ?? ""),
    currency: "GHS",
  }
  const announcement = {
    enabled: checked(formData, "announcementEnabled"),
    text: String(formData.get("announcement") ?? ""),
    link: String(formData.get("announcementLink") ?? "/new-arrivals"),
  }
  const hero = {
    headline: String(formData.get("headline") ?? ""),
    supporting: String(formData.get("supporting") ?? ""),
    primaryCta: String(formData.get("primaryCta") ?? ""),
    primaryHref: String(formData.get("primaryHref") ?? "/shop"),
    secondaryCta: String(formData.get("secondaryCta") ?? ""),
    secondaryHref: String(formData.get("secondaryHref") ?? "/about"),
    image: String(formData.get("heroImage") ?? ""),
    imageAlt: String(formData.get("heroAlt") ?? ""),
  }
  const story = {
    heading: String(formData.get("storyHeading") ?? ""),
    body: String(formData.get("storyBody") ?? ""),
    image: String(formData.get("storyImage") ?? ""),
    imageAlt: String(formData.get("storyAlt") ?? ""),
  }
  const current = await getSettings()
  const promo = {
    ...current.promo,
    title: String(formData.get("promoTitle") ?? current.promo.title),
    body: String(formData.get("promoBody") ?? current.promo.body),
    message: String(formData.get("promoMessage") ?? current.promo.message),
    cta: String(formData.get("promoCta") ?? current.promo.cta),
    href: String(formData.get("promoHref") ?? current.promo.href),
  }
  const newsletter = {
    heading: String(formData.get("newsletterHeading") ?? current.newsletter.heading),
    body: String(formData.get("newsletterBody") ?? current.newsletter.body),
  }
  const pages = structuredClone(current.pages)
  for (const key of Object.keys(pages) as Array<keyof typeof pages>) {
    const title = formData.get(`${key}-title`)
    if (typeof title === "string" && title.trim()) pages[key].title = title.trim()
    pages[key].sections = pages[key].sections.map((section, index) => ({
      heading: String(formData.get(`${key}-${index}-heading`) ?? section.heading),
      body: String(formData.get(`${key}-${index}-body`) ?? section.body),
    }))
  }
  const sql = getSql()
  const entries = [
    ["brand", brand],
    ["announcement", announcement],
    ["hero", hero],
    ["story", story],
    ["promo", promo],
    ["newsletter", newsletter],
    ["pages", pages],
  ] as const
  for (const [key, value] of entries) {
    await sql`
      insert into site_settings (key, value) values (${key}, ${sql.json(value)})
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `
  }
  refresh()
  redirect("/admin/content")
}

export async function saveSettingsAction(formData: FormData) {
  await requireAdmin()
  const threshold = String(formData.get("freeShippingThreshold") ?? "").trim()
  const commerce = {
    currency: "GHS",
    taxRatePercent: Number(formData.get("taxRatePercent") || 0),
    pricesAreSamples: checked(formData, "pricesAreSamples"),
    inventoryIsDemonstration: checked(formData, "inventoryIsDemonstration"),
    freeShippingThreshold: threshold === "" ? null : Number(threshold),
    acceptOrders: checked(formData, "acceptOrders"),
  }
  const sql = getSql()
  await sql`
    insert into site_settings (key, value) values ('commerce', ${sql.json(commerce)})
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `
  const ids = formData.getAll("shippingId").map(String)
  for (const id of ids) {
    const amount = String(formData.get(`amount-${id}`) ?? "0")
    await sql`
      update shipping_methods set
        name = ${String(formData.get(`name-${id}`) ?? "")},
        description = ${String(formData.get(`description-${id}`) ?? "")},
        amount = ${amount},
        eta = ${String(formData.get(`eta-${id}`) ?? "")},
        is_active = ${formData.get(`active-${id}`) === "on"},
        eligible_for_free_shipping = ${formData.get(`free-${id}`) === "on"}
      where id = ${id}
    `
  }
  refresh()
  redirect("/admin/settings")
}

export async function removeUpload(url: string) {
  await requireAdmin()
  if (!url.startsWith("/uploads/")) return
  const file = path.basename(url)
  await unlink(path.join(process.cwd(), "public", "uploads", file)).catch(() => undefined)
}
