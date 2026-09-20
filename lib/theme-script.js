// This exact logic runs TWICE in two different forms:
// 1. As a raw blocking <script> in app/layout.jsx's <head> (via
//    dangerouslySetInnerHTML with this string) -- this is what actually
//    prevents the flash of the wrong theme, because it runs before the
//    page paints, before React even hydrates. A React useEffect doing
//    the same thing would always be one frame too late.
// 2. Read (not re-run) by components/ThemeToggle.jsx on mount, to know
//    what's already active before the person touches the toggle.
//
// 'theme' in localStorage is 'light' | 'dark' | absent. Absent means
// "follow the device" -- that's the actual default requested (falls
// back to prefers-color-scheme), not a third hardcoded option.
export const THEME_STORAGE_KEY = 'theme';

export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (e) {}
})();
`;
