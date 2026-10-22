import { createClient } from '../../../lib/supabase/server';
import { getSiteContacts } from '../../../lib/site-contacts';
import ContactSettings from '../../../components/admin/ContactSettings';

export const metadata = { title: 'HR, workspace & events — The Foundry' };

export default async function ContactsPage() {
  const supabase = await createClient();
  const contacts = await getSiteContacts(supabase);
  return (
    <div>
      <p className="eyebrow mb-2">HR, workspace &amp; events</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Contact details</h1>
      <p className="mb-6 text-sm text-inkdim">
        HR has no online payment: its card on the website shows WhatsApp and email buttons instead. The workspace and event center sections have
        &ldquo;Make enquiry&rdquo; buttons. Change the numbers, emails and address here and the website updates within a minute.
      </p>
      <div className="flex flex-col gap-6">
        <ContactSettings sectionKey="hr" title="HR services" values={contacts.hr} />
        <ContactSettings sectionKey="workspace" title="Workspace (co-working, meeting room, virtual office)" values={contacts.workspace} withAddress />
        <ContactSettings sectionKey="event" title="Event center (birthdays, Valentine, mini events: up to 30 guests)" values={contacts.event} withAddress />
      </div>
    </div>
  );
}
