import "server-only"
import { getSql } from "@/lib/db"
import { discountPercent, fromPesewas, toPesewas } from "@/lib/money"
import type { CardProduct, ProductFilters } from "@/types/store"

const pageSize = 12

type ImageRow = { url: string; alt: string; primary: boolean }
type VariantRow = {
  id: string
  size: string
  color: string
  colorCode: string | null
  price: string
  stock: number
  active: boolean
}

type ProductRow = {
  id: string
  slug: string
  name: string
  short_description: string
  description: string
  details: string
  materials: string
  care_instructions: string
  fit_notes: string
  base_price: string
  compare_at_price: string | null
  sku: string
  status: string
  featured: boolean
  is_new: boolean
  is_limited_edition: boolean
  sample_data: boolean
  seo_title: string | null
  seo_description: string | null
  category_name: string
  category_slug: string
  images: ImageRow[] | null
  variants: VariantRow[] | null
  rating: string | null
  review_count: number
}

function badge(row: { is_limited_edition: boolean; compare_at_price: string | null; base_price: string; is_new: boolean }) {
  if (row.is_limited_edition) return "Limited" as const
  if (discountPercent(row.base_price, row.compare_at_price)) return "Sale" as const
  if (row.is_new) return "New" as const
  return null
}

function toCard(row: ProductRow): CardProduct {
  const images = row.images ?? []
  const variants = (row.variants ?? []).filter((variant) => variant.active)
  const priced = variants.map((variant) => toPesewas(variant.price))
  const lowest = priced.length ? Math.min(...priced) : toPesewas(row.base_price)
  const colors = new Map<string, string | null>()
  for (const variant of variants) colors.set(variant.color, variant.colorCode)
  const primary = images.find((image) => image.primary) ?? images[0]
  const hover = images.find((image) => image.url !== primary?.url)
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category_name,
    categorySlug: row.category_slug,
    price: fromPesewas(lowest),
    compareAtPrice: row.compare_at_price,
    image: primary?.url ?? null,
    imageAlt: primary?.alt || row.name,
    hoverImage: hover?.url ?? null,
    badge: badge(row),
    sampleData: row.sample_data,
    colors: [...colors.entries()].map(([name, code]) => ({ name, code })),
    variants: variants.map((variant) => ({ ...variant, stock: Number(variant.stock) })),
    inStock: variants.some((variant) => variant.stock > 0),
  }
}

const productSelect = `
  p.id, p.slug, p.name, p.short_description, p.description, p.details, p.materials,
  p.care_instructions, p.fit_notes, p.base_price::text, p.compare_at_price::text,
  p.sku, p.status, p.featured, p.is_new, p.is_limited_edition, p.sample_data,
  p.seo_title, p.seo_description, p.created_at,
  c.name as category_name, c.slug as category_slug,
  coalesce((
    select json_agg(json_build_object('url', i.image_url, 'alt', i.alt_text, 'primary', i.is_primary) order by i.is_primary desc, i.display_order)
    from product_images i where i.product_id = p.id
  ), '[]'::json) as images,
  coalesce((
    select json_agg(json_build_object(
      'id', v.id, 'size', v.size, 'color', v.color, 'colorCode', v.color_code,
      'price', coalesce(v.price_override, p.base_price)::text,
      'stock', v.stock_quantity, 'active', v.is_active
    ) order by v.color, v.size)
    from product_variants v where v.product_id = p.id
  ), '[]'::json) as variants,
  (select round(avg(r.rating)::numeric, 1)::text from reviews r where r.product_id = p.id and r.is_approved) as rating,
  (select count(*)::int from reviews r where r.product_id = p.id and r.is_approved) as review_count
`

