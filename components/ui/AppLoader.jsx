// Branded loading screen: the Foundry icon with a soft glow, a spinning ring and a
// sliding bar. Pure CSS (see globals.css), works in light and dark, and respects
// "reduce motion". Used by app/loading.jsx, so it shows while any page loads,
// including when the installed app opens.
export default function AppLoader({ label = 'Loading' }) {
  return (
    <div className="foundry-loader fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-surface px-6" role="status" aria-live="polite">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="foundry-loader-glow absolute inset-2 rounded-full bg-brand/30 blur-2xl" aria-hidden="true" />
        <span className="foundry-loader-ring absolute inset-0 rounded-full border-4 border-brand/20 border-t-brand" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/apple-icon.png" alt="" width="64" height="64" className="foundry-loader-logo relative h-16 w-16 rounded-2xl" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-xl font-extrabold tracking-tight text-ink">The <span className="text-brand">Foundry</span></p>
        <span className="foundry-loader-bar relative block h-1 w-40 max-w-[60vw] overflow-hidden rounded-full bg-brand/15" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
