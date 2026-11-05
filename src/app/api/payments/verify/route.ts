import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { verifyPaystack } from "@/lib/payments/paystack"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref")
  if (!reference) return NextResponse.redirect(new URL("/checkout", url))
  try {
    await verifyPaystack(reference)
  } catch {
    // The order stays unpaid when verification fails. The receipt shows the real status.
  }
  const rows = await getSql()<Array<{ order_number: string }>>`
    select o.order_number
    from payments p
    join orders o on o.id = p.order_id
    where p.provider_reference = ${reference}
    limit 1
  `
  if (!rows[0]) return NextResponse.redirect(new URL("/checkout", url))
  return NextResponse.redirect(new URL(`/order-confirmation/${rows[0].order_number}`, url))
}
