import Link from "next/link"
import { Bell, Search } from "lucide-react"
import { requireAdmin } from "@/lib/auth"
import { pendingOrderCount } from "@/lib/admin"
import { logoutAction } from "@/server/store-actions"
import { AdminNav } from "@/components/admin-nav"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, pending] = await Promise.all([requireAdmin(), pendingOrderCount()])
  const name = `${user.firstName} ${user.lastName}`.trim()
  const role = user.role === "super_admin" ? "Super Admin" : "Admin"
  return (
    <div className="min-h-screen bg-[#f3f5fb] text-[#1c2434] md:grid md:grid-cols-[260px_1fr]">
      <aside className="hidden min-h-screen flex-col bg-[#16181f] px-4 py-5 text-white md:flex">
        <Link href="/" className="display px-2 text-2xl">Hood Boyz</Link>
        <p className="px-2 text-xs text-white/45">Admin panel</p>
        <div className="mt-6 flex-1 overflow-y-auto pr-1"><AdminNav pending={pending} /></div>
        <div className="mt-4 border-t border-white/10 px-2 pt-4 text-xs text-white/60">
          <p className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#3dd68c]" /> Store online</p>
          <form action={logoutAction} className="mt-3"><button className="underline">Sign out</button></form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center gap-3 border-b border-[#e6eaf2] bg-white px-4 py-3 md:px-6">
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded-lg border border-[#e6eaf2] px-3 py-2 text-sm">Menu</summary>
            <div className="absolute z-20 mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-2xl bg-[#16181f] p-3 shadow-xl">
              <AdminNav pending={pending} />
            </div>
          </details>
          <form action="/admin/orders" className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#f4f6fb] px-3 py-2 text-sm text-[#7b8494]">
            <Search className="size-4 shrink-0" aria-hidden />
            <input name="q" placeholder="Search orders and customers" className="w-full bg-transparent outline-none" aria-label="Search orders and customers" />
          </form>
          <Link href="/admin/orders" className="relative grid size-10 place-items-center rounded-full border border-[#e6eaf2]" aria-label={pending ? `${pending} pending orders` : "Orders"}>
            <Bell className="size-4" aria-hidden />
            {pending > 0 ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#e11d48]" /> : null}
          </Link>
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-full bg-[#16181f] text-sm text-[#f4e7c3]">{initials(name)}</span>
            <span className="hidden sm:block">
              <span className="block text-sm font-medium leading-4">{name}</span>
              <span className="text-xs text-[#7b8494]">{role}</span>
            </span>
          </div>
        </header>
        <main className="px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  )
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "HB"
}
