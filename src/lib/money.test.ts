import { describe, expect, it } from "vitest"
import { discountPercent, fromPesewas, toPesewas } from "@/lib/money"

describe("money", () => {
  it("converts cedis to pesewas without floating point drift", () => {
    expect(toPesewas("420.00")).toBe(42000)
    expect(toPesewas("10.5")).toBe(1050)
    expect(fromPesewas(42000)).toBe("420.00")
    expect(fromPesewas(1050)).toBe("10.50")
  })

  it("computes a sale percentage from compare-at price", () => {
    expect(discountPercent("420.00", "480.00")).toBe(13)
    expect(discountPercent("420.00", "400.00")).toBeNull()
  })
})
