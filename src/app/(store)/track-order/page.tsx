import { TrackForm } from "@/components/forms"
import { PageIntro } from "@/components/editorial"

export const metadata = { title: "Track an order" }

export default function TrackPage() {
  return (
    <div>
      <PageIntro title="Track an order" body="The order number and the checkout email are both required." />
      <div className="max-w-md px-5 py-10 md:px-10">
        <TrackForm />
      </div>
    </div>
  )
}
