import Link from "next/link"

export function PageIntro({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <header className="relative overflow-hidden border-b border-line px-5 py-12 md:px-10 md:py-16">
      {eyebrow ? <p className="nav-link text-gold">{eyebrow}</p> : <p className="nav-link text-gold">Hood Boyz</p>}
      <h1 className="display mt-3 max-w-3xl text-4xl md:text-6xl">{title}</h1>
      <div className="mt-5 h-px w-16 bg-gold" />
      {body ? <p className="mt-4 max-w-2xl text-base leading-7 text-mute">{body}</p> : null}
    </header>
  )
}

export function TextPage({ title, updated, sections }: { title: string; updated: string; sections: Array<{ heading: string; body: string }> }) {
  return (
    <article>
      <PageIntro eyebrow={`Updated ${updated}`} title={title} />
      <div className="mx-auto grid max-w-3xl gap-10 px-5 py-12">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="display text-2xl">{section.heading}</h2>
            <p className="mt-3 leading-7 text-mute">{section.body}</p>
          </section>
        ))}
        <p className="text-sm">
          <Link href="/contact" className="underline underline-offset-4">Write to the studio</Link>
        </p>
      </div>
    </article>
  )
}
