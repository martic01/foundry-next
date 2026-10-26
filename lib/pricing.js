// Price shown and charged for a course. The admin can override it on the
// Registration page (price, optional "was" price, or remove the discount);
// until they do, the defaults in lib/courses.js apply. Amounts are naira.
export function effectivePrice(course, settings) {
  if (settings?.pricing_custom === true && Number.isInteger(settings.price_now)) {
    return { now: settings.price_now, was: Number.isInteger(settings.price_was) ? settings.price_was : null };
  }
  return { now: course.priceNow, was: course.priceWas ?? null };
}

// The course object with its live price filled in (priceNow / priceWas).
export function withPrice(course, settings) {
  const p = effectivePrice(course, settings);
  return { ...course, priceNow: p.now, priceWas: p.was };
}

// Validates what the admin typed. Empty "was" = no discount shown.
export function parsePriceInput(nowRaw, wasRaw) {
  const toInt = (v) => (String(v ?? '').trim() === '' ? null : Number(String(v).replace(/[,\s₦]/g, '')));
  const now = toInt(nowRaw);
  const was = toInt(wasRaw);
  if (now === null || !Number.isInteger(now) || now < 100 || now > 20_000_000) return { error: 'Enter the price in naira (a whole number, at least 100).' };
  if (was !== null) {
    if (!Number.isInteger(was) || was > 20_000_000) return { error: 'The original price must be a whole number of naira.' };
    if (was <= now) return { error: 'The original (crossed-out) price must be higher than the price students pay. Leave it empty to remove the discount.' };
  }
  return { now, was };
}
