import { CalendarDays, Hourglass, Users, ShieldCheck, Sparkles } from 'lucide-react';
import CohortCarousel from '../components/CohortCarousel';
import CourseCard from '../components/CourseCard';
import Robot3D from '../components/Robot3D';
import { CategoryGrid, ProcessSteps, SplitCta, Faq } from '../components/MarketplaceSections';
import { COURSES } from '../lib/courses';

export default function FoundryHome() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-6">
        <div className="relative flex flex-col desktop:flex-row desktop:items-stretch desktop:gap-10">
          <div className="w-full desktop:flex-1">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-brand-light px-3 py-1.5 text-xs font-medium text-brand-dark">
              <Sparkles className="h-3.5 w-3.5" /> Cohort registration is open
            </div>
            <p className="eyebrow mb-3">The Foundry</p>
            {/* pr- reserves clearance so the heading text doesn't run
                under the small corner-positioned bot below, on mobile/
                tablet specifically -- desktop:pr-0 clears it once the
                bot moves to its own side column instead. */}
            <h1 className="mb-4 max-w-2xl pr-24 font-display text-3xl font-extrabold leading-tight text-ink sm:pr-28 sm:text-4xl desktop:pr-0">
              Learn to build with AI as a real development tool — not just a prompt box.
            </h1>
            <p className="max-w-2xl text-inkdim">
              A cohort-based course for people who want to actually ship
              software, not just talk about it. Two stages take you from the
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
                <CalendarDays className="h-4 w-4 flex-shrink-0 text-brand" /> Registration is open now
              </li>
              <li className="flex items-center gap-2.5">
                <Hourglass className="h-4 w-4 flex-shrink-0 text-brand" /> Closes the day the cohort starts — date announced to the waitlist
              </li>
              <li className="flex items-center gap-2.5">
                <Users className="h-4 w-4 flex-shrink-0 text-brand" /> Limited spots per cohort (30 per batch)
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 flex-shrink-0 text-brand" /> Secure sign-in with Google, payment handled by Paystack
              </li>
            </ul>
            <p className="text-sm text-inkdim">
              <strong className="text-ink">How to register:</strong> pick a
              stage below, sign in with Google, confirm your date of birth,
              then pay securely — your seat and cohort account are set up
              automatically the moment payment is confirmed.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <CourseCard course={COURSES.foundations} />
          <CourseCard course={COURSES.react} />
        </div>
      </section>

      <CategoryGrid />
      <ProcessSteps />
      <SplitCta />
      <Faq />
    </main>
  );
}
