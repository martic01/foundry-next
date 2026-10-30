// Registration availability for a course -- pure, shared by the landing
// page, /register, the admin Registration page and /api/payments/verify.
//
// Admin controls (course_settings row):
//   registration_open  the master switch
//   tag                none | coming_soon | ended | limited_seats | sold_out
//   reopen_at          when it reopens; null while closed = "until
//                      further notice"
//
// Three tags CLOSE registration by themselves (coming soon, ended, all
// seats taken) -- showing "Register now" next to "All seats taken" would
// just be wrong. "Limited seats" is information only.
//
// Once reopen_at passes, the closure lifts automatically -- including a
// closing tag, which would otherwise be left showing stale.

export const TAGS = {
  none: { label: '', closes: false },
  coming_soon: { label: 'Coming soon', closes: true },
  ended: { label: 'Ended', closes: true },
  limited_seats: { label: 'Limited seats available', closes: false },
  sold_out: { label: 'All seats taken', closes: true }
};

export const TAG_OPTIONS = Object.keys(TAGS);

// Used when a course has no course_settings row (table not migrated yet,
// or a course added to lib/courses.js later) -- mirrors the old behaviour
// driven by the static `comingSoon` flag.
export function defaultSettingsFor(course) {
  return {
    course: course.key,
    registration_open: !course.comingSoon,
    tag: course.comingSoon ? 'coming_soon' : 'none',
    reopen_at: null,
    registration_closed_at: null,
    auto_close: true
  };
}

export function getAvailability(settings, nowMs = Date.now()) {
  // Closed by itself: 50 seats taken, or the class clock has started.
  // (course_settings.auto_closed is filled in by lib/course-settings.js;
  // the admin can switch this off per course.)
  if (settings?.auto_closed && settings.auto_close !== false) {
    return { open: false, tag: 'sold_out', tagLabel: TAGS.sold_out.label, reopenAt: null, untilFurtherNotice: true, autoClosed: settings.auto_closed };
  }
  const tag = TAGS[settings?.tag] ? settings.tag : 'none';
  const closedByTag = TAGS[tag].closes;
  const closedBySwitch = settings?.registration_open === false;
  const closed = closedBySwitch || closedByTag;

  const reopenMs = settings?.reopen_at ? new Date(settings.reopen_at).getTime() : null;
  const reopened = closed && reopenMs !== null && nowMs >= reopenMs;

  const open = !closed || reopened;
  const shownTag = reopened && closedByTag ? 'none' : tag;

  return {
    open,
    tag: shownTag,
    tagLabel: TAGS[shownTag].label,
    reopenAt: !open && reopenMs !== null ? settings.reopen_at : null,
    untilFurtherNotice: !open && reopenMs === null
  };
}

// A payment that was STARTED before the admin closed registration is
// still honoured -- otherwise someone with the Paystack window open when
// the switch flips would be charged and then refused.
export function startedBeforeClose(settings, txnCreatedAt) {
  const closedAt = settings?.registration_closed_at ? new Date(settings.registration_closed_at).getTime() : null;
  const started = txnCreatedAt ? new Date(txnCreatedAt).getTime() : NaN;
  return closedAt !== null && !Number.isNaN(started) && started < closedAt;
}

export function formatReopenDate(iso) {
  return new Date(iso).toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos'
  });
}

// One-line explanation for students: why it's closed and when it opens.
export function describeClosure(a) {
  if (a.open) return '';
  if (a.autoClosed === 'full') return 'All seats are taken: this cohort is full.';
  if (a.autoClosed === 'started') return 'All seats are taken: this cohort has already started.';
  const lead = a.tag === 'coming_soon' ? 'Registration is not open yet' : a.tag === 'ended' ? 'Registration has ended' : a.tag === 'sold_out' ? 'All seats are taken' : 'Registration is currently closed';
  if (a.reopenAt) return `${lead}. It opens on ${formatReopenDate(a.reopenAt)}.`;
  return `${lead} — until further notice.`;
}

// Admin picks a calendar day; we store midnight at the start of that day
// in Lagos (UTC+1, no DST).
export function reopenDateToIso(yyyyMmDd) {
  return new Date(`${yyyyMmDd}T00:00:00+01:00`).toISOString();
}
export function isoToReopenDateInput(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }); // YYYY-MM-DD
}
