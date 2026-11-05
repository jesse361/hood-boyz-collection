import { Catalog } from "@/components/catalog"
import { getFacets, listProducts, parseFilters } from "@/lib/catalog"

export const dynamic = "force-dynamic"

export const metadata = { title: "Shop" }

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams)
  const [result, facets] = await Promise.all([listProducts(filters), getFacets(true)])
  return <Catalog title="Shop" body="The current Hood Boyz edit." path="/shop" facets={facets} filters={filters} {...result} />
}
