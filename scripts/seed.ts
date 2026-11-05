import { config } from "dotenv"
import bcrypt from "bcryptjs"
import postgres from "postgres"
import { contentDefaults } from "../src/lib/content-defaults"

config({ path: ".env.local" })
config({ path: ".env" })

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing.")
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} })

async function main() {

const category = {
  oversized: "a0000000-0000-4000-8000-000000000001",
  graphic: "a0000000-0000-4000-8000-000000000002",
  sweatshirts: "a0000000-0000-4000-8000-000000000003",
  hoodies: "a0000000-0000-4000-8000-000000000004",
  jackets: "a0000000-0000-4000-8000-000000000005",
  sweatpants: "a0000000-0000-4000-8000-000000000006",
  trousers: "a0000000-0000-4000-8000-000000000007",
  caps: "a0000000-0000-4000-8000-000000000008",
  snapbacks: "a0000000-0000-4000-8000-000000000009",
  beanies: "a0000000-0000-4000-8000-00000000000a",
  accessories: "a0000000-0000-4000-8000-00000000000b",
}

const collection = {
  essentials: "c0000000-0000-4000-8000-000000000001",
  graphic: "c0000000-0000-4000-8000-000000000002",
  headwear: "c0000000-0000-4000-8000-000000000003",
  outerwear: "c0000000-0000-4000-8000-000000000004",
  limited: "c0000000-0000-4000-8000-000000000005",
  everyday: "c0000000-0000-4000-8000-000000000006",
}

const product = {
  sweat: "e0000000-0000-4000-8000-000000000001",
  cap: "e0000000-0000-4000-8000-000000000002",
  beanie: "e0000000-0000-4000-8000-000000000003",
  script: "e0000000-0000-4000-8000-000000000004",
  black: "e0000000-0000-4000-8000-000000000005",
  white: "e0000000-0000-4000-8000-000000000006",
}

const unconfirmed = "Not confirmed. Update this in admin before treating it as a specification."

await sql.begin(async (tx) => {
  await tx`select set_config('app.role_admin', 'super_admin', true)`
  await tx`select set_config('app.allow_customer_role', 'on', true)`

  const categories = [
    [category.oversized, "Oversized T-shirts", "oversized-t-shirts", "Boxy tees with room through the body.", 1],
    [category.graphic, "Graphic T-shirts", "graphic-t-shirts", "Expressive graphic tees.", 2],
    [category.sweatshirts, "Sweatshirts", "sweatshirts", "Crewnecks and heavier layers.", 3],
    [category.hoodies, "Hoodies", "hoodies", "Hooded layers.", 4],
    [category.jackets, "Jackets", "jackets", "Outer layers.", 5],
    [category.sweatpants, "Sweatpants", "sweatpants", "Relaxed bottoms.", 6],
    [category.trousers, "Streetwear trousers", "streetwear-trousers", "Tailored street trousers.", 7],
    [category.caps, "Caps", "caps", "Caps and fitted headwear.", 8],
    [category.snapbacks, "Snapbacks", "snapbacks", "Structured snapback caps.", 9],
    [category.beanies, "Beanies", "beanies", "Knit beanies.", 10],
    [category.accessories, "Accessories", "accessories", "Small goods.", 11],
  ] as const
  for (const [id, name, slug, description, order] of categories) {
    await tx`
      insert into categories (id, name, slug, description, display_order, is_active)
      values (${id}, ${name}, ${slug}, ${description}, ${order}, true)
      on conflict (id) do nothing
    `
  }

  const collections = [
    [collection.essentials, "The Essentials", "the-essentials", "Pieces for every day.", "/products/monogram-white.webp", 1],
    [collection.graphic, "Graphic Culture", "graphic-culture", "Marks, script and monograms.", "/products/script-tee.webp", 2],
    [collection.headwear, "Headwear", "headwear", "Caps and beanies.", "/products/court-cap.jpg", 3],
    [collection.outerwear, "Outerwear", "outerwear", "Sweatshirts and layers.", "/products/collective-sweat.jpg", 4],
    [collection.limited, "The Limited Drop", "the-limited-drop", "A short edit.", "/products/court-cap-side.jpg", 5],
    [collection.everyday, "Everyday Uniform", "everyday-uniform", "What you reach for first.", "/products/beanie.jpg", 6],
  ] as const
  for (const [id, name, slug, description, image, order] of collections) {
    await tx`
      insert into collections (id, name, slug, description, image_url, display_order, is_featured, is_active)
      values (${id}, ${name}, ${slug}, ${description}, ${image}, ${order}, true, true)
      on conflict (id) do nothing
    `
  }

  const products = [
    {
      id: product.sweat,
      name: "MadeHero Collective Sweatshirt",
      slug: "madehero-collective-sweatshirt",
      category: category.sweatshirts,
      price: "420.00",
      compare: "480.00",
      sku: "HB-SW-001",
      featured: true,
      isNew: true,
      limited: true,
      short: "Heather grey crewneck with the collective mark across the back.",
      images: [
        ["/products/collective-sweat.jpg", "Back of a heather grey sweatshirt with the MadeHero Collective graphic.", true],
        ["/products/crest-sweat.jpg", "Front of a heather grey sweatshirt with a small chest crest.", false],
      ],
      color: "Heather grey",
      code: "#C8C8C6",
      sizes: ["S", "M", "L", "XL"],
    },
    {
      id: product.cap,
      name: "Branded Snapback Cap",
      slug: "branded-snapback-cap",
      category: category.snapbacks,
      price: "180.00",
      compare: null,
      sku: "HB-CAP-001",
      featured: true,
      isNew: true,
      limited: true,
      short: "Structured snapback in forest green with an orange brim and monogram.",
      images: [
        ["/products/court-cap.jpg", "Forest green snapback with an orange brim and monogram.", true],
        ["/products/court-cap-side.jpg", "Side view of the forest green and orange snapback.", false],
      ],
      color: "Forest / Orange",
      code: "#0E6B3C",
      sizes: ["OS"],
    },
    {
      id: product.beanie,
      name: "Black Branded Beanie",
      slug: "black-branded-beanie",
      category: category.beanies,
      price: "120.00",
      compare: null,
      sku: "HB-BNE-001",
      featured: false,
      isNew: true,
      limited: false,
      short: "Black knit beanie with a white wordmark on the cuff.",
      images: [["/products/beanie.jpg", "Black beanie with a white MadeHero wordmark.", true]],
      color: "Black",
      code: "#111111",
      sizes: ["OS"],
    },
    {
      id: product.script,
      name: "Graphic Script T-shirt",
      slug: "graphic-script-t-shirt",
      category: category.graphic,
      price: "220.00",
      compare: null,
      sku: "HB-TEE-001",
      featured: true,
      isNew: true,
      limited: false,
      short: "Black tee with a white script graphic across the chest.",
      images: [["/products/script-tee.webp", "Black t-shirt with a white script graphic.", true]],
      color: "Black",
      code: "#111111",
      sizes: ["S", "M", "L", "XL"],
    },
    {
      id: product.black,
      name: "Monogram T-shirt — Black",
      slug: "monogram-t-shirt-black",
      category: category.oversized,
      price: "240.00",
      compare: null,
      sku: "HB-TEE-002",
      featured: true,
      isNew: true,
      limited: false,
      short: "Black oversized tee with a large monogram on the back.",
      images: [["/products/monogram-black.webp", "Black oversized t-shirt with a white monogram.", true]],
      color: "Black",
      code: "#111111",
      sizes: ["S", "M", "L", "XL"],
    },
    {
      id: product.white,
      name: "Monogram T-shirt — White",
      slug: "monogram-t-shirt-white",
      category: category.oversized,
      price: "240.00",
      compare: null,
      sku: "HB-TEE-003",
      featured: false,
      isNew: true,
      limited: false,
      short: "White oversized tee with a large monogram on the back.",
      images: [["/products/monogram-white.webp", "White oversized t-shirt with a black monogram.", true]],
      color: "White",
      code: "#F4F4F2",
      sizes: ["S", "M", "L", "XL"],
    },
  ]

  let imageCounter = 1
  let variantCounter = 1
  for (const item of products) {
    await tx`
      insert into products (
        id, name, slug, short_description, description, details, materials, care_instructions, fit_notes,
        base_price, compare_at_price, sku, category_id, status, featured, is_new, is_limited_edition,
        sample_data, seo_title, seo_description
      ) values (
        ${item.id}, ${item.name}, ${item.slug}, ${item.short},
        ${`${item.short} Shown as supplied in the Hood Boyz edit.`},
        ${unconfirmed}, ${unconfirmed}, ${unconfirmed},
        ${"Photographed as an oversized or one-size piece. Exact measurements have not been supplied."},
        ${item.price}, ${item.compare}, ${item.sku}, ${item.category}, 'active',
        ${item.featured}, ${item.isNew}, ${item.limited}, true,
        ${item.name}, ${item.short}
      )
      on conflict (id) do nothing
    `
    for (const [index, image] of item.images.entries()) {
      const imageId = `10000000-0000-4000-8000-${String(imageCounter).padStart(12, "0")}`
      imageCounter += 1
      await tx`
        insert into product_images (id, product_id, image_url, alt_text, display_order, is_primary)
        values (${imageId}, ${item.id}, ${image[0]}, ${image[1]}, ${index}, ${image[2]})
        on conflict (id) do nothing
      `
    }
    for (const size of item.sizes) {
      const variantId = `20000000-0000-4000-8000-${String(variantCounter).padStart(12, "0")}`
      variantCounter += 1
      await tx`
        insert into product_variants (
          id, product_id, sku, size, color, color_code, stock_quantity, low_stock_threshold, is_active
        ) values (
          ${variantId}, ${item.id}, ${`${item.sku}-${size}`}, ${size}, ${item.color}, ${item.code}, 8, 2, true
        )
        on conflict (id) do nothing
      `
      await tx`
        insert into inventory_transactions (variant_id, transaction_type, quantity, reference, notes)
        select ${variantId}, 'adjustment', 8, 'seed', 'Demonstration opening stock. Not confirmed live inventory.'
        where not exists (
          select 1 from inventory_transactions
          where variant_id = ${variantId} and reference = 'seed'
        )
      `
    }
  }

  const links: Array<[string, string, number]> = [
    [collection.essentials, product.sweat, 1],
    [collection.essentials, product.black, 2],
    [collection.essentials, product.white, 3],
    [collection.essentials, product.script, 4],
    [collection.graphic, product.script, 1],
    [collection.graphic, product.black, 2],
    [collection.graphic, product.white, 3],
    [collection.graphic, product.sweat, 4],
    [collection.headwear, product.cap, 1],
    [collection.headwear, product.beanie, 2],
    [collection.outerwear, product.sweat, 1],
    [collection.limited, product.sweat, 1],
    [collection.limited, product.cap, 2],
    [collection.everyday, product.black, 1],
    [collection.everyday, product.white, 2],
    [collection.everyday, product.beanie, 3],
  ]
  for (const [collectionId, productId, order] of links) {
    await tx`
      insert into collection_products (collection_id, product_id, display_order)
      values (${collectionId}, ${productId}, ${order})
      on conflict do nothing
    `
  }

  await tx`
    insert into shipping_methods (id, name, description, amount, eta, is_active, display_order, eligible_for_free_shipping)
    values
      ('f0000000-0000-4000-8000-000000000001', 'Standard delivery', 'Sample fee for Ghana delivery.', 35, '3–5 business days', true, 1, true),
      ('f0000000-0000-4000-8000-000000000002', 'Express delivery', 'Sample fee for a faster delivery.', 65, '1–2 business days', true, 2, false),
      ('f0000000-0000-4000-8000-000000000003', 'Accra pickup', 'Collect in Accra when the studio confirms the address.', 0, 'Ready when notified', true, 3, false)
    on conflict (id) do nothing
  `

  await tx`
    insert into coupons (
      id, code, description, discount_type, discount_value, minimum_order_amount, usage_limit, is_active
    ) values (
      'd0000000-0000-4000-8000-000000000001', 'HOOD10',
      'Demonstration coupon. Disable it before launch.',
      'percentage', 10, 0, 100, true
    )
    on conflict (id) do nothing
  `

  const settings: Array<[string, Record<string, unknown>]> = [
    ["brand", contentDefaults.brand],
    ["announcement", contentDefaults.announcement],
    ["hero", contentDefaults.hero],
    ["promo", contentDefaults.promo],
    ["story", contentDefaults.story],
    ["newsletter", contentDefaults.newsletter],
    ["social", contentDefaults.social],
    ["commerce", contentDefaults.commerce],
    ["size_guide", contentDefaults.sizeGuide],
    ["pages", contentDefaults.pages],
  ]
  for (const [key, value] of settings) {
    await tx`
      insert into site_settings (key, value)
      values (${key}, ${tx.json(JSON.parse(JSON.stringify(value)))})
      on conflict (key) do nothing
    `
  }

  const email = (process.env.INITIAL_ADMIN_EMAIL || "admin@hoodboyz.local").toLowerCase()
  const password = process.env.INITIAL_ADMIN_PASSWORD
  const existing = await tx<Array<{ id: string }>>`
    select p.id from profiles p
    join user_roles r on r.user_id = p.id and r.role = 'super_admin'
    limit 1
  `
  if (!existing.length && password) {
    const hash = await bcrypt.hash(password, 12)
    const id = crypto.randomUUID()
    await tx`
      insert into profiles (id, email, password_hash, first_name, last_name, email_verified_at)
      values (${id}, ${email}, ${hash}, 'Hood', 'Admin', now())
    `
    await tx`insert into user_roles (user_id, role) values (${id}, 'super_admin')`
    console.log(`Super admin ready for ${email}`)
  }
})

await sql.end()
console.log("Seed complete.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
