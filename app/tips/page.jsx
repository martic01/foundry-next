import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { SECTIONS, INTRO, TIPS, CSS_DEMOS, JS_DEMOS, THREE_DEMOS } from '../../lib/tips/content';
import { pageMeta } from '../../lib/seo';
import DemoGrid from '../../components/tips/DemoGrid';
import TipArt from '../../components/tips/TipArt';
import TipCard from '../../components/tips/TipCard';
import TipCta from '../../components/tips/TipCta';
import Reveal from '../../components/tips/Reveal';

export const metadata = pageMeta({
  title: 'Web design, CSS, JavaScript, 3D and AI tips',
  description: 'Free, friendly tips from The Foundry: design habits, CSS and JavaScript animations you can watch and copy, 3D with Three.js, HTML and working with AI.',
  path: '/tips',
  keywords: 'css animation examples, javascript canvas animation, three.js tutorial, html tips, web design tips, learn coding Nigeria, The Foundry'
});

const TOPIC = { design: 'web design', css: 'CSS', js: 'JavaScript', '3d': '3D on the web', html: 'HTML', ai: 'building with AI' };

function Heading({ id }) {
  const s = SECTIONS.find((x) => x.id === id);
  return (
    <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <TipArt kind={s.art} className="h-24 w-28 flex-shrink-0 rounded-2xl" />
      <div>
        <h2 id={`${id}-title`} className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{INTRO[id].title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-inkdim sm:text-base">{INTRO[id].text}</p>
      </div>
    </div>
  );
}

function Tips({ id }) {
  return <div className="grid gap-5 sm:grid-cols-2 desktop:grid-cols-3">{TIPS[id].map((t, i) => <Reveal key={t.title} className="h-full" delay={(i % 3) * 90}><TipCard {...t} /></Reveal>)}</div>;
}

export default function TipsPage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 pb-6 pt-14">
        <p className="eyebrow mb-3">Free tips</p>
        <h1 className="max-w-3xl font-display text-3xl font-extrabold leading-tight text-ink sm:text-5xl">Learn by watching it move, then copy the code.</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-inkdim">Short explanations, live animations and the code behind each one. Start anywhere. Everything here is the kind of thing you will build, step by step, in our courses.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/register" className="cta-btn"><GraduationCap className="h-4 w-4" /> Register for a course</Link>
          <Link href="/" className="cta-btn-outline">Back to home</Link>
        </div>
        <nav aria-label="Sections on this page" className="mt-8 flex flex-wrap gap-2">
          {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink hover:border-brand hover:text-brand">{s.label}</a>)}
        </nav>
      </section>

      <section id="design" aria-labelledby="design-title" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-10">
        <Heading id="design" />
        <Tips id="design" />
        <TipCta topic={TOPIC.design} />
      </section>

      <section id="css" aria-labelledby="css-title" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-10">
        <Heading id="css" />
        <DemoGrid kind="css" demos={CSS_DEMOS} />
        <TipCta topic={TOPIC.css} />
      </section>

      <section id="js" aria-labelledby="js-title" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-10">
        <Heading id="js" />
        <DemoGrid kind="js" demos={JS_DEMOS} />
        <TipCta topic={TOPIC.js} />
      </section>

      <section id="3d" aria-labelledby="3d-title" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-10">
        <Heading id="3d" />
        <DemoGrid kind="3d" demos={THREE_DEMOS} />
        <TipCta topic={TOPIC['3d']} />
      </section>

      <section id="html" aria-labelledby="html-title" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-10">
        <Heading id="html" />
        <Tips id="html" />
        <TipCta topic={TOPIC.html} />
      </section>

      <section id="ai" aria-labelledby="ai-title" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-10 pb-16">
        <Heading id="ai" />
        <Tips id="ai" />
        <TipCta topic={TOPIC.ai} />
      </section>
    </main>
  );
}
