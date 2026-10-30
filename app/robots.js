import { SITE_URL } from '../lib/seo';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/dashboard', '/teacher', '/api/', '/auth/', '/receipt/', '/verify/', '/offline'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
