import Link from "next/link"
import { LoginForm } from "@/components/forms"

export const metadata = { title: "Sign in" }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="display text-4xl">Sign in</h1>
      <p className="mt-3 text-sm text-mute">Staff email and password open the admin dashboard.</p>
      <div className="mt-8"><LoginForm next={next} /></div>
      <p className="mt-4 text-sm"><Link href="/account/register" className="underline">Create an account</Link></p>
      <p className="mt-2 text-sm"><Link href="/account/forgot-password" className="underline">Forgot password</Link></p>
    </div>
  )
}
