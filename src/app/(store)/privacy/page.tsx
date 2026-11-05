import { TextPage } from "@/components/editorial"
import { getPage } from "@/lib/settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "Privacy" }

export default async function PrivacyPage() {
  return <TextPage {...await getPage("privacy")} />
}
