import { Catalog } from "@/components/catalog"
import { getFacets, listProducts, parseFilters } from "@/lib/catalog"

export const dynamic = "force-dynamic"
export const metadata = { title: "Search" }

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const filters = parseFilters(params)
  const [result, facets] = await Promise.all([listProducts(filters), getFacets(true)])
  return (
    <Catalog
      title={filters.q ? `Results for “${filters.q}”` : "Search"}
      body={filters.q ? undefined : "Search by product, category or collection."}
      path="/search"
      facets={facets}
      filters={filters}
      {...result}
    />
  )
}
