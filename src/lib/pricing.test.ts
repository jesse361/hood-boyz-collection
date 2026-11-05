import { describe, expect, it } from "vitest"
import { quoteDiscount, quoteTotals } from "@/lib/pricing"

const coupon = {
  code: "HOOD10",
  discountType: "percentage" as const,
  discountValue: "10.00",
  minimumOrderAmount: "100.00",
  maximumDiscount: "50.00",
  usageLimit: 5,
  usageCount: 1,
  isActive: true,
}

describe("pricing", () => {
  it("caps a percentage coupon and ignores client totals", () => {
    const result = quoteDiscount(80000, coupon)
    expect(result.discount).toBe(5000)
  })

  it("rejects an expired or exhausted coupon", () => {
    expect(quoteDiscount(20000, { ...coupon, expiresAt: "2020-01-01T00:00:00.000Z" }).error).toMatch(/expired/)
    expect(quoteDiscount(20000, { ...coupon, usageCount: 5 }).error).toMatch(/usage limit/)
  })

  it("adds shipping and a zero tax rate in pesewas", () => {
    const totals = quoteTotals({
      subtotalPesewas: 42000,
      discountPesewas: 4200,
      shippingPesewas: 3500,
      taxRatePercent: 0,
    })
    expect(totals.total).toBe("413.00")
    expect(totals.tax).toBe("0.00")
  })
})
