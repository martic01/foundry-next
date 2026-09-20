export const metadata = {
  title: 'Terms & Policy — State AI Training'
};

const SECTIONS = [
  {
    title: '1. Enrollment & Payment',
    items: [
      'A seat in a cohort is only confirmed once payment for the selected Stage has been completed successfully through our payment provider.',
      'Prices are shown in Nigerian Naira (₦) at checkout and are a one-time fee per Stage, not a subscription.',
      'Registration requires signing in with Google — the email on that account is what we use for your receipt, start date, and cohort access details.'
    ]
  },
  {
    title: '2. Minimum Age',
    items: [
      'You must be at least 15 years old to register for either Stage. Your date of birth is checked at the time of registration; a payment made against an ineligible date of birth will not result in a confirmed seat.',
      'Only the age computed from your date of birth is kept on record — the date of birth itself is used for that one check and is not stored.'
    ]
  },
  {
    title: '3. No-Refund Policy',
    items: [
      'All payments are final once confirmed. We do not offer refunds for change of mind, non-attendance, personal scheduling conflicts, or discontinuing partway through a Stage.',
      'If a cohort is postponed or cancelled by us before it starts, affected learners will be offered a transfer to the next available cohort at no extra cost. This transfer is the remedy offered in that case, in place of a cash refund, except where applicable law requires otherwise.'
    ]
  },
  {
    title: '4. Teaching & Support Policy',
    items: [
      'The tutor is responsible for teaching each topic clearly, running live sessions as scheduled, reviewing submitted work, and giving real, constructive feedback.',
      "If a concept genuinely isn't landing, that's on us to fix — ask, and the tutor will re-explain, point you to extra resources, or make time outside the session to go over it again.",
      "What the tutor can't be responsible for: a learner's personal outcome if they don't engage with sessions, don't submit work, or don't put in the practice the material asks for. Teaching support is guaranteed; a specific result is not."
    ]
  },
  {
    title: '5. Attendance & Missed Classes',
    items: [
      'Live sessions are the core of the cohort. Where practical, session notes or recordings may be shared with enrolled learners, but this isn\u2019t guaranteed for every session.',
      "Missing a class doesn't pause the cohort or entitle a refund — you're responsible for catching up using shared materials and by reaching out with specific questions.",
      'Repeated absence without any communication may affect how much individual feedback the tutor is able to give for the rest of the Stage.'
    ]
  },
  {
    title: '6. Course Duration & Schedule',
    items: [
      'Each Stage runs for 9 weeks, with 3 live classes per week (27 classes total), communicated to the cohort at kickoff along with the exact session times.',
      'Each class runs 1 hour 30 minutes.',
      'The tutor may adjust individual session dates/times (for public holidays, unforeseen circumstances, etc.) with reasonable notice to the cohort. This does not change the total scope of the Stage.'
    ]
  },
  {
    title: '7. Laptop & Installation Requirements',
    items: [
      "You're responsible for showing up to your first class with a laptop that meets the minimum specs (at least 8GB RAM, 200GB storage, a 1.5GHz+ processor, an Intel Core i5 or equivalent, and an updated, currently-supported operating system) — you confirm this by checking the laptop-spec box during registration.",
      "Installing VS Code and Git before your first class is required, not optional. Installation instructions (written steps and, where available, video walkthroughs) are provided on your dashboard once you're registered. If you're genuinely stuck on installation itself, reach out before the first class rather than during it.",
      "Class time is for teaching, not for individual installation troubleshooting — a learner who arrives without VS Code/Git installed may fall behind through no fault of the tutor's teaching."
    ]
  },
  {
    title: '8. Lesson Notes & Guide Videos',
    items: [
      "Written lesson notes are provided on your dashboard, organized day by day, and unlocked progressively as the cohort moves through the material — not all released at once.",
      'These notes (and any installation/guide videos linked from them) are a study aid and a reference to revisit concepts already taught live — they are a supplement to attending sessions, not a substitute for them.',
      "Class recordings, where posted, are for enrolled learners in that specific batch only and shouldn't be shared outside the cohort."
    ]
  },
  {
    title: '9. Course Scope & Depth',
    items: [
      'This course teaches the fundamentals of each topic it covers (HTML, CSS, JavaScript, APIs, Git/GitHub, deployment, and — for Stage 2 — React) at a level that lets you read, understand, test, debug, and modify code confidently, including code an AI tool writes for you.',
      'It is intentionally not an exhaustive or advanced treatment of any single topic. Mastering any one of these areas in full depth (advanced JavaScript patterns, advanced CSS architecture, backend engineering, etc.) is outside the scope of this Stage and would be the subject of further, separate study after you finish.'
    ]
  },
  {
    title: '10. Code of Conduct',
    items: [
      'Be respectful in live sessions and any cohort chat/community space. Harassment, hate speech, or disruptive behavior may result in removal from the cohort without a refund.'
    ]
  },
  {
    title: '11. Course Materials',
    items: [
      "Slides, project briefs, and other materials are for your own learning use. Please don't redistribute, resell, or publish them elsewhere without permission."
    ]
  },
  {
    title: '12. Payment, Sign-In & Data',
    items: [
      "Card/payment details are handled directly by our payment provider (Paystack) — we don't see or store your card number.",
      'Sign-in is handled entirely by Google — we never see or store a password, because there isn\u2019t one to store.',
      'Information tied to your account (name, email) comes from your Google profile and is used only to run the cohort: confirming your seat, sending the start date, and course communication.'
    ]
  },
  {
    title: '13. Class Access — Personal & Non-Transferable',
    items: [
      'Your seat, class link, and access to the group chat are for you, the person who registered and paid, only. Sharing your class link or login with a friend, family member, or anyone else so they can attend or access materials in your place is not allowed.',
      'If we find an account being used by someone other than the registered learner, we may remove that account from the group and page without a refund. Repeated or clear cases may result in the original learner losing their seat entirely.',
      "If you genuinely can't make a live session, that's covered by Section 5 (Attendance & Missed Classes) — catch up with shared materials rather than sending someone in your place."
    ]
  },
  {
    title: '14. Completing Registration',
    items: [
      'Registration completes automatically the moment payment is confirmed — there is no separate account-creation step to finish afterward. If a technical issue means your registration doesn\u2019t complete despite a successful payment, contact us with your payment reference and we\u2019ll sort it out directly.'
    ]
  }
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 font-display text-3xl font-extrabold text-ink">State AI Training — Terms &amp; Policy</h1>
      <p className="mb-8 text-sm italic text-inkdim">
        Last updated: cohort launch (set a real date once this goes live).
      </p>

      <p className="mb-6 text-sm leading-relaxed text-inkdim">
        These terms cover enrollment in a State AI Training cohort (each &quot;Stage&quot; —
        Stage 1: HTML, CSS, JavaScript + AI, or Stage 2: React + AI), run by
        Matthew Aboyade (&quot;we&quot;, &quot;the tutor&quot;). By checking the agreement box
        during registration, you (&quot;the learner&quot;) agree to everything below.
      </p>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mb-6">
          <h2 className="mb-3 border-b border-line pb-2 text-lg text-ink">{section.title}</h2>
          <ul className="space-y-2.5">
            {section.items.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-inkdim">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mb-6">
        <h2 className="mb-3 border-b border-line pb-2 text-lg text-ink">15. Changes to These Terms</h2>
        <p className="text-sm leading-relaxed text-inkdim">
          These terms may be updated between cohorts. The version shown at
          the time you register is the one that applies to your enrollment.
        </p>
      </section>

      <section>
        <h2 className="mb-3 border-b border-line pb-2 text-lg text-ink">16. Questions or Disputes</h2>
        <p className="text-sm leading-relaxed text-inkdim">
          Reach out to{' '}
          <a href="mailto:aboyadematthew@gmail.com" className="text-brand underline">
            aboyadematthew@gmail.com
          </a>{' '}
          with your name and payment reference for anything related to your
          registration or these terms.
        </p>
      </section>
    </main>
  );
}