export function parseFilters(params: Record<string, string | string[] | undefined>): ProductFilters {
  const one = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  const min = Number(one("min"))
  const max = Number(one("max"))
  const page = Number(one("page") || "1")
  const sort = one("sort")
  const availability = one("availability")
  return {
    category: one("category") || undefined,
    collection: one("collection") || undefined,
    size: one("size") || undefined,
    color: one("color") || undefined,
    min: Number.isFinite(min) && one("min") ? min : undefined,
    max: Number.isFinite(max) && one("max") ? max : undefined,
    availability: availability === "in" || availability === "out" ? availability : "",
    sale: one("sale") === "1",
    newest: one("new") === "1",
    q: one("q")?.trim() || undefined,
    sort: sort === "newest" || sort === "price-asc" || sort === "price-desc" || sort === "best" ? sort : "featured",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export async function listProducts(filters: ProductFilters) {
  const sql = getSql()
  const page = filters.page ?? 1
  const order =
    filters.sort === "newest"
      ? sql`p.created_at desc`
      : filters.sort === "price-asc"
        ? sql`(select min(coalesce(v.price_override, p.base_price)) from product_variants v where v.product_id = p.id) asc`
        : filters.sort === "price-desc"
          ? sql`(select min(coalesce(v.price_override, p.base_price)) from product_variants v where v.product_id = p.id) desc`
          : filters.sort === "best"
            ? sql`coalesce((
                select sum(oi.quantity) from order_items oi
                join orders o on o.id = oi.order_id and o.payment_status = 'paid'
                where oi.product_id = p.id
              ), 0) desc, p.created_at desc`
            : sql`p.featured desc, p.created_at desc`

  const where = sql`
    p.status = 'active'
    ${filters.category ? sql`and c.slug = ${filters.category}` : sql``}
    ${filters.collection ? sql`and exists (
      select 1 from collection_products cp
      join collections col on col.id = cp.collection_id
      where cp.product_id = p.id and col.slug = ${filters.collection} and col.is_active
    )` : sql``}
    ${filters.size ? sql`and exists (
      select 1 from product_variants v where v.product_id = p.id and v.is_active and v.size = ${filters.size}
    )` : sql``}
    ${filters.color ? sql`and exists (
      select 1 from product_variants v where v.product_id = p.id and v.is_active and v.color = ${filters.color}
    )` : sql``}
    ${filters.min != null ? sql`and exists (
      select 1 from product_variants v
      where v.product_id = p.id and coalesce(v.price_override, p.base_price) >= ${filters.min}
    )` : sql``}
    ${filters.max != null ? sql`and exists (
      select 1 from product_variants v
      where v.product_id = p.id and coalesce(v.price_override, p.base_price) <= ${filters.max}
    )` : sql``}
    ${filters.availability === "in" ? sql`and exists (
      select 1 from product_variants v where v.product_id = p.id and v.is_active and v.stock_quantity > 0
    )` : sql``}
    ${filters.availability === "out" ? sql`and not exists (
      select 1 from product_variants v where v.product_id = p.id and v.is_active and v.stock_quantity > 0
    )` : sql``}
    ${filters.sale ? sql`and p.compare_at_price is not null and p.compare_at_price > p.base_price` : sql``}
    ${filters.newest ? sql`and p.is_new` : sql``}
    ${filters.q ? sql`and (
      p.search_vector @@ plainto_tsquery('english', ${filters.q})
      or p.name ilike ${"%" + filters.q + "%"}
      or c.name ilike ${"%" + filters.q + "%"}
      or exists (
        select 1 from collection_products cp
        join collections col on col.id = cp.collection_id
        where cp.product_id = p.id and col.name ilike ${"%" + filters.q + "%"}
      )
    )` : sql``}
  `

  const products = await sql<ProductRow[]>`
    select ${sql.unsafe(productSelect)}
    from products p
    join categories c on c.id = p.category_id
    where ${where}
    order by ${order}
    limit ${pageSize} offset ${(page - 1) * pageSize}
  `
  const countRows = await sql<Array<{ count: number }>>`
    select count(*)::int as count
    from products p
    join categories c on c.id = p.category_id
    where ${where}
  `
  return {
    products: products.map(toCard),
    total: countRows[0]?.count ?? 0,
    page,
    pages: Math.max(1, Math.ceil((countRows[0]?.count ?? 0) / pageSize)),
  }
}

export async function getFacets(stocked = false) {
  const sql = getSql()
  const categoryStock = stocked
    ? sql`and exists (select 1 from products p where p.category_id = c.id and p.status = 'active')`
    : sql``
  const collectionStock = stocked
    ? sql`and exists (
        select 1 from collection_products cp
        join products p on p.id = cp.product_id
        where cp.collection_id = c.id and p.status = 'active'
      )`
    : sql``
  const [categories, collections, sizes, colors] = await Promise.all([
    sql<Array<{ name: string; slug: string }>>`
      select c.name, c.slug
      from categories c
      where c.is_active ${categoryStock}
      order by c.display_order, c.name
    `,
    sql<Array<{ name: string; slug: string }>>`
      select c.name, c.slug
      from collections c
      where c.is_active ${collectionStock}
      order by c.display_order, c.name
    `,
    sql<Array<{ size: string }>>`
      select distinct size from product_variants v
      join products p on p.id = v.product_id
      where v.is_active and p.status = 'active'
      order by size
    `,
    sql<Array<{ color: string }>>`
      select distinct color from product_variants v
      join products p on p.id = v.product_id
      where v.is_active and p.status = 'active'
      order by color
    `,
  ])
  return { categories, collections, sizes: sizes.map((row) => row.size), colors: colors.map((row) => row.color) }
}

export async function getProduct(slug: string) {
  const sql = getSql()
  const rows = await sql<ProductRow[]>`
    select ${sql.unsafe(productSelect)}
    from products p
    join categories c on c.id = p.category_id
    where p.slug = ${slug} and p.status = 'active'
    limit 1
  `
  const row = rows[0]
  if (!row) return null
  const related = await sql<ProductRow[]>`
    select ${sql.unsafe(productSelect)}
    from products p
    join categories c on c.id = p.category_id
    where p.status = 'active' and c.slug = ${row.category_slug} and p.id <> ${row.id}
    order by p.featured desc, p.created_at desc
    limit 4
  `
  const together = await sql<ProductRow[]>`
    select ${sql.unsafe(productSelect)}
    from products p
    join categories c on c.id = p.category_id
    where p.id in (
      select other.product_id
      from order_items mine
      join orders o on o.id = mine.order_id and o.payment_status = 'paid'
      join order_items other on other.order_id = mine.order_id and other.product_id <> mine.product_id
      where mine.product_id = ${row.id}
      group by other.product_id
      order by count(*) desc
      limit 4
    )
  `
  const reviews = await sql<
    Array<{ id: string; rating: number; title: string; comment: string; created_at: string; first_name: string }>
  >`
    select r.id, r.rating, r.title, r.comment, r.created_at, p.first_name
    from reviews r
    join profiles p on p.id = r.user_id
    where r.product_id = ${row.id} and r.is_approved
    order by r.created_at desc
  `
  return {
    ...toCard(row),
    shortDescription: row.short_description,
    description: row.description,
    details: row.details,
    materials: row.materials,
    care: row.care_instructions,
    fit: row.fit_notes,
    sku: row.sku,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    images: (row.images ?? []).map((image) => ({ url: image.url, alt: image.alt || row.name })),
    rating: row.rating ? Number(row.rating) : null,
    reviewCount: Number(row.review_count ?? 0),
    related: related.map(toCard),
    together: together.map(toCard),
    reviews,
  }
}

export async function searchSuggestions(query: string) {
  if (query.trim().length < 2) return []
  const result = await listProducts({ q: query.trim(), page: 1, sort: "featured" })
  return result.products.slice(0, 6)
}

export async function getHome() {
  const [newest, featured, collections, reviews] = await Promise.all([
    listProducts({ newest: true, sort: "newest", page: 1 }),
    listProducts({ sort: "featured", page: 1 }),
    getSql()<Array<{ name: string; slug: string; description: string; image_url: string | null }>>`
      select name, slug, description, image_url
      from collections
      where is_active and is_featured
      order by display_order, name
    `,
    getSql()<Array<{ rating: number; title: string; comment: string; product_name: string }>>`
      select r.rating, r.title, r.comment, p.name as product_name
      from reviews r
      join products p on p.id = r.product_id
      where r.is_approved
      order by r.created_at desc
      limit 6
    `,
  ])
  const sales = await getSql()<Array<{ sold: number }>>`
    select coalesce(sum(oi.quantity), 0)::int as sold
    from order_items oi
    join orders o on o.id = oi.order_id and o.payment_status = 'paid'
  `
  const bestProducts = sales[0]?.sold
    ? (await listProducts({ sort: "best", page: 1 })).products.slice(0, 4)
    : featured.products.slice(0, 4)
  const limitedProducts = (await getSql()<ProductRow[]>`
    select ${getSql().unsafe(productSelect)}
    from products p
    join categories c on c.id = p.category_id
    where p.status = 'active' and p.is_limited_edition
    order by p.created_at desc
    limit 4
  `).map(toCard)
  return {
    newest: newest.products.slice(0, 8),
    bestSellers: bestProducts,
    bestMode: sales[0]?.sold ? ("sales" as const) : ("featured" as const),
    limited: limitedProducts,
    collections,
    reviews,
  }
}

export async function getNewArrivalsBoard() {
  const sql = getSql()
  const [listed, groups, collections] = await Promise.all([
    listProducts({ newest: true, sort: "newest", page: 1 }),
    sql<Array<{ name: string; slug: string; items: number; image: string | null }>>`
      select c.name, c.slug, count(p.id)::int as items,
        (
          select pi.image_url
          from products pp
          join product_images pi on pi.product_id = pp.id and pi.is_primary
          where pp.category_id = c.id and pp.status = 'active' and pp.is_new
          order by pp.created_at desc
          limit 1
        ) as image
      from categories c
      join products p on p.category_id = c.id and p.status = 'active' and p.is_new
      where c.is_active
      group by c.id, c.name, c.slug, c.display_order
      order by count(p.id) desc, c.display_order
    `,
    sql<Array<{ name: string; slug: string; description: string; image_url: string | null }>>`
      select name, slug, description, image_url
      from collections
      where is_active and slug in ('graphic-culture', 'headwear', 'everyday-uniform')
      order by display_order
    `,
  ])
  return { products: listed.products, groups, collections }
}

export async function getCollection(slug: string) {
  const rows = await getSql()<Array<{ name: string; slug: string; description: string; image_url: string | null }>>`
    select name, slug, description, image_url from collections where slug = ${slug} and is_active limit 1
  `
  if (!rows[0]) return null
  const products = await listProducts({ collection: slug, page: 1, sort: "featured" })
  return { ...rows[0], products: products.products }
}

export async function listCollections() {
  return getSql()<Array<{ name: string; slug: string; description: string; image_url: string | null }>>`
    select name, slug, description, image_url from collections where is_active order by display_order, name
  `
}

export async function getCategory(slug: string) {
  const rows = await getSql()<Array<{ name: string; slug: string; description: string; image_url: string | null }>>`
    select name, slug, description, image_url from categories where slug = ${slug} and is_active limit 1
  `
  if (!rows[0]) return null
  const products = await listProducts({ category: slug, page: 1 })
  return { ...rows[0], ...products }
}
