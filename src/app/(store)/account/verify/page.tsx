import { verifyAction } from "@/server/store-actions"
import { publicError } from "@/lib/errors"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const metadata = { title: "Verify email" }

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  let message = "Open the verification link from your email."
  if (token) {
    try {
      await verifyAction(token)
      message = "Email verified."
    } catch (error) {
      message = publicError(error)
    }
  }
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="display text-4xl">Email</h1>
      <p className="mt-4">{message}</p>
      <Link href="/account" className="mt-6 inline-block underline">Back to account</Link>
    </div>
  )
}
