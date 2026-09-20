'use client';

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
export default function ClassVideos({ videos }) {
  if (!videos.length) {
    return (
      <div className="rounded-lg border border-line bg-surfaceMuted p-4 text-sm text-inkdim">
        No class videos posted yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {videos.map((v) => (
        <div key={v.id}>
          <p className="mb-1 text-sm font-semibold text-ink">{v.title}</p>
          {v.description && <p className="mb-2 text-sm text-inkdim">{v.description}</p>}
          <video
            controls
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
            className="w-full rounded-lg border border-line bg-black"
            src={v.cloudinary_url}
          />
        </div>
      ))}
    </div>
  );
}
