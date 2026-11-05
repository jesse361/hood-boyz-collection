import { getSettings } from "@/lib/settings"
import { saveContentAction } from "@/server/admin-actions"

export const metadata = { title: "Content" }
const field = "w-full border border-line px-2 py-2"

export default async function ContentPage() {
  const settings = await getSettings()
  return (
    <form action={saveContentAction} className="grid max-w-3xl gap-4">
      <h1 className="display text-4xl">Content</h1>
      <input className={field} name="brandName" defaultValue={settings.brand.name} />
      <input className={field} name="legalName" defaultValue={settings.brand.legalName} />
      <input className={field} name="logoText" defaultValue={settings.brand.logoText} />
      <input className={field} name="tagline" defaultValue={settings.brand.tagline} />
      <textarea className={field} name="description" defaultValue={settings.brand.description} />
      <input className={field} name="email" defaultValue={settings.brand.email} />
      <input className={field} name="phone" defaultValue={settings.brand.phone} />
      <input className={field} name="address" defaultValue={settings.brand.address} />
      <label className="text-sm"><input type="checkbox" name="announcementEnabled" defaultChecked={settings.announcement.enabled} /> Announcement</label>
      <input className={field} name="announcement" defaultValue={settings.announcement.text} />
      <input className={field} name="announcementLink" defaultValue={settings.announcement.link} />
      <input className={field} name="headline" defaultValue={settings.hero.headline} />
      <textarea className={field} name="supporting" defaultValue={settings.hero.supporting} />
      <input className={field} name="primaryCta" defaultValue={settings.hero.primaryCta} />
      <input className={field} name="primaryHref" defaultValue={settings.hero.primaryHref} />
      <input className={field} name="secondaryCta" defaultValue={settings.hero.secondaryCta} />
      <input className={field} name="secondaryHref" defaultValue={settings.hero.secondaryHref} />
      <input className={field} name="heroImage" defaultValue={settings.hero.image} />
      <input className={field} name="heroAlt" defaultValue={settings.hero.imageAlt} />
      <input className={field} name="promoTitle" defaultValue={settings.promo.title} />
      <textarea className={field} name="promoBody" defaultValue={settings.promo.body} />
      <input className={field} name="promoMessage" defaultValue={settings.promo.message} />
      <input className={field} name="promoCta" defaultValue={settings.promo.cta} />
      <input className={field} name="promoHref" defaultValue={settings.promo.href} />
      <input className={field} name="storyHeading" defaultValue={settings.story.heading} />
      <textarea className={field} name="storyBody" defaultValue={settings.story.body} />
      <input className={field} name="storyImage" defaultValue={settings.story.image} />
      <input className={field} name="storyAlt" defaultValue={settings.story.imageAlt} />
      <input className={field} name="newsletterHeading" defaultValue={settings.newsletter.heading} />
      <textarea className={field} name="newsletterBody" defaultValue={settings.newsletter.body} />
      {(Object.keys(settings.pages) as Array<keyof typeof settings.pages>).map((key) => (
        <fieldset key={key} className="grid gap-2 border border-line p-3">
          <legend className="px-1">{key}</legend>
          <input className={field} name={`${key}-title`} defaultValue={settings.pages[key].title} />
          {settings.pages[key].sections.map((section, index) => (
            <div key={`${key}-${index}`} className="grid gap-2">
              <input className={field} name={`${key}-${index}-heading`} defaultValue={section.heading} />
              <textarea className={field} name={`${key}-${index}-body`} defaultValue={section.body} rows={3} />
            </div>
          ))}
        </fieldset>
      ))}
      <button className="bg-ink px-4 py-3 text-paper">Save content</button>
    </form>
  )
}
