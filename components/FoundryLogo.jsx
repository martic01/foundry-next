// The Foundry mark (the site icon) plus the wordmark; scales with the classes given.
export default function FoundryLogo({ className = '', markClass = 'h-10 w-10', textClass = 'text-2xl' }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/apple-icon.png" alt="The Foundry logo" className={`${markClass} rounded-xl object-contain`} />
      <span className={`font-display font-extrabold leading-none tracking-tight text-ink ${textClass}`}>
        The <span className="text-brand">Foundry</span>
      </span>
    </span>
  );
}
