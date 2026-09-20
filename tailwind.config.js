/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // toggled on <html> by lib/theme.js / components/ThemeToggle.jsx -- not just prefers-color-scheme, since the person can override the device default
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Values come from CSS custom properties (see :root / .dark in
        // app/globals.css), not fixed hex here -- that's what lets every
        // component that already uses these token names (text-ink,
        // bg-surfaceMuted, etc.) re-theme for dark mode automatically,
        // with zero changes to the component itself. The
        // `rgb(var(--x) / <alpha-value>)` form is Tailwind's documented
        // pattern for CSS-variable-backed colors that still support
        // opacity modifiers like `bg-surface/50`.
        brand: {
          DEFAULT: 'rgb(var(--color-brand) / <alpha-value>)',
          dark: 'rgb(var(--color-brand-dark) / <alpha-value>)',
          light: 'rgb(var(--color-brand-light) / <alpha-value>)'
        },
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        inkdim: 'rgb(var(--color-inkdim) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        surfaceMuted: 'rgb(var(--color-surface-muted) / <alpha-value>)'
      },
      fontFamily: {
        display: ['var(--font-syne)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        racing: ['var(--font-racing)', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 3px rgba(20, 21, 26, 0.08), 0 1px 2px rgba(20, 21, 26, 0.04)',
        cardHover: '0 8px 24px rgba(20, 21, 26, 0.10)'
      }
    }
  },
  plugins: []
};
