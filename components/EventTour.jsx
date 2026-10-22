'use client';

import { MapPin, Mail, MessageCircle, Cake, Heart, PartyPopper, CalendarCheck } from 'lucide-react';
import SceneTour from './SceneTour';

const cl = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

const load = async () => {
  const m = await import('../lib/room3d/event');
  return {
    build: m.buildEvent,
    path: m.EVENT_PATH,
    opens: () => [0, 0, 0],
    handsAlpha: (p) => 1 - smooth(cl((p - 0.07) / 0.1)),
    handsRise: (p) => 0.22 * (1 - smooth(cl(p / 0.03)))
  };
};

// links: { whatsapp, ask: { birthday, valentine, mini, book } }  (built on the server)
export default function EventTour({ contacts, links, children }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contacts.address)}`;
  const stages = [
    { id: 'birthday', from: 0.18, to: 0.38, side: 'left', icon: Cake, title: 'Birthdays', text: 'Fairy lights, fresh flowers and balloons for the birthday you have been planning. Room for up to 30 guests.' },
    { id: 'valentine', from: 0.42, to: 0.62, side: 'right', icon: Heart, title: 'Valentine & dinners', text: 'Candle-lit round tables, floral centrepieces and soft light under the open sky: for date nights, proposals and anniversaries.' },
    { id: 'mini', from: 0.66, to: 0.84, side: 'left', icon: PartyPopper, title: 'Mini events & parties', text: 'A colour-changing dance floor, a DJ stage and a flower wall for baby showers, small receptions and get-togethers.' },
    {
      id: 'book', from: 0.88, to: 1.3, side: 'right', icon: CalendarCheck, title: 'Book your date',
      text: 'Tell us the date, the number of guests and the kind of celebration, and we will confirm availability and rates.',
      extra: (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href={`mailto:${contacts.email}?subject=${encodeURIComponent('Event center enquiry')}`} className="inline-flex items-center gap-1.5 hover:text-white"><Mail className="h-3.5 w-3.5" /> {contacts.email}</a>
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white"><MessageCircle className="h-3.5 w-3.5" /> {contacts.whatsapp}</a>
        </p>
      )
    }
  ];
  const intro = {
    eyebrow: 'Event center', to: 0.14,
    title: 'A beautiful open-air space for your small celebrations',
    body: (
      <>
        <p className="mb-2 text-sm text-white/85">Birthdays, Valentine dinners and mini events. Up to 30 guests.</p>
        <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-white/85">
          <MapPin className="h-4 w-4 flex-shrink-0 text-[#e8c36a]" />
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-2 hover:underline">{contacts.address}</a>
        </p>
      </>
    )
  };
  return (
    <SceneTour id="events" label="Event center: birthdays, Valentine and mini events for up to 30 guests" load={load} intro={intro} stages={stages} address={contacts.address} links={links} theme="night" height="560vh">
      {children}
    </SceneTour>
  );
}
