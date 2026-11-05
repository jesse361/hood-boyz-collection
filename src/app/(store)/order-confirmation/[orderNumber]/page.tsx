import Link from "next/link"
import { getOrderForViewer } from "@/lib/commerce"
import { formatMoney } from "@/lib/money"

export const dynamic = "force-dynamic"

type Item = { name: string; sku: string; variant: { size?: string; color?: string }; quantity: number; unitPrice: string; lineTotal: string }
type Shipment = { carrier: string; tracking: string; notes: string | null; shippedAt: string | null }
type Address = { street?: string; city?: string; region?: string; country?: string; phone?: string }

export default async function ConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params
  const row = await getOrderForViewer(decodeURIComponent(orderNumber))
  if (!row) {
    return (
      <div className="px-5 py-16 md:px-10">
        <h1 className="display text-4xl">Order</h1>
        <p className="mt-4 max-w-lg text-mute">This page opens after checkout, from your account, or when the order number matches the checkout email.</p>
        <Link href="/track-order" className="mt-6 inline-block underline">Track with email</Link>
      </div>
    )
  }
  const order = row as {
    order_number: string
    customer_name: string
    customer_email: string
    payment_status: string
    fulfillment_status: string
    payment_method: string | null
    subtotal: string
    discount_amount: string
    shipping_amount: string
    tax_amount: string
    total_amount: string
    currency: string
    shipping_method: string | null
    expected_delivery: string | null
    items: Item[]
    shipments: Shipment[]
    shipping_address: Address
    created_at: string | Date
  }
  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      <p className="nav-link text-mute">Receipt</p>
      <h1 className="display mt-3 text-4xl">{order.order_number}</h1>
      <p className="mt-3 text-mute">{order.customer_name} · {order.customer_email}</p>
      <p className="mt-6 border border-line p-4">
        Payment is <strong>{order.payment_status}</strong> via {order.payment_method === "pay_on_delivery" ? "pay on delivery" : order.payment_method}.
        {order.payment_status === "pending" ? " Pending is not paid." : null}
      </p>
      <p className="mt-3 text-sm">Fulfillment: {order.fulfillment_status}. {order.shipping_method} {order.expected_delivery ? `· ${order.expected_delivery}` : ""}</p>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {order.items.map((item) => (
          <li key={item.sku + item.name} className="flex justify-between gap-4 py-3 text-sm">
            <span>{item.name} · {item.variant?.color} / {item.variant?.size} × {item.quantity}</span>
            <span>{formatMoney(item.lineTotal, order.currency)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 grid gap-1 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotal, order.currency)}</dd></div>
        <div className="flex justify-between"><dt>Discount</dt><dd>{formatMoney(order.discount_amount, order.currency)}</dd></div>
        <div className="flex justify-between"><dt>Delivery</dt><dd>{formatMoney(order.shipping_amount, order.currency)}</dd></div>
        <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(order.tax_amount, order.currency)}</dd></div>
        <div className="flex justify-between text-base"><dt>Total</dt><dd>{formatMoney(order.total_amount, order.currency)}</dd></div>
      </dl>
      <p className="mt-6 text-sm text-mute">
        {order.shipping_address?.street}, {order.shipping_address?.city}, {order.shipping_address?.region}
      </p>
      {order.shipments?.length ? (
        <div className="mt-6">
          <h2 className="display text-2xl">Shipments</h2>
          {order.shipments.map((shipment) => (
            <p key={shipment.tracking} className="mt-2 text-sm">{shipment.carrier} · {shipment.tracking}</p>
          ))}
        </div>
      ) : <p className="mt-6 text-sm text-mute">No shipment has been recorded.</p>}
      <p className="mt-8 text-sm print:hidden">Print this page to keep the receipt.</p>
    </article>
  )
}
