import { createClient } from '../../../lib/supabase/server';
import { getLegalForAdmin } from '../../../lib/legal';
import LegalEditor from '../../../components/admin/LegalEditor';

export const metadata = { title: 'Terms & policy — The Foundry' };

export default async function AdminLegal() {
  const supabase = await createClient();
  const [terms, privacy] = await Promise.all([getLegalForAdmin(supabase, 'terms'), getLegalForAdmin(supabase, 'privacy')]);
  return (
    <div>
      <p className="eyebrow mb-2">Legal</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Terms &amp; policy</h1>
      <p className="mb-6 text-sm text-inkdim">This is exactly what visitors see on the Terms &amp; Policy and Privacy pages. Edit any section, add new ones, and save: the public pages update straight away.</p>
      <LegalEditor docs={{ terms, privacy }} />
    </div>
  );
}
