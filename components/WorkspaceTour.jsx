'use client';

import { MapPin, Mail, MessageCircle, Building2, Users, Mailbox } from 'lucide-react';
import SceneTour from './SceneTour';

const smooth = (t) => t * t * (3 - 2 * t);
const cl = (v) => Math.min(1, Math.max(0, v));

// Loaded lazily: the scene pulls in the baked 3D models.
const load = async () => {
  const m = await import('../lib/room3d/workspace');
  return {
    build: m.buildWorkspace,
    path: m.WORKSPACE_PATH,
    // entrance doors open as you arrive; the virtual-office door opens as you reach it
    opens: (p) => [0, smooth(cl((p - 0.02) / 0.1)) * 1.1, smooth(cl((p - 0.72) / 0.06)) * 1.3],
    handsAlpha: (p) => 1 - smooth(cl((p - 0.06) / 0.1)),
    handsRise: (p) => 0.22 * (1 - smooth(cl(p / 0.03)))
  };
};

// `links` are built on the server (lib/site-contacts pulls in server-only code):
// { whatsapp, ask: { cowork, meeting, virtual } }
export default function WorkspaceTour({ contacts, links, children }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contacts.address)}`;
  const stages = [
    { id: 'cowork', from: 0.16, to: 0.36, side: 'left', icon: Building2, title: 'Co-working space', text: 'A calm, comfortable place to focus: for freelancers, remote workers, students and small teams.' },
    { id: 'meeting', from: 0.42, to: 0.64, side: 'right', icon: Users, title: 'Meeting room', text: 'A glass-walled, air-conditioned room for client meetings, interviews, workshops and team sessions.' },
    {
      id: 'virtual', from: 0.8, to: 1.3, side: 'right', icon: Mailbox, title: 'Virtual office',
      text: 'Your own furnished private office: a desk, a comfortable chair and a door you can close, plus a real Lagos business address and mail handling for your company.',
      extra: (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href={`mailto:${contacts.email}?subject=${encodeURIComponent('Workspace enquiry')}`} className="inline-flex items-center gap-1.5 hover:text-white"><Mail className="h-3.5 w-3.5" /> {contacts.email}</a>
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white"><MessageCircle className="h-3.5 w-3.5" /> {contacts.whatsapp}</a>
        </p>
      )
    }
  ];
  const intro = {
    eyebrow: 'Workspace', to: 0.14,
    title: 'A conducive place to work, meet and run your business',
    body: (
      <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-white/85">
        <MapPin className="h-4 w-4 flex-shrink-0 text-[#e8c36a]" />
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-2 hover:underline">{contacts.address}</a>
      </p>
    )
  };
  return (
    <SceneTour id="workspace" label="Workspace: co-working, meeting room and virtual office" load={load} intro={intro} stages={stages} address={contacts.address} links={links}>
      {children}
    </SceneTour>
  );
}
