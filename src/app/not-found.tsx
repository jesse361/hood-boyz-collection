import Link from "next/link"

export default function NotFound() {
  return (
    <div className="px-5 py-24">
      <h1 className="display text-5xl">That page is not in the edit.</h1>
      <Link href="/shop" className="mt-6 inline-block underline">Back to the shop</Link>
    </div>
  )
}
