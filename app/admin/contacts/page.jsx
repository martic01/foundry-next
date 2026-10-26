import { redirect } from 'next/navigation';

// The HR, workspace & events details now live in a tab on the Registration page.
export default function ContactsPage() {
  redirect('/admin/registration');
}
