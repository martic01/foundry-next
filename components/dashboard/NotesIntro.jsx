export default function NotesIntro({ intro }) {
  if (!intro) return null;

  return (
    <div className="card mb-8 p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-inkdim">{intro.title}</p>
      <h2 className="mb-1 font-display text-xl font-extrabold text-ink">{intro.subtitle}</h2>
      {intro.tagline && <p className="mb-3 text-sm italic text-inkdim">{intro.tagline}</p>}

      {!!intro.meta?.length && (
        <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-inkdim">
          {intro.meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {intro.sections?.map((s) => (
          <div key={s.heading}>
            <p className="mb-1.5 text-sm font-semibold text-ink">{s.heading}</p>
            {s.body && <p className="text-sm text-inkdim">{s.body}</p>}
            {!!s.bullets?.length && (
              <ul className="mt-1 flex flex-col gap-1">
                {s.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm text-inkdim">
                    <span className="text-brand">&bull;</span> {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
