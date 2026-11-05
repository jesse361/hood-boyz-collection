import Link from "next/link"
import { listCollections } from "@/lib/catalog"
import { PageIntro } from "@/components/editorial"

export const dynamic = "force-dynamic"
export const metadata = { title: "Collections" }

export default async function CollectionsPage() {
  const collections = await listCollections()
  return (
    <div>
      <PageIntro title="Collections" body="Edits of the same garments, grouped by how you might wear them." />
      <div className="grid gap-6 px-5 py-10 md:grid-cols-3 md:px-10">
        {collections.map((collection) => (
          <Link key={collection.slug} href={`/collections/${collection.slug}`} className="border border-line bg-white p-4">
            {collection.image_url ? <img src={collection.image_url} alt="" className="aspect-[4/5] w-full object-contain" /> : null}
            <h2 className="mt-4 display text-2xl">{collection.name}</h2>
            <p className="text-sm text-mute">{collection.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
