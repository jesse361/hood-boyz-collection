import Link from "next/link"
import { formatMoney } from "@/lib/money"
import { BarChart3, Bell, Box, Megaphone, PackagePlus, Percent, TrendingUp, Users, Wallet } from "lucide-react"

type SeriesPoint = { day: string; revenue: number; orders: number; customers: number }
type ProductRow = { name: string; units: number; revenue: string; image: string | null }
type CategoryRow = { name: string; revenue: number }
type OrderRow = {
  id: string
  order_number: string
  customer_name: string
  total_amount: string
  currency: string
  payment_status: string
  fulfillment_status: string
  created_at: Date
  items: number
}
type ActivityRow = { id: string; at: Date; title: string; detail: string }

const ranges = [
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
  { days: 365, label: "1Y" },
]

const sliceColors = ["#c6a15b", "#5b6cff", "#21a366", "#e36a8d", "#7c6a58", "#8b93a7"]

export function AdminDashboard({
  firstName,
  days,
  revenueNow,
  revenuePrev,
  ordersNow,
  ordersPrev,
  customers,
  customersNow,
  customersPrev,
  series,
  products,
  categories,
  recent,
  activity,
}: {
  firstName: string
  days: number
  revenueNow: number
  revenuePrev: number
  ordersNow: number
  ordersPrev: number
  customers: number
  customersNow: number
  customersPrev: number
  series: SeriesPoint[]
  products: ProductRow[]
  categories: CategoryRow[]
  recent: OrderRow[]
  activity: ActivityRow[]
}) {
  const rangeLabel = days === 365 ? "Last year" : `Last ${days} days`
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-3xl text-[#1c2434]">Welcome back, {firstName}!</h1>
          <p className="mt-1 text-sm text-[#7b8494]">Here&apos;s what&apos;s happening with Hood Boyz today.</p>
        </div>
        <p className="rounded-xl border border-[#e6eaf2] bg-white px-3 py-2 text-sm text-[#5c677a]">{rangeLabel}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Wallet} tint="bg-[#eef2ff] text-[#4453d6]" label="Total sales" value={formatMoney(revenueNow)} change={delta(revenueNow, revenuePrev)} points={series.map((point) => point.revenue)} stroke="#4453d6" />
        <Metric icon={Box} tint="bg-[#f3eefe] text-[#7a4de0]" label="Total orders" value={ordersNow.toLocaleString("en-GH")} change={delta(ordersNow, ordersPrev)} points={series.map((point) => point.orders)} stroke="#7a4de0" />
        <Metric icon={Users} tint="bg-[#e9f8ef] text-[#1d9a57]" label="Total customers" value={customers.toLocaleString("en-GH")} change={delta(customersNow, customersPrev)} points={series.map((point) => point.customers)} stroke="#1d9a57" />
        <Metric icon={TrendingUp} tint="bg-[#fff4e8] text-[#d98324]" label="Total revenue" value={formatMoney(revenueNow)} change={delta(revenueNow, revenuePrev)} points={series.map((point) => point.revenue)} stroke="#d98324" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)_220px]">
        <article className="rounded-2xl border border-[#e6eaf2] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-medium text-[#5c677a]"><BarGlyph /> Sales overview</h2>
              <p className="display mt-2 text-3xl text-[#1c2434]">{formatMoney(revenueNow)}</p>
              <Change value={delta(revenueNow, revenuePrev)} suffix="vs previous period" />
            </div>
            <div className="flex rounded-xl bg-[#f4f6fb] p-1 text-xs font-medium">
              {ranges.map((range) => (
                <Link key={range.days} href={range.days === 30 ? "/admin" : `/admin?range=${range.days}`} className={`rounded-lg px-2.5 py-1.5 ${days === range.days ? "bg-white text-[#1c2434] shadow-sm" : "text-[#7b8494]"}`}>{range.label}</Link>
              ))}
            </div>
          </div>
          <SalesChart series={series} />
        </article>

        <article className="rounded-2xl border border-[#e6eaf2] bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-[#5c677a]">Top products</h2>
            <Link href="/admin/products" className="text-xs font-medium text-[#8a6a2f]">View all</Link>
          </div>
          {products.length === 0 ? <p className="mt-6 text-sm text-[#7b8494]">No product sales in this period.</p> : (
            <ol className="mt-4 grid gap-3">
              {products.map((product, index) => (
                <li key={product.name} className="flex items-center gap-3">
                  <span className="w-4 text-xs text-[#98a2b3]">{index + 1}</span>
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt="" className="size-10 rounded-lg object-cover" />
                  ) : <span className="grid size-10 place-items-center rounded-lg bg-[#f4f1e8] text-xs text-[#8a6a2f]">HB</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-[#1c2434]">{product.name}</span>
                    <span className="text-xs text-[#7b8494]">{formatMoney(Number(product.revenue) / Math.max(product.units, 1))}</span>
                  </span>
                  <span className="text-xs text-[#7b8494]">{product.units} sold</span>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="rounded-2xl border border-[#e6eaf2] bg-white p-5">
          <h2 className="text-sm font-medium text-[#5c677a]">Quick actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Action href="/admin/products/new" icon={PackagePlus} label="Add product" className="bg-[#eef2ff] text-[#4453d6]" />
            <Action href="/admin/discounts" icon={Percent} label="Create discount" className="bg-[#fff1f4] text-[#d4537e]" />
            <Action href="/admin/newsletter" icon={Megaphone} label="Newsletter" className="bg-[#fff6ea] text-[#d98324]" />
            <Action href="/admin/analytics" icon={BarChart3} label="View reports" className="bg-[#e9f8ef] text-[#1d9a57]" />
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_280px_280px]">
        <article className="overflow-hidden rounded-2xl border border-[#e6eaf2] bg-white">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-sm font-medium text-[#5c677a]">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-medium text-[#8a6a2f]">View all</Link>
          </div>
          {recent.length === 0 ? <p className="px-5 py-8 text-sm text-[#7b8494]">No orders yet.</p> : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs text-[#98a2b3]">
                  <tr>
                    <th className="px-5 py-2 font-medium">#</th>
                    <th className="py-2 font-medium">Customer</th>
                    <th className="py-2 font-medium">Items</th>
                    <th className="py-2 font-medium">Total</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Date</th>
                    <th className="px-5 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((order) => (
                    <tr key={order.id} className="border-t border-[#eef1f6]">
                      <td className="px-5 py-3 text-[#5c677a]">{order.order_number}</td>
                      <td className="py-3">{order.customer_name}</td>
                      <td className="py-3 text-[#5c677a]">{order.items} {order.items === 1 ? "item" : "items"}</td>
                      <td className="py-3">{formatMoney(order.total_amount, order.currency)}</td>
                      <td className="py-3"><Status status={orderLabel(order)} /></td>
                      <td className="py-3 text-[#5c677a]">{formatDay(order.created_at)}</td>
                      <td className="px-5 py-3"><Link href={`/admin/orders/${order.id}`} className="font-medium text-[#8a6a2f]">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
        <CategoryCard categories={categories} />
        <article className="rounded-2xl border border-[#e6eaf2] bg-white p-5">
          <h2 className="text-sm font-medium text-[#5c677a]">System activity</h2>
          {activity.length === 0 ? <p className="mt-6 text-sm text-[#7b8494]">No activity yet.</p> : (
            <ul className="mt-4 grid gap-4">
              {activity.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <Bell className="mt-0.5 size-4 shrink-0 text-[#c6a15b]" aria-hidden />
                  <span>
                    <span className="block text-sm text-[#1c2434]">{item.title}</span>
                    <span className="block text-xs text-[#7b8494]">{item.detail}</span>
                    <span className="block text-xs text-[#98a2b3]">{timeAgo(item.at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  )
}

function Metric({ icon: Icon, tint, label, value, change, points, stroke }: { icon: typeof Wallet; tint: string; label: string; value: string; change: number | null; points: number[]; stroke: string }) {
  return (
    <article className="rounded-2xl border border-[#e6eaf2] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-10 place-items-center rounded-xl ${tint}`}><Icon className="size-5" aria-hidden /></span>
        <Sparkline points={points} stroke={stroke} />
      </div>
      <p className="mt-4 text-xs text-[#7b8494]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-[#1c2434]">{value}</p>
      <Change value={change} />
    </article>
  )
}

function Change({ value, suffix }: { value: number | null; suffix?: string }) {
  if (value === null) return <p className="mt-1 text-xs font-medium text-[#1d9a57]">New{suffix ? ` ${suffix}` : ""}</p>
  const up = value >= 0
  return <p className={`mt-1 text-xs font-medium ${up ? "text-[#1d9a57]" : "text-[#d4537e]"}`}>{up ? "↑" : "↓"} {Math.abs(value).toFixed(1)}%{suffix ? ` ${suffix}` : ""}</p>
}

function Action({ href, icon: Icon, label, className }: { href: string; icon: typeof PackagePlus; label: string; className: string }) {
  return (
    <Link href={href} className={`grid min-h-24 place-items-center rounded-2xl px-2 text-center text-xs font-medium ${className}`}>
      <span className="grid justify-items-center gap-2"><Icon className="size-5" aria-hidden />{label}</span>
    </Link>
  )
}

function BarGlyph() {
  return <span className="grid size-6 place-items-center rounded-md bg-[#eef2ff] text-[#4453d6]" aria-hidden>▦</span>
}

function Sparkline({ points, stroke }: { points: number[]; stroke: string }) {
  const sample = points.length > 24 ? points.filter((_, index) => index % Math.ceil(points.length / 24) === 0) : points
  const max = Math.max(...sample, 1)
  const width = 92
  const height = 36
  const step = sample.length > 1 ? width / (sample.length - 1) : width
  const line = sample.map((point, index) => `${index === 0 ? "M" : "L"}${(index * step).toFixed(1)},${(height - (point / max) * (height - 4) - 2).toFixed(1)}`).join(" ")
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-24" aria-hidden>
      <path d={line || "M0,34 L92,34"} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function SalesChart({ series }: { series: SeriesPoint[] }) {
  const width = 640
  const height = 220
  const pad = 28
  const max = Math.max(...series.map((point) => point.revenue), 1)
  const step = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0
  const coords = series.map((point, index) => {
    const x = pad + index * step
    const y = height - pad - (point.revenue / max) * (height - pad * 2)
    return [x, y] as const
  })
  const line = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const last = coords.at(-1) ?? [pad, height - pad]
  const area = coords.length ? `${line} L${last[0].toFixed(1)},${height - pad} L${pad},${height - pad} Z` : ""
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  const labelEvery = Math.max(1, Math.ceil(series.length / 5))
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-56 w-full" role="img" aria-label={`Paid sales ${formatMoney(series.reduce((sum, point) => sum + point.revenue, 0))}`}>
      {ticks.map((tick) => {
        const y = height - pad - tick * (height - pad * 2)
        return <line key={tick} x1={pad} x2={width - 8} y1={y} y2={y} stroke="#eef1f6" />
      })}
      {area ? <path d={area} fill="rgba(91,108,255,0.12)" /> : null}
      <path d={line || `M${pad},${height - pad} L${width - pad},${height - pad}`} fill="none" stroke="#5b6cff" strokeWidth="2.5" />
      {last ? <circle cx={last[0]} cy={last[1]} r="4" fill="#5b6cff" /> : null}
      {series.map((point, index) => index % labelEvery === 0 ? (
        <text key={point.day} x={pad + index * step} y={height - 8} textAnchor="middle" className="fill-[#98a2b3]" fontSize="11">{shortDay(point.day)}</text>
      ) : null)}
    </svg>
  )
}

function CategoryCard({ categories }: { categories: CategoryRow[] }) {
  const total = categories.reduce((sum, row) => sum + row.revenue, 0)
  const slices = categories.reduce<Array<CategoryRow & { fraction: number; start: number; color: string }>>((list, row, index) => {
    const fraction = total === 0 ? 0 : row.revenue / total
    const start = list.reduce((sum, slice) => sum + slice.fraction, 0)
    return [...list, { ...row, fraction, start, color: sliceColors[index % sliceColors.length] }]
  }, [])
  return (
    <article className="rounded-2xl border border-[#e6eaf2] bg-white p-5">
      <h2 className="text-sm font-medium text-[#5c677a]">Sales by category</h2>
      {total === 0 ? <p className="mt-6 text-sm text-[#7b8494]">No category sales in this period.</p> : (
        <div className="mt-4 grid justify-items-center gap-4">
          <svg viewBox="0 0 120 120" className="size-36" role="img" aria-label="Sales share by category">
            {slices.map((slice) => (
              <circle key={slice.name} cx="60" cy="60" r="42" fill="none" stroke={slice.color} strokeWidth="16" strokeDasharray={`${slice.fraction * 264} 264`} strokeDashoffset={-slice.start * 264} transform="rotate(-90 60 60)" />
            ))}
            <text x="60" y="58" textAnchor="middle" fontSize="11" className="fill-[#7b8494]">Sales</text>
            <text x="60" y="74" textAnchor="middle" fontSize="11" fontWeight="600" className="fill-[#1c2434]">{formatMoney(total).replace(".00", "")}</text>
          </svg>
          <ul className="grid w-full gap-2 text-sm">
            {slices.map((slice) => (
              <li key={slice.name} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[#5c677a]"><span className="size-2.5 rounded-full" style={{ background: slice.color }} />{slice.name}</span>
                <span>{Math.round(slice.fraction * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}

function Status({ status }: { status: string }) {
  const tone = status === "Paid" || status === "Delivered" ? "bg-[#e9f8ef] text-[#1d9a57]" : status === "Pending" ? "bg-[#fff6ea] text-[#d98324]" : status === "Shipped" ? "bg-[#eef2ff] text-[#4453d6]" : "bg-[#f4f6fb] text-[#5c677a]"
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{status}</span>
}

function orderLabel(order: OrderRow) {
  if (order.fulfillment_status === "shipped") return "Shipped"
  if (order.fulfillment_status === "delivered") return "Delivered"
  if (order.fulfillment_status === "processing") return "Processing"
  if (order.payment_status === "paid") return "Paid"
  if (order.payment_status === "pending") return "Pending"
  return order.payment_status.replaceAll("_", " ")
}

function delta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

function formatDay(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" })
}

function shortDay(day: string) {
  const [, month, date] = day.split("-")
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${names[Number(month) - 1]} ${Number(date)}`
}

function timeAgo(value: Date | string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}
