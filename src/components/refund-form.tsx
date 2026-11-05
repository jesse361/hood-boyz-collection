"use client"

import { useActionState } from "react"
import { refundAction } from "@/server/admin-actions"

export function RefundForm({ id, currency }: { id: string; currency: string }) {
  const [state, action, pending] = useActionState(refundAction, {})
  const field = "w-full border border-line px-2 py-2"
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <input className={field} name="amount" placeholder={`Amount ${currency}`} required />
      <input className={field} name="reason" placeholder="Reason" required />
      <select className={field} name="method" defaultValue="manual">
        <option value="manual">Manual</option>
        <option value="provider">Paystack</option>
      </select>
      <label className="text-sm"><input type="checkbox" name="returnStock" /> Return units to stock</label>
      {state.error ? <p className="text-sm">{state.error}</p> : null}
      <button disabled={pending} className="border border-ink px-3 py-2">{pending ? "Working" : "Record refund"}</button>
    </form>
  )
}
