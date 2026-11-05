import { notFound } from "next/navigation"
import { Catalog } from "@/components/catalog"
import { getFacets, listCollections, listProducts, parseFilters } from "@/lib/catalog"

export const dynamic = "force-dynamic"

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const collections = await listCollections()
  const collection = collections.find((item) => item.slug === slug)
  if (!collection) notFound()
  const filters = { ...parseFilters(await searchParams), collection: slug }
  const [result, facets] = await Promise.all([listProducts(filters), getFacets(true)])
  return <Catalog title={collection.name} body={collection.description} path={`/collections/${slug}`} facets={facets} filters={filters} {...result} />
}
