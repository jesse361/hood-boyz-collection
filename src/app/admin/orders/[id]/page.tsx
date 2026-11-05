import { notFound } from "next/navigation"
import { RefundForm } from "@/components/refund-form"
import { adminOrder } from "@/lib/admin"
import { formatMoney } from "@/lib/money"
import { confirmDeliveryPaymentAction, fulfillmentAction, shipmentAction } from "@/server/admin-actions"

export const dynamic = "force-dynamic"

type Item = { name: string; sku: string; quantity: number; lineTotal: string; variant: { size?: string; color?: string } }
type Event = { id: string; event: string; note: string | null; to: string | null; at: string }
type Shipment = { carrier: string; tracking: string; notes: string | null }
type Refund = { amount: string; status: string; reason: string; method: string }

export default async function OrderAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await adminOrder(id)
  if (!row) notFound()
  const order = row as {
    id: string
    order_number: string
    customer_name: string
    customer_email: string
    customer_phone: string | null
    payment_status: string
    fulfillment_status: string
    payment_method: string | null
    total_amount: string
    currency: string
    subtotal: string
    discount_amount: string
    shipping_amount: string
    tax_amount: string
    items: Item[]
    events: Event[]
    shipments: Shipment[]
    refunds: Refund[]
    shipping_address: { street?: string; city?: string; region?: string }
  }
  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <h1 className="display text-4xl">{order.order_number}</h1>
        <p className="mt-2">{order.customer_name} · {order.customer_email} · {order.customer_phone}</p>
        <p className="mt-2 text-sm">Payment {order.payment_status} · {order.payment_method} · Fulfillment {order.fulfillment_status}</p>
        <p className="mt-2 text-sm text-mute">{order.shipping_address?.street}, {order.shipping_address?.city}, {order.shipping_address?.region}</p>
        <ul className="mt-6 divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.sku} className="flex justify-between py-2 text-sm">
              <span>{item.name} · {item.variant?.color}/{item.variant?.size} × {item.quantity}</span>
              <span>{formatMoney(item.lineTotal, order.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4">Total {formatMoney(order.total_amount, order.currency)}</p>
        <h2 className="mt-8 display text-2xl">History</h2>
        <ul className="mt-3 text-sm">{order.events.map((event) => <li key={event.id}>{event.event}: {event.note}</li>)}</ul>
      </div>
      <div className="grid gap-6">
        {order.payment_method === "pay_on_delivery" && order.payment_status === "pending" ? (
          <form action={confirmDeliveryPaymentAction} className="border border-line p-4">
            <input type="hidden" name="id" value={order.id} />
            <p className="text-sm">Confirming this records the cash as paid. It cannot be done from the storefront.</p>
            <button className="mt-3 bg-ink px-3 py-2 text-paper">Confirm delivery payment</button>
          </form>
        ) : null}
        <form action={fulfillmentAction} className="grid gap-2 border border-line p-4">
          <input type="hidden" name="id" value={order.id} />
          <select name="status" defaultValue={order.fulfillment_status} className="border border-line px-2 py-2">
            {["unfulfilled", "processing", "shipped", "delivered", "cancelled"].map((status) => <option key={status}>{status}</option>)}
          </select>
          <input name="note" placeholder="Note" className="border border-line px-2 py-2" />
          <button className="border border-ink px-3 py-2">Update fulfillment</button>
        </form>
        <form action={shipmentAction} className="grid gap-2 border border-line p-4">
          <input type="hidden" name="id" value={order.id} />
          <input name="carrier" placeholder="Carrier" className="border border-line px-2 py-2" required />
          <input name="tracking" placeholder="Tracking number" className="border border-line px-2 py-2" required />
          <input name="notes" placeholder="Notes" className="border border-line px-2 py-2" />
          <button className="border border-ink px-3 py-2">Add shipment</button>
        </form>
        {order.shipments.map((shipment) => <p key={shipment.tracking} className="text-sm">{shipment.carrier} · {shipment.tracking}</p>)}
        <RefundForm id={order.id} currency={order.currency} />
        {order.refunds.map((refund) => <p key={refund.reason} className="text-sm">{refund.status} {formatMoney(refund.amount, order.currency)} · {refund.reason}</p>)}
      </div>
    </div>
  )
}
