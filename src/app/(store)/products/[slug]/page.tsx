import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { BuyBox } from "@/components/buy-box"
import { Gallery } from "@/components/gallery"
import { ProductCard } from "@/components/product-card"
import { ReviewForm } from "@/components/forms"
import { getCurrentUser } from "@/lib/auth"
import { getProduct } from "@/lib/catalog"
import { getSql } from "@/lib/db"
import { getSettings } from "@/lib/settings"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return { title: "Product" }
  return { title: product.seoTitle || product.name, description: product.seoDescription || product.shortDescription }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) {
    const rows = await getSql()<Array<{ to_path: string }>>`
      select to_path from redirects where from_path = ${`/products/${slug}`} limit 1
    `
    if (rows[0]) redirect(rows[0].to_path)
    notFound()
  }
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()])
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    sku: product.sku,
    image: product.images.map((image) => image.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "GHS",
      price: product.price,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  }
  return (
    <article className="pb-24 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid md:grid-cols-2">
        <Gallery images={product.images} />
        <div className="px-5 py-8 md:px-12 md:py-12">
          <p className="nav-link text-mute">{product.category}</p>
          <h1 className="display mt-3 text-4xl md:text-5xl">{product.name}</h1>
          <p className="mt-4 max-w-md leading-7">{product.shortDescription}</p>
          {product.sampleData || settings.commerce.pricesAreSamples ? (
            <p className="mt-3 text-sm text-mute">Sample price and demonstration stock. These figures are labeled so they are not read as confirmed retail or warehouse counts.</p>
          ) : null}
          <div className="mt-8">
            <BuyBox product={product} sample={product.sampleData || settings.commerce.pricesAreSamples} />
          </div>
          <dl className="mt-10 grid gap-4 text-sm">
            <div><dt className="nav-link text-mute">Description</dt><dd className="mt-1">{product.description}</dd></div>
            <div><dt className="nav-link text-mute">Details</dt><dd className="mt-1">{product.details}</dd></div>
            <div><dt className="nav-link text-mute">Materials</dt><dd className="mt-1">{product.materials}</dd></div>
            <div><dt className="nav-link text-mute">Care</dt><dd className="mt-1">{product.care}</dd></div>
            <div><dt className="nav-link text-mute">Fit</dt><dd className="mt-1">{product.fit}</dd></div>
            <div><dt className="nav-link text-mute">SKU</dt><dd className="mt-1">{product.sku}</dd></div>
          </dl>
          <Link href="/size-guide" className="mt-6 inline-block underline underline-offset-4">Size guide</Link>
        </div>
      </div>
      <section className="border-t border-line px-5 py-12 md:px-10">
        <h2 className="display text-3xl">You may also like</h2>
        {product.related.length === 0 ? <p className="mt-3 text-mute">No other active pieces share this category yet.</p> : (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {product.related.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        )}
      </section>
      <section className="px-5 py-12 md:px-10">
        <h2 className="display text-3xl">Frequently bought together</h2>
        {product.together.length === 0 ? (
          <p className="mt-3 text-mute">This list is built from paid orders only. There are no paid orders pairing this piece yet.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {product.together.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        )}
      </section>
      <section className="border-t border-line px-5 py-12 md:px-10">
        <h2 className="display text-3xl">Reviews</h2>
        {product.rating ? <p className="mt-2 text-sm text-mute">{product.rating} / 5 from {product.reviewCount} approved {product.reviewCount === 1 ? "review" : "reviews"}</p> : <p className="mt-2 text-sm text-mute">No approved reviews yet.</p>}
        <div className="mt-6 grid gap-6">
          {product.reviews.map((review) => (
            <blockquote key={review.id}>
              <p className="font-medium">{review.title || `${review.rating}/5`}</p>
              <p className="mt-1">{review.comment}</p>
              <footer className="text-sm text-mute">{review.first_name}</footer>
            </blockquote>
          ))}
        </div>
        <div className="mt-8 max-w-lg">
          {user ? <ReviewForm productId={product.id} /> : <Link href={`/account/login?next=/products/${product.slug}`} className="underline">Sign in to review</Link>}
        </div>
      </section>
    </article>
  )
}
