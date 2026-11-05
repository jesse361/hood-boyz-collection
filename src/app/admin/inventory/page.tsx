import { adminInventory, inventoryLog } from "@/lib/admin"
import { adjustStockAction } from "@/server/admin-actions"

export const metadata = { title: "Inventory" }

const sizeRank: Record<string, number> = { XS: 0, S: 1, M: 2, L: 3, XL: 4, XXL: 5, OS: 6 }

type InventoryRow = Awaited<ReturnType<typeof adminInventory>>[number]

export default async function InventoryPage() {
  const [rows, log] = await Promise.all([adminInventory(), inventoryLog()])
  const groups = new Map<string, InventoryRow[]>()
  for (const row of rows) {
    const list = groups.get(row.product_id) ?? []
    list.push(row)
    groups.set(row.product_id, list)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.color.localeCompare(b.color) || (sizeRank[a.size] ?? 99) - (sizeRank[b.size] ?? 99) || a.size.localeCompare(b.size))
  }
  const units = rows.reduce((sum, row) => sum + row.stock_quantity, 0)
  const low = rows.filter((row) => row.stock_quantity <= row.low_stock_threshold).length

  return (
    <div>
      <div>
        <h1 className="display text-3xl text-[#1c2434]">Inventory</h1>
        <p className="mt-1 max-w-xl text-sm text-[#7b8494]">Adjust on-hand stock by size. Every change is written to the audit log.</p>
      </div>

      <section className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Variants" value={String(rows.length)} />
        <Stat label="Units" value={String(units)} />
        <Stat label="Low stock" value={String(low)} warn={low > 0} />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_320px]">
        <div className="grid gap-4">
          {[...groups.values()].map((variants) => {
            const product = variants[0]
            return (
              <article key={product.product_id} className="overflow-hidden rounded-2xl border border-[#e6eaf2] bg-white">
                <header className="flex items-center gap-3 border-b border-[#eef1f6] px-4 py-4">
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt="" className="size-12 rounded-xl object-cover" />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-xl bg-[#f4f1e8] text-xs text-[#8a6a2f]">HB</span>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-medium text-[#1c2434]">{product.name}</h2>
                    <p className="text-xs text-[#7b8494]">{variants.length} {variants.length === 1 ? "size" : "sizes"}{product.sample_data ? " · sample" : ""}</p>
                  </div>
                </header>
                <ul>
                  {variants.map((variant) => {
                    const short = variant.stock_quantity <= variant.low_stock_threshold
                    return (
                      <li key={variant.id} className="border-t border-[#eef1f6] px-4 py-4 first:border-t-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#1c2434]">{variant.color} / {variant.size}</p>
                            <p className="mt-0.5 font-mono text-xs text-[#7b8494]">{variant.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-semibold tabular-nums ${short ? "text-[#d98324]" : "text-[#1c2434]"}`}>{variant.stock_quantity}</p>
                            <p className="text-[11px] uppercase tracking-wide text-[#98a2b3]">{short ? "Low" : "On hand"}</p>
                          </div>
                        </div>
                        <form action={adjustStockAction} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[96px_minmax(0,1fr)_auto]">
                          <input type="hidden" name="variantId" value={variant.id} />
                          <input name="delta" type="number" inputMode="numeric" placeholder="+ / −" required aria-label={`Adjust ${variant.sku}`} className="w-full rounded-lg border border-[#e6eaf2] bg-[#f8f9fc] px-3 py-2 text-sm outline-none" />
                          <input name="notes" placeholder="Note" aria-label={`Note for ${variant.sku}`} className="w-full rounded-lg border border-[#e6eaf2] bg-[#f8f9fc] px-3 py-2 text-sm outline-none" />
                          <button className="rounded-lg bg-[#16181f] px-4 py-2 text-sm text-white">Save</button>
                        </form>
                      </li>
                    )
                  })}
                </ul>
              </article>
            )
          })}
        </div>

        <aside className="rounded-2xl border border-[#e6eaf2] bg-white p-4">
          <h2 className="text-sm font-medium text-[#5c677a]">Audit</h2>
          {log.length === 0 ? <p className="mt-4 text-sm text-[#7b8494]">No stock movements yet.</p> : (
            <ol className="mt-4 grid gap-4">
              {log.map((entry) => (
                <li key={entry.id} className="grid grid-cols-[auto_1fr] gap-3">
                  <span className={`mt-0.5 rounded-full px-2 py-1 text-xs font-semibold tabular-nums ${entry.quantity < 0 ? "bg-[#fff1f4] text-[#d4537e]" : "bg-[#e9f8ef] text-[#1d9a57]"}`}>
                    {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-[#1c2434]">{entry.name ?? "Variant"}{entry.color && entry.size ? ` · ${entry.color} / ${entry.size}` : ""}</p>
                    <p className="font-mono text-xs text-[#7b8494]">{entry.sku}</p>
                    <p className="mt-1 text-xs capitalize text-[#5c677a]">{entry.transaction_type.replaceAll("_", " ")}</p>
                    {entry.notes ? <p className="mt-1 text-xs leading-5 text-[#7b8494]">{entry.notes}</p> : null}
                    <p className="mt-1 text-[11px] text-[#98a2b3]">{formatWhen(entry.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#e6eaf2] bg-white px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[#98a2b3]">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${warn ? "text-[#d98324]" : "text-[#1c2434]"}`}>{value}</p>
    </div>
  )
}

function formatWhen(value: Date | string) {
  return new Date(value).toLocaleString("en-GH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}
