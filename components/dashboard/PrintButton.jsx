'use client';

import { Download } from 'lucide-react';

// No PDF library involved -- the receipt page itself is print-styled
// (Nav/Footer are hidden via `print:hidden`, see components/Nav.jsx and
// components/Footer.jsx), so the browser's own "Print > Save as PDF" is
// the download. That avoids pulling in a new dependency just for this,
// and it's what every browser already does reliably without extra JS.
export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="cta-btn print:hidden">
      <Download className="h-4 w-4" /> Download receipt (PDF)
    </button>
  );
}
