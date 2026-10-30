// Single source of truth for everything search engines and social previews see.
// Set NEXT_PUBLIC_SITE_URL (e.g. https://thefoundry.ng) in your hosting env so
// canonical links, the sitemap and share cards use your real domain.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')).replace(/\/+$/, '');
export const SITE_NAME = 'The Foundry';
export const ALT_NAME = 'State AI Training';
// Spellings people actually type when they search for the school.
export const BRAND_VARIANTS = ['marFoundry', 'Mar Foundry', 'The Foundry Nigeria', 'Foundry coding school', ALT_NAME];

export const SITE_TITLE = 'The Foundry (marFoundry): Learn Coding, Programming & AI in Nigeria';
// 150-160 characters: what Google shows under the title.
export const SITE_DESCRIPTION =
  'Learn coding, programming and AI at The Foundry (marFoundry). Live cohort courses in HTML, CSS, JavaScript, React and Cybersecurity in Nigeria, with projects and certificates.';

export const SITE_KEYWORDS = [
  'learn coding in Nigeria', 'coding bootcamp Lagos', 'AI training Nigeria', 'learn AI coding', 'web development course',
  'HTML CSS JavaScript course', 'React course', 'frontend development training', 'cybersecurity course Nigeria',
  'learn to code with AI', 'cohort based coding course', 'programming classes Lagos', 'tech training Nigeria',
  'certificate of completion coding', 'The Foundry', 'marFoundry', 'Mar Foundry', 'State AI Training',
  'learn coding', 'learn programming', 'programming for beginners', 'learn AI', 'coding school', 'online coding classes Nigeria', 'learn React', 'learn JavaScript'
];

export const OG_IMAGE = { url: '/og-image.png', width: 1200, height: 630, alt: 'The Foundry: learn coding and AI by building real software' };

// Metadata for a public page. `path` makes the canonical URL.
export function pageMeta({ title, description, path = '/', noindex = false, keywords }) {
  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: path },
    openGraph: { type: 'website', url: path, siteName: SITE_NAME, locale: 'en_NG', title, description, images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [OG_IMAGE.url] },
    ...(noindex ? { robots: { index: false, follow: false } } : {})
  };
}

// Pages that must never appear in search results (accounts, receipts, admin).
export const NOINDEX = { robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } } };

// JSON-LD must not be able to close the script tag.
export const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
