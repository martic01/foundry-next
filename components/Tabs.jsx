'use client';

import { useEffect, useId, useRef, useState } from 'react';

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
// Optional unread dots: give a tab a `latest` (ISO time of its newest item) and the strip a `seenKey`.
// A dot shows on a tab whose newest item is newer than the last time this person opened that tab
// (remembered on this device only); opening the tab clears it.
export default function Tabs({ tabs, defaultKey, seenKey }) {
  const baseId = useId();
  const [active, setActive] = useState(defaultKey || tabs[0]?.key);
  const [visited, setVisited] = useState(() => new Set([defaultKey || tabs[0]?.key]));
  const [seen, setSeen] = useState(null); // null until read on the client (no dots on the server render)
  const panelRefs = useRef({});
  const tabRefs = useRef({});

  // If the active tab disappears (a filtered list changed the tab set),
  // fall back to the first one rather than rendering nothing.
  const activeKey = tabs.some((t) => t.key === active) ? active : tabs[0]?.key;

  const storeKey = seenKey ? `tabs-seen:${seenKey}` : null;
  useEffect(() => {
    if (!storeKey) return;
    try { setSeen(JSON.parse(localStorage.getItem(storeKey) || '{}') || {}); } catch { setSeen({}); }
  }, [storeKey]);
  useEffect(() => {
    if (!storeKey || seen === null) return;
    const t = tabs.find((x) => x.key === activeKey);
    const stamp = Math.max(Date.now(), Date.parse(t?.latest || '') || 0);
    const prev = seen[activeKey] || 0;
    if (prev && !(Date.parse(t?.latest || '') > prev)) return; // already up to date
    const next = { ...seen, [activeKey]: stamp };
    try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch { /* ignore */ }
    setSeen(next);
  }, [activeKey, seen, storeKey, tabs]);
  const unread = (t) => seen !== null && t.key !== activeKey && !!t.latest && Date.parse(t.latest) > (seen[t.key] || 0);

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
            {unread(t) && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-brand align-middle" aria-label="Unread" />}
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
