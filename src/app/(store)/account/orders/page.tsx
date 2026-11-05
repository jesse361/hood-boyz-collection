import Link from "next/link"
import { listAccountOrders } from "@/lib/account"
import { requireUser } from "@/lib/auth"
import { formatMoney } from "@/lib/money"

export const dynamic = "force-dynamic"
export const metadata = { title: "Orders" }

export default async function OrdersPage() {
  const user = await requireUser()
  const orders = await listAccountOrders(user.id)
  return (
    <div className="px-5 py-10 md:px-10">
      <h1 className="display text-4xl">Orders</h1>
      {orders.length === 0 ? <p className="mt-4 text-mute">No orders yet.</p> : (
        <ul className="mt-6 divide-y divide-line">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <Link href={`/account/orders/${order.id}`} className="font-medium">{order.order_number}</Link>
                <p className="text-sm text-mute">{order.payment_status} · {order.fulfillment_status}</p>
              </div>
              <p>{formatMoney(order.total_amount, order.currency)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
