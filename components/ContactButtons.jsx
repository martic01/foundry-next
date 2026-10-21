import { MessageCircle, Mail } from 'lucide-react';
import { whatsappLink } from '../lib/site-contacts';

// WhatsApp + email enquiry buttons. `message` pre-fills the WhatsApp chat.
export default function ContactButtons({ whatsapp, email, message, subject, className = '', full = false }) {
  const mail = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
  return (
    <div className={`flex ${full ? 'flex-col' : 'flex-wrap'} gap-2 ${className}`}>
      <a href={whatsappLink(whatsapp, message)} target="_blank" rel="noopener noreferrer" className="cta-btn justify-center">
        <MessageCircle className="h-4 w-4" /> WhatsApp us
      </a>
      <a href={mail} className="cta-btn-outline justify-center">
        <Mail className="h-4 w-4" /> Email us
      </a>
    </div>
  );
}
