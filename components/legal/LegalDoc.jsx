import Link from 'next/link';

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Shared layout for the Terms and Privacy pages: title, version line, a plain-words
// summary box, a contents list, then numbered sections (each item is a paragraph).
export default function LegalDoc({ title, updated, intro, summary, sections, other }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="fluid-h1 mb-2 font-display font-extrabold text-ink">{title}</h1>
      <p className="mb-6 text-sm italic text-inkdim">{updated}</p>
      {intro && <p className="mb-6 text-sm leading-relaxed text-inkdim">{intro}</p>}

      {summary && (
        <aside className="mb-8 rounded-xl border border-brand/40 bg-brand-light p-4 sm:p-5" aria-label="Summary in plain words">
          <p className="mb-2 text-sm font-semibold text-ink">The key points in plain words</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
            {summary.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <p className="mt-3 text-xs text-inkdim">This box is only a summary to help you. The full sections below are what apply.</p>
        </aside>
      )}

      <nav aria-label="Contents" className="mb-8 rounded-xl border border-line bg-surfaceMuted p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkdim">Contents</p>
        <ol className="columns-1 gap-6 text-sm sm:columns-2">
          {sections.map((s) => (
            <li key={s.title} className="mb-1 break-inside-avoid"><a href={`#${slug(s.title)}`} className="text-brand hover:underline">{s.title}</a></li>
          ))}
        </ol>
      </nav>

      {sections.map((section) => (
        <section key={section.title} id={slug(section.title)} className="mb-7 scroll-mt-20">
          <h2 className="mb-3 border-b border-line pb-2 text-lg text-ink">{section.title}</h2>
          <ul className="space-y-2.5">
            {section.items.map((item) => (
              <li key={item} className="break-words text-sm leading-relaxed text-inkdim">{item}</li>
            ))}
          </ul>
        </section>
      ))}

      {other && (
        <p className="mt-8 text-sm text-inkdim">
          Also read our <Link href={other.href} className="text-brand underline">{other.label}</Link>.
        </p>
      )}
    </main>
  );
}
