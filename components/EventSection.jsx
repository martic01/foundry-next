import { MapPin, MessageCircle, Mail, Cake, Heart, PartyPopper, Users } from 'lucide-react';
import RemoteImage from './RemoteImage';
import { whatsappLink } from '../lib/site-contacts';
import EventTour from './EventTour';

const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

const OCCASIONS = [
  { id: 'birthday', icon: Cake, title: 'Birthdays', text: 'Fairy lights, fresh flowers and balloons for the birthday you have been planning.', ask: 'a birthday celebration', img: U('1530103862676-de8c9debad1d'), alt: 'A birthday party table with balloons and flowers' },
  { id: 'valentine', icon: Heart, title: 'Valentine & dinners', text: 'Candle-lit tables, floral centrepieces and soft light for date nights, proposals and anniversaries.', ask: 'a Valentine or dinner event', img: U('1519225421980-715cb0215aed'), alt: 'A romantic table set with flowers and candles' },
  { id: 'mini', icon: PartyPopper, title: 'Mini events & parties', text: 'A dance floor, DJ stage and flower wall for baby showers, small receptions and get-togethers.', ask: 'a mini event or party', img: U('1492684223066-81342ee5ff30'), alt: 'Guests celebrating at a small party' }
];

export default function EventSection({ contacts }) {
  const msg = (ask) => whatsappLink(contacts.whatsapp, `Hello, I would like to make an enquiry about ${ask} (up to 30 guests) at ${contacts.address}.`);
  const links = {
    whatsapp: whatsappLink(contacts.whatsapp),
    ask: { birthday: msg(OCCASIONS[0].ask), valentine: msg(OCCASIONS[1].ask), mini: msg(OCCASIONS[2].ask), book: msg('booking the event center') }
  };
  return (
    <>
      <EventIntro contacts={contacts} links={links} />
      <EventTour contacts={contacts} links={links}>
        <StaticEvents contacts={contacts} links={links} />
      </EventTour>
    </>
  );
}

// A short write-up before the walk-through, with clear space around it so
// the Workspace tour and the Event center tour don't run into each other.
function EventIntro({ contacts, links }) {
  return (
    <section className="border-y border-line bg-surfaceMuted px-6 py-24 sm:py-32" aria-labelledby="event-intro-title">
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow mb-3">Event center</p>
        <h2 id="event-intro-title" className="mb-4 font-display text-3xl font-extrabold text-ink sm:text-4xl">Celebrate in a space made for it</h2>
        <p className="mb-4 text-base leading-relaxed text-inkdim">
          Our event center is a small, beautifully decorated open-air space for the moments that matter: birthdays, Valentine dinners, proposals,
          baby showers and other mini events. It holds up to <strong className="text-ink">30 guests</strong>, so it stays warm and personal.
        </p>
        <p className="mb-8 text-base leading-relaxed text-inkdim">
          Think fairy lights overhead, fresh flowers on every table, balloons, candle-lit centrepieces, a colour-changing dance floor and a DJ stage.
          Scroll down to walk through it, then message us with your date and the number of guests.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href={links.ask.book} target="_blank" rel="noopener noreferrer" className="cta-btn"><MessageCircle className="h-4 w-4" /> Check availability</a>
          <span className="inline-flex items-center gap-2 text-sm text-inkdim"><Users className="h-4 w-4 text-brand" /> Up to 30 guests</span>
          <span className="inline-flex items-center gap-2 text-sm text-inkdim"><MapPin className="h-4 w-4 text-brand" /> {contacts.address}</span>
        </div>
      </div>
    </section>
  );
}

// The plain version: shown while loading, with reduced motion, or without canvas.
function StaticEvents({ contacts, links }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contacts.address)}`;
  return (
    <section id="events" className="bg-surface py-16">
      <div className="mx-auto max-w-6xl px-6">
        <p className="eyebrow mb-3">Event center</p>
        <h2 className="mb-3 max-w-2xl font-display text-2xl font-extrabold text-ink sm:text-3xl">A beautiful open-air space for your small celebrations</h2>
        <p className="mb-2 flex flex-wrap items-center gap-2 text-sm text-inkdim">
          <MapPin className="h-4 w-4 flex-shrink-0 text-brand" />
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline-offset-2 hover:underline">{contacts.address}</a>
        </p>
        <p className="mb-8 flex max-w-2xl flex-wrap items-center gap-2 text-sm text-inkdim">
          <Users className="h-4 w-4 flex-shrink-0 text-brand" /> Up to 30 guests: birthdays, Valentine dinners and mini events, with lights, flowers and decoration. Message us for dates and rates.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {OCCASIONS.map((s) => (
            <div key={s.id} className="card flex flex-col overflow-hidden">
              <RemoteImage src={s.img} alt={s.alt} className="h-44 w-full border-b border-line" />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand"><s.icon className="h-5 w-5" strokeWidth={2} /></span>
                  <h3 className="font-display font-extrabold text-ink">{s.title}</h3>
                </div>
                <p className="text-sm text-inkdim">{s.text}</p>
                <a href={links.ask[s.id]} target="_blank" rel="noopener noreferrer" className="cta-btn mt-auto justify-center">
                  <MessageCircle className="h-4 w-4" /> Make enquiry
                </a>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-inkdim">
          <a href={`mailto:${contacts.email}?subject=${encodeURIComponent('Event center enquiry')}`} className="inline-flex items-center gap-1.5 hover:text-ink"><Mail className="h-3.5 w-3.5" /> {contacts.email}</a>
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink"><MessageCircle className="h-3.5 w-3.5" /> {contacts.whatsapp}</a>
        </p>
      </div>
    </section>
  );
}
