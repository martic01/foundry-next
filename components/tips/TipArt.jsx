// Small decorative pictures drawn with SVG (no image files to download).
const ART = {
  design: (<><rect x="20" y="22" width="80" height="56" rx="8" fill="#f2c94c" /><circle cx="60" cy="50" r="16" fill="#14151a" /><rect x="96" y="38" width="44" height="12" rx="6" fill="#ff7a59" /><rect x="96" y="58" width="30" height="12" rx="6" fill="#5ac8fa" /></>),
  css: (<><path d="M30 20h100l-9 80-41 14-41-14z" fill="#2b6cb0" /><path d="M80 28v76l32-11 7-65z" fill="#3b82d6" /><path d="M54 48h52l-1 12H67l1 12h36l-3 26-21 6-21-6-1-12h12l1 6 9 3 9-3 1-12H56z" fill="#fff" /></>),
  js: (<><rect x="24" y="18" width="112" height="86" rx="10" fill="#f2c94c" /><text x="128" y="96" textAnchor="end" fontFamily="monospace" fontWeight="800" fontSize="44" fill="#14151a">JS</text></>),
  '3d': (<><path d="M80 18l48 24v48l-48 24-48-24V42z" fill="#a78bfa" /><path d="M80 18l48 24-48 24-48-24z" fill="#c4b5fd" /><path d="M80 66v48L32 90V42z" fill="#7c5cd6" /></>),
  html: (<><path d="M30 20h100l-9 80-41 14-41-14z" fill="#e8572a" /><path d="M80 28v76l32-11 7-65z" fill="#f2793f" /><path d="M54 48h52l-1 12H67l1 12h36l-3 26-21 6-21-6-1-12h12l1 6 9 3 9-3 1-12H56z" fill="#fff" /></>),
  ai: (<><rect x="38" y="30" width="84" height="64" rx="14" fill="#14151a" stroke="#f2c94c" strokeWidth="4" /><circle cx="64" cy="62" r="9" fill="#5ac8fa" /><circle cx="96" cy="62" r="9" fill="#5ac8fa" /><rect x="70" y="80" width="20" height="5" rx="2.5" fill="#f2c94c" /><path d="M80 30V16" stroke="#f2c94c" strokeWidth="4" /><circle cx="80" cy="14" r="6" fill="#ff7a59" /></>)
};
export default function TipArt({ kind, className = '' }) {
  return (
    <svg viewBox="0 0 160 130" className={className} role="img" aria-hidden="true" focusable="false">
      <defs><linearGradient id={`bg-${kind}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#23252e" /><stop offset="1" stopColor="#14151a" /></linearGradient></defs>
      <rect width="160" height="130" rx="16" fill={`url(#bg-${kind})`} />
      {ART[kind]}
    </svg>
  );
}
