"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatMoney } from "@/lib/money"
import { addToCartAction, wishlistAction } from "@/server/store-actions"
import type { CardProduct } from "@/types/store"

export function BuyBox({ product, sample }: { product: CardProduct; sample: boolean }) {
  const router = useRouter()
  const sizes = useMemo(() => [...new Set(product.variants.map((variant) => variant.size))], [product.variants])
  const first = product.variants.find((variant) => variant.stock > 0) ?? product.variants[0]
  const [size, setSize] = useState(first?.size ?? "")
  const [qty, setQty] = useState(1)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const variant = product.variants.find((item) => item.size === size) ?? first
  const price = variant?.price ?? product.price

  async function add() {
    if (!variant || variant.stock < 1) {
      setError("That size is sold out.")
      return
    }
    setPending(true)
    setError("")
    const result = await addToCartAction(variant.id, qty)
    setPending(false)
    if (result && "error" in result && result.error) {
      setError(result.error)
      return
    }
    window.dispatchEvent(new Event("hb-cart-open"))
    router.refresh()
  }

  return (
    <div className="grid gap-5">
      <p className="display text-3xl">{formatMoney(price)}</p>
      {sample ? <p className="text-sm text-mute">Sample price. The studio has not confirmed this retail price.</p> : null}
      <div className="flex flex-wrap gap-2">
        {sizes.map((option) => {
          const match = product.variants.find((item) => item.size === option)
          const out = !match || match.stock < 1
          return (
            <button
              key={option}
              type="button"
              disabled={out}
              onClick={() => setSize(option)}
              className={`min-w-12 border px-3 py-2 text-sm ${size === option ? "border-ink bg-ink text-paper" : "border-line"} ${out ? "line-through opacity-40" : ""}`}
            >
              {option}
            </button>
          )
        })}
      </div>
      <p className="text-sm text-mute">{variant?.color}</p>
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => setQty((value) => Math.max(1, value - 1))}>−</button>
        <span>{qty}</span>
        <button type="button" onClick={() => setQty((value) => Math.min(10, variant?.stock ?? 10, value + 1))}>+</button>
      </div>
      {error ? <p className="text-sm">{error}</p> : null}
      <button type="button" onClick={add} disabled={pending || !variant || variant.stock < 1} className="bg-ink py-4 nav-link text-paper">
        {pending ? "Adding" : variant && variant.stock > 0 ? "Add to bag" : "Sold out"}
      </button>
      <button type="button" className="border border-ink py-4 nav-link" onClick={async () => { await wishlistAction(product.id); router.refresh() }}>
        Save to wishlist
      </button>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper p-3 md:hidden">
        <button type="button" onClick={add} disabled={pending || !variant || variant.stock < 1} className="flex w-full items-center justify-between bg-ink px-4 py-3 text-paper">
          <span className="nav-link">{variant && variant.stock > 0 ? "Add to bag" : "Sold out"}</span>
          <span>{formatMoney(price)}</span>
        </button>
      </div>
    </div>
  )
}
