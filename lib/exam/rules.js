import { EXAM_RULES, EXAMS, passMarkFor, gradeLabel, retakeFeeFor } from './config';

// Pure exam rules (no database, no question bank): safe to unit-test and to import anywhere.

const ms = (iso) => (iso ? new Date(iso).getTime() : NaN);

// An exam row counts as "on" when the admin switched it on, or its automatic time has passed.
export function isOn(row, now = Date.now()) {
  if (!row) return false;
  if (row.activated) return true;
  const t = ms(row.activate_at);
  return Number.isFinite(t) && t <= now;
}

// rows = every schedule row of the student's batch. A row for this student wins for the date.
export function effectiveSchedule(rows, userId, now = Date.now()) {
  const batchRow = (rows || []).find((r) => !r.user_id) || null;
  const mine = (rows || []).find((r) => r.user_id === userId) || null;
  const row = mine || batchRow;
  if (!row) return null;
  return {
    startsAt: row.starts_at,
    active: isOn(batchRow, now) || isOn(mine, now),
    passPercent: batchRow?.pass_percent || EXAM_RULES.defaultPassPercent,
    batchRow,
    openRow: isOn(batchRow, now) ? batchRow : isOn(mine, now) ? mine : null,
    personal: !!mine,
    personalAt: mine?.updated_at || null,
    note: row.note || ''
  };
}

// What can this student do right now?
//  hidden | not_open | in_progress | wait | pay | ready | passed
export function examState({ schedule, attempts, paidToken = false, now = Date.now() }) {
  const real = (attempts || []).filter((a) => a.status !== 'dismissed');
  const passed = real.find((a) => a.status === 'submitted' && a.passed);
  if (passed) return { state: 'passed', attempt: passed };
  const running = real.find((a) => a.status === 'in_progress');
  if (running) return { state: 'in_progress', attempt: running };
  if (!schedule?.active) return { state: 'hidden' };
  const opens = ms(schedule.startsAt);
  if (Number.isFinite(opens) && now < opens) return { state: 'not_open', opensAt: schedule.startsAt };

  const submitted = real.filter((a) => a.status === 'submitted').sort((a, b) => ms(a.submitted_at) - ms(b.submitted_at));
  // An attempt the school invalidated still USES one of the 3 free attempts (the system's own cancellation of a short paid attempt does not: it has no dismissed_by).
  const invalid = (attempts || []).filter((a) => a.status === 'dismissed' && a.dismissed_by);
  const used = submitted.length + invalid.length;
  const last = submitted[submitted.length - 1];
  // A date the admin set for THIS student after their last attempt replaces the usual 2-day wait.
  const waived = !!schedule.personal && ms(schedule.personalAt) > ms(last?.submitted_at);
  if (last && !waived) {
    const until = ms(last.submitted_at) + EXAM_RULES.gapHours * 3600 * 1000;
    if (now < until) return { state: 'wait', until: new Date(until).toISOString(), used, fee: retakeFeeFor(schedule.batchRow) };
  }
  if (used >= EXAM_RULES.freeAttempts && !paidToken) return { state: 'pay', used, fee: retakeFeeFor(schedule.batchRow) };
  return { state: 'ready', used, attemptNo: used + 1, free: used < EXAM_RULES.freeAttempts };
}

// Fisher-Yates with an injected random function: rand(n) returns an integer 0..n-1.
export function shuffle(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// bank = { html: [...], css: [...] }. Returns [{id, o}] where o is the shown order of the 4 options.
export function pickQuestions(course, bank, rand, counts = {}) {
  const out = [];
  for (const s of EXAMS[course]?.sections || []) {
    const pool = bank[s.key] || [];
    const want = Number.isInteger(counts[s.key]) ? counts[s.key] : s.count;
    if (want === 0) continue;
    if (pool.length < want) throw new Error(`Question bank "${s.key}" has ${pool.length}, needs ${want}.`);
    shuffle(pool, rand).slice(0, want).forEach((q) => out.push({ id: q.id, o: shuffle([0, 1, 2, 3], rand) }));
  }
  return out;
}

// stored = [{id, o}], answers = { [id]: shownPosition }, bank = flat map id -> {answer}
export function gradeAttempt(course, stored, answers, bankById, passPercent = EXAM_RULES.defaultPassPercent) {
  const sections = {};
  for (const s of EXAMS[course]?.sections || []) sections[s.key] = { label: s.label, score: 0, total: 0 };
  let score = 0, total = 0;
  for (const q of stored) {
    const real = bankById[q.id];
    if (!real) continue; // a question removed from the bank later counts for nobody
    const key = q.id.split('-')[0];
    total += 1;
    if (sections[key]) sections[key].total += 1;
    const pos = answers?.[q.id];
    if (Number.isInteger(pos) && pos >= 0 && pos <= 3 && q.o[pos] === real.answer) {
      score += 1;
      if (sections[key]) sections[key].score += 1;
    }
  }
  const percent = total ? Math.round((score / total) * 100) : 0;
  const passed = total > 0 && score >= passMarkFor(total, passPercent);
  return { score, total, percent, passed, sections, label: gradeLabel(percent, passed) };
}

// Profile-card summary for one course from all of a student's attempts in it.
export function summarize(attempts) {
  const real = (attempts || []).filter((a) => a.status === 'submitted');
  const best = real.find((a) => a.passed) || [...real].sort((a, b) => ms(b.submitted_at) - ms(a.submitted_at))[0] || null;
  if (!best) return null;
  return {
    attempts: real.length,
    passed: !!best.passed,
    percent: best.percent,
    score: best.score,
    total: best.total,
    label: gradeLabel(best.percent, best.passed),
    sections: best.sections || {},
    at: best.submitted_at
  };
}

export const remainingMs = (expiresAt, now = Date.now()) => Math.max(0, ms(expiresAt) - now);
