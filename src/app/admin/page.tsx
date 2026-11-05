import { dashboard } from "@/lib/admin"
import { getCurrentUser } from "@/lib/auth"
import { AdminDashboard } from "@/components/admin-dashboard"

export const metadata = { title: "Admin" }

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams
  const days = range === "7" ? 7 : range === "90" ? 90 : range === "365" ? 365 : 30
  const [data, user] = await Promise.all([dashboard(days), getCurrentUser()])
  const totals = data.totals
  return (
    <AdminDashboard
      firstName={user?.firstName || "there"}
      days={data.days}
      revenueNow={totals?.revenue_now ?? 0}
      revenuePrev={totals?.revenue_prev ?? 0}
      ordersNow={totals?.orders_now ?? 0}
      ordersPrev={totals?.orders_prev ?? 0}
      customers={totals?.customers ?? 0}
      customersNow={totals?.customers_now ?? 0}
      customersPrev={totals?.customers_prev ?? 0}
      series={data.series}
      products={data.products}
      categories={data.categories}
      recent={data.recent}
      activity={data.activity}
    />
  )
}
