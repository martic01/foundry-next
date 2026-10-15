// Shown instantly by app/admin/loading.jsx and app/dashboard/loading.jsx
// while the next page's data loads. Because it lives in a loading.jsx,
// the sidebar stays put and only this content area swaps -- so a click
// on a sidebar item responds immediately instead of freezing on the old
// page. It also lets Next prefetch these routes' shell on hover/viewport.
// Server component, no hooks: it ships no JavaScript.
export default function PageSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading">
      <div className="mb-2 h-3 w-24 rounded bg-line" />
      <div className="mb-8 h-7 w-64 max-w-full rounded bg-line" />
      <div className="card mb-5 p-5">
        <div className="mb-3 h-4 w-40 rounded bg-line" />
        <div className="h-3 w-full rounded bg-surfaceMuted" />
        <div className="mt-2 h-3 w-4/5 rounded bg-surfaceMuted" />
      </div>
      <div className="card p-5">
        <div className="mb-4 h-4 w-32 rounded bg-line" />
        <div className="flex flex-col gap-3">
          <div className="h-12 rounded-lg bg-surfaceMuted" />
          <div className="h-12 rounded-lg bg-surfaceMuted" />
          <div className="h-12 rounded-lg bg-surfaceMuted" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
