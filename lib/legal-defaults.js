import { MIN_AGE } from './courses';
import { COHORT_START, COHORT_LENGTH_WEEKS, COHORT_END } from './cohort';

// Built-in (default) Terms and Privacy text. The admin can override either
// from the Terms & policy tab; the public pages use the saved copy when
// there is one and these when there is not (see lib/legal.js).

const TERMS_VERSION = 'Version 3, 11 November 2026';

const TERMS_SUMMARY = [
  `The next cohort starts in ${COHORT_START} and runs for ${COHORT_LENGTH_WEEKS} weeks (27 live classes), finishing around ${COHORT_END}.`,
  `You must be at least ${MIN_AGE}. If you are under 18, a parent or guardian must agree to these terms for you.`,
  'Your seat is confirmed when your payment succeeds. Payments are generally not refundable, but you get a refund or free transfer if we cancel or postpone, a refund if you are charged twice, and your rights under Nigerian law are never taken away.',
  'We teach you properly; we cannot promise a job, income or a particular result. That depends on your own work.',
  'Your seat and class links are personal. Do not share them.',
  'Learners of the cybersecurity course may only test systems they own or have written permission to test.',
  'We collect only what we need, protect it, and never sell it. Read the Privacy Notice for your data rights.'
];

const TERMS_SECTIONS = [
  {
    title: '1. Who We Are and What These Terms Cover',
    items: [
      'These terms are an agreement between you (“the learner”, “you”) and State AI Training, also known as The Foundry (“we”, “us”, “the school”), operated by Matthew Aboyade, who is also the tutor and programme director (“the programme director”). We run coding, AI and related training from Lagos, Nigeria, online and in person.',
      'They apply to every course we sell on this website (each “Stage” or “course”: Stage 1, Stage 2 and the Cybersecurity + AI course) and to your use of this website and your learner dashboard.',
      'They do not cover HR training and services, workspace rentals or event space bookings, which are arranged separately (see Section 23).'
    ]
  },
  {
    title: '2. Accepting These Terms',
    items: [
      'By ticking the agreement box when you register (or by clicking “I accept terms and policy” if the school registered you), you confirm that you have read these terms and the Privacy Notice and agree to them. This electronic agreement is as binding as a signed one.',
      'We record the date you accepted. The version that applies to you is the one you accepted (see Section 25 for changes).',
      'If you do not agree, do not register or pay. If the school registered you and you do not agree, choose “Delete account” when asked and your account is removed.'
    ]
  },
  {
    title: '3. Minimum Age and Learners Under 18',
    items: [
      `You must be at least ${MIN_AGE} years old. Your date of birth is checked at registration. A payment made with an ineligible date of birth will not result in a confirmed seat. Only the age worked out from your date of birth is kept, not the date itself.`,
      'In Nigeria a person under 18 is a child, and a child cannot always make a binding contract alone. If you are under 18, your parent or legal guardian must read and agree to these terms and the Privacy Notice for you, and must be happy for you to pay and attend. By ticking the parent or guardian box at registration you (or they) confirm this.',
      'A parent or guardian of a learner under 18 is responsible for the fees and for the learner’s use of the internet, third-party accounts and tools during the course. We may ask for proof of consent at any time and may suspend a learner under 18 until we have it.',
      'Some third-party services we ask you to use have their own minimum ages (for example some AI assistants allow only users aged 18 or over). You must meet each service’s rule. If you do not, tell your teacher and we will arrange another way for you to do that part of the course.'
    ]
  },
  {
    title: '4. Enrollment, Seats & Payment',
    items: [
      'A seat is confirmed only when your payment for the selected course has been completed successfully through our payment provider, Paystack, and recorded by us. Until then you have no seat, even if you have started paying.',
      'Prices are shown in Nigerian Naira (₦) at checkout. The price you see when you pay is the price you are charged, and it is a one-time fee for that course, not a subscription. Charges added by your own bank or card issuer are yours.',
      'Each batch holds up to 50 learners. Registration for a course closes automatically when 50 seats are taken, and when the course timer starts (the first class), unless we choose to keep it open. We decide this; closing is not a promise that a later seat will be available.',
      'Registration needs a Google account. The email on it is used for your receipt, the start date, certificates and course messages. You are responsible for keeping that account secure.',
      'Registration completes automatically when payment is confirmed. If your payment succeeded but your seat did not appear, contact us with your payment reference and we will fix it. If you are charged for a seat we cannot give you, we refund the full amount.',
      'We may refuse or cancel a registration, and refund it, if we believe it was made by mistake, with false details, or by fraud. Disputing a valid payment with your bank without first contacting us (a “chargeback”) may lead to suspension of your access until it is resolved.'
    ]
  },
  {
    title: '5. Cohort Dates, Duration & Schedule',
    items: [
      `The next cohort starts in ${COHORT_START} and each course runs for ${COHORT_LENGTH_WEEKS} weeks, so it finishes around ${COHORT_END}. The exact date of the first class and your session times are confirmed to registered learners on the dashboard and by email before the start.`,
      `Each course has about 3 live classes a week (27 classes in total). The days and times are on the class timetable in your dashboard, and they can change if the lesson plan needs it (for example, the week we cover Git and GitHub has an extra class). The total scope does not change.`,
      'We may change individual class dates or times (for public holidays, illness, power or internet problems, or other reasons) with reasonable notice to the cohort. A change like this does not reduce what is taught and does not entitle you to a refund. A cohort that is more than 4 weeks late or cancelled is covered by Section 6.'
    ]
  },
  {
    title: '6. Refunds, Cancellations & Transfers',
    items: [
      'General rule: all payments are final once confirmed. We do not refund for change of mind, non-attendance, scheduling conflicts, not meeting the laptop requirements, not completing the work, or leaving part way through.',
      'If we cancel a cohort, or postpone its start by more than 4 weeks, you can choose either a free transfer to the next available cohort of the same course, or a full refund of the fee you paid for it. Tell us within 14 days of our notice. If you do not choose, we transfer you.',
      'You are also refunded in full if you were charged twice for the same seat, if you paid but we could not give you a seat, or if we removed you from the school without a breach of these terms.',
      'If we remove you for breaking the Code of Conduct, sharing access, or dishonesty, you are not refunded.',
      'To ask for a refund, email us (Section 28) with your name, payment reference and reason. We reply within 7 days and pay approved refunds back to the original payment method within 14 days of approval, though your bank may take longer.',
      'Nothing in this section removes or limits any right you have under Nigerian consumer protection law, including the Federal Competition and Consumer Protection Act 2018. If the law gives you a right that these terms do not, the law wins.'
    ]
  },
  {
    title: '7. Teaching, Support & No Guarantee of Results',
    items: [
      'We are responsible for teaching each topic clearly, running live sessions as scheduled, reviewing submitted work and giving real feedback. If a concept is not landing, ask: we will re-explain, point you to extra resources or make time outside the session.',
      'We cannot promise any particular result. We do not promise a job, a promotion, income, freelance work, admission anywhere, or that you will finish the course or earn a certificate. Your result depends on your own attendance, practice and effort. Teaching support is guaranteed; a specific outcome is not.',
      'Any examples of what former or current learners built, or what is possible in the industry, are for illustration and are not promises.'
    ]
  },
  {
    title: '8. Attendance, Missed Classes & Recordings',
    items: [
      'Live sessions are the core of the course. Where practical we share notes or recordings, but we do not promise this for every session.',
      'Missing a class does not pause the course or entitle you to a refund. You are responsible for catching up with shared materials and by asking specific questions. Repeated absence without telling us may reduce the individual feedback we can give you.',
      'We may record live sessions. A recording can contain your voice, your name and anything you share on screen. By attending you agree to this. Recordings are for the learners of that batch and for our teaching quality only, and are not published publicly. Tell us before class if you do not want your voice or screen recorded and we will find a workable arrangement.'
    ]
  },
  {
    title: '9. Laptop, Tools & Third-Party Accounts',
    items: [
      'You are responsible for arriving at your first class with a laptop that meets the minimum specification shown at registration (at least 8GB RAM, 200GB storage, a 1.5GHz+ processor, an Intel Core i5 or equivalent, and an updated, supported operating system) and a working internet connection. You confirm the laptop by ticking the laptop box at registration.',
      'Setting up the tools and accounts listed on your Installation page for your course (for example VS Code, Git, Node.js, a GitHub account, an AI assistant account, VirtualBox and Kali Linux) before your first class is required. You tick each box on that page when you have finished it so that your teacher can see you are ready. Class time is for teaching, not for individual installation, so a learner who arrives unprepared may fall behind through no fault of the tutor.',
      'The tools and accounts are provided by other companies (for example Microsoft, GitHub, Anthropic, DeepSeek, Oracle, Kali, Google, Paystack). You use them under their own terms and privacy policies, which we do not control. We are not responsible for their availability, changes, charges, limits, data handling or for any loss in them. Use a strong, unique password and turn on two-step verification where offered.',
      'We recommend the free plans only. We do not ask you to pay any of these companies, and we are not responsible if you choose to.'
    ]
  },
  {
    title: '10. Lesson Notes, Videos & Course Scope',
    items: [
      'Written notes are on your dashboard, day by day, and unlocked as the cohort moves forward. Notes and guide videos are a study aid and a supplement to live classes, not a replacement for them.',
      'The course teaches the fundamentals of each topic at a level that lets you read, understand, test, debug and modify code, including code an AI tool writes for you. It is intentionally not an exhaustive or advanced treatment of any topic. Mastering a topic in full depth is outside the scope and would need further study.',
      'We may update, reorder or improve the notes and lesson plan at any time to keep them accurate. Technology changes, and we do not promise that every tool will look exactly as taught.'
    ]
  },
  {
    title: '11. Responsible Use of AI Tools',
    items: [
      'We teach you to use AI assistants as a helper, not a substitute for understanding. AI can be wrong, out of date or insecure. You must test and understand anything it produces before you rely on it.',
      'Never type passwords, secret keys, bank details, other people’s personal data or anything confidential into an AI chat. What you type may be stored or processed by that company, sometimes outside Nigeria.',
      'Your submitted work must be work you can explain. Copying another learner’s project, or presenting AI output you do not understand as your own learning, may lead to no certificate being awarded.'
    ]
  },
  {
    title: '12. Cybersecurity Course: Lawful and Ethical Use',
    items: [
      'The cybersecurity course teaches defensive and testing skills. You may use those skills only on systems, networks and accounts that you own, or that you have clear written permission to test, and only inside the practice environments we set up (such as your own virtual machine).',
      'You must never attack, scan, access, disrupt or collect data from any system, school network, website, account or person without permission. This is a crime under Nigerian law (including the Cybercrimes (Prohibition, Prevention, etc.) Act 2015, as amended) and under the law of other countries.',
      'If you break this rule we remove you immediately without a refund, may report you to the authorities, and are not responsible for what you do. You are fully responsible for your own actions.'
    ]
  },
  {
    title: '13. Code of Conduct',
    items: [
      'Be respectful in live sessions, the WhatsApp group and any cohort space. Harassment, bullying, hate speech, sexual or abusive content, spam, threats, cheating, or disruptive behaviour can lead to a warning, suspension or removal from the cohort without a refund.',
      'Do not post anything unlawful, or that you do not have the right to share, in any cohort space.'
    ]
  },
  {
    title: '14. Personal, Non-Transferable Access',
    items: [
      'Your seat, class link, account and access to the group chat are for you alone. Letting someone else attend, log in or use your materials in your place is not allowed.',
      'Only one device can be signed in to your account at a time. Signing in on a new device signs out the old one.',
      'If we find your account used by someone else, we may remove it without a refund. Repeated or clear cases may cost the original learner the seat. If you cannot make a session, follow Section 8 rather than sending someone in your place.'
    ]
  },
  {
    title: '15. Batches, Teachers & Student Management',
    items: [
      'Each batch has up to 50 learners. You are placed in the batch for your course, and the programme director may move you to another batch of the same course when needed (for example to balance numbers).',
      'Each batch has one or more teachers chosen by the programme director. A teacher can only see the learners, class links, videos and announcements of the batches they teach.',
      'The programme director may block you from a single course, remove you from a batch, or remove you from a course, for example for breaking the Code of Conduct or sharing access. Blocking in one course does not affect other courses you are enrolled in. A removal for misconduct does not entitle you to a refund (Section 6).',
      'A learner who becomes a teacher uses the teacher portal only; the roles are not mixed.',
      'We may reset a batch (for example to start a new group). A reset removes learners from that batch only and does not delete their account or their payment records.'
    ]
  },
  {
    title: '16. Class Videos, Links, Announcements & Uploads',
    items: [
      'Class videos, links and announcements are posted by the programme director or the teacher of your batch, and each is shown only to the batch (or all batches) it was posted for.',
      'Posts can be set to expire. An expired item is removed automatically, and an expired class video is also deleted from our video storage. Download anything you need before the expiry date shown.',
      'Videos are uploaded only by signed-in staff. You are alerted when something new is posted for you, and announcements must be acknowledged before they close.',
      'Class recordings and links are for enrolled learners of that batch only and may not be shared (see Sections 8 and 14).'
    ]
  },
  {
    title: '17. Reporting a Problem',
    items: [
      'Teachers cannot edit or delete what the programme director posts, but they can report it, and can report a learner for a conduct or attendance concern.',
      'Reports are reviewed by the programme director, who may remove content, speak to the people involved, or act under Sections 13, 14 and 15. A report is a request for review, not a finding.',
      'You can raise a concern with the programme director at any time using the contact details in Section 28.'
    ]
  },
  {
    title: '18. Certificates',
    items: [
      'A certificate of completion is awarded only by the programme director, to learners who have completed the full course (individually or for a whole batch). Completing the course does not by itself guarantee a certificate, and we may withhold one for dishonesty or serious misconduct.',
      'You enter your full name before you pay. That name is printed on your certificate exactly as typed, so check the spelling. If it is wrong, tell the programme director before the certificate is awarded. An issued certificate is changed by revoking and re-issuing it.',
      'Each certificate has a unique ID and a QR code. We store the ID with your name, your email address, the course title and the award date so the certificate can be verified.',
      'Anyone who has your certificate ID, or scans the QR code, can see on our website that the certificate is genuine, with your name, course, award date and ID. The \u201cVerify certificate\u201d box on our website shows only a partly hidden version of your email address. Share your ID or certificate only with people you are happy to see that information.',
      'A certificate shows that you completed our course. It is not a degree, a professional licence, or a qualification recognised by a government or regulatory body unless we state so in writing.',
      'The programme director may revoke a certificate, for example if it was awarded in error or obtained dishonestly. Revoking deletes the ID and the stored name and email for that certificate, it stops passing verification, and it can no longer be downloaded.'
    ]
  },
  {
    title: '19. Intellectual Property',
    items: [
      'The slides, notes, videos, lesson plans, project briefs, website, logo and name are owned by us or our licensors. You get a personal, non-transferable licence to use them for your own learning while you are enrolled. You may not copy, resell, publish, share, record or upload them elsewhere (including to AI tools for training or to other sites) without our written permission.',
      'The projects and code you create remain yours. You give us permission to view, run and discuss them for teaching and marking. We will not publish your project or your name as a showcase without asking you first.',
      'Do not upload or submit anything that infringes someone else’s copyright or other rights.'
    ]
  },
  {
    title: '20. Suspension & Ending Your Enrollment',
    items: [
      'We may suspend or end your access if you break these terms, put other learners or us at risk, fail to pay, or if the law requires it. We will tell you why unless the law or safety prevents it, and you can respond to the programme director.',
      'You may stop attending at any time, but that does not give you a refund (Section 6). You may ask us to close your account by writing to us. Closing it ends your access to the dashboard, notes and videos.',
      'Sections that by their nature should continue (for example refunds, intellectual property, liability, disputes) continue after your enrollment ends.'
    ]
  },
  {
    title: '21. Disclaimers & Limits on Our Liability',
    items: [
      'We run the website and classes with reasonable care, but we provide them “as available”. We do not promise that the website, the dashboard or any third-party service will always work without interruption or errors.',
      'To the extent the law allows, we are not liable for: loss of profit, income, business or opportunities; loss or damage to your laptop, files or data; problems caused by third-party tools, accounts or AI output; or any indirect or consequential loss.',
      'To the extent the law allows, our total liability to you for any claim connected with a course is limited to the fees you paid for that course.',
      'Nothing in these terms limits liability that cannot lawfully be limited, including liability for death or personal injury caused by negligence, for fraud, or for any right you have under consumer protection law.'
    ]
  },
  {
    title: '22. Events Outside Our Control',
    items: [
      'We are not in breach of these terms, and not liable, for a delay or failure caused by events beyond our reasonable control, such as power or internet outages, extreme weather, illness of the tutor, strikes, government action, telecom or platform failures (including payment, video, hosting or sign-in providers) and civil unrest. We will tell you as soon as we reasonably can and reschedule classes where possible. Section 6 still applies if a cohort is cancelled or badly delayed.'
    ]
  },
  {
    title: '23. Other Services (HR, Workspace & Events)',
    items: [
      'HR training and services, co-working desks, meeting rooms, virtual office and event space are arranged by enquiry and covered by a separate written quote or agreement. These terms do not set their price, rules or refund rights.'
    ]
  },
  {
    title: '24. Your Data & Privacy',
    items: [
      'We collect and use your information as explained in our Privacy Notice, which forms part of these terms. Payment card details are handled directly by Paystack and we never see or store them. Sign-in is handled by Google, so we never store a password.',
      'The Privacy Notice explains what we keep, why, for how long, who we share it with, and your rights, including to see, correct and delete your data.'
    ]
  },
  {
    title: '25. Changes to These Terms',
    items: [
      'We may update these terms, for example when the law or our courses change. The version you accepted applies to your enrollment for that course. For changes that are important and affect you during your course, we tell you on the dashboard or by email, and the new version applies to later registrations and, where you agree or the law allows, to your current one.',
      'The date and version of the current terms are shown at the top of this page.'
    ]
  },
  {
    title: '26. Complaints, Disputes & Governing Law',
    items: [
      'If something goes wrong, first write to us (Section 28) with your name, payment reference and what happened. We acknowledge within 3 working days and try to settle within 14 days. Please give us that chance before starting any formal step.',
      'These terms are governed by the laws of the Federal Republic of Nigeria. If we cannot settle a dispute informally, either of us may take it to the courts of Lagos State, Nigeria, which have jurisdiction. This does not stop you from complaining to a consumer or data protection regulator, or from using any right the law gives you to go to another court.'
    ]
  },
  {
    title: '27. General',
    items: [
      'These terms and the Privacy Notice are the whole agreement between us about your enrollment and replace anything said earlier.',
      'If any part is found invalid or unenforceable, the rest still applies. If we do not enforce a right straight away, we have not given it up.',
      'You may not transfer your rights or duties under these terms to anyone else. We may transfer ours if the school is run by another person or company, and we will tell you.',
      'We send notices to the email on your account and by posting on your dashboard. Keep your email up to date. These terms are in English.'
    ]
  }
];

