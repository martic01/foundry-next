// The class WhatsApp group every student is asked to join. Change it here
// (or set NEXT_PUBLIC_WHATSAPP_GROUP_URL) when the group link changes.
const DEFAULT_GROUP = 'https://chat.whatsapp.com/JijGTbMCwPzJLIwSWGJlVD?s=cl&p=a&mlu=4&ilr=4';

// Only ever an official WhatsApp invite link, so a mistyped or tampered
// environment value can't send students to some other site.
function safeGroupUrl(value) {
  try {
    const u = new URL(String(value || ''));
    if (u.protocol === 'https:' && u.hostname === 'chat.whatsapp.com') return u.toString();
  } catch { /* fall through */ }
  return DEFAULT_GROUP;
}

export const WHATSAPP_GROUP_URL = safeGroupUrl(process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL || DEFAULT_GROUP);
