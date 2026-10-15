'use client';

import { useState } from 'react';
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, PlayCircle } from 'lucide-react';
import { toCloudinaryPosterUrl } from '../../lib/cloudinary';

// Needs 'use client' specifically because of onContextMenu below --
// event handlers can't be passed as props from a Server Component, only
// from a Client Component. Everything else here (fetching `videos`) is
// still done by the server parent (app/dashboard/courses/page.jsx); this
// component just renders what it's given.
//
// Cloudinary serves the raw video file with proper range-request support,
// so a plain native <video> tag is all that's needed here -- no embed
// iframe, no player SDK, unlike the YouTube case (components/VideoEmbed.jsx)
// which needs an iframe because YouTube doesn't hand out direct file URLs.
//
// Deliberately no download option here -- students can watch, not save a
// local copy. The <video> tag itself has no `download` attribute or
// controlsList removal needed for that; browsers only offer a save-video
// option via their own right-click menu regardless, which this can't
// fully prevent, but nothing in this component adds or encourages one.
// Each video is a collapsible row (closed by default) inside a scroll
// area, so a long list is easy to scroll past. The <video> element is
// only mounted while its row is open: collapsing stops playback and
// nothing is fetched for rows that were never opened.
export default function ClassVideos({ videos }) {
  const [openIds, setOpenIds] = useState(() => new Set());

  if (!videos.length) {
    return (
      <div className="rounded-lg border border-line bg-surfaceMuted p-4 text-sm text-inkdim">
        No class videos posted yet.
      </div>
    );
  }

  const allOpen = openIds.size === videos.length;
  const toggle = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-inkdim">
          {videos.length} {videos.length === 1 ? 'video' : 'videos'}
        </p>
        {videos.length > 1 && (
          <button
            type="button"
            onClick={() => setOpenIds(allOpen ? new Set() : new Set(videos.map((v) => v.id)))}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs font-medium text-inkdim hover:border-brand/40 hover:text-brand"
          >
            {allOpen ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>

      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-line" data-video-list>
        {videos.map((v) => {
          const open = openIds.has(v.id);
          return (
            <div key={v.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => toggle(v.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surfaceMuted"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <PlayCircle className="h-4 w-4 flex-shrink-0 text-brand" />
                  <span className="truncate text-sm font-semibold text-ink">{v.title}</span>
                </span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-inkdim transition ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="px-4 pb-4">
                  {v.description && <p className="mb-2 text-sm text-inkdim">{v.description}</p>}
                  <video
                    controls
                    preload="none"
                    poster={toCloudinaryPosterUrl(v.cloudinary_url)}
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full rounded-lg border border-line bg-black"
                    src={v.cloudinary_url}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
