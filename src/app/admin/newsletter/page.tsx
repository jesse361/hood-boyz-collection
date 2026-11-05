import { adminNewsletter } from "@/lib/admin"
import { newsletterStatusAction } from "@/server/admin-actions"

export const metadata = { title: "Newsletter" }

export default async function NewsletterPage() {
  const rows = await adminNewsletter()
  return (
    <div>
      <h1 className="display text-4xl">Newsletter</h1>
      {rows.length === 0 ? <p className="mt-4 text-mute">No subscribers yet.</p> : null}
      <ul className="mt-6 divide-y divide-line text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between py-3">
            <span>{row.email} · {row.status}</span>
            <form action={newsletterStatusAction}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="status" value={row.status === "subscribed" ? "unsubscribed" : "subscribed"} />
              <button className="underline">{row.status === "subscribed" ? "Unsubscribe" : "Resubscribe"}</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  )
}
