import { ResetForm } from "@/components/forms"

export const metadata = { title: "Choose a password" }

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="display text-4xl">Choose a password</h1>
      <div className="mt-8">{token ? <ResetForm token={token} /> : <p>This reset link is missing its token.</p>}</div>
    </div>
  )
}
