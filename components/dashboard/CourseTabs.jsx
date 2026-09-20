'use client';

import { useState } from 'react';

// Needs 'use client' because switching tabs is interactive state -- but
// the content of each tab (classLinkContent, receiptContent) is passed
// in already-rendered from the server component (app/dashboard/page.jsx),
// so the actual data fetching stays server-side; this component only
// ever decides which of the two to show.
export default function CourseTabs({ classLinkContent, receiptContent }) {
  const [tab, setTab] = useState('class');

  const tabs = [
    { key: 'class', label: 'Class link' },
    { key: 'receipt', label: 'Receipt' }
  ];

  return (
    <div className="mb-5">
      <div className="mb-3 inline-flex gap-1 rounded-lg bg-surfaceMuted p-1 text-sm font-medium">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-1.5 transition ${
              tab === t.key ? 'bg-white text-ink shadow-sm' : 'text-inkdim hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Both panels stay mounted (just hidden) rather than conditionally
          rendered -- switching tabs back and forth shouldn't re-run
          anything or lose scroll position inside a panel. */}
      <div className={tab === 'class' ? '' : 'hidden'}>{classLinkContent}</div>
      <div className={tab === 'receipt' ? '' : 'hidden'}>{receiptContent}</div>
    </div>
  );
}
