'use client';

import { useLayoutEffect, useRef, useState } from 'react';

// Long text collapses to a few lines with a "Read more" toggle; short
// text renders as-is with no toggle at all. Overflow is measured, so it
// adapts to screen width (a message that fits on a desktop may need
// "Read more" on a phone).
export default function ExpandableText({ text, lines = 4, className = '' }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      if (open) return; // while open we can't measure the clamped height
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text, lines, open]);

  return (
    <div>
      <p
        ref={ref}
        className={`whitespace-pre-wrap break-words ${className}`}
        style={
          open
            ? undefined
            : { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
        }
      >
        {text}
      </p>
      {(overflows || open) && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-1 text-xs font-semibold text-brand hover:underline"
        >
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
