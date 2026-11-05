import Link from "next/link"
import { getFacets, getHome } from "@/lib/catalog"
import { Hero } from "@/components/hero"
import { ProductCard } from "@/components/product-card"
import { getSettings } from "@/lib/settings"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [settings, home, facets] = await Promise.all([getSettings(), getHome(), getFacets()])
  return (
    <div>
      <Hero {...settings.hero} />
      <section className="px-5 py-14 md:px-10">
        <div className="flex items-end justify-between border-b border-line pb-4">
          <div>
            <p className="nav-link text-gold">01</p>
            <h2 className="display mt-2 text-3xl">New arrivals</h2>
          </div>
          <Link href="/new-arrivals" className="nav-link">View all</Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {home.newest.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
      <section className="grid items-center bg-white md:grid-cols-2">
        <img src={settings.promo.image} alt={settings.promo.imageAlt} className="h-full max-h-[70vh] w-full object-contain" />
        <div className="px-5 py-12 md:px-12">
          <p className="nav-link text-gold">Spotlight</p>
          <h2 className="display mt-3 text-4xl">{settings.promo.title}</h2>
          <p className="mt-4 max-w-md leading-7">{settings.promo.body}</p>
          {settings.promo.message ? <p className="mt-3 text-sm text-mute">{settings.promo.message}</p> : null}
          <Link href={settings.promo.href} className="mt-6 inline-block bg-ink px-5 py-3 nav-link text-paper">{settings.promo.cta}</Link>
        </div>
      </section>
      <section className="px-5 py-14 md:px-10">
        <p className="nav-link text-gold">02</p>
        <h2 className="display mt-2 text-3xl">{home.bestMode === "sales" ? "Best sellers" : "Featured"}</h2>
        {home.bestMode === "featured" ? <p className="mt-2 text-sm text-mute">Shown from the featured edit. Paid orders will replace this list.</p> : null}
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {home.bestSellers.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
      <section className="border-y border-line px-5 py-14 md:px-10">
        <h2 className="display text-3xl">Collections</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {home.collections.map((collection) => (
            <Link key={collection.slug} href={`/collections/${collection.slug}`} className="border border-line bg-white p-4">
              {collection.image_url ? <img src={collection.image_url} alt="" className="aspect-[4/5] w-full object-contain" /> : null}
              <p className="mt-4 font-medium">{collection.name}</p>
              <p className="text-sm text-mute">{collection.description}</p>
            </Link>
          ))}
        </div>
      </section>
      {home.limited.length ? (
        <section className="px-5 py-14 md:px-10">
          <h2 className="display text-3xl">Limited</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {home.limited.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      ) : null}
      <section className="grid items-center md:grid-cols-2">
        <div className="px-5 py-12 md:px-12">
          <h2 className="display text-4xl">{settings.story.heading}</h2>
          <p className="mt-4 max-w-md leading-7 text-mute">{settings.story.body}</p>
          <Link href="/about" className="mt-6 inline-block underline underline-offset-4">Read the house</Link>
        </div>
        <img src={settings.story.image} alt={settings.story.imageAlt} className="h-full max-h-[70vh] w-full bg-white object-contain" />
      </section>
      <section className="px-5 py-14 md:px-10">
        <h2 className="display text-3xl">Categories</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {facets.categories.map((category) => (
            <Link key={category.slug} href={`/categories/${category.slug}`} className="border border-line px-4 py-2 text-sm">
              {category.name}
            </Link>
          ))}
        </div>
      </section>
      <section className="border-t border-line px-5 py-14 md:px-10">
        <h2 className="display text-3xl">Reviews</h2>
        {home.reviews.length === 0 ? <p className="mt-4 text-mute">Approved reviews will appear here. None yet.</p> : (
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {home.reviews.map((review) => (
              <blockquote key={review.title + review.product_name} className="border border-line p-4">
                <p>{review.comment}</p>
                <footer className="mt-3 text-sm text-mute">{review.product_name} · {review.rating}/5</footer>
              </blockquote>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
