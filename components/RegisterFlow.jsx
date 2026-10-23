'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, PartyPopper, CheckCircle2, Loader2, ArrowRight, ShieldCheck, Laptop } from 'lucide-react';
import AutoPanImage from './AutoPanImage';
import GoogleIcon from './icons/GoogleIcon';
import { createClient } from '../lib/supabase/client';
import { COURSES, getCourse, MIN_AGE, isAgeEligible, formatNaira } from '../lib/courses';
import { LAPTOP_SPECS } from '../lib/laptop-specs';
import { getAvailability, describeClosure } from '../lib/course-status';
import { saveCertificateNameAction } from '../app/actions';
import { validateCertificateName } from '../lib/certificates';
import { withPrice } from '../lib/pricing';
import ContactButtons from './ContactButtons';

export default function RegisterFlow({ settingsByCourse, hrContacts }) {
  const params = useSearchParams();
  const baseCourse = getCourse(params.get('course')) || COURSES.foundations;
  // If the admin changes the price while this page is open, the server tells us on Pay and we show the new one.
  const [priceOverride, setPriceOverride] = useState(null);
  const course = withPrice(baseCourse, settingsByCourse[baseCourse.key]);
  if (priceOverride !== null) course.priceNow = priceOverride;
  const [done, setDone] = useState(false);

  const availability = getAvailability(settingsByCourse[course.key]);

  // Enquiry-only course (HR): no checkout, just ways to get in touch.
  if (course.contactOnly) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="card p-8">
          <p className="eyebrow mb-2">Enquire</p>
          <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">{course.name}</h1>
          <p className="mb-4 text-brand-dark">{course.tagline}</p>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkdim">What we offer</p>
          <ul className="mb-6 space-y-2">
            {(course.services || course.learn).map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-ink"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" strokeWidth={2.25} />{item}</li>
            ))}
          </ul>
          <p className="mb-3 text-sm text-inkdim">There is no online payment for HR. Message us and we will talk through what you need and the cost.</p>
          <ContactButtons whatsapp={hrContacts?.whatsapp} email={hrContacts?.email} message="Hello, I would like to enquire about your HR training and services." subject="HR enquiry" />
        </div>
      </main>
    );
  }

  if (!availability.open) {
    const heading = availability.tag === 'coming_soon' ? 'Coming soon' : availability.tag === 'ended' ? 'Registration ended' : availability.tag === 'sold_out' ? 'All seats taken' : 'Registration closed';
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg items-center px-6 text-center">
        <div className="card w-full p-8">
          <h1 className="mb-2 font-display text-xl font-extrabold text-ink">{course.name} — {heading}</h1>
          <p className="mb-5 text-sm text-inkdim">
            {describeClosure(availability)}
            {availability.reopenAt ? '' : ' Check back soon.'}
          </p>
          <a href="/#courses" className="cta-btn w-fit">
            Back to courses
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      {done ? <DoneStep /> : <DetailsStep course={course} onDone={() => setDone(true)} onPriceChange={setPriceOverride} />}
    </main>
  );
}

