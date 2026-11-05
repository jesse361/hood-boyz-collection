import { ContactForm } from "@/components/forms"
import { PageIntro } from "@/components/editorial"
import { getSettings } from "@/lib/settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "Contact" }

export default async function ContactPage() {
  const settings = await getSettings()
  return (
    <div>
      <PageIntro title="Contact" body={`${settings.brand.email} · ${settings.brand.address}`} />
      <div className="max-w-xl px-5 py-10 md:px-10">
        <ContactForm />
      </div>
    </div>
  )
}
