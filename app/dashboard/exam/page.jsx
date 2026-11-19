import { createAdminClient } from '../../../lib/supabase/admin';
import { getUser, getProfile } from '../../../lib/supabase/session';
import { loadExamContext, clientQuestions } from '../../../lib/exam/server';
import { EXAMS, EXAM_RULES, examTotal, passMarkFor } from '../../../lib/exam/config';
import ExamRunner from '../../../components/exam/ExamRunner';
import ExamPanel from '../../../components/exam/ExamPanel';

export const metadata = { title: 'Exam — The Foundry' };
export const dynamic = 'force-dynamic';

export default async function StudentExam() {
  const user = await getUser();
  const db = createAdminClient();
  const ctx = await loadExamContext(db, user.id);

  if (!ctx || (ctx.state.state === 'hidden' && !ctx.attempts.length)) {
    return (
      <div>
        <p className="eyebrow mb-2">Exam</p>
        <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Exam</h1>
        <div className="card p-6 text-sm text-inkdim">The exam is not open yet. You will get an alert when the school opens it.</div>
      </div>
    );
  }

  const running = ctx.state.state === 'in_progress' ? ctx.state.attempt : null;
  if (running) {
    const profile = await getProfile(user.id);
    return (
      <ExamRunner
        attemptId={running.id}
        questions={clientQuestions(running.questions)}
        sections={EXAMS[ctx.course].sections}
        initialAnswers={running.answers || {}}
        expiresAt={Date.parse(running.expires_at)}
        startedAt={Date.parse(running.started_at)}
        serverNow={Date.now()}
        candidate={profile?.full_name || ''}
        title="Final examination"
      />
    );
  }

  const total = ctx.settings.total;
  const passPercent = ctx.schedule?.passPercent || EXAM_RULES.defaultPassPercent;
  const view = {
    sections: EXAMS[ctx.course].sections,
    state: ctx.state.state,
    schedule: ctx.schedule && { startsAt: ctx.schedule.startsAt, active: ctx.schedule.active, personal: ctx.schedule.personal, note: ctx.schedule.note },
    nextNo: ctx.nextNo,
    fee: ctx.settings.retakeFee,
    used: ctx.state.used ?? ctx.attempts.filter((a) => a.status === 'submitted').length,
    until: ctx.state.until || null,
    attemptNo: ctx.state.attemptNo || 1,
    free: ctx.state.free,
    total, durationMinutes: ctx.settings.durationMinutes, counts: ctx.settings.counts, passPercent, passMark: passMarkFor(total, passPercent),
    attempts: ctx.attempts.map((a) => ({ id: a.id, status: a.status, started_at: a.started_at, percent: a.percent, score: a.score, total: a.total, passed: a.passed, auto_submitted: a.auto_submitted, sections: a.sections })),
    request: ctx.request,
    summary: ctx.summary
  };
  return (
    <div>
      <p className="eyebrow mb-2">Exam</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Final exam</h1>
      <ExamPanel view={view} />
    </div>
  );
}
