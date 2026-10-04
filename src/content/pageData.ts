import type { ContentPageData } from '../components/marketing/ContentPage';

/**
 * Copy for the public content pages. Every statement describes the product as it works today
 * (checked against the code: upload formats, limits, statuses, exports). Do not add outcome claims
 * ("get hired faster"), user counts or comparisons we cannot back up.
 */

const HOME = { name: 'Home', path: '/' };

const REL = {
  tailoring: { href: '/resume-tailoring', label: 'Résumé tailoring', blurb: 'Rewrite your résumé for one specific job.' },
  builder: { href: '/ats-resume-builder', label: 'ATS-friendly résumé builder', blurb: 'Templates, live editing, PDF and LaTeX export.' },
  cover: { href: '/cover-letter-generator', label: 'Cover letter generator', blurb: 'A letter written for the job you are applying to.' },
  tracker: { href: '/job-application-tracker', label: 'Application tracker', blurb: 'Every application, status and job description in one list.' },
  interview: { href: '/mock-interview', label: 'AI mock interview', blurb: 'Rehearse with an AI interviewer set up for the role.' },
  guideTailor: { href: '/guides/tailor-resume-to-job-description', label: 'How to tailor a résumé to a job description', blurb: 'A step-by-step method you can use with or without the tool.' },
  guideAts: { href: '/guides/how-ats-resume-scanners-work', label: 'How ATS résumé scanners work', blurb: 'What the software does with your résumé, and what breaks it.' },
};

export const RESUME_TAILORING: ContentPageData = {
  path: '/resume-tailoring',
  kind: 'feature',
  h1: 'Tailor your résumé to any job description with AI',
  answer:
    'AIJobSearchAgent rewrites your résumé for one specific job. Upload your résumé as a PDF or text file, paste the job description, and in about 10 to 30 seconds you get a tailored résumé, a matching cover letter, and a match analysis listing your strengths, the gaps, and the keywords you cover or miss.',
  features: ['Résumé rewritten for a specific job', 'Match score with strengths, gaps and suggestions', 'Keywords present and missing', 'Matching cover letter', 'Editable result with PDF and LaTeX export'],
  breadcrumb: [HOME, { name: 'Résumé tailoring', path: '/resume-tailoring' }],
  steps: [
    { name: 'Upload your résumé', text: 'Upload a PDF or plain-text (.txt) résumé. The PDF needs selectable text.' },
    { name: 'Paste the job description', text: 'Paste the posting, or start from an application you have already saved.' },
    { name: 'Generate', text: 'The AI writes a tailored résumé, a cover letter and a match analysis, usually in 10 to 30 seconds.' },
    { name: 'Review, edit and export', text: 'Read every line, edit it in the résumé editor, then download a PDF or the LaTeX source.' },
  ],
  sections: [
    {
      id: 'how-it-works',
      heading: 'How it works',
      list: {
        ordered: true,
        items: [
          'Upload your résumé as a PDF or plain-text file. The PDF must contain selectable text; a scanned image cannot be read.',
          'Paste the job description, or start from an application you have already saved in the tracker.',
          'Generate. The AI writes a version of your résumé for that job and a matching cover letter. This usually takes 10 to 30 seconds.',
          'Review the result in the résumé editor, change anything you like, then download a PDF or the LaTeX source.',
        ],
      },
    },
    {
      id: 'match-analysis',
      heading: 'What the match analysis shows',
      paragraphs: ['Alongside the rewritten résumé you get an analysis of how your résumé lines up with the job.'],
      table: {
        head: ['Part', 'What it tells you'],
        rows: [
          ['Match score', 'An overall estimate of how well your résumé fits the posting.'],
          ['Strengths', 'Parts of your experience that the job asks for.'],
          ['Gaps', 'Requirements the résumé does not yet show evidence for.'],
          ['Suggestions', 'Concrete changes worth making before you apply.'],
          ['Keywords', 'Terms from the posting that your résumé already contains, and the ones it is missing.'],
        ],
      },
    },
    {
      id: 'limits',
      heading: 'What to know before you rely on it',
      list: {
        items: [
          'The match score is an estimate produced by the AI. It is not the score any particular applicant tracking system will assign.',
          'The AI works from your résumé, but it can still make mistakes. Read every line before you send anything, and never claim experience you do not have.',
          'Uploads are PDF and plain text. DOCX and DOC are not supported yet.',
          'Each account can generate up to 5 tailored sets per day. Paid plans with higher limits are planned.',
          'Résumés and job descriptions are English-language today.',
        ],
      },
    },
    {
      id: 'memory',
      heading: 'It remembers your earlier résumés',
      paragraphs: [
        'When you have saved earlier résumés or job descriptions in your account, relevant details from them can be reused so a long résumé is trimmed to what matters for the new job. This memory is stored in your own account and is not shared with other users.',
      ],
    },
  ],
  faqs: [
    { q: 'How long does generating a tailored résumé take?', a: 'Usually 10 to 30 seconds. The résumé and the cover letter are produced together.' },
    { q: 'Will it invent experience I do not have?', a: 'It is set up to work from the résumé you upload, but AI can make mistakes. Always read the result and remove anything that is not true before you apply.' },
    { q: 'Can I tailor one résumé for several jobs?', a: 'Yes. Each job gets its own generation and its own saved résumé, so you keep one version per application. The limit is 5 generations per day.' },
    { q: 'Which file formats can I upload?', a: 'PDF (with selectable text) and plain text. Export a Word document to PDF first.' },
  ],
  related: [REL.builder, REL.cover, REL.guideTailor, REL.tracker],
  cta: { heading: 'Tailor your first résumé', text: 'Create an account, upload your résumé and paste a job description.' },
};

