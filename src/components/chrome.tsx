"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Heart, Menu, Search, ShoppingBag, X } from "lucide-react"
import type { SessionUser } from "@/lib/auth"
import type { ContentDefaults } from "@/lib/content-defaults"
import { formatMoney } from "@/lib/money"
import type { Quote } from "@/types/store"
import { couponAction, removeItemAction, updateQuantityAction } from "@/server/store-actions"
import { NewsletterForm } from "@/components/forms"

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/new-arrivals", label: "New" },
  { href: "/collections", label: "Collections" },
  { href: "/categories", label: "Categories" },
]

export function Chrome({
  settings,
  user,
  bag,
  saved,
  cart,
  children,
}: {
  settings: ContentDefaults
  user: SessionUser | null
  bag: number
  saved: number
  cart: Quote
  children: React.ReactNode
}) {
  const router = useRouter()
  const [menu, setMenu] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<Array<{ slug: string; name: string; price: string }>>([])
  const staff = user?.role === "admin" || user?.role === "super_admin"
  const accountHref = staff ? "/admin" : user ? "/account" : "/account/login"
  const accountLabel = staff ? "Admin" : user ? "Account" : "Login"

  useEffect(() => {
    const open = () => setDrawer(true)
    window.addEventListener("hb-cart-open", open)
    return () => window.removeEventListener("hb-cart-open", open)
  }, [])

  useEffect(() => {
    const current = query.trim()
    if (current.length < 2) return
    const handle = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((body: { items?: Array<{ slug: string; name: string; price: string }> }) => setHits(body.items ?? []))
        .catch(() => setHits([]))
    }, 180)
    return () => clearTimeout(handle)
  }, [query])

  return (
    <div className="flex min-h-screen flex-col">
      {settings.announcement.enabled ? (
        <Link href={settings.announcement.link || "/new-arrivals"} className="bg-ink px-4 py-2 text-center text-[11px] tracking-[0.18em] text-paper uppercase">
          {settings.announcement.text}
        </Link>
      ) : null}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
          <button className="md:hidden" aria-label="Open menu" onClick={() => setMenu(true)}>
            <Menu size={20} />
          </button>
          <nav className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </nav>
          <Link href="/" className="display text-lg tracking-tight md:absolute md:left-1/2 md:-translate-x-1/2">
            {settings.brand.logoText}
          </Link>
          <div className="flex items-center gap-3">
            <button aria-label="Search" onClick={() => setSearchOpen(true)}><Search size={18} /></button>
            <Link href={accountHref} className="border border-ink px-3 py-2 nav-link">{accountLabel}</Link>
            <Link href="/wishlist" className="relative" aria-label="Wishlist">
              <Heart size={18} />
              {saved > 0 ? <span className="absolute -top-2 -right-2 text-[10px]">{saved}</span> : null}
            </Link>
            <button className="relative" aria-label="Bag" onClick={() => setDrawer(true)}>
              <ShoppingBag size={18} />
              {bag > 0 ? <span className="absolute -top-2 -right-2 text-[10px]">{bag}</span> : null}
            </button>
          </div>
        </div>
      </header>

      {menu ? (
        <div className="fixed inset-0 z-50 bg-ink text-paper">
          <div className="flex justify-end p-5">
            <button aria-label="Close menu" onClick={() => setMenu(false)}><X /></button>
          </div>
          <nav className="grid gap-6 px-8 pt-8">
            <Link href={accountHref} className="display text-4xl" onClick={() => setMenu(false)}>{accountLabel}</Link>
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="display text-4xl" onClick={() => setMenu(false)}>
                {link.label}
              </Link>
            ))}
            <Link href="/about" className="display text-4xl" onClick={() => setMenu(false)}>About</Link>
          </nav>
        </div>
      ) : null}

      {searchOpen ? (
        <div className="fixed inset-0 z-50 bg-paper px-5 pt-8 md:px-16">
          <div className="flex items-center justify-between">
            <p className="nav-link text-mute">Search the edit</p>
            <button aria-label="Close search" onClick={() => setSearchOpen(false)}><X /></button>
          </div>
          <form action="/search" className="mt-8 border-b border-ink">
            <input
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tees, caps, beanies"
              className="display w-full bg-transparent py-4 text-4xl outline-none"
              autoFocus
            />
          </form>
          <ul className="mt-6 grid gap-3">
            {query.trim().length >= 2
              ? hits.map((hit) => (
                <li key={hit.slug}>
                  <Link href={`/products/${hit.slug}`} onClick={() => setSearchOpen(false)} className="flex justify-between">
                    <span>{hit.name}</span>
                    <span>{formatMoney(hit.price)}</span>
                  </Link>
                </li>
              ))
              : null}
          </ul>
        </div>
      ) : null}

      {drawer ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/40">
          <button className="hidden flex-1 md:block" aria-label="Close bag" onClick={() => setDrawer(false)} />
          <aside className="flex h-full w-full flex-col bg-paper p-5 md:max-w-md">
            <div className="flex items-center justify-between">
              <h2 className="display text-2xl">Your bag</h2>
              <button aria-label="Close bag" onClick={() => setDrawer(false)}><X /></button>
            </div>
            <div className="mt-6 flex-1 space-y-5 overflow-auto">
              {cart.lines.length === 0 ? <p className="text-mute">Your bag is empty.</p> : null}
              {cart.lines.map((line) => (
                <div key={line.variantId} className="grid grid-cols-[72px_1fr] gap-3 border-b border-line pb-4">
                  {line.image ? <img src={line.image} alt="" className="h-24 w-full object-cover" /> : <div className="bg-line" />}
                  <div>
                    <p className="font-medium">{line.name}</p>
                    <p className="text-sm text-mute">{line.color} / {line.size}</p>
                    <p className="mt-1">{formatMoney(line.lineTotal, cart.currency)}</p>
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <button onClick={async () => { await updateQuantityAction(line.itemId, line.quantity - 1); router.refresh() }} disabled={line.quantity <= 1}>−</button>
                      <span>{line.quantity}</span>
                      <button onClick={async () => { await updateQuantityAction(line.itemId, line.quantity + 1); router.refresh() }} disabled={line.quantity >= 10}>+</button>
                      <button className="ml-auto underline" onClick={async () => { await removeItemAction(line.itemId); router.refresh() }}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {cart.lines.length > 0 ? (
              <div className="space-y-3 border-t border-line pt-4">
                <form
                  className="flex gap-2"
                  onSubmit={async (event) => {
                    event.preventDefault()
                    const data = new FormData(event.currentTarget)
                    await couponAction(String(data.get("code") ?? ""))
                    router.refresh()
                  }}
                >
                  <input name="code" defaultValue={cart.coupon ?? ""} placeholder="Coupon" className="w-full border border-line px-3 py-2" />
                  <button className="border border-ink px-3">Apply</button>
                </form>
                {cart.couponError ? <p className="text-sm">{cart.couponError}</p> : null}
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatMoney(cart.subtotal, cart.currency)}</span></div>
                <Link href="/cart" onClick={() => setDrawer(false)} className="block border border-ink py-3 text-center nav-link">View bag</Link>
                <Link href="/checkout" onClick={() => setDrawer(false)} className="block bg-ink py-3 text-center nav-link text-paper">Checkout</Link>
              </div>
            ) : (
              <Link href="/shop" onClick={() => setDrawer(false)} className="bg-ink py-3 text-center nav-link text-paper">Shop the edit</Link>
            )}
          </aside>
        </div>
      ) : null}

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-ink text-paper">
        <div className="grid gap-10 px-5 py-14 md:grid-cols-4 md:px-10">
          <div>
            <p className="display text-2xl">{settings.brand.logoText}</p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/70">{settings.brand.description}</p>
          </div>
          <div className="grid gap-2 text-sm">
            <Link href="/shop">Shop</Link>
            <Link href="/new-arrivals">New arrivals</Link>
            <Link href="/size-guide">Size guide</Link>
            <Link href="/track-order">Track an order</Link>
          </div>
          <div className="grid gap-2 text-sm">
            <Link href="/about">About</Link>
            <Link href="/shipping">Shipping</Link>
            <Link href="/returns">Returns</Link>
            <Link href="/faq">Questions</Link>
            <Link href="/contact">Contact</Link>
            <Link href={accountHref}>{accountLabel}</Link>
          </div>
          <NewsletterForm heading={settings.newsletter.heading} body={settings.newsletter.body} />
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 px-5 py-4 text-xs text-white/60 md:px-10">
          <p>{settings.brand.address} · {settings.brand.email}</p>
          <p className="flex gap-4">
            <Link href="/privacy">Privacy</Link>
            <Link href="/cookies">Cookies</Link>
            <Link href="/terms">Terms</Link>
          </p>
        </div>
      </footer>
      <CookieNote />
    </div>
  )
}

function CookieNote() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(window.localStorage.getItem("hb-cookies") !== "1")
  }, [])
  if (!open) return null
  return (
    <div className="fixed right-4 bottom-4 z-40 max-w-sm border border-line bg-paper p-4 shadow-sm">
      <p className="text-sm leading-6">We use a bag cookie and a sign-in cookie. No advertising cookies.</p>
      <div className="mt-3 flex gap-3">
        <button className="bg-ink px-3 py-2 text-xs tracking-widest text-paper uppercase" onClick={() => { localStorage.setItem("hb-cookies", "1"); setOpen(false) }}>OK</button>
        <Link href="/cookies" className="px-3 py-2 text-xs tracking-widest uppercase">Read</Link>
      </div>
    </div>
  )
}
