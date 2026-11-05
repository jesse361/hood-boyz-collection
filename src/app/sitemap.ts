import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const sql = getSql()
  const [products, collections, categories] = await Promise.all([
    sql<Array<{ slug: string }>>`select slug from products where status = 'active'`,
    sql<Array<{ slug: string }>>`select slug from collections where is_active`,
    sql<Array<{ slug: string }>>`select slug from categories where is_active`,
  ])
  const staticPaths = ["", "/shop", "/new-arrivals", "/collections", "/categories", "/about", "/contact", "/faq", "/shipping", "/returns", "/size-guide", "/privacy", "/terms", "/cookies", "/track-order"]
  return [
    ...staticPaths.map((path) => ({ url: `${base}${path || "/"}` })),
    ...products.map((row) => ({ url: `${base}/products/${row.slug}` })),
    ...collections.map((row) => ({ url: `${base}/collections/${row.slug}` })),
    ...categories.map((row) => ({ url: `${base}/categories/${row.slug}` })),
  ]
}
