import { cartCount, getCart, wishlistCount } from "@/lib/commerce"
import { getCurrentUser } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { Chrome } from "@/components/chrome"

export const dynamic = "force-dynamic"

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, user, bag, saved, cart] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    cartCount(),
    wishlistCount(),
    getCart(),
  ])
  return (
    <Chrome settings={settings} user={user} bag={bag} saved={saved} cart={cart}>
      {children}
    </Chrome>
  )
}