function DetailsStep({ course, onDone, onPriceChange }) {
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null); // Supabase user once signed in with Google
  const [checkingSession, setCheckingSession] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState({ text: '', kind: '' });

  const [dob, setDob] = useState('');
  const [fullName, setFullName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [specsAgreed, setSpecsAgreed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState({ text: '', kind: '' });
  // The centred progress box. null = hidden (also while Paystack's own window is up, or when a message needs the person's attention).
  const [phase, setPhase] = useState(null); // null | 'preparing' | 'opening' | 'confirming'
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [otherCourses, setOtherCourses] = useState([]); // courses this same account already holds

  // Runs once on load, including right after landing back from Google's
  // redirect (see app/auth/callback/route.js). Google itself is the
  // email verification and the credential -- there's no local password
  // anywhere in this app to also check.
  useEffect(() => {
    if (searchParams.get('oauth_error')) {
      setAuthStatus({ text: 'Google sign-in didn\u2019t complete. Please try again.', kind: 'error' });
    }
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data?.user || null;
      setUser(u);
      setCheckingSession(false);
      if (u) {
        // Prefill: the name they gave before, else the one on their Google account.
        const { data: prof } = await supabase.from('profiles').select('certificate_name').eq('id', u.id).maybeSingle();
        setFullName((prev) => prev || prof?.certificate_name || u.user_metadata?.full_name || u.user_metadata?.name || '');
      }
    });
  }, [searchParams]);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    const supabase = createClient();
    const next = window.location.pathname + window.location.search;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });
    if (error) {
      setGoogleLoading(false);
      setAuthStatus({ text: error.message, kind: 'error' });
    }
    // On success the browser navigates away to Google -- nothing else to
    // do here; the useEffect above picks the session back up on return.
  }

  // Once signed in, check whether this account already has a paid
  // registration for THIS course specifically (someone could still pay
  // for the other stage) -- purely a UI courtesy that disables the
  // button early. The real gate is server-side, in
  // /api/payments/verify, since this check alone couldn't stop a
  // replayed request.
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('registrations')
      .select('course')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .then(({ data }) => {
        const held = (data || []).map((r) => r.course);
        setAlreadyPaid(held.includes(course.key));
        setOtherCourses(held.filter((c) => c !== course.key));
      });
  }, [user, course.key]);

  const dobEntered = dob !== '';
  const ageEligible = dobEntered && isAgeEligible(dob);
  const ageIneligible = dobEntered && !ageEligible;
  const nameCheck = validateCertificateName(fullName);
  const canPay = !!user && !!nameCheck.ok && ageEligible && agreed && specsAgreed && !paying && !alreadyPaid;

  async function handlePay() {
    if (!canPay) return;
    setPaying(true);

    // The name for the certificate is saved BEFORE any money moves.
    const saved = await saveCertificateNameAction(fullName);
    if (saved?.error) {
      setPaying(false);
      setNameTouched(true);
      setStatus({ text: saved.error, kind: 'error' });
      return;
    }

    // The SERVER picks the amount (the admin's live price), records it, and
    // starts the Paystack transaction. We only receive an access code, so
    // nothing in the browser can change what is charged.
    setStatus({ text: '', kind: '' });
    setPhase('preparing');
    let init;
    try {
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseKey: course.key, dob, specsAgreed, expectedPrice: course.priceNow })
      });
      init = await res.json();
      if (res.status === 409 && init.error === 'price_changed') {
        onPriceChange(init.priceNow);
        setPhase(null);
        setPaying(false);
        setStatus({ text: 'The price was just updated to ' + formatNaira(init.priceNow) + '. Please check it and tap Pay again.', kind: 'info' });
        return;
      }
      if (!res.ok) throw new Error(init.error || 'Could not start the payment.');
    } catch (err) {
      setPhase(null);
      setPaying(false);
      setStatus({ text: err.message, kind: 'error' });
      return;
    }
    const reference = init.reference;
    setPhase('opening');
    // Safety net: never leave our box over Paystack's window if it forgets to tell us it loaded.
    const hideTimer = setTimeout(() => setPhase((p) => (p === 'opening' ? null : p)), 3500);

    // Loaded dynamically, only here (inside a click handler, so only
    // ever in the browser): that package touches `window` as soon as it is
    // imported, which would crash Next.js's server-side prerender.
    const { default: PaystackPop } = await import('@paystack/inline-js');
    const popup = new PaystackPop();
    popup.resumeTransaction(init.accessCode, {
      onLoad: () => { clearTimeout(hideTimer); setPhase((p) => (p === 'opening' ? null : p)); },
      onSuccess: async (transaction) => {
        clearTimeout(hideTimer);
        setStatus({ text: '', kind: '' });
        setPhase('confirming');
        try {
          const res = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference: transaction.reference || reference,
              certificateName: fullName
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Could not verify your payment.');
          setPhase(null);
          onDone();
        } catch (err) {
          setPhase(null);
          setPaying(false);
          setStatus({ text: err.message, kind: 'error' });
        }
      },
      onCancel: () => {
        clearTimeout(hideTimer);
        setPhase(null);
        setPaying(false);
        setStatus({ text: 'Payment window closed \u2014 you can try again whenever you\u2019re ready.', kind: 'info' });
      },
      onError: (error) => {
        clearTimeout(hideTimer);
        setPhase(null);
        setPaying(false);
        setStatus({ text: 'Payment error: ' + (error?.message || 'please try again.'), kind: 'error' });
      }
    });
  }

  return (
    <section className="card grid gap-8 p-6 md:grid-cols-[0.85fr_1.15fr] md:p-9">
      <AutoPanImage src={course.image} alt={course.name} frameClassName="aspect-[4/5] w-full rounded-lg border border-line" />

      <div>
        <p className="eyebrow mb-2">State AI Training</p>
        <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">{course.name}</h1>
        <p className="mb-5 text-brand-dark">{course.tagline}</p>

        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkdim">What you&apos;ll learn</p>
        <ul className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {course.learn.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-ink">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" strokeWidth={2.25} />
              {item}
            </li>
          ))}
        </ul>

        <div className="mb-6 flex items-baseline gap-3 rounded-lg bg-surfaceMuted p-4">
          <span className="font-display text-2xl font-semibold text-ink">{formatNaira(course.priceNow)}</span>
          {course.priceWas ? <span className="text-inkdim line-through">{formatNaira(course.priceWas)}+</span> : null}
        </div>

        {/* Step: sign in -- Google handles both the credential and the
            email verification, so there's nothing else to do here. */}
        <div className="mb-5 rounded-lg border border-line p-4">
          <p className="mb-3 text-sm font-semibold text-ink">1. Sign in</p>
          {checkingSession ? (
            <p className="flex items-center gap-2 text-sm text-inkdim">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking sign-in status&hellip;
            </p>
          ) : user ? (
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Signed in as {user.email}
            </p>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="cta-btn-outline w-full !py-2.5 text-sm"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Redirecting to Google&hellip;
                </>
              ) : (
                <>
                  <GoogleIcon className="h-4 w-4" /> Continue with Google
                </>
              )}
            </button>
          )}
          {authStatus.text && (
            <p className={`mt-2 text-xs ${authStatus.kind === 'error' ? 'text-red-600' : 'text-inkdim'}`}>{authStatus.text}</p>
          )}
        </div>

        {/* Step: the name printed on the certificate. Saved before payment. */}
        <div className="mb-5 rounded-lg border border-line p-4">
          <p className="mb-1 text-sm font-semibold text-ink">2. Your full name</p>
          <p className="mb-3 text-xs text-inkdim">This is the name that will be printed on your certificate, so enter it exactly as you want it to appear (first and last name).</p>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            placeholder="e.g. Ada Chinwe Obi"
            autoComplete="name"
            maxLength={100}
            className="field"
            aria-label="Full name for your certificate"
          />
          {nameTouched && nameCheck.error && <p className="mt-2 text-xs text-red-600">{nameCheck.error}</p>}
        </div>

        {/* Step: date of birth -- gates course eligibility at a single,
            blanket minimum age across both stages. */}
        <div className="mb-5 rounded-lg border border-line p-4">
          <p className="mb-3 text-sm font-semibold text-ink">3. Confirm your date of birth</p>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="field"
          />
          {ageIneligible && (
            <p className="mt-2 text-xs text-red-600">
              You must be at least {MIN_AGE} to register for this course.
            </p>
          )}
        </div>

        {/* Step: laptop specs -- a real checkbox the student must tick,
            not just fine print, since showing up to class on hardware
            that can't run the tools wastes their money and everyone's
            time. Recorded to the DB at payment time (see
            /api/payments/verify) as laptop_specs_agreed. */}
        <div className="mb-5 rounded-lg border border-line p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Laptop className="h-4 w-4" /> 4. Confirm your laptop meets these specs
          </p>
          <ul className="mb-3 space-y-1.5">
            {LAPTOP_SPECS.map((spec) => (
              <li key={spec} className="flex items-start gap-2 text-sm text-inkdim">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand" />
                {spec}
              </li>
            ))}
          </ul>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-inkdim">
            <input
              type="checkbox"
              checked={specsAgreed}
              onChange={(e) => setSpecsAgreed(e.target.checked)}
              className="mt-1 accent-brand"
            />
            <span>I confirm my laptop meets all of the specs above.</span>
          </label>
        </div>

        <label className="mb-5 flex cursor-pointer items-start gap-2 text-sm text-inkdim">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-brand" />
          <span>
            I agree to the{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand underline">
              Terms &amp; Policy
            </a>
          </span>
        </label>

        {!alreadyPaid && otherCourses.length > 0 && (
          <p className="mb-4 rounded-lg border border-line bg-surfaceMuted p-3 text-sm text-inkdim">
            You&apos;re already a student with <span className="font-medium text-ink">{user.email}</span>. Paying here adds{' '}
            <span className="font-medium text-ink">{course.name}</span> to the same account &mdash; no new sign-up needed.
          </p>
        )}
        {alreadyPaid ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-700">
            You&apos;ve already registered for {course.name}.{' '}
            <a href="/dashboard" className="font-semibold underline">Go to your dashboard &rarr;</a>
          </div>
        ) : (
          <button onClick={handlePay} disabled={!canPay} className="cta-btn w-full">
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Pay Now
          </button>
        )}
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-inkdim">
          <ShieldCheck className="h-3.5 w-3.5" /> Secured by Paystack
        </p>
        {status.text && (
          <p className={`mt-3 text-sm ${status.kind === 'error' ? 'text-red-600' : status.kind === 'success' ? 'text-emerald-600' : 'text-inkdim'}`} role="status" aria-live="polite">
            {status.text}
          </p>
        )}
        {phase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-live="assertive" aria-label="Payment progress">
            <div className="card flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center shadow-2xl">
              <Loader2 className="h-10 w-10 animate-spin text-brand" />
              <div>
                <p className="font-display text-base font-extrabold text-ink">
                  {phase === 'preparing' ? 'Preparing your secure payment' : phase === 'opening' ? 'Opening the payment window' : 'Confirming your payment'}
                </p>
                <p className="mt-1 text-sm text-inkdim">
                  {phase === 'confirming' ? 'Setting up your seat. Please keep this page open, it only takes a moment.' : 'One moment, please.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function DoneStep() {
  return (
    <section className="card p-6 md:p-9">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
        <PartyPopper className="h-3.5 w-3.5" /> You&apos;re in!
      </div>
      <h2 className="mb-2 font-display text-2xl font-extrabold text-ink">Welcome to the cohort.</h2>
      <p className="mb-6 max-w-md text-sm text-inkdim">
        Your seat is confirmed. The confirmed start date and next steps are
        on their way to your email. You can log in any time from the
        Student login link at the top of this page — with the same Google
        account you just used.
      </p>
      <a href="/" className="cta-btn">
        Back to The Foundry <ArrowRight className="h-4 w-4" />
      </a>
    </section>
  );
}
