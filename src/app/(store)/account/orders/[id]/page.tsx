import { notFound } from "next/navigation"
import { getAccountOrder } from "@/lib/account"
import { requireUser } from "@/lib/auth"
import { formatMoney } from "@/lib/money"

export const dynamic = "force-dynamic"

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const row = await getAccountOrder(user.id, id)
  if (!row) notFound()
  const order = row as {
    order_number: string
    payment_status: string
    fulfillment_status: string
    currency: string
    total_amount: string
    items: Array<{ name: string; quantity: number; lineTotal: string; variant: { size?: string; color?: string } }>
    shipments: Array<{ carrier: string; tracking: string }>
  }
  return (
    <div className="px-5 py-10 md:px-10">
      <h1 className="display text-4xl">{order.order_number}</h1>
      <p className="mt-2 text-mute">{order.payment_status} · {order.fulfillment_status}</p>
      <ul className="mt-6 divide-y divide-line">
        {order.items.map((item) => (
          <li key={item.name} className="flex justify-between py-3 text-sm">
            <span>{item.name} · {item.variant?.color} / {item.variant?.size} × {item.quantity}</span>
            <span>{formatMoney(item.lineTotal, order.currency)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4">{formatMoney(order.total_amount, order.currency)}</p>
      {order.shipments?.length ? order.shipments.map((shipment) => (
        <p key={shipment.tracking} className="mt-3 text-sm">{shipment.carrier}: {shipment.tracking}</p>
      )) : <p className="mt-4 text-sm text-mute">No tracking number yet.</p>}
    </div>
  )
}
