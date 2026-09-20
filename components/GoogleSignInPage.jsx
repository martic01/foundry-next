'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import GoogleIcon from './icons/GoogleIcon';

// Google is the only sign-in method anywhere in this app -- it handles
// both the credential and proving the email is real, so there's no
// password anywhere here for this app to store, hash, or leak.
export default function GoogleSignInPage({ title, subtitle, redirectTo }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogleSignIn() {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
      }
    });
    if (signInError) {
      setLoading(false);
      setError(signInError.message);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <div className="card p-7 text-center">
        <h1 className="mb-1 font-display text-xl font-extrabold text-ink">{title}</h1>
        <p className="mb-6 text-sm text-inkdim">{subtitle}</p>

        <button onClick={handleGoogleSignIn} disabled={loading} className="cta-btn w-full justify-center">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Redirecting to Google&hellip;
            </>
          ) : (
            <>
              <GoogleIcon className="h-4 w-4" /> Continue with Google
            </>
          )}
        </button>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
