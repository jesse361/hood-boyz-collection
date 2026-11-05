import { CouponForm } from "@/components/coupon-form"
import { adminCoupons } from "@/lib/admin"

export const metadata = { title: "Coupons" }

export default async function CouponsPage() {
  const coupons = await adminCoupons()
  return (
    <div>
      <h1 className="display text-4xl">Coupons</h1>
      <p className="mt-2 text-sm text-mute">HOOD10 is a demonstration coupon. Turn it off before launch.</p>
      <ul className="mt-6 grid gap-3 text-sm">
        {coupons.map((coupon) => (
          <li key={coupon.id} className="border border-line p-3">
            <CouponForm
              id={coupon.id}
              code={coupon.code}
              description={coupon.description}
              discountType={coupon.discount_type}
              discountValue={coupon.discount_value}
              minimum={coupon.minimum_order_amount}
              active={coupon.is_active}
              usage={`${coupon.usage_count}${coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""}`}
            />
          </li>
        ))}
      </ul>
      <div className="mt-8 max-w-md"><CouponForm /></div>
    </div>
  )
}
