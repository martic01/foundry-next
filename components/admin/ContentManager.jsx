'use client';

import { useState } from 'react';
import Tabs from '../Tabs';
import ClassLinkManager from './ClassLinkManager';
import ClassVideoManager from './ClassVideoManager';

// Hosts the two managers behind tabs, with one shared filter. The
// filter answers "what would students in batch X see?" -- i.e. items
// aimed at that batch PLUS items aimed at all batches.
export default function ContentManager({ links, videos, audienceOptions, canTargetAll = true }) {
  const [filter, setFilter] = useState('everything');

  const pick = (items) => {
    if (filter === 'everything') return items;
    if (filter === 'all') return items.filter((i) => !i.batch_id);
    return items.filter((i) => !i.batch_id || i.batch_id === filter);
  };

  return (
    <div>
      <label className="mb-5 flex flex-wrap items-center gap-3 text-sm text-inkdim">
        <span className="font-medium text-ink">View as</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="field !w-auto min-w-[16rem]">
          <option value="everything">Everything (all items)</option>
          {canTargetAll && <option value="all">Only items for all batches</option>}
          {audienceOptions
            .filter((o) => o.value !== 'all')
            .map((o) => (
              <option key={o.value} value={o.value}>
                What {o.label} sees
              </option>
            ))}
        </select>
      </label>

      <Tabs
        tabs={[
          { key: 'links', label: `Class links (${pick(links).length})`, content: <ClassLinkManager links={pick(links)} audienceOptions={audienceOptions} /> },
          { key: 'videos', label: `Videos (${pick(videos).length})`, content: <ClassVideoManager videos={pick(videos)} audienceOptions={audienceOptions} /> }
        ]}
      />
    </div>
  );
}
