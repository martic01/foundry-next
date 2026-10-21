import { MapPin, MessageCircle, Mail, Building2, Users, Mailbox } from 'lucide-react';
import RemoteImage from './RemoteImage';
import { whatsappLink } from '../lib/site-contacts';

// Photos are free-to-use Unsplash images, loaded from their CDN.
const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

const SPACES = [
  {
    icon: Building2,
    title: 'Co-working space',
    text: 'A calm, comfortable place to focus: for freelancers, remote workers, students and small teams who want to get out of the house and get things done.',
    img: U('1604328727766-a151d1045ab4'),
    alt: 'People working on laptops in a bright shared office',
    ask: 'a desk in your co-working space'
  },
  {
    icon: Users,
    title: 'Meeting room',
    text: 'A professional room for client meetings, interviews, workshops and team sessions, so you meet in a proper setting.',
    img: U('1431540015161-0bf868a2d407'),
    alt: 'A meeting room with a long table and chairs',
    ask: 'your meeting room'
  },
  {
    icon: Mailbox,
    title: 'Virtual office',
    text: 'A real Lagos business address for your company, with a professional setting you can point clients to.',
    img: U('1758448500688-3ababa93fd67'),
    alt: 'A modern office reception desk',
    ask: 'a virtual office'
  }
];

export default function WorkspaceSection({ contacts }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contacts.address)}`;
  return (
    <section id="workspace" className="bg-surfaceMuted py-16">
      <div className="mx-auto max-w-6xl px-6">
        <p className="eyebrow mb-3">Workspace</p>
        <h2 className="mb-3 max-w-2xl font-display text-2xl font-extrabold text-ink sm:text-3xl">A conducive place to work, meet and run your business</h2>
        <p className="mb-2 flex flex-wrap items-center gap-2 text-sm text-inkdim">
          <MapPin className="h-4 w-4 flex-shrink-0 text-brand" />
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline-offset-2 hover:underline">{contacts.address}</a>
        </p>
        <p className="mb-8 max-w-2xl text-sm text-inkdim">Co-working desks, a meeting room and a virtual office address, all in one place. Message us for availability and rates.</p>

        <div className="grid gap-6 md:grid-cols-3">
          {SPACES.map((s) => (
            <div key={s.title} className="card flex flex-col overflow-hidden">
              <RemoteImage src={s.img} alt={s.alt} className="h-44 w-full border-b border-line" />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand"><s.icon className="h-5 w-5" strokeWidth={2} /></span>
                  <h3 className="font-display font-extrabold text-ink">{s.title}</h3>
                </div>
                <p className="text-sm text-inkdim">{s.text}</p>
                <a
                  href={whatsappLink(contacts.whatsapp, `Hello, I would like to make an enquiry about ${s.ask} at ${contacts.address}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-btn mt-auto justify-center"
                >
                  <MessageCircle className="h-4 w-4" /> Make enquiry
                </a>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-inkdim">
          <a href={`mailto:${contacts.email}?subject=${encodeURIComponent('Workspace enquiry')}`} className="inline-flex items-center gap-1.5 hover:text-ink"><Mail className="h-3.5 w-3.5" /> {contacts.email}</a>
          <a href={whatsappLink(contacts.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink"><MessageCircle className="h-3.5 w-3.5" /> {contacts.whatsapp}</a>
        </p>
      </div>
    </section>
  );
}
