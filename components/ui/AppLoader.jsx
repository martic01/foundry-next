// Branded loading screen using the glowing Foundry robot artwork. The artwork has a
// black background, so the screen is black too and the two blend seamlessly.
// Pure CSS animation (globals.css): the robot breathes, a glow pulses behind it and
// a bar slides underneath. Respects "reduce motion". Used by app/loading.jsx, so it
// shows while any page loads, including when the installed app opens.
export default function AppLoader({ label = 'Loading' }) {
  return (
    <div className="foundry-loader fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black px-6" role="status" aria-live="polite">
      <div className="relative flex w-[min(62vw,16rem)] items-center justify-center">
        <span className="foundry-loader-glow absolute inset-[18%] rounded-full bg-[#f2c94c]/25 blur-3xl" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/loader-logo.webp" alt="" width="640" height="640" className="foundry-loader-logo relative h-auto w-full select-none" draggable="false" />
      </div>
      <span className="foundry-loader-bar relative block h-1 w-40 max-w-[55vw] overflow-hidden rounded-full bg-[#f2c94c]/15" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
