'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

// In-app replacement for window.confirm() / window.alert().
//
//   const { confirm, alert } = useDialog();
//
//   if (!(await confirm({
//     title: 'Delete announcement?',
//     message: 'Students will no longer see it.',
//     confirmLabel: 'Delete',
//     tone: 'danger'
//   }))) return;
//
//   await alert({ title: 'Saved', message: 'Batch renamed.', tone: 'success' });
//
// Both return a Promise, so call sites read exactly like the native ones.
// `confirm` resolves true/false; `alert` resolves when dismissed. A plain
// string is accepted as shorthand for { message }.
//
// Requests made while a dialog is open are queued and shown in order.
// Mounted once, in app/layout.jsx.

const DialogContext = createContext(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog() must be used inside <DialogProvider> (mounted in app/layout.jsx).');
  return ctx;
}

const TONES = {
  default: {
    icon: Info,
    badge: 'bg-brand/10 text-brand',
    confirmBtn: 'bg-brand text-ink hover:brightness-95'
  },
  danger: {
    icon: AlertTriangle,
    badge: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
    confirmBtn: 'bg-red-600 text-white hover:bg-red-700'
  },
  success: {
    icon: CheckCircle2,
    badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    confirmBtn: 'bg-emerald-600 text-white hover:bg-emerald-700'
  },
  error: {
    icon: XCircle,
    badge: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
    confirmBtn: 'bg-red-600 text-white hover:bg-red-700'
  }
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function normalize(input) {
  return typeof input === 'string' ? { message: input } : input || {};
}

export function DialogProvider({ children }) {
  const [current, setCurrent] = useState(null);
  // currentRef mirrors `current` synchronously so two dialogs requested in
  // the same tick queue up correctly (state alone would lag a render).
  const currentRef = useRef(null);
  const queueRef = useRef([]);
  const idRef = useRef(0);

  const enqueue = useCallback((request) => {
    return new Promise((resolve) => {
      const item = { ...request, resolve, id: ++idRef.current };
      if (currentRef.current) {
        queueRef.current.push(item);
      } else {
        currentRef.current = item;
        setCurrent(item);
      }
    });
  }, []);

  const close = useCallback((result) => {
    const item = currentRef.current;
    if (!item) return;
    item.resolve(result);
    const next = queueRef.current.shift() || null;
    currentRef.current = next;
    setCurrent(next);
  }, []);

  // If the provider ever unmounts mid-dialog, don't leave callers
  // awaiting forever -- treat it as "cancelled".
  useEffect(() => {
    const queue = queueRef;
    return () => {
      currentRef.current?.resolve(false);
      queue.current.forEach((q) => q.resolve(false));
    };
  }, []);

  const api = useMemo(
    () => ({
      confirm: (opts) => enqueue({ type: 'confirm', ...normalize(opts) }),
      alert: (opts) => enqueue({ type: 'alert', ...normalize(opts) })
    }),
    [enqueue]
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && <DialogView key={current.id} dialog={current} onClose={close} />}
    </DialogContext.Provider>
  );
}

function DialogView({ dialog, onClose }) {
  const {
    type,
    title,
    message,
    tone = 'default',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    okLabel = 'OK'
  } = dialog;
  const isConfirm = type === 'confirm';
  const t = TONES[tone] || TONES.default;
  const Icon = t.icon;

  const panelRef = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  const cancel = useCallback(() => onClose(isConfirm ? false : undefined), [onClose, isConfirm]);
  const accept = useCallback(() => onClose(isConfirm ? true : undefined), [onClose, isConfirm]);

  // Focus management + scroll lock. For a destructive confirm, focus lands
  // on Cancel so an accidental Enter/Space can't delete anything; for
  // everything else it lands on the primary button. Focus returns to
  // whatever opened the dialog when it closes.
  useEffect(() => {
    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = isConfirm && tone === 'danger' ? cancelRef.current : confirmRef.current;
    first?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      if (opener && document.contains(opener) && typeof opener.focus === 'function') opener.focus();
    };
  }, [isConfirm, tone]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      // Keep Tab / Shift+Tab inside the dialog.
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [cancel]);

  const btnBase =
    'inline-flex min-w-[5.5rem] items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

  return (
    <div
      className="dialog-fade fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div
        ref={panelRef}
        role={isConfirm ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={message ? descId : undefined}
        className="dialog-pop w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-start gap-4">
          <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${t.badge}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            {title && (
              <h2 id={titleId} className="font-display text-base font-extrabold text-ink">
                {title}
              </h2>
            )}
            {message && (
              <div id={descId} className={`whitespace-pre-line text-sm text-inkdim ${title ? 'mt-1.5' : 'pt-2'}`}>
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {isConfirm && (
            <button ref={cancelRef} type="button" onClick={cancel} className={`${btnBase} border border-line bg-surface text-ink hover:bg-surfaceMuted`}>
              {cancelLabel}
            </button>
          )}
          <button ref={confirmRef} type="button" onClick={accept} className={`${btnBase} ${t.confirmBtn}`}>
            {isConfirm ? confirmLabel : okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
