import { ProfileForm } from "@/components/forms"
import { deleteAccountAction, logoutAction } from "@/server/store-actions"
import { requireUser } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const metadata = { title: "Profile" }

export default async function ProfilePage() {
  const user = await requireUser()
  return (
    <div className="max-w-lg px-5 py-10 md:px-10">
      <h1 className="display text-4xl">Profile</h1>
      <div className="mt-8"><ProfileForm firstName={user.firstName} lastName={user.lastName} phone={user.phone ?? ""} /></div>
      <form action={logoutAction} className="mt-6"><button className="underline">Sign out</button></form>
      <form action={deleteAccountAction} className="mt-8">
        <p className="text-sm text-mute">Deleting the account removes the profile, addresses and wishlist. Orders stay for the studio’s records with the account link removed.</p>
        <button className="mt-3 border border-ink px-4 py-2 text-sm">Delete account</button>
      </form>
    </div>
  )
}
