'use client';

import ErrorScreen from '../components/ui/ErrorScreen';

// Last-resort boundary (errors in the root layout itself). It replaces the
// whole document, so it brings its own <html>/<body> and no site styles.
export default function GlobalError({ error }) {
  return (
    <html lang="en">
      <body>
        <ErrorScreen error={error} plain />
      </body>
    </html>
  );
}
