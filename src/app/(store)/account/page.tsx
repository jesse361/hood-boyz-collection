import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { listAccountOrders } from "@/lib/account"

export const dynamic = "force-dynamic"

export default async function AccountHome() {
  const user = await requireUser()
  const orders = await listAccountOrders(user.id)
  return (
    <div className="px-5 py-10 md:px-10">
      <h1 className="display text-4xl">Hello, {user.firstName}</h1>
      <p className="mt-2 text-mute">{user.email}{user.emailVerified ? "" : " · email not verified"}</p>
      <p className="mt-6">{orders.length} orders on this account.</p>
      <div className="mt-6 flex gap-4 text-sm">
        <Link href="/account/orders" className="underline">Orders</Link>
        <Link href="/account/export" className="underline">Download your data</Link>
      </div>
    </div>
  )
}
