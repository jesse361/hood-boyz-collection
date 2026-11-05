import { TextPage } from "@/components/editorial"
import { getPage } from "@/lib/settings"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const page = await getPage("about")
  return { title: page.title }
}

export default async function AboutPage() {
  const page = await getPage("about")
  return <TextPage {...page} />
}
