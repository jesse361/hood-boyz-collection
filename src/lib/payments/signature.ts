import { createHmac, timingSafeEqual } from "node:crypto"

export function paystackSignature(rawBody: string, secret: string) {
  return createHmac("sha512", secret).update(rawBody).digest("hex")
}

export function stripeSignature(rawBody: string, secret: string, timestamp: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")
}

export function signaturesMatch(expected: string, received: string) {
  const left = Buffer.from(expected)
  const right = Buffer.from(received)
  if (left.length === 0 || left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
