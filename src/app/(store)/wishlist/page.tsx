import { ProductGrid } from "@/components/product-card"
import { getWishlistProducts } from "@/lib/commerce"
import { PageIntro } from "@/components/editorial"

export const dynamic = "force-dynamic"
export const metadata = { title: "Wishlist" }

export default async function WishlistPage() {
  const products = await getWishlistProducts()
  return (
    <div>
      <PageIntro title="Wishlist" body="Saved on this browser until you sign in. Signing in merges it into your account." />
      <ProductGrid products={products} />
    </div>
  )
}
