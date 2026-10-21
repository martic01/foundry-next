'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { updateSiteContact } from '../../app/admin/actions';
import { isValidPhone, isValidEmail } from '../../lib/site-contacts';

export default function ContactSettings({ sectionKey, title, values, withAddress = false }) {
  const [whatsapp, setWhatsapp] = useState(values.whatsapp);
  const [email, setEmail] = useState(values.email);
  const [address, setAddress] = useState(values.address || '');
  const [status, setStatus] = useState({ text: '', kind: '' });
  const [isPending, startTransition] = useTransition();
  const dirty = whatsapp !== values.whatsapp || email !== values.email || (withAddress && address !== (values.address || ''));
  const valid = isValidPhone(whatsapp) && isValidEmail(email) && (!withAddress || address.trim().length >= 5);

  function save() {
    setStatus({ text: '', kind: '' });
    startTransition(async () => {
      try {
        const res = await updateSiteContact(sectionKey, { whatsapp, email, address });
        setStatus(res?.error ? { text: res.error, kind: 'error' } : { text: 'Saved. The website shows this within a minute.', kind: 'ok' });
      } catch {
        setStatus({ text: 'Couldn’t reach the server. Check your connection and try again.', kind: 'error' });
      }
    });
  }

  return (
    <div className="card p-5">
      <p className="mb-3 text-sm font-semibold text-ink">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">WhatsApp number</span>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" placeholder="08012345678" className="field" disabled={isPending} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">Email address</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="field" disabled={isPending} />
        </label>
        {withAddress && (
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">Address</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} className="field" disabled={isPending} />
          </label>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={isPending || !dirty || !valid} className="cta-btn !px-4 !py-2 text-xs">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
        </button>
        {!valid && <span className="text-xs text-red-600">Check the number, email{withAddress ? ' and address' : ''}.</span>}
        {status.text && <span className={`text-xs ${status.kind === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{status.text}</span>}
      </div>
    </div>
  );
}
