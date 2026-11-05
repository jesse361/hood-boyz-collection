import Link from "next/link"
import { ProductGrid } from "@/components/product-card"
import type { CardProduct, ProductFilters } from "@/types/store"

type Facets = {
  categories: Array<{ name: string; slug: string }>
  collections: Array<{ name: string; slug: string }>
  sizes: string[]
  colors: string[]
}

const swatches: Record<string, string> = {
  Black: "#161616",
  White: "#f4f4f2",
  "Heather grey": "#c5c5c1",
  "Forest / Orange": "linear-gradient(135deg, #0e6b3c 50%, #e26a1a 50%)",
}

const sizeRank = ["S", "M", "L", "XL", "OS"]

function query(filters: ProductFilters, patch: Partial<ProductFilters> & { page?: number }) {
  const next = { ...filters, ...patch }
  const params = new URLSearchParams()
  if (next.category) params.set("category", next.category)
  if (next.collection) params.set("collection", next.collection)
  if (next.size) params.set("size", next.size)
  if (next.color) params.set("color", next.color)
  if (next.min != null) params.set("min", String(next.min))
  if (next.max != null) params.set("max", String(next.max))
  if (next.availability) params.set("availability", next.availability)
  if (next.sale) params.set("sale", "1")
  if (next.newest) params.set("new", "1")
  if (next.q) params.set("q", next.q)
  if (next.sort && next.sort !== "featured") params.set("sort", next.sort)
  if (next.page && next.page > 1) params.set("page", String(next.page))
  const value = params.toString()
  return value ? `?${value}` : ""
}

