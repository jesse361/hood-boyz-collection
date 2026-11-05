import { shippingRows } from "@/lib/admin"
import { getSettings } from "@/lib/settings"
import { saveSettingsAction } from "@/server/admin-actions"

export const metadata = { title: "Settings" }
const field = "w-full border border-line px-2 py-2"

export default async function SettingsPage() {
  const [settings, methods] = await Promise.all([getSettings(), shippingRows()])
  return (
    <form action={saveSettingsAction} className="grid max-w-3xl gap-4">
      <h1 className="display text-4xl">Settings</h1>
      <label className="text-sm">Tax percent<input className={field} name="taxRatePercent" type="number" step="0.01" defaultValue={settings.commerce.taxRatePercent} /></label>
      <label className="text-sm">Free shipping threshold (GHS, blank means none)<input className={field} name="freeShippingThreshold" defaultValue={settings.commerce.freeShippingThreshold ?? ""} /></label>
      <label className="text-sm"><input type="checkbox" name="pricesAreSamples" defaultChecked={settings.commerce.pricesAreSamples} /> Sample prices</label>
      <label className="text-sm"><input type="checkbox" name="inventoryIsDemonstration" defaultChecked={settings.commerce.inventoryIsDemonstration} /> Demonstration inventory</label>
      <label className="text-sm"><input type="checkbox" name="acceptOrders" defaultChecked={settings.commerce.acceptOrders} /> Accept orders</label>
      <h2 className="display text-2xl">Shipping methods</h2>
      {methods.map((method) => (
        <fieldset key={method.id} className="grid gap-2 border border-line p-3">
          <input type="hidden" name="shippingId" value={method.id} />
          <input className={field} name={`name-${method.id}`} defaultValue={method.name} />
          <input className={field} name={`description-${method.id}`} defaultValue={method.description} />
          <input className={field} name={`amount-${method.id}`} defaultValue={method.amount} />
          <input className={field} name={`eta-${method.id}`} defaultValue={method.eta} />
          <label className="text-sm"><input type="checkbox" name={`active-${method.id}`} defaultChecked={method.is_active} /> Active</label>
          <label className="text-sm"><input type="checkbox" name={`free-${method.id}`} defaultChecked={method.eligible_for_free_shipping} /> Eligible when a free-shipping threshold is saved</label>
        </fieldset>
      ))}
      <button className="bg-ink px-4 py-3 text-paper">Save settings</button>
    </form>
  )
}
