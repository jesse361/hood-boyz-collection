import { adminTeam } from "@/lib/admin"
import { revokeSessionsAction, roleAction } from "@/server/admin-actions"

export const metadata = { title: "Team" }

export default async function TeamPage() {
  const team = await adminTeam()
  return (
    <div>
      <h1 className="display text-4xl">Team</h1>
      <p className="mt-2 max-w-xl text-sm text-mute">The first super admin comes from the seed and INITIAL_ADMIN_EMAIL. Role changes require a super admin.</p>
      <ul className="mt-6 grid gap-4">
        {team.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 border border-line p-3 text-sm">
            <span>{member.first_name} {member.last_name} · {member.email}</span>
            <form action={roleAction} className="flex gap-2">
              <input type="hidden" name="userId" value={member.id} />
              <select name="role" defaultValue={member.role ?? "customer"} className="border border-line px-2 py-1">
                <option value="customer">customer</option>
                <option value="admin">admin</option>
                <option value="super_admin">super_admin</option>
              </select>
              <button className="underline">Save role</button>
            </form>
            <form action={revokeSessionsAction}>
              <input type="hidden" name="userId" value={member.id} />
              <button className="underline">Revoke sessions</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  )
}
