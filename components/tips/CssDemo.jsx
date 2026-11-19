'use client';

import { reducedMotion } from './Stage';

// Runs the exact HTML and CSS shown beside it. The text comes from lib/tips/content.js (written by us, not by
// visitors). Animations are paused whenever the card is off screen or the person prefers less motion.
export default function CssDemo({ html, css, active }) {
  const still = reducedMotion();
  return (
    <div className={`flex h-full min-h-[14rem] items-center justify-center p-4 ${active && !still ? '' : 'tip-paused'}`}>
      <style>{`${css}\n.tip-paused *, .tip-paused *::before, .tip-paused *::after { animation-play-state: paused !important; }`}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
