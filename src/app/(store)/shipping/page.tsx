import { TextPage } from "@/components/editorial"
import { getPage } from "@/lib/settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "Shipping" }

export default async function ShippingPage() {
  return <TextPage {...await getPage("shipping")} />
}
