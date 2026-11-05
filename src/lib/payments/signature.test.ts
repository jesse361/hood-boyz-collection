import { describe, expect, it } from "vitest"
import { paystackSignature, signaturesMatch } from "@/lib/payments/signature"

describe("paystack signatures", () => {
  it("accepts a matching signature and rejects a tampered body", () => {
    const body = JSON.stringify({ event: "charge.success", data: { reference: "HB10001" } })
    const signature = paystackSignature(body, "sk_test_secret")
    expect(signaturesMatch(signature, signature)).toBe(true)
    expect(signaturesMatch(paystackSignature(body + " ", "sk_test_secret"), signature)).toBe(false)
    expect(signaturesMatch(signature, "short")).toBe(false)
  })
})
