'use client';

import { useId, useRef, useState } from 'react';

// Generic tab strip. The Installation page nests it two levels deep (OS
// tabs, and inside each OS a second Tabs for VS Code / Git), and the
// admin Content page uses it for links / videos / announcements.
//
// Built for instant switching:
//   * A tab's panel is mounted the first time it's opened and then KEPT
//     mounted (hidden), instead of being thrown away and rebuilt on every
//     switch. Re-opening a tab is just un-hiding it -- no re-render of
//     its (sometimes large) content, and half-typed form input survives
//     a trip to another tab.
//   * Tabs that were never opened are never mounted, so first load
//     doesn't pay for panels nobody looked at.
//   * Leaving a tab pauses any <video>/<audio> in it, since a hidden
//     panel would otherwise keep playing sound.
export default function Tabs({ tabs, defaultKey }) {
  const baseId = useId();
  const [active, setActive] = useState(defaultKey || tabs[0]?.key);
  const [visited, setVisited] = useState(() => new Set([defaultKey || tabs[0]?.key]));
  const panelRefs = useRef({});
  const tabRefs = useRef({});

  // If the active tab disappears (a filtered list changed the tab set),
  // fall back to the first one rather than rendering nothing.
  const activeKey = tabs.some((t) => t.key === active) ? active : tabs[0]?.key;

  function select(key) {
    if (key === activeKey) return;
    panelRefs.current[activeKey]?.querySelectorAll('video, audio').forEach((m) => m.pause());
    setActive(key);
    setVisited((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

  // Arrow-key navigation, per the ARIA tabs pattern.
  function onKeyDown(e, index) {
    const last = tabs.length - 1;
    let next = null;
    if (e.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    select(tabs[next].key);
    tabRefs.current[tabs[next].key]?.focus();
  }

  return (
    <div>
      <div role="tablist" className="mb-4 flex flex-wrap gap-1 rounded-lg bg-surfaceMuted p-1 text-sm font-medium">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => {
              tabRefs.current[t.key] = el;
            }}
            id={`${baseId}-tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={activeKey === t.key}
            aria-controls={`${baseId}-panel-${t.key}`}
            tabIndex={activeKey === t.key ? 0 : -1}
            onClick={() => select(t.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`rounded-md px-4 py-1.5 transition ${
              activeKey === t.key ? 'bg-surface text-ink shadow-sm' : 'text-inkdim hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) =>
        visited.has(t.key) || t.key === activeKey ? (
          <div
            key={t.key}
            ref={(el) => {
              panelRefs.current[t.key] = el;
            }}
            id={`${baseId}-panel-${t.key}`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${t.key}`}
            hidden={t.key !== activeKey}
          >
            {t.content}
          </div>
        ) : null
      )}
    </div>
  );
}
