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
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-stretch lg:gap-10">
          <div className="w-full lg:flex-1">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-brand-light px-3 py-1.5 text-xs font-medium text-brand-dark">
              <Sparkles className="h-3.5 w-3.5" /> Cohort registration is open
            </div>
            <p className="eyebrow mb-3">The Foundry</p>
            <h1 className="mb-4 max-w-2xl font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
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
          {/* w-full + a fixed mobile height so it doesn't overflow when
              stacked above/below the text on small screens; lg:w-[440px]
              + lg:items-stretch on the row above is what makes it match
              the text column's height on larger screens. */}
          <div className="h-72 w-full flex-shrink-0 sm:h-80 lg:h-auto lg:w-[440px]">
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
