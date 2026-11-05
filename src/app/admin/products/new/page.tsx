import { ProductEditor } from "@/components/product-editor"
import { adminCategories, adminCollections } from "@/lib/admin"

export const metadata = { title: "New product" }

export default async function NewProductPage() {
  const [categories, collections] = await Promise.all([adminCategories(), adminCollections()])
  return (
    <div className="max-w-3xl">
      <h1 className="display text-4xl">New product</h1>
      <div className="mt-6">
        <ProductEditor categories={categories} collections={collections} />
      </div>
    </div>
  )
}
