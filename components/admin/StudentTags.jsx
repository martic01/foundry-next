'use client';

import { ScrollText, Wrench, MessageCircle } from 'lucide-react';
import CursorTip from '../ui/CursorTip';

const ON = 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';
const PART = 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
const OFF = 'border-line bg-surfaceMuted text-inkdim';

function Tag({ icon: Icon, label, cls, tip }) {
  return (
    <CursorTip tip={tip}>
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
        <Icon className="h-3 w-3" /> {label}
      </span>
    </CursorTip>
  );
}

const fmt = (iso) => new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

// Three tags: terms accepted, tools installed, WhatsApp group joined.
// Hover (or tap) a tag to read exactly what it means for this student.
export default function StudentTags({ tags }) {
  if (!tags) return null;
  const { terms, install, whatsapp } = tags;

  const termsTag =
    terms.state === 'agreed'
      ? { label: 'Terms agreed', cls: ON, tip: <><strong>Agreed to the terms and policy.</strong><br />{terms.how === 'register' ? <>They ticked &ldquo;I agree to the Terms &amp; Policy&rdquo; when registering online ({fmt(terms.at)}).</> : <>They clicked &ldquo;I accept terms and policy&rdquo; on {fmt(terms.at)}.</>}</> }
      : terms.state === 'pending'
        ? { label: 'Terms pending', cls: PART, tip: <><strong>Has not agreed yet.</strong><br />You registered this student by hand, so a popup asks them to accept the terms and policy (or delete their account) the next time they open their dashboard.</> }
        : { label: 'Terms n/a', cls: OFF, tip: <><strong>No agreement on record.</strong><br />They registered online, where the Terms &amp; Policy box must be ticked to pay. Run supabase/8-terms.sql to fill this in for earlier students.</> };

  const list = (a) => a.join(', ');
  const installTag =
    install.state === 'all'
      ? { label: 'Installed', cls: ON, tip: <><strong>All required tools installed.</strong><br />They ticked every box on their Installation page: {list(install.done)}.</> }
      : install.state === 'some'
        ? { label: `Installed ${install.done.length}/${install.total}`, cls: PART, tip: <><strong>Some tools installed.</strong><br />Done: {list(install.done)}.<br />Still missing: {list(install.missing)}.</> }
        : install.state === 'none'
          ? { label: 'Not installed', cls: OFF, tip: <><strong>No tools ticked yet.</strong><br />Needs: {list(install.missing)}. Students tick each box themselves on their Installation page once the tool is installed.</> }
          : { label: 'No install', cls: OFF, tip: <><strong>Nothing to install.</strong><br />Their course has no required tools.</> };

  const waTag = whatsapp
    ? { label: 'In WhatsApp', cls: ON, tip: <><strong>Joined the WhatsApp group.</strong><br />They ticked &ldquo;I&apos;ve joined the group&rdquo; on their Installation page.</> }
    : { label: 'No WhatsApp', cls: OFF, tip: <><strong>Has not joined the WhatsApp group.</strong><br />Students tick the box themselves after joining, so this is what they reported.</> };

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Tag icon={ScrollText} {...termsTag} />
      <Tag icon={Wrench} {...installTag} />
      <Tag icon={MessageCircle} {...waTag} />
    </span>
  );
}
