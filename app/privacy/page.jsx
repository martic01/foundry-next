import { pageMeta } from '../../lib/seo';
import LegalDoc from '../../components/legal/LegalDoc';
import { getLegal } from '../../lib/legal';

export const metadata = pageMeta({
  title: 'Privacy Notice | The Foundry',
  description: 'What personal data The Foundry (State AI Training) collects, why, who we share it with, how long we keep it, and your rights under the Nigeria Data Protection Act 2023.',
  path: '/privacy'
});

export const revalidate = 300;

export default async function Page() {
  const d = await getLegal('privacy');
  return (
    <LegalDoc title={d.title} updated={d.updated} intro={d.intro} summary={d.summary.length ? d.summary : null} sections={d.sections} other={{ href: '/terms', label: 'Terms & Policy' }} />
  );
}
