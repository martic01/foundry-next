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
    // DEFAULT only: used when this course has no row in the
    // course_settings table (see lib/course-status.js). Once the
    // migration has run, registration is controlled from
    // /admin/registration and this flag no longer matters.
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
  },
  cybersecurity: {
    key: 'cybersecurity',
    name: 'Cybersecurity + AI',
    tagline: 'Learn. Build. Protect.',
    image: '/images/cohort/cybersecurity.webp',
    accent: '#38bdf8',
    priceNow: 200000,
    priceWas: 300000,
    learn: [
      'Cybersecurity foundations, tools and terminology',
      'Hands-on labs with real tools and scenarios',
      'Build security solutions end-to-end',
      'Use AI to scan, analyze and defend',
      'Live sessions with experienced professionals',
      'Career-ready skills that stand out'
    ]
  },
  hr: {
    key: 'hr',
    name: 'HR — People. Strategy. Impact.',
    tagline: 'Build better work cultures and develop great teams.',
    image: '/images/cohort/hr.webp',
    accent: '#f2c94c',
    priceNow: 200000,
    priceWas: 300000,
    learn: [
      'Recruitment, onboarding and employee relations',
      'HR tools & systems: ATS, HRIS, performance management',
      'Build an HR strategy and solve real scenarios',
      'Live sessions with experienced HR professionals',
      'Career-ready skills, confidence and a certificate'
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

// Safe lookup for course keys that arrive from the client (request
// bodies, Server Action args). Plain COURSES[key] would resolve inherited
// names like "constructor" or "__proto__" to a truthy object.
export function getCourse(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(COURSES, key) ? COURSES[key] : null;
}
