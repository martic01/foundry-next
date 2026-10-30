import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { COURSES } from '../../../lib/courses';
import { SITE_URL, SITE_NAME, pageMeta, jsonLd } from '../../../lib/seo';
import FoundryLogo from '../../../components/FoundryLogo';

// One indexable landing page per course, so each can rank for its own searches.
const COPY = {
  foundations: {
    title: 'Learn HTML, CSS, JavaScript & AI Coding in Nigeria | The Foundry',
    description: 'Learn coding from zero: HTML, CSS, JavaScript and AI-assisted programming in a live cohort at The Foundry (marFoundry), with projects and a certificate.',
    keywords: ['learn coding', 'learn HTML CSS JavaScript', 'programming for beginners', 'web development course Nigeria', 'marFoundry'],
    intro: 'This is the best place to start if you want to learn coding. You go from a blank file to real, responsive websites, and you learn to use AI as a coding partner without becoming dependent on it.'
  },
  react: {
    title: 'Learn React Programming with AI in Nigeria | The Foundry',
    description: 'Build modern React apps with live instructors at The Foundry (marFoundry): components, hooks, routing, APIs and AI-assisted development, plus a certificate.',
    keywords: ['learn React', 'React course Nigeria', 'frontend development training', 'learn programming', 'marFoundry'],
    intro: 'Stage 2 takes you from JavaScript to production-ready React apps. You build, test and ship projects that go straight into your portfolio.'
  },
  cybersecurity: {
    title: 'Cybersecurity + AI Course in Nigeria | The Foundry',
    description: 'Hands-on cybersecurity training with AI at The Foundry (marFoundry): labs with real tools, defence and analysis skills, live sessions and a certificate.',
    keywords: ['cybersecurity course Nigeria', 'learn cybersecurity', 'ethical hacking course', 'AI security training', 'marFoundry'],
    intro: 'Learn how attacks work and how to defend against them, using real tools in guided labs, with AI to scan, analyse and respond faster.'
  },
  hr: {
    title: 'HR Training & HR Services in Nigeria | The Foundry',
    description: 'HR training and complete HR services for people and organisations from The Foundry (marFoundry). Enquire by WhatsApp or email.',
    keywords: ['HR training Nigeria', 'HR services Lagos', 'recruitment training', 'marFoundry'],
    intro: 'Training for HR professionals and full HR services for organisations. This programme runs by enquiry.'
  }
};

export function generateStaticParams() {
  return Object.keys(COURSES).map((key) => ({ key }));
}

export function generateMetadata({ params }) {
  const c = COURSES[params.key];
  if (!c) return {};
  const m = COPY[c.key];
  return pageMeta({ title: m.title, description: m.description, path: `/courses/${c.key}`, keywords: m.keywords });
}

export default function CoursePage({ params }) {
  const c = COURSES[params.key];
  if (!c) notFound();
  const m = COPY[c.key];
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Course', name: c.name, description: `${c.tagline} ${m.description}`,
        provider: { '@type': 'EducationalOrganization', name: SITE_NAME, url: SITE_URL },
        url: `${SITE_URL}/courses/${c.key}`, inLanguage: 'en', educationalCredentialAwarded: 'Certificate of completion',
        teaches: c.learn
      },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: c.name, item: `${SITE_URL}/courses/${c.key}` }
      ] }
    ]
  };
  const others = Object.values(COURSES).filter((o) => o.key !== c.key);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <header className="mb-8 flex justify-center"><Link href="/" aria-label="The Foundry home"><FoundryLogo markClass="h-9 w-9" textClass="text-[length:clamp(1.25rem,5vw,1.75rem)]" /></Link></header>
      <p className="eyebrow">{SITE_NAME} course</p>
      <h1 className="fluid-h1 mb-3 font-display font-extrabold text-ink">{c.name}</h1>
      <p className="fluid-lead mb-6 text-inkdim">{m.intro}</p>

      <h2 className="fluid-h2 mb-3 font-display font-bold text-ink">What you will learn</h2>
      <ul className="mb-8 grid gap-2 sm:grid-cols-2">
        {c.learn.map((l) => (
          <li key={l} className="flex items-start gap-2 text-sm text-ink"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" /> {l}</li>
        ))}
      </ul>

      <div className="mb-10 flex flex-wrap gap-3">
        <Link href={c.contactOnly ? '/#hr' : '/register'} className="cta-btn inline-flex items-center gap-2">{c.contactOnly ? 'Enquire now' : 'Register for this course'} <ArrowRight className="h-4 w-4" /></Link>
        <Link href="/#courses" className="cta-btn-outline">All courses</Link>
      </div>

      <h2 className="mb-3 font-display text-lg font-bold text-ink">Other courses at The Foundry</h2>
      <ul className="flex flex-wrap gap-2">
        {others.map((o) => <li key={o.key}><Link href={`/courses/${o.key}`} className="inline-block rounded-full border border-line px-3 py-1.5 text-sm text-brand hover:bg-brand-light">{o.name}</Link></li>)}
      </ul>
    </main>
  );
}
