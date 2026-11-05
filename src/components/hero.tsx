import Link from "next/link"

export function Hero({
  headline,
  supporting,
  primaryCta,
  primaryHref,
  secondaryCta,
  secondaryHref,
  image,
  imageAlt,
}: {
  headline: string
  supporting: string
  primaryCta: string
  primaryHref: string
  secondaryCta: string
  secondaryHref: string
  image: string
  imageAlt: string
}) {
  return (
    <section className="grid min-h-[80vh] bg-ink text-paper md:grid-cols-2">
      <div className="flex flex-col justify-end px-5 py-12 md:px-12 md:py-16">
        <p className="nav-link text-gold">Hood Boyz</p>
        <h1 className="display mt-4 text-5xl leading-[0.9] md:text-7xl">{headline}</h1>
        <p className="mt-6 max-w-md text-white/70">{supporting}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={primaryHref} className="bg-paper px-5 py-3 nav-link text-ink">{primaryCta}</Link>
          <Link href={secondaryHref} className="border border-white/40 px-5 py-3 nav-link text-paper">{secondaryCta}</Link>
          <Link href="/admin" className="border border-gold px-5 py-3 nav-link text-gold">Admin</Link>
        </div>
      </div>
      <div className="bg-paper">
        <img src={image} alt={imageAlt} className="h-full max-h-[80vh] w-full object-contain" />
      </div>
    </section>
  )
}