export const ATS_RESUME_BUILDER: ContentPageData = {
  path: '/ats-resume-builder',
  kind: 'feature',
  h1: 'ATS-friendly résumé builder with LaTeX and PDF export',
  answer:
    'Choose one of 12 résumé templates, edit your résumé live in the browser, and export a PDF with selectable text or the LaTeX source. The PDF is produced from the same content as the on-screen preview, so what you see is what you download. You can also open the LaTeX in Overleaf.',
  features: ['12 résumé templates', 'Live preview while editing', 'Drag-and-drop section ordering', 'Undo and redo with autosave', 'PDF export with selectable text', 'LaTeX source export', 'Open in Overleaf'],
  breadcrumb: [HOME, { name: 'Résumé builder', path: '/ats-resume-builder' }],
  sections: [
    {
      id: 'templates',
      heading: 'Templates',
      paragraphs: [
        'There are 12 templates across simple, modern, two-column, compact, classic and creative styles. Every template renders your own résumé, so you can compare them with your real content before choosing.',
      ],
      table: {
        head: ['Template', 'Style', 'Notes'],
        rows: [
          ['Meridian', 'Centred serif classic', 'A hairline under each heading.'],
          ['Harbor', 'Clean sans-serif with a navy accent', 'A safe default for most applications.'],
          ['Graphite', 'Dense and efficient', 'Fits more on one page.'],
          ['Sequoia', 'Forest-green accents', 'Generous spacing.'],
          ['Atlas', 'Two columns with a tinted sidebar', 'Skills and languages in the sidebar.'],
          ['Aurora', 'Violet sidebar on the right', 'Bold and contemporary.'],
        ],
      },
    },
    {
      id: 'editor',
      heading: 'The editor',
      list: {
        items: [
          'A live preview updates as you type.',
          'Drag sections and entries to reorder them.',
          'Undo and redo, with autosave so you do not lose changes.',
          'Rich-text bullets, plus control over fonts, colours and spacing.',
          'Switch template at any time without retyping.',
        ],
      },
    },
    {
      id: 'export',
      heading: 'Export options',
      list: {
        items: [
          'PDF: compiled from LaTeX, so the text in the file is real, selectable text rather than an image.',
          'LaTeX source (.tex): download it and keep editing anywhere LaTeX runs.',
          'Open in Overleaf: sends the source to a new project in your own Overleaf account.',
        ],
      },
    },
    {
      id: 'ats',
      heading: 'Choosing a template for applicant tracking systems',
      paragraphs: [
        'Applicant tracking systems read a résumé as text, top to bottom. Single-column templates are the safest because the reading order is unambiguous. Two-column templates such as Atlas and Aurora look good to people, but some systems read the columns in the wrong order, so use them when you are sending your résumé directly to a person.',
        'Whatever you pick, avoid putting key information in images, and check how the PDF reads by selecting all the text and pasting it into a plain-text editor.',
      ],
    },
  ],
  faqs: [
    { q: 'Do I need to know LaTeX?', a: 'No. You edit in the browser like a normal document. LaTeX is only used behind the scenes to produce the PDF, and you can download the source if you want it.' },
    { q: 'What is Overleaf?', a: 'Overleaf is a free online LaTeX editor. The Open in Overleaf button creates a project there from your résumé, in your own Overleaf account.' },
    { q: 'Are two-column templates safe for ATS?', a: 'Single-column templates are safest. Two-column layouts can be read in the wrong order by some systems, so prefer a single column for online applications.' },
    { q: 'Can I start from an AI-tailored résumé?', a: 'Yes. When you tailor a résumé to a job, the result opens in the same editor, so you can adjust the template and wording before exporting.' },
  ],
  related: [REL.tailoring, REL.guideAts, REL.cover, REL.tracker],
  cta: { heading: 'Build your résumé', text: 'Pick a template and start editing in a minute.' },
};

