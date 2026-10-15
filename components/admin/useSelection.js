import { useState } from 'react';

// Tick-box selection keyed by registration id.
export function useSelection() {
  const [ids, setIds] = useState(() => new Set());
  return {
    ids,
    has: (id) => ids.has(id),
    toggle: (id) =>
      setIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      }),
    setAll: (list) => setIds(new Set(list)),
    clear: () => setIds(new Set())
  };
}
