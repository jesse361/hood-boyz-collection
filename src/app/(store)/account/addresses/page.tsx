import { AddressForm } from "@/components/forms"
import { listAddresses } from "@/lib/account"
import { requireUser } from "@/lib/auth"
import { deleteAddressAction } from "@/server/store-actions"

export const dynamic = "force-dynamic"
export const metadata = { title: "Addresses" }

export default async function AddressesPage() {
  const user = await requireUser()
  const addresses = await listAddresses(user.id)
  return (
    <div className="grid gap-10 px-5 py-10 md:grid-cols-2 md:px-10">
      <div>
        <h1 className="display text-4xl">Addresses</h1>
        <ul className="mt-6 grid gap-4">
          {addresses.length === 0 ? <li className="text-mute">No saved addresses.</li> : null}
          {addresses.map((address) => (
            <li key={address.id} className="border border-line p-4 text-sm">
              <p className="font-medium">{address.label}{address.is_default ? " · default" : ""}</p>
              <p>{address.first_name} {address.last_name}</p>
              <p>{address.street}</p>
              <p>{address.city}, {address.region}</p>
              <p>{address.phone}</p>
              <form action={deleteAddressAction}><input type="hidden" name="id" value={address.id} /><button className="mt-2 underline">Remove</button></form>
            </li>
          ))}
        </ul>
      </div>
      <AddressForm />
    </div>
  )
}
