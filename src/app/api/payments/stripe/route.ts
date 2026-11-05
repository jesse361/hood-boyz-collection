export const dynamic = "force-dynamic"

export async function POST() {
  return Response.json({ error: "Stripe is not configured for this store." }, { status: 501 })
}
