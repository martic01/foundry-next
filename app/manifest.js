import { SITE_NAME, SITE_DESCRIPTION } from '../lib/seo';

export default function manifest() {
  return {
    name: `${SITE_NAME}: Learn Coding & AI`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#b8860b',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  };
}
