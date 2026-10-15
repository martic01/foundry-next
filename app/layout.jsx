import { Suspense } from 'react';
import { Inter, Syne, Racing_Sans_One } from 'next/font/google';
import './globals.css';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import ConditionalChrome from '../components/ConditionalChrome';
import NavigationLoader from '../components/NavigationLoader';
import { DialogProvider } from '../components/ui/DialogProvider';
import { THEME_INIT_SCRIPT } from '../lib/theme-script';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// Syne, not Plus Jakarta Sans, for headers -- it has distinctive, flared
// letterforms even at 700/800 weight, so headings read as bold and a bit
// unusual on their own, not just "the body font, but heavier." Body
// copy stays on Inter (still var(--font-inter)) so long text is still
// easy to read.
const syne = Syne({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-syne' });
// Racing Sans One is used ONLY for "The Foundry" wordmark (nav + receipt
// header) -- it only ships one weight (400), but its letterforms are
// inherently bold/condensed by design (built for motorsport livery
// numbering), which is the "race font" look, distinct from Syne which
// still does all the other headings on the site.
const racing = Racing_Sans_One({ subsets: ['latin'], weight: ['400'], variable: '--font-racing' });

export const metadata = {
  title: 'The Foundry — State AI Training',
  description: 'A cohort-based course on building with AI as a real development tool — not just prompting, actually shipping working software.'
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: the blocking <script> below deliberately
    // adds the `dark` class to <html> BEFORE React hydrates (so there's
    // no flash of the wrong theme). React then sees a class the server
    // never rendered and warns about the mismatch. That difference is the
    // whole point of the script, so the warning is silenced for this one
    // element only -- it does not affect any child.
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${syne.variable} ${racing.variable}`}>
      <head>
        {/* Plain blocking <script>, NOT next/script (which defers) --
            this has to run before first paint to avoid a flash of the
            wrong theme. Sets the .dark class from localStorage, falling
            back to the OS's prefers-color-scheme when the person hasn't
            picked a theme explicitly (see lib/theme-script.js). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col bg-surfaceMuted font-body text-ink antialiased">
        {/* Suspense is required here, not optional -- NavigationLoader
            uses useSearchParams(), and App Router requires any component
            that does to be wrapped in a Suspense boundary (otherwise the
            build either errors or force-opts the whole route into
            client-side rendering). The fallback is null since there's
            nothing to show before the loader itself even mounts. */}
        <Suspense fallback={null}>
          <NavigationLoader />
        </Suspense>
        {/* Nav and Footer are still rendered here (server-side) so they
            keep reading the session cookie correctly -- ConditionalChrome
            just decides whether to show them, based on path. Portal
            pages (/dashboard, /admin) render their own sidebar shell
            instead and skip this chrome entirely. */}
        {/* DialogProvider powers useDialog() -- the in-app replacement
            for window.confirm()/alert() (components/ui/DialogProvider.jsx). */}
        <DialogProvider>
          <ConditionalChrome nav={<Nav />} footer={<Footer />}>
            {children}
          </ConditionalChrome>
        </DialogProvider>
      </body>
    </html>
  );
}
