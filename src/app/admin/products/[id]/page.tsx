import { notFound } from "next/navigation"
import { ProductEditor } from "@/components/product-editor"
import { adminCategories, adminCollections, adminProduct } from "@/lib/admin"

export const dynamic = "force-dynamic"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [product, categories, collections] = await Promise.all([adminProduct(id), adminCategories(), adminCollections()])
  if (!product) notFound()
  return (
    <div className="max-w-3xl">
      <h1 className="display text-4xl">{product.name}</h1>
      <p className="mt-2 text-sm text-mute">{product.sample_data ? "Demonstration product. Prices and stock are unconfirmed." : "Live catalogue product."}</p>
      <div className="mt-6">
        <ProductEditor
          categories={categories}
          collections={collections}
          product={{
            ...product,
            images: product.images.map((image) => ({ url: image.image_url, alt: image.alt_text })),
            variants: product.variants.map((variant) => ({
              sku: variant.sku,
              size: variant.size,
              color: variant.color,
              colorCode: variant.color_code,
              stock: variant.stock_quantity,
              low: variant.low_stock_threshold,
            })),
          }}
        />
      </div>
    </div>
  )
}