export function Catalog({
  title,
  body,
  products,
  total,
  page,
  pages,
  facets,
  filters,
  path,
}: {
  title: string
  body?: string
  products: CardProduct[]
  total: number
  page: number
  pages: number
  facets: Facets
  filters: ProductFilters
  path: string
}) {
  const sorts = [
    ["featured", "Featured"],
    ["newest", "Newest"],
    ["price-asc", "Price ↑"],
    ["price-desc", "Price ↓"],
    ["best", "Best"],
  ] as const
  const sizes = [...facets.sizes].sort((a, b) => sizeRank.indexOf(a) - sizeRank.indexOf(b))
  const panel = (
    <FilterPanel path={path} filters={filters} facets={{ ...facets, sizes }} />
  )

  return (
    <div>
      <header className="relative overflow-hidden border-b border-line px-5 py-12 md:px-10 md:py-16">
        <p className="pointer-events-none absolute -top-6 right-4 display text-[7rem] leading-none text-ink/[0.05] md:right-10 md:text-[10rem]">
          {String(total).padStart(2, "0")}
        </p>
        <p className="nav-link text-gold">Hood Boyz · The edit</p>
        <h1 className="display relative mt-3 max-w-4xl text-5xl md:text-7xl">{title}</h1>
        <div className="mt-5 flex items-center gap-3">
          <span className="h-px w-16 bg-gold" />
          <span className="h-1.5 w-1.5 bg-gold" />
        </div>
        {body ? <p className="relative mt-4 max-w-xl text-base leading-7 text-mute">{body}</p> : null}
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-3 text-[11px] tracking-[0.22em] text-mute uppercase">
          <span>Accra</span>
          <span className="text-gold">◆</span>
          <span>Streetwear</span>
          <span className="text-gold">◆</span>
          <span>Hood Boyz</span>
          <span className="text-gold">◆</span>
          <span>Ghana</span>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-line bg-white/70 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-auto px-6 py-8">{panel}</div>
        </aside>
        <div>
          <details className="group border-b border-line bg-white/80 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
              <span className="nav-link">Refine</span>
              <span className="grid h-7 w-7 place-items-center border border-ink text-lg leading-none group-open:bg-ink group-open:text-paper">+</span>
            </summary>
            <div className="border-t border-line px-5 py-6">{panel}</div>
          </details>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-ink px-5 py-3 text-paper md:px-8">
            <p className="nav-link text-gold">{total} {total === 1 ? "piece" : "pieces"}</p>
            <div className="flex gap-4 overflow-auto text-[11px] tracking-[0.16em] uppercase">
              {sorts.map(([value, label]) => (
                <Link
                  key={value}
                  href={`${path}${query(filters, { sort: value, page: 1 })}`}
                  className={filters.sort === value ? "text-paper underline decoration-gold underline-offset-4" : "text-white/55"}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <ActiveChips path={path} filters={filters} facets={facets} />
          <ProductGrid products={products} />
          <div className="flex items-center justify-between px-5 pb-16 md:px-8">
            <p className="nav-link text-mute">Page {page} / {pages}</p>
            <div className="flex gap-2">
              {page > 1 ? <Link href={`${path}${query(filters, { page: page - 1 })}`} className="border border-ink px-4 py-2 text-xs tracking-[0.16em] uppercase">Previous</Link> : null}
              {page < pages ? <Link href={`${path}${query(filters, { page: page + 1 })}`} className="bg-ink px-4 py-2 text-xs tracking-[0.16em] text-paper uppercase">Next</Link> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActiveChips({ path, filters, facets }: { path: string; filters: ProductFilters; facets: Facets }) {
  const chips = [
    filters.category ? { label: facets.categories.find((item) => item.slug === filters.category)?.name || filters.category, href: `${path}${query(filters, { category: undefined, page: 1 })}` } : null,
    filters.collection ? { label: facets.collections.find((item) => item.slug === filters.collection)?.name || filters.collection, href: `${path}${query(filters, { collection: undefined, page: 1 })}` } : null,
    filters.size ? { label: `Size ${filters.size}`, href: `${path}${query(filters, { size: undefined, page: 1 })}` } : null,
    filters.color ? { label: filters.color, href: `${path}${query(filters, { color: undefined, page: 1 })}` } : null,
    filters.availability === "in" ? { label: "In stock", href: `${path}${query(filters, { availability: "", page: 1 })}` } : null,
    filters.sale ? { label: "On sale", href: `${path}${query(filters, { sale: false, page: 1 })}` } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3 md:px-8">
      {chips.map((chip) => (
        <Link key={chip.label} href={chip.href} className="border border-ink bg-white px-3 py-1 text-[11px] tracking-[0.14em] uppercase">
          {chip.label} ×
        </Link>
      ))}
    </div>
  )
}

function FilterPanel({
  path,
  filters,
  facets,
}: {
  path: string
  filters: ProductFilters
  facets: Facets
}) {
  return (
    <div className="grid gap-8">
      <Group label="Category">
        {facets.categories.map((item) => (
          <Link
            key={item.slug}
            href={`${path}${query(filters, { category: filters.category === item.slug ? undefined : item.slug, page: 1 })}`}
            className={`block border-l-2 py-1 pl-3 text-sm ${filters.category === item.slug ? "border-gold bg-ink text-paper" : "border-transparent hover:border-ink"}`}
          >
            {item.name}
          </Link>
        ))}
      </Group>
      <Group label="Collection">
        {facets.collections.map((item) => (
          <Link
            key={item.slug}
            href={`${path}${query(filters, { collection: filters.collection === item.slug ? undefined : item.slug, page: 1 })}`}
            className={`block border-l-2 py-1 pl-3 text-sm ${filters.collection === item.slug ? "border-gold bg-ink text-paper" : "border-transparent hover:border-ink"}`}
          >
            {item.name}
          </Link>
        ))}
      </Group>
      <Group label="Size">
        <div className="flex flex-wrap gap-2">
          {facets.sizes.map((size) => (
            <Link
              key={size}
              href={`${path}${query(filters, { size: filters.size === size ? undefined : size, page: 1 })}`}
              className={`grid h-10 min-w-10 place-items-center border px-2 text-xs tracking-widest ${filters.size === size ? "border-ink bg-ink text-paper" : "border-line bg-white hover:border-ink"}`}
            >
              {size}
            </Link>
          ))}
        </div>
      </Group>
      <Group label="Colour">
        <div className="grid gap-2">
          {facets.colors.map((color) => {
            const paint = swatches[color] || "#d8d4cc"
            const active = filters.color === color
            return (
              <Link
                key={color}
                href={`${path}${query(filters, { color: active ? undefined : color, page: 1 })}`}
                className={`flex items-center gap-3 border px-2 py-2 text-sm ${active ? "border-ink bg-white" : "border-transparent hover:border-line"}`}
              >
                <span className="h-5 w-5 border border-line" style={{ background: paint }} />
                {color}
              </Link>
            )
          })}
        </div>
      </Group>
      <Group label="Edit">
        <div className="flex flex-wrap gap-2">
          <Toggle href={`${path}${query(filters, { availability: filters.availability === "in" ? "" : "in", page: 1 })}`} active={filters.availability === "in"} label="In stock" />
          <Toggle href={`${path}${query(filters, { sale: !filters.sale, page: 1 })}`} active={Boolean(filters.sale)} label="On sale" />
          <Toggle href={`${path}${query(filters, { newest: !filters.newest, page: 1 })}`} active={Boolean(filters.newest)} label="New" />
        </div>
      </Group>
      <form action={path} className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input name="min" defaultValue={filters.min ?? ""} placeholder="Min" className="border border-line bg-white px-2 py-2 text-sm" />
        <input name="max" defaultValue={filters.max ?? ""} placeholder="Max" className="border border-line bg-white px-2 py-2 text-sm" />
        <button className="bg-ink px-3 text-[11px] tracking-[0.14em] text-paper uppercase">Go</button>
      </form>
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="nav-link mb-3 flex items-center gap-2 text-mute">
        <span className="h-1.5 w-1.5 bg-gold" />
        {label}
      </p>
      {children}
    </section>
  )
}

function Toggle({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} className={`border px-3 py-2 text-[11px] tracking-[0.14em] uppercase ${active ? "border-ink bg-ink text-paper" : "border-line bg-white"}`}>
      {label}
    </Link>
  )
}
