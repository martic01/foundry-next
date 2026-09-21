// Single source of truth for course copy/pricing -- the landing page and
// the register page both read from here, so a price or learn-list change
// only needs to happen in one place.
export const COURSES = {
  foundations: {
    key: 'foundations',
    name: 'Stage 1 — HTML, CSS, JavaScript + AI',
    tagline: 'Master the foundation.',
    image: '/images/cohort/stage1.webp',
    // Stage-based color, used on profile card badges so Stage 1 vs
    // Stage 2 is recognizable at a glance without reading the label.
    accent: '#f2c94c',
    priceNow: 150000,
    priceWas: 250000,
    learn: [
      'Build responsive web pages',
      'Style modern interfaces with CSS',
      'Add interactivity with JavaScript',
      'Use AI for coding & explanations',
      'Debug and refactor with AI',
      'Ship real projects',
      'Git & GitHub essentials'
    ]
  },
  react: {
    key: 'react',
    name: 'Stage 2 — React + AI',
    tagline: 'Build modern, production-ready apps.',
    image: '/images/cohort/stage2.webp',
    accent: '#38bdf8',
    // No batches/schedule for this stage yet -- registration (client and
    // server side, see RegisterFlow.jsx and app/api/payments/verify)
    // stays closed while this is true, and CourseCard shows a disabled
    // "Coming soon" state instead of a working Register button.
    comingSoon: true,
    priceNow: 250000,
    priceWas: 400000,
    learn: [
      'Components & Props',
      'State & Events',
      'Hooks & Context',
      'React Router',
      'Tailwind CSS for styling',
      'API Integration',
      'Use AI to plan & generate code',
      'Test, debug & ship with confidence',
      'Git & GitHub workflow'
    ]
  }
};

// A single, blanket minimum age across both stages -- replaces the
// earlier age-RANGE system, which is gone in favor of collecting an
// actual date of birth and computing exact age from it.
export const MIN_AGE = 15;

export function calculateAge(dobString) {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function isAgeEligible(dobString) {
  const age = calculateAge(dobString);
  return age !== null && age >= MIN_AGE;
}

export function formatNaira(n) {
  return '\u20A6' + n.toLocaleString('en-NG');
}
