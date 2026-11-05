import { analytics } from "@/lib/admin"
import { formatMoney } from "@/lib/money"

export const metadata = { title: "Analytics" }

export default async function AnalyticsPage() {
  const data = await analytics()
  const summary = data.summary
  return (
    <div>
      <h1 className="display text-4xl">Analytics</h1>
      <p className="mt-2 max-w-xl text-sm text-mute">Figures count paid orders only. Pending and demonstration stock are not treated as sales.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="border border-line p-4"><p className="nav-link text-mute">Paid orders</p><p className="text-2xl">{summary?.paid_orders ?? 0}</p></div>
        <div className="border border-line p-4"><p className="nav-link text-mute">Revenue</p><p className="text-2xl">{formatMoney(summary?.revenue ?? "0")}</p></div>
        <div className="border border-line p-4"><p className="nav-link text-mute">Units</p><p className="text-2xl">{summary?.units ?? 0}</p></div>
        <div className="border border-line p-4"><p className="nav-link text-mute">Pending</p><p className="text-2xl">{summary?.pending ?? 0}</p></div>
      </div>
      <h2 className="mt-10 display text-2xl">Paid days</h2>
      {data.days.length === 0 ? <p className="mt-2 text-mute">No paid orders yet.</p> : (
        <table className="mt-3 text-sm"><tbody>{data.days.map((day) => <tr key={day.day}><td className="pr-6 py-1">{day.day}</td><td className="pr-6">{day.orders}</td><td>{formatMoney(day.revenue)}</td></tr>)}</tbody></table>
      )}
      <h2 className="mt-10 display text-2xl">Paid products</h2>
      {data.products.length === 0 ? <p className="mt-2 text-mute">No product has a paid unit yet.</p> : (
        <ul className="mt-3 text-sm">{data.products.map((product) => <li key={product.name}>{product.name} · {product.units} · {formatMoney(product.revenue)}</li>)}</ul>
      )}
    </div>
  )
}
