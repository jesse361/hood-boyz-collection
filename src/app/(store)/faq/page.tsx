import { TextPage } from "@/components/editorial"
import { getPage } from "@/lib/settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "Questions" }

export default async function FaqPage() {
  return <TextPage {...await getPage("faq")} />
}
