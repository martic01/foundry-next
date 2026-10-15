'use client';

import dynamic from 'next/dynamic';

// Robot3D pulls in three.js + the GLTF loader (hundreds of KB) and then
// downloads a 3D model. None of that is needed to read the page, so it's
// split into its own chunk and loaded after the page is interactive
// instead of blocking first paint. ssr:false because it is WebGL-only.
// (next/dynamic with ssr:false has to live in a Client Component, which
// is why this wrapper exists rather than doing it in app/page.jsx.)
//
// The placeholder is an empty box with the SAME h-full/w-full sizing as
// the real component's root, so nothing shifts when the robot arrives.
const Robot3D = dynamic(() => import('./Robot3D'), {
  ssr: false,
  loading: () => <div className="h-full w-full" aria-hidden="true" />
});

export default Robot3D;
