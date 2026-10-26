import { CalendarDays, Hourglass, Users, ShieldCheck, Sparkles } from 'lucide-react';
import CohortCarousel from '../components/CohortCarousel';
import CourseCard from '../components/CourseCard';
import Robot3D from '../components/Robot3DLazy';
import { CategoryGrid, ProcessSteps, SplitCta, Faq } from '../components/MarketplaceSections';
import { COURSES } from '../lib/courses';
import { getPublicCourseSettings } from '../lib/course-settings';
import { getPublicSiteContacts } from '../lib/site-contacts';
import { withPrice } from '../lib/pricing';
import WorkspaceSection from '../components/WorkspaceSection';
import EventSection from '../components/EventSection';
import { getAvailability } from '../lib/course-status';
import { FAQS } from '../components/MarketplaceSections';
import { SITE_URL, SITE_NAME, ALT_NAME, SITE_TITLE, SITE_DESCRIPTION, SITE_KEYWORDS, pageMeta, jsonLd } from '../lib/seo';
import { normalizePhone } from '../lib/site-contacts';

export const metadata = pageMeta({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: '/', keywords: SITE_KEYWORDS });

// Structured data (JSON-LD): lets Google understand the organisation and show the courses.
function structuredData(settings, contacts) {
  const org = {
    '@type': 'EducationalOrganization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: ALT_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    image: `${SITE_URL}/og-image.png`,
    description: SITE_DESCRIPTION,
    address: { '@type': 'PostalAddress', streetAddress: contacts.workspace.address, addressCountry: 'NG' },
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', email: contacts.hr.email, telephone: `+${normalizePhone(contacts.hr.whatsapp)}`, areaServed: 'NG', availableLanguage: 'English' }]
  };
  const courses = Object.values(COURSES).map((c) => {
    const priced = withPrice(c, settings[c.key]);
    return {
      '@type': 'Course',
      name: c.name,
      description: `${c.tagline} You will learn: ${c.learn.join('; ')}.`,
      provider: { '@id': `${SITE_URL}/#organization` },
      url: `${SITE_URL}/register`,
      image: `${SITE_URL}${c.image}`,
      inLanguage: 'en',
      educationalCredentialAwarded: 'Certificate of completion',
      ...(c.contactOnly || !priced.priceNow ? {} : { offers: { '@type': 'Offer', category: 'Paid', price: String(priced.priceNow), priceCurrency: 'NGN', url: `${SITE_URL}/register` } })
    };
  });
  return {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, alternateName: ALT_NAME, description: SITE_DESCRIPTION, inLanguage: 'en', publisher: { '@id': `${SITE_URL}/#organization` } },
      { '@type': 'FAQPage', mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
      ...[['Workspace', 'Co-working desks, a meeting room and a private virtual office'], ['Event Center', 'An open-air celebration space for birthdays, Valentine dinners and mini events, for up to 30 guests']].map(([n, d], i) => ({
        '@type': 'LocalBusiness', '@id': `${SITE_URL}/#${i ? 'events' : 'workspace'}`, name: `${SITE_NAME} ${n}`, description: d, url: `${SITE_URL}/#${i ? 'events' : 'workspace'}`, image: `${SITE_URL}/og-image.png`,
        telephone: `+${normalizePhone(contacts[i ? 'event' : 'workspace'].whatsapp)}`, email: contacts[i ? 'event' : 'workspace'].email,
        address: { '@type': 'PostalAddress', streetAddress: contacts[i ? 'event' : 'workspace'].address, addressCountry: 'NG' }, parentOrganization: { '@id': `${SITE_URL}/#organization` }
      })),
      { '@type': 'ItemList', name: 'Courses at The Foundry', itemListElement: courses.map((course, i) => ({ '@type': 'ListItem', position: i + 1, item: course })) }
    ]
  };
}

