'use client';

import { useRef, useState, useEffect } from 'react';

// Wrap anything: hovering shows a small box next to the mouse pointer.
// Also opens on keyboard focus, and on tap for touch screens (closes after a
// few seconds). `tip` can be text or JSX.
export default function CursorTip({ tip, children, className = '' }) {
  const [pos, setPos] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const at = (x, y) => {
    const w = typeof window === 'undefined' ? 1000 : window.innerWidth;
    const h = typeof window === 'undefined' ? 800 : window.innerHeight;
    // Keep the box on screen: flip to the left / above near the edges.
    setPos({ x: Math.min(x + 14, w - 270), y: y + 18 > h - 140 ? Math.max(8, y - 130) : y + 18 });
  };

  return (
    <span
      className={`relative inline-flex ${className}`}
      tabIndex={0}
      onMouseEnter={(e) => at(e.clientX, e.clientY)}
      onMouseMove={(e) => at(e.clientX, e.clientY)}
      onMouseLeave={() => setPos(null)}
      onFocus={(e) => { const r = e.currentTarget.getBoundingClientRect(); at(r.left, r.bottom - 12); }}
      onBlur={() => setPos(null)}
      onTouchStart={(e) => {
        const t = e.touches[0];
        at(t.clientX, t.clientY);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setPos(null), 4500);
      }}
    >
      {children}
      {pos && (
        <span
          role="tooltip"
          style={{ position: 'fixed', left: pos.x, top: pos.y, width: 256 }}
          className="pointer-events-none z-[90] rounded-lg border border-line bg-surface p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink shadow-xl"
        >
          {tip}
        </span>
      )}
    </span>
  );
}
