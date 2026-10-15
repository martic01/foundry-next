import { REGISTRATION_SOURCES } from '../../lib/payments';

// "Manual" vs "Paystack" chip -- how this student's registration was made.
// Pure presentation (no hooks), so it works in server and client
// components alike. `source` is 'manual' | 'gateway' (see getSource()).
const STYLES = {
  manual:
    'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300',
  gateway:
    'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300'
};

export default function SourceBadge({ source }) {
  const meta = REGISTRATION_SOURCES[source];
  if (!meta) return null;
  return (
    <span
      title={meta.title}
      className={`inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STYLES[source]}`}
    >
      {meta.label}
    </span>
  );
}
