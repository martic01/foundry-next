import { COURSE_TOOLS, TOOLS, COMMUNITY_ID } from './install-guides';
import { isToolDone } from './installs';

// Plain, serialisable "tags" for the admin lists: did the student accept the
// terms, have they ticked their installs, have they joined the WhatsApp group.
// All of it is what the student reported by ticking the boxes themselves.
export function studentTags(profile, courseKeys, { manual = false } = {}) {
  const keys = [...new Set((courseKeys || []).filter((k) => COURSE_TOOLS[k]))];
  const toolIds = [...new Set(keys.flatMap((k) => COURSE_TOOLS[k]))];
  const done = toolIds.filter((id) => isToolDone(profile, id));
  const missing = toolIds.filter((id) => !isToolDone(profile, id));
  const accepted = profile?.terms_accepted_at || null;
  return {
    terms: {
      state: accepted ? 'agreed' : manual ? 'pending' : 'unrecorded',
      how: accepted ? (manual ? 'popup' : 'register') : null,
      at: accepted ? new Date(accepted).toISOString() : null
    },
    install: {
      state: !toolIds.length ? 'none_needed' : !missing.length ? 'all' : done.length ? 'some' : 'none',
      done: done.map((id) => TOOLS[id].label),
      missing: missing.map((id) => TOOLS[id].label),
      total: toolIds.length
    },
    whatsapp: !!isToolDone(profile, COMMUNITY_ID)
  };
}
