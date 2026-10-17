'use client';

import ErrorScreen from '../components/ui/ErrorScreen';

export default function Error({ error }) {
  return <ErrorScreen error={error} />;
}