export default async function FoundryHome() {
  // Admin-controlled registration state, read through a short-lived
  // cache that the admin's save busts immediately (see
  // getPublicCourseSettings). A scheduled reopen date still takes effect
  // on time because getAvailability() compares it to "now" per request.
  const [settings, contacts] = await Promise.all([getPublicCourseSettings(), getPublicSiteContacts()]);
  const availability = Object.fromEntries(Object.keys(COURSES).map((k) => [k, getAvailability(settings[k])]));
  const anyOpen = Object.values(availability).some((a) => a.open);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData(settings, contacts)) }} />
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-6">
        <div className="relative flex flex-col desktop:flex-row desktop:items-stretch desktop:gap-10">
          <div className="w-full desktop:flex-1">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-brand-light px-3 py-1.5 text-xs font-medium text-brand-dark">
              <Sparkles className="h-3.5 w-3.5" /> {anyOpen ? 'Cohort registration is open' : 'Cohort registration is currently closed'}
            </div>
            <p className="eyebrow mb-3">The Foundry</p>
            {/* pr- reserves clearance so the heading text doesn't run
                under the small corner-positioned bot below, on mobile/
                tablet specifically -- desktop:pr-0 clears it once the
                bot moves to its own side column instead. */}
            <h1 className="fluid-h1 mb-4 max-w-2xl pr-[clamp(4.5rem,22vw,7rem)] font-display font-extrabold text-ink desktop:pr-0">
              Learn to build with AI as a real development tool — not just a prompt box.
            </h1>
            <p className="fluid-lead max-w-2xl text-inkdim">
              A cohort-based course for people who want to actually ship
              software, not just talk about it. Our web-development stages take you from the
              fundamentals to shipping full React applications, each with live
              sessions, real projects, and feedback from an actual instructor —
              not just an AI.
            </p>
          </div>
          {/* One single Robot3D instance, repositioned by breakpoint --
              not two separate copies for mobile vs desktop. Mounting a
              second WebGL canvas just to hide it with CSS would double
              the GPU/memory cost for no benefit, which defeats the
              low-end-GPU work in Robot3D.jsx itself.
              Below 700px: small, absolutely pinned to the top-right
              corner of the text block (via the `relative` wrapper above),
              out of the way rather than a large stacked block that used
              to push/overlap the copy.
              700px and up (`desktop:`, a custom breakpoint -- see
              tailwind.config.js): back to normal flow as its own side
              column, with a slow golden gradient wave glowing behind it
              (.gold-wave, defined in globals.css) -- hidden below that
              width since it'd just be visual noise behind a much smaller
              bot. The column's own width is clamp(260px, 36vw, 440px),
              not a flat 440px -- a fixed width would jump straight to
              440px the instant the viewport crosses 700px, which is
              tight enough there to risk overflow (440px bot + the text
              column's own minimum + the gap between them, all inside
              max-w-6xl's padding). The clamp scales it down smoothly as
              the viewport narrows toward 700px instead, only reaching
              the full 440px once there's actually room for it.
              much smaller bot. */}
          <div className="absolute right-0 top-0 h-20 w-20 overflow-hidden sm:h-24 sm:w-24 desktop:relative desktop:h-auto desktop:w-[clamp(260px,36vw,440px)] desktop:flex-shrink-0">
            <div className="gold-wave pointer-events-none absolute inset-0 -z-10 hidden desktop:block" aria-hidden="true" />
            <Robot3D />
          </div>
        </div>
      </section>

      <section id="courses" className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <CohortCarousel />

          <div className="flex flex-col gap-4">
            <ul className="space-y-2.5 text-sm text-inkdim">
              <li className="flex items-center gap-2.5">
                <CalendarDays className="h-4 w-4 flex-shrink-0 text-brand" /> {anyOpen ? 'Registration is open now' : 'Registration is closed right now — see each course below for when it opens'}
              </li>
              <li className="flex items-center gap-2.5">
                <Hourglass className="h-4 w-4 flex-shrink-0 text-brand" /> Closes the day the cohort starts — date announced to the waitlist
              </li>
              <li className="flex items-center gap-2.5">
                <Users className="h-4 w-4 flex-shrink-0 text-brand" /> Limited spots per cohort (50 per batch)
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 flex-shrink-0 text-brand" /> Secure sign-in with Google, payment handled by Paystack
              </li>
            </ul>
            <p className="text-sm text-inkdim">
              <strong className="text-ink">How to register:</strong> pick a
              course below, sign in with Google, confirm your date of birth,
              then pay securely — your seat and cohort account are set up
              automatically the moment payment is confirmed.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {Object.values(COURSES).map((c) => (
            <CourseCard key={c.key} course={withPrice(c, settings[c.key])} availability={availability[c.key]} contacts={contacts.hr} />
          ))}
        </div>
      </section>

      <WorkspaceSection contacts={contacts.workspace} />
      <EventSection contacts={contacts.event} />

      <CategoryGrid />
      <ProcessSteps />
      <SplitCta />
      <Faq />
    </main>
  );
}
