import "server-only"
import { CommerceError } from "@/lib/errors"
import { toPesewas } from "@/lib/money"
import { appUrl } from "@/lib/settings"
import { attachPaystackReference, applyVerifiedPayment } from "@/lib/commerce"
import { getSql } from "@/lib/db"
import { paystackSignature, signaturesMatch } from "@/lib/payments/signature"

function secret() {
  const value = process.env.PAYSTACK_SECRET_KEY
  if (!value) throw new CommerceError("Paystack is not configured.")
  return value
}

export async function initializePaystack(orderNumber: string, email: string, total: string, currency: string) {
  const reference = `${orderNumber}-${crypto.randomUUID().slice(0, 8)}`
  await attachPaystackReference(orderNumber, reference)
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: toPesewas(total),
      currency,
      reference,
      callback_url: `${appUrl()}/api/payments/verify`,
      metadata: { order_number: orderNumber },
    }),
  })
  const body = (await response.json()) as { status?: boolean; message?: string; data?: { authorization_url?: string } }
  if (!response.ok || !body.status || !body.data?.authorization_url) {
    throw new CommerceError(body.message || "Paystack could not start the payment.")
  }
  return { authorizationUrl: body.data.authorization_url, reference }
}

export async function verifyPaystack(reference: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret()}` },
    cache: "no-store",
  })
  const body = (await response.json()) as {
    status?: boolean
    data?: { status?: string; amount?: number; currency?: string; reference?: string }
  }
  if (!response.ok || !body.status || !body.data) throw new CommerceError("Paystack verification failed.")
  if (body.data.status !== "success") return { paid: false as const, status: body.data.status ?? "failed" }
  const result = await applyVerifiedPayment(reference, Number(body.data.amount), body.data.currency || "GHS")
  return { paid: true as const, already: result.already, orderId: result.orderId }
}

export async function handlePaystackWebhook(rawBody: string, signature: string | null) {
  const key = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY
  if (!key) return { status: 503, body: { error: "Paystack is not configured." } }
  if (!signature || !signaturesMatch(paystackSignature(rawBody, key), signature)) {
    return { status: 401, body: { error: "Invalid signature." } }
  }
  const event = JSON.parse(rawBody) as { event?: string; data?: { id?: number; reference?: string; status?: string } }
  const eventKey = `${event.event ?? "unknown"}:${event.data?.reference ?? ""}:${event.data?.id ?? ""}`
  const inserted = await getSql()<Array<{ id: string }>>`
    insert into webhook_events (provider, event_key, payload)
    values ('paystack', ${eventKey}, ${getSql().json(JSON.parse(rawBody))})
    on conflict (provider, event_key) do nothing
    returning id
  `
  if (!inserted.length) return { status: 200, body: { received: true, duplicate: true } }
  if (event.event === "charge.success" && event.data?.reference) {
    await verifyPaystack(event.data.reference)
  }
  return { status: 200, body: { received: true, duplicate: false } }
}

export async function refundPaystack(reference: string, amountPesewas: number) {
  const response = await fetch("https://api.paystack.co/refund", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transaction: reference, amount: amountPesewas }),
  })
  const body = (await response.json()) as { status?: boolean; message?: string; data?: { id?: number } }
  if (!response.ok || !body.status) throw new CommerceError(body.message || "Paystack refund failed.")
  return String(body.data?.id ?? reference)
}
