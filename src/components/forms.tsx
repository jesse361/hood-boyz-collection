"use client"

import { useActionState } from "react"
import {
  addressAction,
  contactAction,
  forgotAction,
  loginAction,
  newsletterAction,
  profileAction,
  registerAction,
  resetAction,
  reviewAction,
  trackOrderAction,
} from "@/server/store-actions"

function Note({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null
  return <p className="text-sm">{error || success}</p>
}

const field = "w-full border border-line bg-transparent px-3 py-3 outline-none focus:border-ink"

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, {})
  return (
    <form action={action} className="grid gap-3">
      <input className={field} name="email" type="email" required placeholder="Email" />
      <input className={field} name="password" type="password" required placeholder="Password" />
      <input type="hidden" name="next" value={next ?? ""} />
      <Note error={state.error} />
      <button disabled={pending} className="bg-ink py-3 nav-link text-paper">{pending ? "Signing in" : "Sign in"}</button>
    </form>
  )
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, {})
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <input className={field} name="firstName" required placeholder="First name" />
        <input className={field} name="lastName" required placeholder="Last name" />
      </div>
      <input className={field} name="email" type="email" required placeholder="Email" />
      <input className={field} name="password" type="password" required minLength={8} placeholder="Password" />
      <Note error={state.error} />
      <button disabled={pending} className="bg-ink py-3 nav-link text-paper">{pending ? "Creating" : "Create account"}</button>
    </form>
  )
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotAction, {})
  return (
    <form action={action} className="grid gap-3">
      <input className={field} name="email" type="email" required placeholder="Email" />
      <Note success={state.message} />
      {state.devLink ? <a className="text-sm underline" href={state.devLink}>Open the local reset link</a> : null}
      <button disabled={pending} className="bg-ink py-3 nav-link text-paper">Send reset</button>
    </form>
  )
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetAction, {})
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="token" value={token} />
      <input className={field} name="password" type="password" required minLength={8} placeholder="New password" />
      <Note error={state.error} />
      <button disabled={pending} className="bg-ink py-3 nav-link text-paper">Update password</button>
    </form>
  )
}

export function ProfileForm({ firstName, lastName, phone }: { firstName: string; lastName: string; phone: string }) {
  const [state, action, pending] = useActionState(profileAction, {})
  return (
    <form action={action} className="grid gap-3">
      <input className={field} name="firstName" defaultValue={firstName} required />
      <input className={field} name="lastName" defaultValue={lastName} required />
      <input className={field} name="phone" defaultValue={phone} placeholder="Phone" />
      <Note error={state.error} success={state.saved ? "Profile saved." : undefined} />
      <button disabled={pending} className="bg-ink py-3 nav-link text-paper">Save profile</button>
    </form>
  )
}

export function AddressForm() {
  const [state, action, pending] = useActionState(addressAction, {})
  return (
    <form action={action} className="grid gap-3">
      <input className={field} name="label" placeholder="Label" defaultValue="Home" />
      <div className="grid gap-3 md:grid-cols-2">
        <input className={field} name="firstName" required placeholder="First name" />
        <input className={field} name="lastName" required placeholder="Last name" />
      </div>
      <input className={field} name="phone" required placeholder="Phone" />
      <input className={field} name="street" required placeholder="Street" />
      <div className="grid gap-3 md:grid-cols-3">
        <input className={field} name="city" required placeholder="City" />
        <input className={field} name="region" required placeholder="Region" />
        <input className={field} name="country" required defaultValue="Ghana" />
      </div>
      <input className={field} name="postalCode" placeholder="Postal code" />
      <Note error={state.error} />
      <button disabled={pending} className="border border-ink py-3 nav-link">Save address</button>
    </form>
  )
}

export function NewsletterForm({ heading, body }: { heading: string; body: string }) {
  const [state, action, pending] = useActionState(newsletterAction, {})
  return (
    <form action={action} className="grid gap-3">
      <p className="nav-link">{heading}</p>
      <p className="text-sm text-white/70">{body}</p>
      <input className="border border-white/20 bg-transparent px-3 py-3" name="email" type="email" required placeholder="Email" />
      <Note error={state.error} success={state.success ? "You are on the list." : undefined} />
      <button disabled={pending} className="border border-white/40 py-3 nav-link">Join</button>
    </form>
  )
}

export function ContactForm() {
  const [state, action, pending] = useActionState(contactAction, {})
  return (
    <form action={action} className="grid gap-3">
      <input className={field} name="name" required placeholder="Name" />
      <input className={field} name="email" type="email" required placeholder="Email" />
      <input className={field} name="subject" required placeholder="Subject" />
      <textarea className={field} name="message" required minLength={10} rows={6} placeholder="Message" />
      <Note error={state.error} success={state.success ? "Message received. The studio will reply by email." : undefined} />
      <button disabled={pending} className="bg-ink py-3 nav-link text-paper">Send</button>
    </form>
  )
}

export function TrackForm() {
  const [state, action, pending] = useActionState(trackOrderAction, {})
  return (
    <form action={action} className="grid gap-3">
      <input className={field} name="orderNumber" required placeholder="Order number" />
      <input className={field} name="email" type="email" required placeholder="Checkout email" />
      <Note error={state.error} />
      <button disabled={pending} className="bg-ink py-3 nav-link text-paper">Find order</button>
    </form>
  )
}

export function ReviewForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(reviewAction, {})
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="productId" value={productId} />
      <select className={field} name="rating" defaultValue="5">
        {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
      </select>
      <input className={field} name="title" placeholder="Title" />
      <textarea className={field} name="comment" required minLength={3} rows={4} placeholder="What should the next person know?" />
      <Note error={state.error} success={state.success ? "Review submitted for approval." : undefined} />
      <button disabled={pending} className="border border-ink py-3 nav-link">Submit review</button>
    </form>
  )
}
