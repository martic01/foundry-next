// Exam settings per course. Only Stage 1 (foundations) has a question bank so far;
// a course with no entry here has no exam. Pure data: safe for browser and server.
export const EXAMS = {
  foundations: {
    // How many questions are drawn at random from each bank. 40+40+40 + 5+5+5+5 = 140.
    sections: [
      { key: 'html', label: 'HTML', count: 40 },
      { key: 'css', label: 'CSS', count: 40 },
      { key: 'js', label: 'JavaScript', count: 40 },
      { key: 'git', label: 'Git & GitHub', count: 5 },
      { key: 'hosting', label: 'Hosting (Vercel)', count: 5 },
      { key: 'structure', label: 'Project structure', count: 5 },
      { key: 'ai', label: 'AI', count: 5 }
    ]
  }
};

export const EXAM_RULES = {
  durationMinutes: 120,        // auto-submitted when this runs out
  graceSeconds: 300,           // a dropped connection may still deliver the final answers this long after time-up
  defaultPassPercent: 50,
  freeAttempts: 3,             // first try + 2 retakes
  minSubmitMinutes: 10, // the Submit button stays locked for this long after the exam starts
  minCountMinutes: 10,         // a PAID attempt that ends before this is not counted and the payment is kept
  gapHours: 48,                // wait between attempts
  retakeFeeNaira: 5000,        // every attempt after the free ones
  maxViolations: 3,            // times a student may leave full screen / switch away before the exam is submitted for them
  defaultExamHourWAT: 18,      // every exam starts at 6:00 PM Lagos time unless the admin or a reschedule says otherwise
  daysAfterCourse: 7           // provisional exam date: a week after the last class
};

// Per-batch settings with the defaults filled in. `row` is the batch's exam_schedules row (or null).
// The retake fee in naira: the admin's figure for the batch, else the default (5,000).
export const retakeFeeFor = (row) => (Number.isInteger(row?.retake_fee_naira) && row.retake_fee_naira >= 100 ? row.retake_fee_naira : EXAM_RULES.retakeFeeNaira);

export function examSettings(course, row) {
  const sections = EXAMS[course]?.sections || [];
  const saved = row?.section_counts && typeof row.section_counts === 'object' ? row.section_counts : {};
  const counts = Object.fromEntries(sections.map((s) => {
    const v = saved[s.key];
    return [s.key, Number.isInteger(v) && v >= 0 ? v : s.count];
  }));
  const minutes = Number.isInteger(row?.duration_minutes) ? row.duration_minutes : EXAM_RULES.durationMinutes;
  return { counts, durationMinutes: minutes, retakeFee: retakeFeeFor(row), total: Object.values(counts).reduce((n, x) => n + x, 0) };
}

export const hasExam = (course) => !!EXAMS[course];
export const examTotal = (course) => (EXAMS[course]?.sections || []).reduce((n, s) => n + s.count, 0);
export const passMarkFor = (total, passPercent) => Math.ceil((total * passPercent) / 100);

// 70%+ Good, 80%+ Great, 100% Perfect; 50-69 plain pass.
export function gradeLabel(percent, passed) {
  if (percent === null || percent === undefined) return '';
  if (percent >= 100) return 'Perfect';
  if (percent >= 80) return 'Great';
  if (percent >= 70) return 'Good';
  return passed ? 'Pass' : 'Not passed';
}
