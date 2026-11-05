import { adminCollections } from "@/lib/admin"
import { saveCollectionAction } from "@/server/admin-actions"

export const metadata = { title: "Collections" }
const field = "w-full border border-line px-2 py-2"

export default async function CollectionsAdmin() {
  const collections = await adminCollections()
  return (
    <div>
      <h1 className="display text-4xl">Collections</h1>
      <ul className="mt-6 grid gap-4">
        {collections.map((collection) => (
          <li key={collection.id}>
            <form action={saveCollectionAction} className="grid gap-2 border border-line p-3">
              <input type="hidden" name="id" value={collection.id} />
              <input className={field} name="name" defaultValue={collection.name} />
              <input className={field} name="slug" defaultValue={collection.slug} />
              <input className={field} name="description" defaultValue={collection.description} />
              <input className={field} name="image" defaultValue={collection.image_url ?? ""} placeholder="Image path" />
              <label className="text-sm"><input type="checkbox" name="active" defaultChecked={collection.is_active} /> Active</label>
              <label className="text-sm"><input type="checkbox" name="featured" defaultChecked={collection.is_featured} /> Featured · {collection.products} pieces</label>
              <button className="border border-ink px-3 py-2 text-sm">Save</button>
            </form>
          </li>
        ))}
      </ul>
      <form action={saveCollectionAction} className="mt-8 grid max-w-xl gap-2">
        <h2 className="display text-2xl">Add collection</h2>
        <input className={field} name="name" required placeholder="Name" />
        <input className={field} name="description" placeholder="Description" />
        <input className={field} name="image" placeholder="Image path" />
        <label className="text-sm"><input type="checkbox" name="active" defaultChecked /> Active</label>
        <label className="text-sm"><input type="checkbox" name="featured" /> Featured</label>
        <button className="bg-ink px-3 py-2 text-paper">Add</button>
      </form>
    </div>
  )
}
