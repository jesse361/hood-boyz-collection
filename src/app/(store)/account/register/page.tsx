import Link from "next/link"
import { RegisterForm } from "@/components/forms"

export const metadata = { title: "Create account" }

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="display text-4xl">Create account</h1>
      <div className="mt-8"><RegisterForm /></div>
      <p className="mt-4 text-sm"><Link href="/account/login" className="underline">Already have an account</Link></p>
    </div>
  )
}
