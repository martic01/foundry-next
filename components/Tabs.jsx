'use client';

import { useState } from 'react';

// Generic on purpose -- CourseTabs.jsx is the same idea specialized for
// exactly two fixed tabs (Class link / Receipt); this one takes an
// arbitrary list, so the Installation page can nest it two levels deep
// (OS tabs, and inside each OS, a second Tabs for VS Code / Git) without
// a second bespoke component.
export default function Tabs({ tabs, defaultKey }) {
  const [active, setActive] = useState(defaultKey || tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) || tabs[0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-surfaceMuted p-1 text-sm font-medium">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`rounded-md px-4 py-1.5 transition ${
              active === t.key ? 'bg-surface text-ink shadow-sm' : 'text-inkdim hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {activeTab?.content}
    </div>
  );
}
