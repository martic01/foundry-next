'use client';

import { useState } from 'react';

// An <img> for photos hosted elsewhere. If it fails to load, the soft
// gradient behind it shows instead of a broken-image icon.
export default function RemoteImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-brand-light to-surfaceMuted ${className}`}>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
      )}
    </div>
  );
}
