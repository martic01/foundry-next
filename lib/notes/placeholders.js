// SHORT PLACEHOLDER notes for the courses whose real lesson notes aren't
// written yet. To replace one: create lib/notes/<course>.js exporting the
// same shape as lib/notes/foundations.js (an array of days + an intro
// object) and point NOTES_BY_COURSE / INTRO_BY_COURSE in
// lib/notes/index.js at it -- nothing else needs to change.

const PLACEHOLDER_LINE = 'Placeholder — the full lesson notes for this day will replace this card.';

// weeks: [{ title, days: [dayTitle, dayTitle, ...] }]
function build(courseLabel, weeks) {
  const notes = [];
  let day = 1;
  weeks.forEach((w, wi) => {
    w.days.forEach((title) => {
      notes.push({
        day,
        week: wi + 1,
        weekTitle: w.title,
        title,
        intro: PLACEHOLDER_LINE,
        concepts: [
          {
            title: title,
            meaning: `Coming soon: the ${courseLabel} notes for "${title}".`,
            example: ''
          }
        ]
      });
      day += 1;
    });
  });
  return notes;
}

function intro(courseLabel, tagline) {
  return {
    title: 'The Foundry',
    subtitle: `${courseLabel} — Course Notes`,
    tagline,
    meta: ['Placeholder outline — full notes coming soon'],
    sections: [
      {
        heading: 'About these notes',
        body: 'This is a short outline so you can see how the notes will look. The complete lesson notes will be added here before each topic is taught.'
      }
    ]
  };
}

export const REACT_NOTES = build('React', [
  { title: 'Components & Props', days: ['Thinking in components', 'Props and composition', 'Lists and conditional rendering'] },
  { title: 'State, Events & Hooks', days: ['State and events', 'Effects and data flow', 'Context and custom hooks'] },
  { title: 'Routing, APIs & Shipping', days: ['React Router', 'Calling APIs', 'Testing, debugging and deploying'] }
]);
export const REACT_INTRO = intro('Stage 2: React + AI', 'Build modern, production-ready apps');

export const CYBERSECURITY_NOTES = build('Cybersecurity', [
  { title: 'Foundations', days: ['Security concepts and terminology', 'How networks and the web work', 'Threats, attacks and risk'] },
  { title: 'Hands-On Labs', days: ['Scanning and reconnaissance', 'Vulnerabilities and exploits (ethical)', 'Logs, monitoring and detection'] },
  { title: 'Defend & Respond with AI', days: ['Hardening systems', 'Using AI to analyze and defend', 'Incident response and reporting'] }
]);
export const CYBERSECURITY_INTRO = intro('Cybersecurity + AI', 'Learn. Build. Protect.');

export const HR_NOTES = build('HR', [
  { title: 'HR Foundations', days: ['What HR does', 'Recruitment and selection', 'Onboarding and employee relations'] },
  { title: 'Tools & Systems', days: ['ATS and HRIS basics', 'Performance management', 'Compensation, policy and compliance'] },
  { title: 'Strategy & Impact', days: ['Culture and engagement', 'Building an HR strategy', 'Real-world scenarios and career prep'] }
]);
export const HR_INTRO = intro('HR — People. Strategy. Impact.', 'Build better work cultures and develop great teams');
