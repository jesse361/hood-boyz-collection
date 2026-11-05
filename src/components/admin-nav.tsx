"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Boxes,
  FolderOpen,
  LayoutDashboard,
  Mail,
  Package,
  Percent,
  Settings,
  ShoppingBag,
  Star,
  Tags,
  Ticket,
  Users,
  UsersRound,
} from "lucide-react"

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/collections", label: "Collections", icon: FolderOpen },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, badge: true },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/discounts", label: "Discounts & Sales", icon: Percent },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/content", label: "Content", icon: FolderOpen },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/team", label: "Staff & Permissions", icon: UsersRound },
]

export function AdminNav({ pending, onNavigate }: { pending: number; onNavigate?: () => void }) {
  const path = usePathname()
  return (
    <nav className="grid gap-1">
      {links.map((link) => {
        const active = link.exact ? path === link.href : path === link.href || path.startsWith(`${link.href}/`)
        const Icon = link.icon
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-[#c6a15b] text-[#1a1408]" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">{link.label}</span>
            {link.badge && pending > 0 ? (
              <span className={`rounded-full px-1.5 text-[11px] font-semibold ${active ? "bg-[#1a1408] text-[#f4e7c3]" : "bg-[#e11d48] text-white"}`}>{pending}</span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
