import Link from "next/link"
import { formatMoney, discountPercent } from "@/lib/money"
import type { CardProduct } from "@/types/store"

export function ProductCard({ product }: { product: CardProduct }) {
  const sale = discountPercent(product.price, product.compareAtPrice)
  return (
    <article className="group">
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden border border-line bg-white shadow-[0_18px_40px_-28px_rgba(16,16,16,0.45)]">
        <span className="absolute top-0 left-0 z-10 h-8 w-8 border-t-2 border-l-2 border-gold" />
        <span className="absolute right-0 bottom-0 z-10 h-8 w-8 border-r-2 border-b-2 border-gold" />
        {product.badge ? (
          <span className="absolute top-3 left-3 z-10 bg-ink px-2 py-1 text-[10px] tracking-[0.18em] text-paper uppercase">{product.badge}</span>
        ) : null}
        <div className="relative aspect-[4/5]">
          {product.image ? (
            <img src={product.image} alt={product.imageAlt} className="h-full w-full object-contain p-5 transition duration-700 group-hover:scale-[1.04]" />
          ) : (
            <div className="grid h-full place-items-center text-mute">No photograph</div>
          )}
          {product.hoverImage ? (
            <img src={product.hoverImage} alt="" className="absolute inset-0 h-full w-full object-contain bg-white p-5 opacity-0 transition duration-700 group-hover:opacity-100" />
          ) : null}
        </div>
      </Link>
      <div className="mt-4">
        <p className="text-[10px] tracking-[0.18em] text-gold uppercase">{product.category}</p>
        <Link href={`/products/${product.slug}`} className="mt-1 block font-medium leading-snug">{product.name}</Link>
        <p className="mt-2 text-sm">
          {sale && product.compareAtPrice ? <span className="mr-2 text-mute line-through">{formatMoney(product.compareAtPrice)}</span> : null}
          {formatMoney(product.price)}
        </p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {product.colors.map((color) => (
          <span key={color.name} title={color.name} className="h-3 w-3 border border-line" style={{ background: color.code || "#ddd" }} />
        ))}
        {!product.inStock ? <span className="text-[10px] tracking-[0.16em] uppercase">Sold out</span> : null}
      </div>
    </article>
  )
}

export function ProductGrid({ products }: { products: CardProduct[] }) {
  if (!products.length) {
    return (
      <div className="mx-5 my-10 border border-dashed border-line px-6 py-16 text-center md:mx-8">
        <p className="display text-3xl">Nothing in this edit</p>
        <p className="mt-2 text-mute">Try another size, colour, or collection.</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-12 px-5 py-8 md:px-8 lg:grid-cols-3">
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  )
}
