import Link from 'next/link';
import { PAYMENT_STATUSES } from '../../lib/payments';
import { formatNaira } from '../../lib/courses';

// The row of "All / Paid / Part payment / Payment pending / Complimentary"
// tiles, each with its count (and the amount still owed where there is
// one). Two uses, one look:
//   * Payments page  -> pass `onSelect` + `active`: tiles are filter buttons.
//   * Overview       -> omit them: tiles are links into the Payments page
//                       already filtered to that status.
// No hooks, so it renders on the server or the client.

const TONES = {
  all: { dot: 'bg-ink/40', ring: 'ring-ink/30' },
  paid: { dot: 'bg-emerald-500', ring: 'ring-emerald-500/50' },
  part: { dot: 'bg-amber-500', ring: 'ring-amber-500/50' },
  pending: { dot: 'bg-orange-500', ring: 'ring-orange-500/50' },
  free: { dot: 'bg-slate-400', ring: 'ring-slate-400/50' }
};

export default function PaymentStatTiles({ summary, active, onSelect }) {
  const tiles = [
    { key: 'all', label: 'All enrolled', count: summary.total, owed: 0 },
    ...Object.entries(PAYMENT_STATUSES).map(([key, s]) => ({
      key,
      label: key === 'pending' ? 'Pending' : s.label,
      count: summary.byStatus[key].count,
      owed: summary.byStatus[key].balanceKobo
    }))
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => {
        const isActive = active === t.key;
        const body = (
          <>
            <div className="mb-1 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${TONES[t.key].dot}`} aria-hidden="true" />
              <span className="text-xs font-medium uppercase tracking-wide text-inkdim">{t.label}</span>
            </div>
            <p className="font-display text-2xl font-extrabold text-ink">{t.count}</p>
            <p className="mt-0.5 h-4 text-xs text-inkdim">{t.owed > 0 ? `${formatNaira(t.owed / 100)} owed` : '\u00a0'}</p>
          </>
        );
        const cls = `card block p-4 text-left transition hover:border-brand/40 ${isActive ? `ring-2 ${TONES[t.key].ring}` : ''}`;

        return onSelect ? (
          <button key={t.key} type="button" onClick={() => onSelect(t.key)} aria-pressed={isActive} className={cls}>
            {body}
          </button>
        ) : (
          <Link key={t.key} href={t.key === 'all' ? '/admin/payments' : `/admin/payments?status=${t.key}`} className={cls}>
            {body}
          </Link>
        );
      })}
    </div>
  );
}
