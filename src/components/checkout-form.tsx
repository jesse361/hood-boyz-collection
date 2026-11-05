"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatMoney } from "@/lib/money"
import { checkoutAction, quoteAction } from "@/server/store-actions"
import type { Quote } from "@/types/store"

type Method = { id: string; name: string; description: string; amount: string; eta: string }
type Prefill = {
  email: string
  firstName: string
  lastName: string
  phone: string
  street: string
  city: string
  region: string
  country: string
}

export function CheckoutForm({
  initial,
  methods,
  paystack,
  prefill,
}: {
  initial: Quote
  methods: Method[]
  paystack: boolean
  prefill: Prefill
}) {
  const router = useRouter()
  const [quote, setQuote] = useState(initial)
  const [shippingMethodId, setShippingMethodId] = useState(methods[0]?.id ?? "")
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "pay_on_delivery">(paystack ? "paystack" : "pay_on_delivery")
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const field = "w-full border border-line bg-transparent px-3 py-3 outline-none"

  async function requote(nextShipping: string, coupon?: string) {
    const result = await quoteAction(nextShipping, coupon)
    if ("quote" in result && result.quote) setQuote(result.quote)
    if ("error" in result && result.error) setError(result.error)
  }

  async function submit(formData: FormData) {
    setPending(true)
    setError("")
    const result = await checkoutAction({
      email: formData.get("email"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      phone: formData.get("phone"),
      country: formData.get("country"),
      region: formData.get("region"),
      city: formData.get("city"),
      street: formData.get("street"),
      postalCode: formData.get("postalCode") || "",
      deliveryInstructions: formData.get("deliveryInstructions") || "",
      shippingMethodId,
      paymentMethod,
      couponCode: quote.coupon ?? "",
      idempotencyKey,
    })
    setPending(false)
    if ("error" in result && result.error) {
      setError(result.error)
      return
    }
    if ("authorizationUrl" in result && result.authorizationUrl) {
      window.location.href = result.authorizationUrl
      return
    }
    if ("orderNumber" in result && result.orderNumber) {
      router.push(`/order-confirmation/${result.orderNumber}`)
    }
  }

  if (!quote.lines.length) {
    return <p className="px-5 py-16 text-mute">Your bag is empty. Add a piece before checkout.</p>
  }

  return (
    <form action={submit} className="grid gap-10 px-5 py-10 md:grid-cols-[1.2fr_0.8fr] md:px-10">
      <div className="grid gap-4">
        <h1 className="display text-4xl">Checkout</h1>
        {quote.pricesAreSamples ? <p className="text-sm text-mute">Prices in this order are sample prices.</p> : null}
        {quote.inventoryIsDemonstration ? <p className="text-sm text-mute">Stock figures are demonstration inventory.</p> : null}
        <input className={field} name="email" type="email" required defaultValue={prefill.email} placeholder="Email" />
        <div className="grid gap-3 md:grid-cols-2">
          <input className={field} name="firstName" required defaultValue={prefill.firstName} placeholder="First name" />
          <input className={field} name="lastName" required defaultValue={prefill.lastName} placeholder="Last name" />
        </div>
        <input className={field} name="phone" required defaultValue={prefill.phone} placeholder="Phone" />
        <input className={field} name="street" required defaultValue={prefill.street} placeholder="Street" />
        <div className="grid gap-3 md:grid-cols-3">
          <input className={field} name="city" required defaultValue={prefill.city} placeholder="City" />
          <input className={field} name="region" required defaultValue={prefill.region} placeholder="Region" />
          <input className={field} name="country" required defaultValue={prefill.country || "Ghana"} />
        </div>
        <input className={field} name="postalCode" placeholder="Postal code" />
        <textarea className={field} name="deliveryInstructions" rows={3} placeholder="Delivery instructions" />
        <fieldset className="grid gap-2">
          <legend className="nav-link mb-2">Delivery</legend>
          {methods.map((method) => (
            <label key={method.id} className="flex items-start justify-between gap-4 border border-line p-3">
              <span>
                <input
                  type="radio"
                  name="shipping"
                  checked={shippingMethodId === method.id}
                  onChange={() => {
                    setShippingMethodId(method.id)
                    void requote(method.id)
                  }}
                />
                <span className="ml-2">{method.name}</span>
                <span className="mt-1 block text-sm text-mute">{method.description} {method.eta}</span>
              </span>
              <span>{formatMoney(method.amount)}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="nav-link mb-2">Payment</legend>
          <label className="border border-line p-3">
            <input type="radio" name="payment" checked={paymentMethod === "paystack"} disabled={!paystack} onChange={() => setPaymentMethod("paystack")} />
            <span className="ml-2">Card or mobile money</span>
            {paystack ? null : <span className="mt-1 block text-sm text-mute">Paystack is not configured. Add PAYSTACK_SECRET_KEY to take card and mobile-money payments.</span>}
          </label>
          <label className="border border-line p-3">
            <input type="radio" name="payment" checked={paymentMethod === "pay_on_delivery"} onChange={() => setPaymentMethod("pay_on_delivery")} />
            <span className="ml-2">Pay on delivery</span>
            <span className="mt-1 block text-sm text-mute">Stays pending until the studio confirms the cash payment. This does not mark the order paid.</span>
          </label>
        </fieldset>
      </div>
      <aside className="h-fit border border-line p-5">
        {quote.lines.map((line) => (
          <div key={line.itemId} className="mb-4 flex justify-between gap-3 text-sm">
            <span>{line.name} · {line.size} × {line.quantity}</span>
            <span>{formatMoney(line.lineTotal, quote.currency)}</span>
          </div>
        ))}
        <dl className="grid gap-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(quote.subtotal, quote.currency)}</dd></div>
          <div className="flex justify-between"><dt>Discount</dt><dd>{formatMoney(quote.discount, quote.currency)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd>{quote.shippingName ? formatMoney(quote.shipping, quote.currency) : "Choose a method"}</dd></div>
          <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(quote.tax, quote.currency)}</dd></div>
          <div className="flex justify-between text-base"><dt>Total</dt><dd>{formatMoney(quote.total, quote.currency)}</dd></div>
        </dl>
        {error ? <p className="mt-4 text-sm">{error}</p> : null}
        <button disabled={pending || !shippingMethodId} className="mt-5 w-full bg-ink py-4 nav-link text-paper">
          {pending ? "Placing order" : paymentMethod === "paystack" ? "Continue to Paystack" : "Place order"}
        </button>
      </aside>
    </form>
  )
}
