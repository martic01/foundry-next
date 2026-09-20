import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import AutoPanImage from './AutoPanImage';
import { formatNaira } from '../lib/courses';

export default function CourseCard({ course }) {
  return (
    <div className="card flex flex-col overflow-hidden transition hover:shadow-cardHover">
      <AutoPanImage
        src={course.image}
        alt={course.name}
        frameClassName="h-48 w-full border-b border-line"
      />
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
        <Link href={`/register?course=${course.key}`} className="cta-btn w-full">
          Register now <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
