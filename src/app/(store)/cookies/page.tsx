import { TextPage } from "@/components/editorial"
import { getPage } from "@/lib/settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "Cookies" }

export default async function CookiesPage() {
  return <TextPage {...await getPage("cookies")} />
}
