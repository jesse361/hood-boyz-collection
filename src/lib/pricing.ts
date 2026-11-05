import { fromPesewas, toPesewas } from "@/lib/money"

export type DiscountType = "percentage" | "fixed"

export type DiscountRule = {
  code?: string | null
  name?: string | null
  discountType: DiscountType
  discountValue: string
  minimumOrderAmount: string
  maximumDiscount: string | null
  usageLimit?: number | null
  usageCount?: number
  startsAt?: string | null
  expiresAt?: string | null
  isActive: boolean
}

export function quoteDiscount(subtotalPesewas: number, rule: DiscountRule, now = new Date()) {
  if (!rule.isActive) return { discount: 0, error: "This offer is not active." }
  if (rule.startsAt && new Date(rule.startsAt) > now) return { discount: 0, error: "This offer is not active yet." }
  if (rule.expiresAt && new Date(rule.expiresAt) < now) return { discount: 0, error: "This offer has expired." }
  if (rule.usageLimit != null && (rule.usageCount ?? 0) >= rule.usageLimit) {
    return { discount: 0, error: "This coupon has reached its usage limit." }
  }
  if (subtotalPesewas < toPesewas(rule.minimumOrderAmount)) {
    return { discount: 0, error: "The order does not meet the minimum spend." }
  }
  const hundredths = Math.round(Number(rule.discountValue) * 100)
  let discount =
    rule.discountType === "percentage"
      ? Math.floor((subtotalPesewas * hundredths) / 10000)
      : toPesewas(rule.discountValue)
  if (rule.maximumDiscount != null) discount = Math.min(discount, toPesewas(rule.maximumDiscount))
  discount = Math.max(0, Math.min(discount, subtotalPesewas))
  return { discount, label: rule.code ?? rule.name ?? "Discount" }
}

export function quoteTotals(input: {
  subtotalPesewas: number
  discountPesewas: number
  shippingPesewas: number
  taxRatePercent: number
}) {
  const taxable = Math.max(0, input.subtotalPesewas - input.discountPesewas)
  const rateHundredths = Math.round(input.taxRatePercent * 100)
  const tax = Math.round((taxable * rateHundredths) / 10000)
  const total = taxable + input.shippingPesewas + tax
  return {
    subtotal: fromPesewas(input.subtotalPesewas),
    discount: fromPesewas(input.discountPesewas),
    shipping: fromPesewas(input.shippingPesewas),
    tax: fromPesewas(tax),
    total: fromPesewas(total),
    subtotalPesewas: input.subtotalPesewas,
    discountPesewas: input.discountPesewas,
    shippingPesewas: input.shippingPesewas,
    taxPesewas: tax,
    totalPesewas: total,
  }
}
