import Link from "next/link"
import { adminOrders } from "@/lib/admin"
import { formatMoney } from "@/lib/money"

export const metadata = { title: "Orders" }

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = q?.trim().toLowerCase() ?? ""
  const orders = (await adminOrders()).filter((order) => {
    if (!query) return true
    return [order.order_number, order.customer_name, order.customer_email].some((value) => value.toLowerCase().includes(query))
  })
  return (
    <div>
      <h1 className="display text-4xl">Orders</h1>
      {orders.length === 0 ? <p className="mt-4 text-mute">{query ? `No orders match “${q?.trim()}”.` : "No orders yet. Revenue stays at zero until a payment is verified or a delivery payment is confirmed."}</p> : (
        <table className="mt-6 w-full text-left text-sm">
          <thead><tr className="border-b border-line"><th className="py-2">Order</th><th>Customer</th><th>Payment</th><th>Fulfillment</th><th>Total</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-line">
                <td className="py-3"><Link className="underline" href={`/admin/orders/${order.id}`}>{order.order_number}</Link></td>
                <td>{order.customer_name}</td>
                <td>{order.payment_status}</td>
                <td>{order.fulfillment_status}</td>
                <td>{formatMoney(order.total_amount, order.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
