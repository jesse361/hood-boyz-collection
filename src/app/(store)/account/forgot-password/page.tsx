import { ForgotForm } from "@/components/forms"

export const metadata = { title: "Forgot password" }

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="display text-4xl">Reset password</h1>
      <p className="mt-3 text-sm text-mute">If the email matches an account, a reset link is prepared. The reply is the same either way.</p>
      <div className="mt-8"><ForgotForm /></div>
    </div>
  )
}
