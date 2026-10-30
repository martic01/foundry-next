import { SITE_URL } from '../lib/seo';
import { COURSES } from '../lib/courses';

// Only the public pages. Accounts, receipts and admin are kept out on purpose.
export default function sitemap() {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    ...Object.keys(COURSES).map((k) => ({ url: `${SITE_URL}/courses/${k}`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 })),
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 }
  ];
}
