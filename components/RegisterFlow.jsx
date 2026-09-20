'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, PartyPopper, CheckCircle2, Loader2, ArrowRight, ShieldCheck, Laptop } from 'lucide-react';
import AutoPanImage from './AutoPanImage';
import GoogleIcon from './icons/GoogleIcon';
import { createClient } from '../lib/supabase/client';
import { COURSES, MIN_AGE, isAgeEligible, formatNaira } from '../lib/courses';
import { LAPTOP_SPECS } from '../lib/laptop-specs';

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

export default function RegisterFlow() {
  const params = useSearchParams();
  const course = COURSES[params.get('course')] || COURSES.foundations;
  const [done, setDone] = useState(false);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      {done ? <DoneStep /> : <DetailsStep course={course} onDone={() => setDone(true)} />}
    </main>
  );
}

function DetailsStep({ course, onDone }) {
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null); // Supabase user once signed in with Google
  const [checkingSession, setCheckingSession] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState({ text: '', kind: '' });

  const [dob, setDob] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [specsAgreed, setSpecsAgreed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState({ text: '', kind: '' });
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  // Runs once on load, including right after landing back from Google's
  // redirect (see app/auth/callback/route.js). Google itself is the
  // email verification and the credential -- there's no local password
  // anywhere in this app to also check.
  useEffect(() => {
    if (searchParams.get('oauth_error')) {
      setAuthStatus({ text: 'Google sign-in didn\u2019t complete. Please try again.', kind: 'error' });
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
      setCheckingSession(false);
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
      .select('id')
      .eq('user_id', user.id)
      .eq('course', course.key)
      .eq('status', 'paid')
      .maybeSingle()
      .then(({ data }) => setAlreadyPaid(!!data));
  }, [user, course.key]);

  const dobEntered = dob !== '';
  const ageEligible = dobEntered && isAgeEligible(dob);
  const ageIneligible = dobEntered && !ageEligible;
  const canPay = !!user && ageEligible && agreed && specsAgreed && !paying && !alreadyPaid;

  async function handlePay() {
    if (!canPay) return;
    if (!PAYSTACK_PUBLIC_KEY) {
      setStatus({ text: 'Payment isn\u2019t configured yet (missing Paystack key). Please check back soon.', kind: 'error' });
      return;
    }
    setPaying(true);
    setStatus({ text: 'Opening secure payment window\u2026', kind: 'info' });

    // Loaded dynamically, only here (inside a click handler, so only
    // ever in the browser) instead of a top-level static import. That
    // package touches `window` as soon as it's imported, which crashes
    // Next.js's server-side prerender of this page if it's imported
    // statically -- Node has no `window` at build time.
    const { default: PaystackPop } = await import('@paystack/inline-js');

    const reference = 'FOUNDRY_' + course.key.toUpperCase() + '_' + Date.now();
    const popup = new PaystackPop();
    popup.newTransaction({
      key: PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: course.priceNow * 100,
      currency: 'NGN',
      reference,
      metadata: { course: course.key, course_name: course.name },
      onSuccess: async (transaction) => {
        setStatus({ text: 'Confirming your payment and setting up your seat\u2026', kind: 'info' });
        try {
          const res = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference: transaction.reference || reference,
              courseKey: course.key,
              dob,
              specsAgreed
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Could not verify your payment.');
          onDone();
        } catch (err) {
          setPaying(false);
          setStatus({ text: err.message, kind: 'error' });
        }
      },
      onCancel: () => {
        setPaying(false);
        setStatus({ text: 'Payment window closed \u2014 you can try again whenever you\u2019re ready.', kind: 'info' });
      },
      onError: (error) => {
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
          <span className="text-inkdim line-through">{formatNaira(course.priceWas)}+</span>
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

        {/* Step: date of birth -- gates course eligibility at a single,
            blanket minimum age across both stages. */}
        <div className="mb-5 rounded-lg border border-line p-4">
          <p className="mb-3 text-sm font-semibold text-ink">2. Confirm your date of birth</p>
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
            <Laptop className="h-4 w-4" /> 3. Confirm your laptop meets these specs
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
          <p className={`mt-3 text-sm ${status.kind === 'error' ? 'text-red-600' : status.kind === 'success' ? 'text-emerald-600' : 'text-inkdim'}`}>
            {status.text}
          </p>
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
