// Single source of truth for the minimum laptop spec list -- shown on
// the payment page (as an agreement checkbox students must tick before
// paying) and on the Installation page (as a reminder). Keeping it in
// one file means those two places can never quietly drift apart.
export const LAPTOP_SPECS = [
  'At least 8GB of RAM',
  'At least 200GB of storage',
  'A processor of at least 1.5GHz',
  'At least an Intel Core i5 (or equivalent)',
  'An updated, currently-supported operating system -- Windows 10 or later, a recent macOS, or a current Linux distribution'
];
