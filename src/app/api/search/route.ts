import { searchSuggestions } from "@/lib/catalog"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? ""
  const items = await searchSuggestions(query)
  return Response.json({
    items: items.map((item) => ({ slug: item.slug, name: item.name, price: item.price })),
  })
}