export const COVER_LETTER: ContentPageData = {
  path: '/cover-letter-generator',
  kind: 'feature',
  h1: 'AI cover letter generator that starts from the job description',
  answer:
    'AIJobSearchAgent writes a cover letter for one specific job. It reads your résumé and the job description together and drafts a letter that refers to the role, delivered alongside your tailored résumé as a PDF and as LaTeX you can edit. You review and change it before sending.',
  features: ['Cover letter written from your résumé and a job description', 'Generated together with a tailored résumé', 'PDF and LaTeX output', 'Editable and recompilable'],
  breadcrumb: [HOME, { name: 'Cover letter generator', path: '/cover-letter-generator' }],
  sections: [
    {
      id: 'what-you-get',
      heading: 'What you get',
      list: {
        items: [
          'A letter drafted for the specific posting, using details from your résumé.',
          'Your contact details at the top, taken from your saved profile.',
          'A PDF to send and the LaTeX source to keep editing.',
          'The letter is saved with the résumé, so each application has its own pair.',
        ],
      },
    },
    {
      id: 'editing',
      heading: 'Editing the letter',
      paragraphs: [
        'The cover letter has its own tab next to the résumé. Edit the text directly, recompile, and download the new PDF. Because it is LaTeX underneath, you can also open it in Overleaf.',
      ],
    },
    {
      id: 'personalise',
      heading: 'Make it yours before you send it',
      list: {
        ordered: true,
        items: [
          'Add one specific reason you want this company, in your own words. A generated draft cannot know it.',
          'Check every claim against your résumé and remove anything that overstates your experience.',
          'Match the tone to the company: shorter and plainer usually reads better.',
          'Read it aloud once. Anything awkward to say is awkward to read.',
        ],
      },
    },
  ],
  faqs: [
    { q: 'Is the cover letter generated separately from the résumé?', a: 'They are produced in the same step from the same inputs, so the letter and the résumé are consistent with each other.' },
    { q: 'Can I edit the letter?', a: 'Yes. Edit it in the cover letter tab, recompile, and download the new PDF or the LaTeX source.' },
    { q: 'Does it use my contact details?', a: 'It takes them from your saved profile, so add any missing details there first. Check the header before you send the letter.' },
  ],
  related: [REL.tailoring, REL.builder, REL.tracker, REL.guideTailor],
  cta: { heading: 'Write a cover letter for your next application', text: 'Upload your résumé and paste the job description.' },
};