const PRIVACY_SUMMARY = [
  'We collect only what we need to run your course: your name, email, age, payments, progress and certificates.',
  'We never sell your data and never show you adverts. We use no advertising or tracking cookies.',
  'Card details go straight to Paystack. We never see or store them. Sign-in is by Google, so we never hold a password.',
  'Some of the companies that help us run the site store data outside Nigeria. We choose them carefully.',
  'You can ask to see, correct or delete your data, or object to how we use it. Write to us and we answer within 30 days.',
  'You can complain to the Nigeria Data Protection Commission if you are unhappy with how we handle your data.'
];

const PRIVACY_SECTIONS = [
  {
    title: '1. Who Is Responsible for Your Data',
    items: [
      'State AI Training, also known as The Foundry, operated by Matthew Aboyade in Lagos, Nigeria, is the “data controller”: we decide why and how your personal data is used. This notice explains it under the Nigeria Data Protection Act 2023 (“the NDPA”).',
      'Contact for anything about your data: aboyadematthew@gmail.com. If we are required to register with the Nigeria Data Protection Commission (NDPC) or appoint a data protection officer, we will do so.'
    ]
  },
  {
    title: '2. What We Collect',
    items: [
      'Account details: the name you choose for your certificate and profile, the name on your Google account, and your Google email address. We do not receive your Google password.',
      `Registration details: your age (worked out from the date of birth you enter, which is not stored), the course and batch you join, and, if you are under 18, that a parent or guardian agreed. The minimum age is ${MIN_AGE}.`,
      'Payment records: the amount, currency, date, status, reference and the email used. Card or bank details are handled only by Paystack and never reach us.',
      'Learning records: your progress in setting up tools, the boxes you tick on the Installation page, whether you joined the WhatsApp group, the notes unlocked for your batch, messages and announcements you acknowledged, and when you accepted our terms.',
      'Certificates: your name, email, course, award date and unique certificate ID.',
      'Anything you or staff upload or post in the system, such as reports or class content, stored with the account that made it.',
      'Technical data: your IP address and device or browser details when you use the site, used for security, preventing abuse (such as limiting repeated lookups), fixing errors, and to keep one device signed in at a time. We keep a session identifier for this.',
      'Class recordings, if we record a live session: your voice, name and anything you show on screen.',
      'Messages you send us by email or WhatsApp.'
    ]
  },
  {
    title: '3. Why We Use It and Our Legal Basis',
    items: [
      'To provide your course (contract): create your account, confirm your seat, place you in a batch, give you notes, videos, links and announcements, run classes, award and verify certificates, and send you important messages and receipts.',
      'To take and record payments and meet our accounting and tax duties (contract and legal obligation).',
      'To keep the school and the website safe and working: prevent fraud, sharing of accounts and abuse, and fix problems (our legitimate interests, which do not override your rights).',
      'To improve our teaching and courses, using your progress records in a general way (legitimate interests).',
      'Where we rely on your consent (for example recordings in a way you have agreed to, or your parent’s consent if you are under 18), you can withdraw it at any time by writing to us. Withdrawing does not affect what we did before.',
      'We do not sell your personal data, we do not use it for advertising, and we do not make decisions about you by computer alone, other than closing registration automatically when a batch is full or has started.'
    ]
  },
  {
    title: '4. Who We Share It With',
    items: [
      'Only the people who need it: the programme director, and the teacher of your batch, who sees the learners, progress and tool checklist of their own batch.',
      'Companies that process data for us (“processors”), each only for its job: Google (sign-in), Supabase (database and accounts), Paystack (payments), Cloudinary (class video storage), EmailJS (sending notice emails), and our website hosting provider. WhatsApp (Meta) runs the class group if you join it.',
      'The WhatsApp group is visible to its members: other members can see your phone number and the name you use there. Joining is a choice, but it is how we send urgent class news. Do not share anything private in it.',
      'Certificate details are public to anyone who has the exact certificate ID or scans its QR code (see the Terms, Section 18).',
      'Authorities, courts or professional advisers, only where the law requires or to protect rights, safety or against fraud.',
      'We do not give your data to advertisers or sell it to anyone.'
    ]
  },
  {
    title: '5. Transfers Outside Nigeria',
    items: [
      'Several of our providers keep data on servers in other countries. When that happens we use providers that apply recognised security measures and contract terms, and we share only what the service needs. By using the site you understand your data may be processed outside Nigeria in this way.',
      'AI assistants you choose to use for the course (such as Claude or DeepSeek) are your own accounts with those companies. They are governed by their own privacy policies and may process data outside Nigeria. Do not type personal or confidential information into them.'
    ]
  },
  {
    title: '6. How Long We Keep It',
    items: [
      'Account and learning records: while you are enrolled and for up to 24 months after your cohort ends, so we can support you, issue certificates and answer questions. After that we delete or anonymise them unless you ask us to keep them or the law requires otherwise.',
      'Payment and accounting records: for as long as Nigerian accounting and tax rules require us to keep them.',
      'Certificates: kept for as long as the certificate stands, because verification is their purpose. You can ask us to revoke yours, which deletes the stored name and email for it.',
      'Class recordings and expired posts: removed on the expiry date set when they were posted, or when the batch ends.',
      'Technical and security records, including rate-limit entries: kept for a short time, then deleted.',
      'If you are registered by the school and you do not accept the terms and choose to delete your account, your account and registration are deleted straight away.'
    ]
  },
  {
    title: '7. Your Rights',
    items: [
      'Under the NDPA you can: be told how your data is used (this notice); see the data we hold about you and get a copy; have wrong data corrected; have your data deleted where we no longer need it; ask us to limit how we use it; object to a use that relies on our legitimate interests; receive your data in a common format; and withdraw consent at any time.',
      'To use any of these rights write to the email in Section 1. We may ask you to prove who you are first, so we do not give your data to someone else. We answer within 30 days. Some data we must keep by law (for example payment records), and we will tell you if so.',
      'If you are not happy with our answer you can complain to the Nigeria Data Protection Commission (ndpc.gov.ng). We would like the chance to put things right first.'
    ]
  },
  {
    title: '8. Children and Under-18s',
    items: [
      `You must be at least ${MIN_AGE} to register. A person under 18 is a child under Nigerian law, so for any learner under 18 we need a parent or guardian to agree to the Terms and this notice, and to the use of the child’s data. Parents and guardians can ask to see, correct or delete their child’s data at any time.`,
      'We do not knowingly collect data from anyone under 15 and will delete it if we find we have.'
    ]
  },
  {
    title: '9. Security',
    items: [
      'We protect data with encrypted connections (HTTPS), restricted access by role (learner, teacher, director), database rules that stop one person reading another’s records, server-side checks on payments, and limits on repeated requests.',
      'No system is completely secure. If a breach seriously puts your rights at risk, we will tell you and, where the law requires, the NDPC within the time the law sets (72 hours). Please protect your own Google account and device, and tell us at once if you think your account has been used by someone else.'
    ]
  },
  {
    title: '10. Cookies and Similar Technology',
    items: [
      'We use only the cookies and browser storage the site needs to work: to keep you signed in, to remember your light or dark mode choice, and for security. We do not use advertising or tracking cookies, and we do not run behaviour-tracking analytics.',
      'Google, Paystack and video providers may set their own cookies when you use their sign-in, payment or video features. Those are governed by their policies. You can block cookies in your browser, but you may then be unable to sign in.'
    ]
  },
  {
    title: '11. Changes to This Notice',
    items: [
      'We may update this notice. The date at the top shows the latest version. For important changes we tell you on your dashboard or by email.'
    ]
  },
  {
    title: '12. Contact',
    items: ['Questions or requests about your data: aboyadematthew@gmail.com. Please include your full name and registration email.']
  }
];


export const LEGAL_DEFAULTS = {
  terms: {
    title: 'Terms & Policy',
    updated: `${TERMS_VERSION}. Applies to State AI Training (The Foundry). Previous version: 20 October 2026.`,
    intro: 'Please read this carefully before you register or pay. It explains what you get, what we expect from you, what happens if things change, and your rights. If anything is unclear, write to us before you pay: we will explain it in plain words.',
    summary: TERMS_SUMMARY,
    sections: [...TERMS_SECTIONS, {
      title: '28. Contact',
      items: ['Email aboyadematthew@gmail.com with your full name, your registration email and your payment reference for anything about your registration, these terms, a refund, a complaint, or your data. We reply within 3 working days.']
    }]
  },
  privacy: {
    title: 'Privacy Notice',
    updated: 'Version 1, 11 November 2026. Applies to State AI Training (The Foundry) under the Nigeria Data Protection Act 2023.',
    intro: 'This notice explains what personal information we collect when you use this website and our courses, why we use it, who sees it, how long we keep it and what control you have. It is part of the Terms & Policy.',
    summary: PRIVACY_SUMMARY,
    sections: PRIVACY_SECTIONS
  }
};
