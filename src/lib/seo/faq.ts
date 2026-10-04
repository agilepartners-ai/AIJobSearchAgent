import type { Faq } from './jsonld';

/**
 * The home-page FAQ. This one list drives both the visible accordion and the FAQPage structured
 * data, so the markup can never describe something the page does not say. Every answer states
 * only what the product does today; if a fact changes (pricing, formats, limits), change it here.
 */
export const HOME_FAQ: Faq[] = [
  {
    q: 'What does AIJobSearchAgent do?',
    a: 'You upload a résumé (PDF or plain text) and paste a job description. It writes a version of your résumé tailored to that job, a matching cover letter, and a match analysis that lists your strengths, the gaps, and the keywords your résumé covers or misses. You can edit the résumé in the app, export it as a PDF or LaTeX source, and track the application.',
  },
  {
    q: 'How much does it cost?',
    a: 'There is no paid plan in the app today. Each account can generate up to 5 tailored résumé-and-cover-letter sets per day. Paid plans with higher limits are planned; their details will be published on this page.',
  },
  {
    q: 'Which résumé formats can I upload?',
    a: 'PDF and plain text (.txt). DOCX and DOC files are not supported yet, so export your document to PDF first. The PDF needs selectable text; a scanned image of a résumé cannot be read.',
  },
  {
    q: 'Will it get my résumé past an ATS?',
    a: 'No tool can promise that. What it does is produce a clean, single-column, text-selectable résumé and show which keywords from the job posting your résumé covers or misses. Those are the things applicant tracking systems and recruiters search for.',
  },
  {
    q: 'Is my résumé data private?',
    a: 'Your records are stored in a PostgreSQL database, connections are encrypted with TLS, and each account can only read its own data. To write your documents, your résumé text and the job description are sent to Google’s Gemini API for processing. We do not sell your data. The Privacy Policy has the details.',
  },
  {
    q: 'Does it work for internships and entry-level jobs?',
    a: 'Yes. It works from whatever you provide, including projects, coursework and internships, and the match analysis shows the gaps against the job so you know what to add or emphasise. Always read the result before you send it.',
  },
  {
    q: 'How does the AI mock interview work?',
    a: 'It opens a live conversation with an AI interviewer, powered by Tavus, in a new tab and set up with the job you chose. Use it to rehearse; afterwards, review your own answers.',
  },
  {
    q: 'Can I use it outside the US?',
    a: 'Résumé tailoring works on any English-language résumé and job description, so it is not tied to a country. Job search uses a third-party listings provider, so coverage varies by location.',
  },
];
