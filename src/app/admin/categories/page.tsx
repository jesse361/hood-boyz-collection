import { adminCategories } from "@/lib/admin"
import { saveCategoryAction } from "@/server/admin-actions"

export const metadata = { title: "Categories" }
const field = "w-full border border-line px-2 py-2"

export default async function CategoriesAdmin() {
  const categories = await adminCategories()
  return (
    <div>
      <h1 className="display text-4xl">Categories</h1>
      <ul className="mt-6 grid gap-4">
        {categories.map((category) => (
          <li key={category.id}>
            <form action={saveCategoryAction} className="grid gap-2 border border-line p-3 md:grid-cols-5">
              <input type="hidden" name="id" value={category.id} />
              <input className={field} name="name" defaultValue={category.name} />
              <input className={field} name="slug" defaultValue={category.slug} />
              <input className={field} name="description" defaultValue={category.description} />
              <input className={field} name="displayOrder" type="number" defaultValue={category.display_order} />
              <label className="text-sm"><input type="checkbox" name="active" defaultChecked={category.is_active} /> Active · {category.products}</label>
              <button className="border border-ink px-3 py-2 text-sm">Save</button>
            </form>
          </li>
        ))}
      </ul>
      <form action={saveCategoryAction} className="mt-8 grid max-w-xl gap-2">
        <h2 className="display text-2xl">Add category</h2>
        <input className={field} name="name" placeholder="Name" required />
        <input className={field} name="description" placeholder="Description" />
        <label className="text-sm"><input type="checkbox" name="active" defaultChecked /> Active</label>
        <button className="bg-ink px-3 py-2 text-paper">Add</button>
      </form>
    </div>
  )
}
