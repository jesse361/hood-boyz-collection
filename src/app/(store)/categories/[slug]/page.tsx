import { notFound } from "next/navigation"
import { Catalog } from "@/components/catalog"
import { getCategory, getFacets, listProducts, parseFilters } from "@/lib/catalog"

export const dynamic = "force-dynamic"

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const category = await getCategory(slug)
  if (!category) notFound()
  const filters = { ...parseFilters(await searchParams), category: slug }
  const [result, facets] = await Promise.all([listProducts(filters), getFacets(true)])
  return <Catalog title={category.name} body={category.description} path={`/categories/${slug}`} facets={facets} filters={filters} {...result} />
}
