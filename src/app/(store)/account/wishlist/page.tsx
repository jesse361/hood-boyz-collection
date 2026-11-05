import { ProductGrid } from "@/components/product-card"
import { getWishlistProducts } from "@/lib/commerce"

export const dynamic = "force-dynamic"
export const metadata = { title: "Wishlist" }

export default async function AccountWishlistPage() {
  const products = await getWishlistProducts()
  return (
    <div>
      <h1 className="display px-5 pt-10 text-4xl md:px-10">Wishlist</h1>
      <ProductGrid products={products} />
    </div>
  )
}
