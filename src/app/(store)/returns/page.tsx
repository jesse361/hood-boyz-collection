import { TextPage } from "@/components/editorial"
import { getPage } from "@/lib/settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "Returns" }

export default async function ReturnsPage() {
  return <TextPage {...await getPage("returns")} />
}