export const TRACKER: ContentPageData = {
  path: '/job-application-tracker',
  kind: 'feature',
  h1: 'A job application tracker that keeps everything in one list',
  answer:
    'Keep every application in one searchable list: company, role, date, location, status, link and the job description, with your tailored résumé and cover letter attached. Filter by status, sort by recent, company or status, and start a tailored résumé straight from any saved role.',
  features: ['Searchable list of applications', 'Status filters and sorting', 'Job description stored with each application', 'Tailor a résumé from any application', 'Add roles from job search or by hand'],
  breadcrumb: [HOME, { name: 'Application tracker', path: '/job-application-tracker' }],
  sections: [
    {
      id: 'statuses',
      heading: 'Statuses',
      table: {
        head: ['Status', 'Meaning'],
        rows: [
          ['To apply', 'You saved the role but have not applied yet.'],
          ['Applied', 'The application has been sent.'],
          ['Interviewing', 'You are in the interview process.'],
          ['Offer', 'You have an offer.'],
          ['Accepted / Declined', 'You accepted the offer, or turned it down.'],
          ['Rejected', 'The company said no.'],
        ],
      },
    },
    {
      id: 'features',
      heading: 'What you can do',
      list: {
        items: [
          'Search by role or company, filter by status, and sort by recent, company or status.',
          'Add a role from job search or enter one by hand, with the posting link and description.',
          'Open any application to read its job description and change its status.',
          'Press Tailor resume on an application to generate a résumé and cover letter for that exact job.',
          'Generated documents are saved against the application so you can find them later.',
        ],
      },
    },
    {
      id: 'why',
      heading: 'Why keep the job description',
      paragraphs: [
        'Postings are often taken down once the role is filled. Saving the description with the application means you can still read what you applied to when an interview invitation arrives weeks later.',
      ],
    },
  ],
  faqs: [
    { q: 'Can I add a job I found somewhere else?', a: 'Yes. Add an application by hand with the company, role, link and description.' },
    { q: 'What happens to the documents I generate?', a: 'They are saved with the application, and the résumé also appears in your résumé list so you can edit it later.' },
    { q: 'Can I search my applications?', a: 'Yes. Search by role or company and filter by status.' },
  ],
  related: [REL.tailoring, REL.interview, REL.cover, REL.guideTailor],
  cta: { heading: 'Start tracking your applications', text: 'Create an account and add your first role.' },
};

export const MOCK_INTERVIEW: ContentPageData = {
  path: '/mock-interview',
  kind: 'feature',
  h1: 'AI mock interview practice for the role you are applying to',
  answer:
    'Rehearse for an interview with an AI interviewer that is set up for the job you are applying to. The session opens as a live conversation in a new tab, powered by Tavus. Use it to practise answering out loud, then review your own answers afterwards.',
  features: ['Live AI interviewer in a new tab', 'Set up with the job you choose', 'Practice conversation you can repeat'],
  breadcrumb: [HOME, { name: 'AI mock interview', path: '/mock-interview' }],
  sections: [
    {
      id: 'how',
      heading: 'How a practice session works',
      list: {
        ordered: true,
        items: [
          'Open an application in your list and choose Practise interview.',
          'The job title, company and job description are passed to the interviewer, so the conversation fits the role.',
          'Start the session. It opens as a live conversation in a new browser tab.',
          'Answer out loud as you would in the real interview.',
        ],
      },
    },
    {
      id: 'practise',
      heading: 'Getting the most from practice',
      list: {
        items: [
          'Prepare two or three specific examples from your work before you start, and reuse them across questions.',
          'Structure answers with the situation, what you did, and the result.',
          'Say your answers aloud rather than in your head; the difference shows quickly.',
          'Repeat the session after reviewing your own answers.',
        ],
      },
    },
    {
      id: 'limits',
      heading: 'What it is not',
      paragraphs: ['It is a rehearsal partner. It does not predict how a real interviewer will judge you, and it does not replace preparing concrete examples from your own experience.'],
    },
  ],
  faqs: [
    { q: 'Who provides the AI interviewer?', a: 'The conversation is powered by Tavus and opens in a separate tab.' },
    { q: 'Is it set up for my job?', a: 'Yes. When you start it from an application, that application’s job title, company and description are passed to the interviewer.' },
    { q: 'How many practice interviews can I run?', a: 'Each account can start up to 5 practice interviews per day. Sessions are limited to 30 minutes.' },
  ],
  related: [REL.tracker, REL.tailoring, REL.guideTailor, REL.cover],
  cta: { heading: 'Practise before the real thing', text: 'Create an account and start a mock interview.' },
};

