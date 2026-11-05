import Link from "next/link"
import { formatMoney, discountPercent } from "@/lib/money"
import type { CardProduct } from "@/types/store"

type Group = { name: string; slug: string; items: number; image: string | null }
type CollectionTile = { name: string; slug: string; description: string; image_url: string | null }

function bySlug(products: CardProduct[], slug: string, fallback: number) {
  return products.find((product) => product.slug === slug) ?? products[fallback] ?? null
}

export function NewArrivalsBoard({
  products,
  groups,
  collections,
}: {
  products: CardProduct[]
  groups: Group[]
  collections: CollectionTile[]
}) {
  const lead = bySlug(products, "monogram-t-shirt-black", 0)
  const seen = new Set<string>(lead ? [lead.slug] : [])
  const supports = [
    bySlug(products, "monogram-t-shirt-white", 1),
    bySlug(products, "graphic-script-t-shirt", 2),
    bySlug(products, "branded-snapback-cap", 3),
  ].filter((product): product is CardProduct => {
    if (!product || seen.has(product.slug)) return false
    seen.add(product.slug)
    return true
  })
  const sale = bySlug(products, "madehero-collective-sweatshirt", 0)
  const categories = groups.slice(0, 3)

  return (
    <div className="bg-[#f3f3f1] pb-16">
      <section className="mx-3 mt-3 grid gap-3 rounded-[28px] bg-white p-3 md:mx-6 md:p-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-between px-4 py-8 md:px-10 md:py-12">
          <div>
            <p className="text-sm text-mute">New arrivals</p>
            <h1 className="display mt-3 max-w-xl text-5xl leading-[0.95] md:text-6xl">The latest drop is in.</h1>
            <p className="mt-4 max-w-md leading-7 text-mute">
              A different piece in each frame: oversized tees, the script graphic, headwear, and the collective sweatshirt.
            </p>
            <Link href="#just-in" className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm text-paper">
              Shop the drop <span aria-hidden>→</span>
            </Link>
          </div>
          <p className="mt-10 text-sm text-mute">{products.length} pieces marked new</p>
        </div>
        {lead ? (
          <Link href={`/products/${lead.slug}`} className="relative flex min-h-[420px] items-end overflow-hidden rounded-[24px] bg-[#f6f6f4]">
            {lead.image ? <img src={lead.image} alt={lead.imageAlt} className="absolute inset-0 h-full w-full object-contain p-8" /> : null}
            <span className="relative m-4 rounded-full bg-white px-4 py-2 text-sm shadow-sm">{lead.name}</span>
          </Link>
        ) : null}
      </section>

      <section className="mx-3 mt-3 grid gap-3 sm:grid-cols-3 md:mx-6">
        {supports.map((product) => (
          <Link key={product.id} href={`/products/${product.slug}`} className="rounded-[24px] bg-white p-3">
            <div className="overflow-hidden rounded-[18px] bg-[#f6f6f4]">
              {product.image ? <img src={product.image} alt={product.imageAlt} className="aspect-square w-full object-contain p-4" /> : null}
            </div>
            <div className="flex items-start justify-between gap-3 px-2 pt-3 pb-1">
              <p className="font-medium leading-snug">{product.name}</p>
              <p className="shrink-0 text-sm">{formatMoney(product.price)}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="px-4 py-14 md:px-8">
        <h2 className="display text-center text-4xl">Shop by category</h2>
        <p className="mt-2 text-center text-sm text-mute">Each tile is a different piece from this drop.</p>
        <div className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-3">
          {categories.map((group) => (
            <Link key={group.slug} href={`/categories/${group.slug}`} className="group overflow-hidden rounded-[24px] bg-white">
              <div className="bg-[#f6f6f4]">
                {group.image ? <img src={group.image} alt="" className="aspect-[4/5] w-full object-contain p-6 transition duration-500 group-hover:scale-[1.03]" /> : null}
              </div>
              <div className="flex items-center justify-between px-4 py-4">
                <p className="font-medium">{group.name}</p>
                <p className="text-sm text-mute">{group.items} {group.items === 1 ? "piece" : "pieces"}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="just-in" className="px-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-4">
          <div>
            <h2 className="display text-4xl">Just in</h2>
            <p className="mt-2 text-sm text-mute">The full new edit, one card each.</p>
          </div>
          <Link href="/shop" className="nav-link">All shop</Link>
        </div>
        <div className="mx-auto mt-8 grid max-w-6xl grid-cols-2 gap-4 lg:grid-cols-3">
          {products.map((product) => <ShelfCard key={product.id} product={product} />)}
        </div>
      </section>

      {sale ? (
        <section className="mx-3 mt-14 grid overflow-hidden rounded-[28px] bg-white md:mx-6 md:grid-cols-2">
          <div className="flex flex-col justify-center px-6 py-12 md:px-12">
            <p className="nav-link text-mute">This drop</p>
            <h2 className="display mt-3 text-4xl md:text-5xl">{sale.name}</h2>
            <p className="mt-4 max-w-md leading-7 text-mute">
              {sale.compareAtPrice ? "Marked below its compare-at price. Sample prices stay labeled on the product page." : "Open the piece for sizes and the full photograph."}
            </p>
            <p className="mt-5 text-lg">
              {sale.compareAtPrice ? <span className="mr-2 text-mute line-through">{formatMoney(sale.compareAtPrice)}</span> : null}
              {formatMoney(sale.price)}
            </p>
            <Link href={`/products/${sale.slug}`} className="mt-6 inline-flex w-fit rounded-full bg-ink px-5 py-3 text-sm text-paper">
              View piece <span aria-hidden>→</span>
            </Link>
          </div>
          <Link href={`/products/${sale.slug}`} aria-label={sale.name} className="bg-[#f6f6f4]">
            {sale.image ? <img src={sale.image} alt={sale.imageAlt} className="h-full max-h-[520px] w-full object-contain p-8" /> : null}
          </Link>
        </section>
      ) : null}

      {collections.length ? (
        <section className="px-4 py-14 md:px-8">
          <h2 className="display text-center text-4xl">Featured collections</h2>
          <p className="mt-2 text-center text-sm text-mute">Three edits, three different photographs.</p>
          <div className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-2">
            {collections[0] ? <CollectionCard collection={collections[0]} tall /> : null}
            <div className="grid gap-4">
              {collections.slice(1, 3).map((collection) => <CollectionCard key={collection.slug} collection={collection} />)}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function ShelfCard({ product }: { product: CardProduct }) {
  const sale = discountPercent(product.price, product.compareAtPrice)
  return (
    <article className="rounded-[24px] bg-white p-3">
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden rounded-[18px] bg-[#f6f6f4]">
        {product.badge ? (
          <span className="absolute top-3 left-3 rounded-full bg-ink px-2.5 py-1 text-[10px] tracking-[0.16em] text-paper uppercase">{product.badge}</span>
        ) : null}
        {product.image ? <img src={product.image} alt={product.imageAlt} className="aspect-[4/5] w-full object-contain p-4" /> : null}
      </Link>
      <div className="px-2 pt-3 pb-1">
        <Link href={`/products/${product.slug}`} className="font-medium leading-snug">{product.name}</Link>
        <p className="mt-1 text-sm text-mute">
          {sale && product.compareAtPrice ? <span className="mr-2 line-through">{formatMoney(product.compareAtPrice)}</span> : null}
          <span className="text-ink">{formatMoney(product.price)}</span>
        </p>
      </div>
    </article>
  )
}

function CollectionCard({ collection, tall = false }: { collection: CollectionTile; tall?: boolean }) {
  return (
    <Link href={`/collections/${collection.slug}`} className="group relative flex min-h-56 overflow-hidden rounded-[24px] bg-white">
      {collection.image_url ? (
        <img src={collection.image_url} alt="" className={`w-full object-contain p-6 ${tall ? "aspect-[4/5] md:aspect-auto md:h-full md:min-h-[460px]" : "aspect-[16/9]"}`} />
      ) : null}
      <span className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-2 text-sm shadow-sm">{collection.name}</span>
    </Link>
  )
}
