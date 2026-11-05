import { handlePaystackWebhook } from "@/lib/payments/paystack"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const raw = await request.text()
  const signature = request.headers.get("x-paystack-signature")
  const result = await handlePaystackWebhook(raw, signature)
  return Response.json(result.body, { status: result.status })
}
