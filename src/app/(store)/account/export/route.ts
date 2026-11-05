import { exportAccount } from "@/lib/account"
import { requireUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await requireUser()
  const data = await exportAccount(user.id)
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=hood-boyz-account.json",
    },
  })
}
