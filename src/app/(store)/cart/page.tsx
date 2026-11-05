import Link from "next/link"
import { couponAction, removeItemAction, updateQuantityAction } from "@/server/store-actions"
import { getCart } from "@/lib/commerce"
import { formatMoney } from "@/lib/money"
import { PageIntro } from "@/components/editorial"

export const dynamic = "force-dynamic"
export const metadata = { title: "Bag" }

export default async function CartPage() {
  const cart = await getCart()
  return (
    <div>
      <PageIntro title="Bag" body={cart.pricesAreSamples ? "Sample prices are labeled on each piece." : undefined} />
      {cart.lines.length === 0 ? (
        <p className="px-5 py-12 text-mute">Your bag is empty. <Link href="/shop" className="underline">Shop the edit</Link></p>
      ) : (
        <div className="grid gap-10 px-5 py-10 md:grid-cols-[1.4fr_0.6fr] md:px-10">
          <div className="grid gap-6">
            {cart.lines.map((line) => (
              <div key={line.itemId} className="grid grid-cols-[96px_1fr] gap-4 border-b border-line pb-6">
                {line.image ? <img src={line.image} alt="" className="h-32 w-full object-cover" /> : null}
                <div>
                  <p className="font-medium">{line.name}</p>
                  <p className="text-sm text-mute">{line.color} / {line.size}</p>
                  {line.sampleData ? <p className="text-xs text-mute">Sample price</p> : null}
                  <p className="mt-2">{formatMoney(line.lineTotal, cart.currency)}</p>
                  <div className="mt-3 flex gap-3 text-sm">
                    <form action={updateQuantityAction.bind(null, line.itemId, line.quantity - 1)}><button disabled={line.quantity <= 1}>−</button></form>
                    <span>{line.quantity}</span>
                    <form action={updateQuantityAction.bind(null, line.itemId, line.quantity + 1)}><button>+</button></form>
                    <form action={removeItemAction.bind(null, line.itemId)}><button className="underline">Remove</button></form>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="h-fit border border-line p-5">
            <form action={async (formData) => { "use server"; await couponAction(String(formData.get("code") ?? "")) }} className="flex gap-2">
              <input name="code" defaultValue={cart.coupon ?? ""} placeholder="Coupon" className="w-full border border-line px-3 py-2" />
              <button className="border border-ink px-3">Apply</button>
            </form>
            {cart.couponError ? <p className="mt-2 text-sm">{cart.couponError}</p> : null}
            <div className="mt-4 flex justify-between"><span>Subtotal</span><span>{formatMoney(cart.subtotal, cart.currency)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>{formatMoney(cart.discount, cart.currency)}</span></div>
            <Link href="/checkout" className="mt-5 block bg-ink py-3 text-center nav-link text-paper">Checkout</Link>
          </aside>
        </div>
      )}
    </div>
  )
}
