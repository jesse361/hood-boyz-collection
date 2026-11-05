"use client"

import { useActionState } from "react"
import { saveCouponAction } from "@/server/admin-actions"

export function CouponForm({
  id,
  code = "",
  description = "",
  discountType = "percentage",
  discountValue = "",
  minimum = "0",
  active = true,
  usage,
}: {
  id?: string
  code?: string
  description?: string
  discountType?: string
  discountValue?: string
  minimum?: string
  active?: boolean
  usage?: string
}) {
  const [state, action, pending] = useActionState(saveCouponAction, {})
  const field = "w-full border border-line px-2 py-2"
  return (
    <form action={action} className="grid gap-2">
      {id ? <input type="hidden" name="id" value={id} /> : <h2 className="display text-2xl">New coupon</h2>}
      <input className={field} name="code" defaultValue={code} required placeholder="Code" />
      <input className={field} name="description" defaultValue={description} placeholder="Description" />
      <select className={field} name="discountType" defaultValue={discountType}>
        <option value="percentage">percentage</option>
        <option value="fixed">fixed</option>
      </select>
      <input className={field} name="discountValue" defaultValue={discountValue} required placeholder="Value" />
      <input className={field} name="minimumOrderAmount" defaultValue={minimum} placeholder="Minimum" />
      <label className="text-sm"><input type="checkbox" name="isActive" defaultChecked={active} /> Active {usage ? `· used ${usage}` : ""}</label>
      {state.error ? <p>{state.error}</p> : null}
      <button disabled={pending} className="border border-ink px-3 py-2">Save</button>
    </form>
  )
}
