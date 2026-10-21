import { redirect } from 'next/navigation';

// Reports now live next to announcements, in their own tab.
export default function ReportsPage() {
  redirect('/admin/announcements?tab=reports');
}