export const GUIDE_TAILOR: ContentPageData = {
  path: '/guides/tailor-resume-to-job-description',
  kind: 'guide',
  h1: 'How to tailor your résumé to a job description',
  answer:
    'To tailor a résumé, read the job posting for its must-haves, match each one to real evidence from your experience, use the posting’s own wording where it is true, and move the most relevant bullets to the top. Keep it honest, keep it to the facts, and check the keywords before you send it.',
  breadcrumb: [HOME, { name: 'Guides', path: '/guides' }, { name: 'Tailor a résumé', path: '/guides/tailor-resume-to-job-description' }],
  steps: [
    { name: 'Read the posting for must-haves', text: 'Highlight the requirements that are repeated or listed first, and separate must-haves from nice-to-haves.' },
    { name: 'Map each requirement to evidence', text: 'For every must-have, find a specific project or result from your experience that shows it.' },
    { name: 'Use the posting’s wording where it is true', text: 'If you did the work but called it something else, use the employer’s term.' },
    { name: 'Reorder and trim', text: 'Move the most relevant bullets up and cut the ones that do not help this application.' },
    { name: 'Quantify results', text: 'Add numbers, scale and outcomes where you honestly have them.' },
    { name: 'Check keywords and proofread', text: 'Confirm the important terms appear naturally, then read the whole thing once more.' },
  ],
  sections: [
    {
      id: 'why',
      heading: 'Why tailoring is worth the time',
      paragraphs: [
        'A recruiter reading a résumé is answering one question: does this person match the role? Software that sorts applications does the same thing with keywords. A résumé written for the specific posting makes that answer easy to find; a generic one makes the reader do the work.',
      ],
    },
    {
      id: 'steps',
      heading: 'The method, step by step',
      list: {
        ordered: true,
        items: [
          'Read the posting twice. Highlight the requirements that are repeated or listed first. Those are the must-haves; the rest are nice-to-haves.',
          'For each must-have, write down one specific piece of evidence from your experience: a project, a result, a tool you used.',
          'Rewrite your summary so its first line matches the role. Say what you do and what you are applying to do, in the posting’s terms.',
          'Use the employer’s wording where it is accurate. If the posting says “stakeholder management” and you did exactly that under another name, use their term.',
          'Reorder bullets so the most relevant ones come first under each job, and cut the ones that do not help this application.',
          'Add numbers only where you actually have them: size of team, volume, time saved, money, percentage change.',
          'Check that the main keywords from the posting appear naturally, then proofread the whole résumé.',
        ],
      },
    },
    {
      id: 'honesty',
      heading: 'The one rule: stay truthful',
      paragraphs: [
        'Tailoring means choosing and phrasing true things for a particular reader. It never means adding skills you do not have. Interviewers will ask about everything on the page, so every line should be something you can discuss in detail.',
      ],
    },
    {
      id: 'checklist',
      heading: 'A quick checklist before you send it',
      list: {
        items: [
          'The top third of page one answers “why this role?”.',
          'Every must-have in the posting has evidence somewhere on the résumé.',
          'No claim you cannot explain in an interview.',
          'The file is a PDF with selectable text and a clear file name.',
        ],
      },
    },
    {
      id: 'tool',
      heading: 'Doing this faster with a tool',
      paragraphs: [
        'AIJobSearchAgent automates the mechanical part of this method: you paste the posting, and it drafts a tailored résumé, a cover letter, and a list of keywords you cover or miss. You still do the important part, which is reading the result and removing anything that is not true.',
      ],
    },
  ],
  faqs: [
    { q: 'How much of my résumé should change for each job?', a: 'Usually the summary, the order of your bullets and some wording. Your facts stay the same; the emphasis changes.' },
    { q: 'Should I copy phrases straight from the job posting?', a: 'Only where they accurately describe what you did. Copying requirements you did not meet is the fastest way to a difficult interview.' },
    { q: 'How many keywords is enough?', a: 'There is no magic number. Make sure the main skills and tools from the posting appear in context, with evidence next to them.' },
  ],
  related: [REL.tailoring, REL.guideAts, REL.cover, REL.builder],
  cta: { heading: 'Let the tool do the first draft', text: 'Paste a job description and get a tailored résumé and match analysis.' },
};

