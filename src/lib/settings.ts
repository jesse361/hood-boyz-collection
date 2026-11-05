import "server-only"
import { contentDefaults, type ContentDefaults, type PageDoc } from "@/lib/content-defaults"
import { getSql } from "@/lib/db"

type SettingsMap = Record<string, unknown>

function merge<T>(fallback: T, value: unknown): T {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...fallback, ...(value as object) } as T
  }
  return (value as T) ?? fallback
}

export async function getSettings(): Promise<ContentDefaults> {
  const rows = await getSql()<Array<{ key: string; value: unknown }>>`
    select key, value from site_settings
  `
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value])) as SettingsMap
  return {
    brand: merge(contentDefaults.brand, map.brand),
    announcement: merge(contentDefaults.announcement, map.announcement),
    hero: merge(contentDefaults.hero, map.hero),
    promo: merge(contentDefaults.promo, map.promo),
    story: merge(contentDefaults.story, map.story),
    newsletter: merge(contentDefaults.newsletter, map.newsletter),
    social: merge(contentDefaults.social, map.social),
    commerce: merge(contentDefaults.commerce, map.commerce),
    sizeGuide: merge(contentDefaults.sizeGuide, map.size_guide),
    pages: {
      about: merge(contentDefaults.pages.about, (map.pages as ContentDefaults["pages"] | undefined)?.about),
      faq: merge(contentDefaults.pages.faq, (map.pages as ContentDefaults["pages"] | undefined)?.faq),
      shipping: merge(contentDefaults.pages.shipping, (map.pages as ContentDefaults["pages"] | undefined)?.shipping),
      returns: merge(contentDefaults.pages.returns, (map.pages as ContentDefaults["pages"] | undefined)?.returns),
      privacy: merge(contentDefaults.pages.privacy, (map.pages as ContentDefaults["pages"] | undefined)?.privacy),
      terms: merge(contentDefaults.pages.terms, (map.pages as ContentDefaults["pages"] | undefined)?.terms),
      cookies: merge(contentDefaults.pages.cookies, (map.pages as ContentDefaults["pages"] | undefined)?.cookies),
    },
  }
}

export async function getPage(key: keyof ContentDefaults["pages"]): Promise<PageDoc> {
  const settings = await getSettings()
  return settings.pages[key]
}

export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY)
}

export function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}
