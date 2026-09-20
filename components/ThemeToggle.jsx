'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { THEME_STORAGE_KEY } from '../lib/theme-script';

const OPTIONS = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor }
];

function apply(choice) {
  const isDark =
    choice === 'dark' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

export default function ThemeToggle() {
  // Starts as 'system' on the server and on first client render (so
  // server/client markup matches, avoiding a hydration mismatch) --
  // corrected to the real stored value in the effect below, which runs
  // after hydration. The tiny flash this could theoretically cause on
  // the TOGGLE ITSELF (not the page, which is already correct from the
  // blocking script) is a non-issue in practice.
  const [choice, setChoice] = useState('system');

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    setChoice(stored || 'system');

    // Live-updates if the OS theme changes while on 'system' and the
    // user hasn't overridden it -- e.g. their OS switches to dark mode
    // at sunset while this tab is still open.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function onChange() {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) apply('system');
    }
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  function select(next) {
    setChoice(next);
    if (next === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    }
    apply(next);
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-surfaceMuted p-0.5">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = choice === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => select(opt.key)}
            aria-label={opt.label}
            aria-pressed={active}
            title={opt.label}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
              active ? 'bg-surface text-brand shadow-sm' : 'text-inkdim hover:text-ink'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