export const GUIDE_ATS: ContentPageData = {
  path: '/guides/how-ats-resume-scanners-work',
  kind: 'guide',
  h1: 'How ATS résumé scanners work (and how to pass them)',
  answer:
    'An applicant tracking system is a database for job applications. It parses your résumé into fields, then lets recruiters search and filter. It rarely “scores” you the way people imagine, but it can misread a résumé. Use a simple single-column layout, standard headings and real text, and the software will read it correctly.',
  breadcrumb: [HOME, { name: 'Guides', path: '/guides' }, { name: 'How ATS scanners work', path: '/guides/how-ats-resume-scanners-work' }],
  sections: [
    {
      id: 'what',
      heading: 'What an ATS actually does',
      list: {
        items: [
          'Collects applications from a company’s careers page and job boards into one place.',
          'Parses each résumé: it pulls out your name, contact details, job titles, employers, dates, education and skills.',
          'Stores that structured data so a recruiter can search it, for example by skill, job title or location.',
          'Lets recruiters set screening questions and move candidates through stages.',
        ],
      },
    },
    {
      id: 'myth',
      heading: 'What it usually does not do',
      paragraphs: [
        'Many people picture a robot that rejects résumés automatically for tiny formatting mistakes. How much automatic filtering happens depends on the company and how its recruiters configure the system, and it is more often driven by screening questions and keyword searches than by a hidden score. The more common practical problem is parsing: if the software cannot read your résumé correctly, your details can end up missing or in the wrong field.',
      ],
    },
    {
      id: 'breaks',
      heading: 'What commonly breaks parsing',
      table: {
        head: ['Problem', 'Why it hurts', 'Do this instead'],
        rows: [
          ['Text inside images or scans', 'The parser cannot read pixels as text.', 'Use a PDF with selectable text.'],
          ['Tables and text boxes', 'Reading order becomes unpredictable.', 'Use plain paragraphs and bullet lists.'],
          ['Two or more columns', 'Some systems read across rows and mix the columns.', 'Prefer a single column for online applications.'],
          ['Information in headers or footers', 'Parsers often skip those areas.', 'Keep contact details in the main body.'],
          ['Creative section names', 'Parsers look for standard ones.', 'Use Experience, Education, Skills.'],
          ['Icons or special symbols for contact info', 'They may be dropped or garbled.', 'Write the text out: email, phone, location.'],
        ],
      },
    },
    {
      id: 'test',
      heading: 'A two-minute test you can run yourself',
      list: {
        ordered: true,
        items: [
          'Open your résumé PDF and select all the text.',
          'Paste it into a plain-text editor.',
          'Read it. If the order is wrong, text is missing, or characters are garbled, a parser will struggle too.',
        ],
      },
    },
    {
      id: 'keywords',
      heading: 'Writing for software and for people',
      paragraphs: [
        'Recruiters search ATS databases with the terms from the job posting. Use those terms where they honestly describe your work, and put them in context next to evidence, such as a result or a project, rather than in a list of unexplained words. That helps the search find you and helps the human who reads the résumé next.',
      ],
    },
  ],
  faqs: [
    { q: 'Is a PDF or a Word file better for an ATS?', a: 'Either can work if it contains real, selectable text. Follow the instructions on the application page if they ask for a specific format.' },
    { q: 'Do I need to hide keywords in white text?', a: 'No. It does not work reliably, and a recruiter who sees it will not trust your résumé. Use honest keywords in context.' },
    { q: 'Is there one ATS score I should aim for?', a: 'No. Different systems work differently, and the score some tools show you is their own estimate. Treat it as a hint about missing keywords, not a pass mark.' },
  ],
  related: [REL.builder, REL.guideTailor, REL.tailoring, REL.cover],
  cta: { heading: 'Build a résumé that parses cleanly', text: 'Choose a single-column template and export a PDF with selectable text.' },
};

export const GUIDES_INDEX = {
  path: '/guides',
  h1: 'Job search guides',
  answer: 'Plain-English guides on tailoring a résumé to a job, how applicant tracking systems read it, and what to check before you send an application.',
  guides: [
    { href: '/guides/tailor-resume-to-job-description', title: 'How to tailor your résumé to a job description', blurb: 'A step-by-step method: read the posting, map it to your experience, and rewrite honestly.' },
    { href: '/guides/how-ats-resume-scanners-work', title: 'How ATS résumé scanners work (and how to pass them)', blurb: 'What the software does with your résumé, what breaks it, and a two-minute test.' },
  ],
};
