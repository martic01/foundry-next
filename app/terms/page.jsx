import { pageMeta } from '../../lib/seo';
import LegalDoc from '../../components/legal/LegalDoc';
import { getLegal } from '../../lib/legal';

export const metadata = pageMeta({
  title: 'Terms & Policy | The Foundry',
  description: 'Enrollment, payment, refunds, conduct, certificates, liability and your rights for learners on The Foundry (State AI Training) coding and AI courses.',
  path: '/terms'
});

export const revalidate = 300;

export default async function Page() {
  const d = await getLegal('terms');
  return (
    <LegalDoc title={d.title} updated={d.updated} intro={d.intro} summary={d.summary.length ? d.summary : null} sections={d.sections} other={{ href: '/privacy', label: 'Privacy Notice' }} />
  );
}
