import { TextPage } from "@/components/editorial"
import { getPage } from "@/lib/settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "Terms" }

export default async function TermsPage() {
  return <TextPage {...await getPage("terms")} />
}
