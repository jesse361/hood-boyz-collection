import Link from "next/link"
import { getFacets } from "@/lib/catalog"
import { PageIntro } from "@/components/editorial"

export const dynamic = "force-dynamic"
export const metadata = { title: "Categories" }

export default async function CategoriesPage() {
  const facets = await getFacets()
  return (
    <div>
      <PageIntro title="Categories" body="Empty categories stay empty until a product is assigned." />
      <ul className="grid gap-px bg-line px-5 py-10 md:grid-cols-2 md:px-10">
        {facets.categories.map((category, index) => (
          <li key={category.slug} className="bg-paper">
            <Link href={`/categories/${category.slug}`} className="flex items-baseline justify-between px-4 py-6">
              <span className="display text-2xl">{category.name}</span>
              <span className="nav-link text-gold">{String(index + 1).padStart(2, "0")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
