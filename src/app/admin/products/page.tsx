import Link from "next/link"
import { adminProducts } from "@/lib/admin"
import { formatMoney } from "@/lib/money"
import { archiveProductAction } from "@/server/admin-actions"

export const metadata = { title: "Products" }

const statusTone: Record<string, string> = {
  active: "bg-[#e9f8ef] text-[#1d9a57]",
  draft: "bg-[#fff6ea] text-[#d98324]",
  archived: "bg-[#f4f6fb] text-[#5c677a]",
}

export default async function ProductsPage() {
  const products = await adminProducts()
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-3xl text-[#1c2434]">Products</h1>
          <p className="mt-1 text-sm text-[#7b8494]">{products.length} {products.length === 1 ? "piece" : "pieces"} in the catalog</p>
        </div>
        <Link href="/admin/products/new" className="rounded-xl bg-[#16181f] px-4 py-2.5 text-sm text-white">New product</Link>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-[#e6eaf2] bg-white">
        {products.length === 0 ? (
          <p className="px-5 py-10 text-sm text-[#7b8494]">No products yet.</p>
        ) : (
          <>
          <ul className="divide-y divide-[#eef1f6] md:hidden">
            {products.map((product) => (
              <li key={product.id} className="grid gap-3 px-4 py-4">
                <Link href={`/admin/products/${product.id}`} className="flex items-center gap-3">
                  <ProductThumb image={product.image} />
                  <span className="min-w-0">
                    <span className="block font-medium text-[#1c2434]">{product.name}</span>
                    <span className="block text-xs text-[#7b8494]">{meta(product)}</span>
                  </span>
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Status status={product.status} />
                  <span className={`text-sm tabular-nums ${product.low_stock ? "font-medium text-[#d98324]" : "text-[#1c2434]"}`}>{product.stock} in stock</span>
                  <span className="text-sm tabular-nums">{formatMoney(product.base_price)}</span>
                  <Archive productId={product.id} archived={product.status === "archived"} />
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#98a2b3]">
                <tr>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-[#eef1f6]">
                    <td className="border-t border-[#eef1f6] px-5 py-3">
                      <Link href={`/admin/products/${product.id}`} className="flex items-center gap-3">
                        <ProductThumb image={product.image} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-[#1c2434]">{product.name}</span>
                          <span className="block truncate text-xs text-[#7b8494]">{meta(product)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="border-t border-[#eef1f6] px-4 py-3"><Status status={product.status} /></td>
                    <td className={`border-t border-[#eef1f6] px-4 py-3 tabular-nums ${product.low_stock ? "font-medium text-[#d98324]" : "text-[#1c2434]"}`}>
                      {product.stock}
                      {product.low_stock ? <span className="mt-0.5 block text-xs font-normal">Low</span> : null}
                    </td>
                    <td className="border-t border-[#eef1f6] px-4 py-3 tabular-nums text-[#1c2434]">{formatMoney(product.base_price)}</td>
                    <td className="border-t border-[#eef1f6] px-5 py-3 text-right"><Archive productId={product.id} archived={product.status === "archived"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  )
}

function ProductThumb({ image }: { image: string | null }) {
  if (!image) return <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#f4f1e8] text-xs text-[#8a6a2f]">HB</span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
}

function Status({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone[status] ?? statusTone.draft}`}>{status}</span>
}

function Archive({ productId, archived }: { productId: string; archived: boolean }) {
  if (archived) return <span className="text-xs text-[#98a2b3]">Archived</span>
  return (
    <form action={archiveProductAction}>
      <input type="hidden" name="id" value={productId} />
      <button className="rounded-lg border border-[#e6eaf2] px-3 py-1.5 text-xs text-[#5c677a]">Archive</button>
    </form>
  )
}

function meta(product: { sku: string; category: string | null; sample_data: boolean }) {
  return [product.sku, product.category, product.sample_data ? "sample" : null].filter(Boolean).join(" · ")
}
