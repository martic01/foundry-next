import Link from 'next/link';
import { Check, ArrowRight, Clock } from 'lucide-react';
import AutoPanImage from './AutoPanImage';
import { formatNaira } from '../lib/courses';
import { TAGS, formatReopenDate } from '../lib/course-status';

const TAG_STYLES = {
  coming_soon: 'bg-ink/80 text-white',
  ended: 'bg-red-600 text-white',
  limited_seats: 'bg-amber-500 text-white',
  sold_out: 'bg-red-600 text-white'
};

// `availability` comes from getAvailability() (lib/course-status.js),
// computed on the server from the admin's course_settings.
export default function CourseCard({ course, availability }) {
  const closedLabel =
    availability.tag === 'ended' ? 'Registration ended' : availability.tag === 'sold_out' ? 'All seats taken' : availability.tag === 'coming_soon' ? 'Coming soon' : 'Registration closed';

  return (
    <div className="card flex flex-col overflow-hidden transition hover:shadow-cardHover">
      <div className="relative">
        <AutoPanImage
          src={course.image}
          alt={course.name}
          frameClassName="h-48 w-full border-b border-line"
        />
        {availability.tag !== 'none' && (
          <span className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${TAG_STYLES[availability.tag]}`}>
            {availability.tag === 'coming_soon' && <Clock className="h-3 w-3" />} {TAGS[availability.tag].label}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-sm font-semibold text-ink">{course.name}</p>
        <p className="text-sm text-inkdim">{course.tagline}</p>
        <ul className="space-y-1.5">
          {course.learn.slice(0, 3).map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-inkdim">
              <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand" strokeWidth={2.5} />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-display text-lg font-semibold text-ink">{formatNaira(course.priceNow)}</span>
          <span className="text-sm text-inkdim line-through">{formatNaira(course.priceWas)}+</span>
        </div>
        {!availability.open ? (
          <div>
            <button type="button" disabled className="cta-btn w-full opacity-50" aria-disabled="true">
              {closedLabel}
            </button>
            <p className="mt-2 text-center text-xs text-inkdim">
              {availability.reopenAt ? `Opens ${formatReopenDate(availability.reopenAt)}` : 'Opening date to be announced'}
            </p>
          </div>
        ) : (
          <Link href={`/register?course=${course.key}`} className="cta-btn w-full">
            Register now <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
