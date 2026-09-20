import { Compass, Palette, Eye, Rocket, ArrowRight, Plus, Sparkles } from 'lucide-react';

const CATEGORIES = [
  {
    image: '/images/categories/static-sites.svg',
    title: 'Static Sites',
    desc: 'Portfolios, landing pages, and small business sites — built fast, clean, and ready to launch without unnecessary overhead.'
  },
  {
    image: '/images/categories/ecommerce.svg',
    title: 'E-commerce',
    desc: 'Storefronts with product pages, cart and checkout flows, and everything needed to actually take an order.'
  },
  {
    image: '/images/categories/other-builds.svg',
    title: 'Other Builds',
    desc: "Dashboards, internal tools, and anything else that doesn't fit neatly into a template — scoped and built around what it actually needs to do."
  }
];

export function CategoryGrid() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow mb-3">Ready-made</p>
      <h2 className="mb-3 font-display text-2xl font-extrabold text-ink">A site built for what you actually need</h2>
      <p className="mb-8 max-w-2xl text-sm text-inkdim">
        Three starting points, each customized rather than handed over as
        a raw template — your content, your branding, your structure.
      </p>
      <div className="grid gap-5 sm:grid-cols-3">
        {CATEGORIES.map((c) => (
          <div key={c.title} className="card relative overflow-hidden transition hover:shadow-cardHover">
            <span className="absolute right-4 top-4 z-10 rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-inkdim backdrop-blur">
              Coming soon
            </span>
            <div className="relative h-40 w-full border-b border-line bg-brand-light">
              {/* Plain <img>, not next/image -- these are local SVGs,
                  and next/image blocks SVG optimization by default for
                  security reasons (dangerouslyAllowSVG). They're already
                  tiny vector files with nothing to optimize anyway. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt={c.title} className="h-full w-full object-cover" />
            </div>
            <div className="p-6">
              <h3 className="mb-1.5 font-display font-extrabold text-ink">{c.title}</h3>
              <p className="text-sm text-inkdim">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { icon: Compass, title: 'Browse or describe', desc: 'Pick a ready-made template close to what you need, or describe a custom build if nothing quite fits.' },
  { icon: Palette, title: 'Customize', desc: 'Your content, your colors, your copy — every site is adjusted, never handed over as a raw template.' },
  { icon: Eye, title: 'Review', desc: "See it live before it's final. Revisions happen here, not after launch." },
  { icon: Rocket, title: 'Launch', desc: 'Deployed and handed over — with the source, not locked behind a subscription.' }
];

export function ProcessSteps() {
  return (
    <section className="bg-surface py-16">
      <div className="mx-auto max-w-6xl px-6">
        <p className="eyebrow mb-3">How it&apos;ll work</p>
        <h2 className="mb-8 font-display text-2xl font-extrabold text-ink">From first message to a live site</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-light text-brand">
                <s.icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-brand-dark">STEP {String(i + 1).padStart(2, '0')}</p>
              <h3 className="mb-1.5 font-display font-extrabold text-ink">{s.title}</h3>
              <p className="text-sm text-inkdim">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SplitCta() {
  const PORTFOLIO_CONTACT_URL = 'https://marticampf.vercel.app/contact.html';
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="card p-7">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-light text-brand">
            <Sparkles className="h-5 w-5" strokeWidth={2} />
          </div>
          <h3 className="mb-2 font-display font-extrabold text-ink">Need something custom?</h3>
          <p className="mb-5 text-sm text-inkdim">
            If a ready-made site isn&apos;t the right fit, I build from
            scratch — scoped to what you actually need, priced up front, no
            surprises along the way.
          </p>
          <a href={PORTFOLIO_CONTACT_URL} className="cta-btn">
            Get a quote <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="card p-7">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-light text-brand">
            <Rocket className="h-5 w-5" strokeWidth={2} />
          </div>
          <h3 className="mb-2 font-display font-extrabold text-ink">Want to learn to build it yourself?</h3>
          <p className="mb-5 text-sm text-inkdim">
            A cohort-based course on building with AI as a real development
            tool — not just prompting, actually shipping working software.
          </p>
          <a href="#courses" className="cta-btn-outline">
            See the cohort <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  { q: "What's included with a ready-made site?", a: 'The full source, customized to your content and branding, deployed and ready to use — not a locked template you edit yourself.' },
  { q: 'Can I request changes after it\u2019s built?', a: 'Yes — review happens before final handover specifically so revisions are part of the process, not an extra ask afterward.' },
  { q: 'Do I need coding experience for the course?', a: 'No. Stage 1 starts from the fundamentals. If you already know HTML/CSS/JS, you can move straight into Stage 2 (React).' },
  { q: 'Is the marketplace open now?', a: 'Not yet — ready-made sites and custom builds are still being built out. The cohort course is open now, though.' }
];

export function Faq() {
  return (
    <section className="bg-surface py-16">
      <div className="mx-auto max-w-3xl px-6">
        <p className="eyebrow mb-3">Questions</p>
        <h2 className="mb-8 font-display text-2xl font-extrabold text-ink">Frequently asked</h2>
        <div className="space-y-3">
          {FAQS.map((item) => (
            <details key={item.q} className="card group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink marker:content-none">
                {item.q}
                <Plus className="h-4 w-4 flex-shrink-0 text-inkdim transition group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-sm text-inkdim">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
