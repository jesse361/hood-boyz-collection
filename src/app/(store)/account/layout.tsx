import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"

const links = [
  ["/account", "Overview"],
  ["/account/profile", "Profile"],
  ["/account/orders", "Orders"],
  ["/account/addresses", "Addresses"],
  ["/account/wishlist", "Wishlist"],
]

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) return children
  return (
    <div className="grid md:grid-cols-[200px_1fr]">
      <aside className="border-b border-line px-5 py-8 md:border-r md:border-b-0">
        <p className="text-sm text-mute">{user.firstName}</p>
        <nav className="mt-4 grid gap-2 text-sm">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  )
}
