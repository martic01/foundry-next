import { CodeBox } from './Stage';

export default function TipCard({ title, text, code }) {
  return (
    <article className="tip-lift flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="flex-1 p-4">
        <h3 className="font-display text-base font-bold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-inkdim">{text}</p>
      </div>
      <CodeBox code={code} lang="example" />
    </article>
  );
}
