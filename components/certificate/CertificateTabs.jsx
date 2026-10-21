'use client';

import { useState } from 'react';
import CertificateViewer from './CertificateViewer';

// One tab per certificate (a student may finish more than one course).
// No certificates => the locked, empty template.
export default function CertificateTabs({ certs }) {
  const [i, setI] = useState(0);
  if (!certs.length) return <CertificateViewer data={null} />;
  const cur = certs[Math.min(i, certs.length - 1)];
  return (
    <div>
      {certs.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {certs.map((c, idx) => (
            <button key={c.code} onClick={() => setI(idx)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${idx === i ? 'border-brand bg-brand text-white' : 'border-line text-inkdim hover:text-ink'}`}>
              {c.course}
            </button>
          ))}
        </div>
      )}
      <CertificateViewer key={cur.code} data={cur} />
    </div>
  );
}
