import { adminDiscounts } from "@/lib/admin"
import { saveDiscountAction } from "@/server/admin-actions"

export const metadata = { title: "Discounts" }
const field = "border border-line px-2 py-2"

export default async function DiscountsPage() {
  const discounts = await adminDiscounts()
  return (
    <div>
      <h1 className="display text-4xl">Automatic discounts</h1>
      <p className="mt-2 max-w-xl text-sm text-mute">None are seeded. A discount applies only when it is active here and no coupon is on the bag.</p>
      {discounts.length === 0 ? <p className="mt-4 text-mute">No automatic discounts.</p> : null}
      <ul className="mt-4 grid gap-3">
        {discounts.map((discount) => (
          <li key={discount.id}>
            <form action={saveDiscountAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={discount.id} />
              <input className={field} name="name" defaultValue={discount.name} />
              <select className={field} name="discountType" defaultValue={discount.discount_type}><option value="percentage">percentage</option><option value="fixed">fixed</option></select>
              <input className={field} name="discountValue" defaultValue={discount.discount_value} />
              <input className={field} name="minimumOrderAmount" defaultValue={discount.minimum_order_amount} />
              <label className="text-sm"><input type="checkbox" name="isActive" defaultChecked={discount.is_active} /> Active</label>
              <button className="underline">Save</button>
            </form>
          </li>
        ))}
      </ul>
      <form action={saveDiscountAction} className="mt-8 flex flex-wrap gap-2">
        <input className={field} name="name" placeholder="Name" required />
        <select className={field} name="discountType"><option value="percentage">percentage</option><option value="fixed">fixed</option></select>
        <input className={field} name="discountValue" placeholder="Value" required />
        <input className={field} name="minimumOrderAmount" placeholder="Minimum" defaultValue="0" />
        <label className="text-sm"><input type="checkbox" name="isActive" defaultChecked /> Active</label>
        <button className="bg-ink px-3 py-2 text-paper">Add</button>
      </form>
    </div>
  )
}
