import { describe, expect, it } from 'vitest';
import { buildDocument } from '../../../server/latex/buildDocument';
import { createSampleResume } from '../defaults';
import { ResumeDocumentSchema } from '../schema';
import { coerceResume, healResume, toPartialDate } from './coerce';
import { resumeFromMacroBody } from './fromMacros';

describe('toPartialDate', () => {
  it.each([
    ['04/2025', '2025-04'], // the format that broke real generations
    ['05/2027', '2027-05'],
    ['4-2025', '2025-04'],
    ['2025-04', '2025-04'],
    ['2025/4', '2025-04'],
    ['Apr 2025', '2025-04'],
    ['April 2025', '2025-04'],
    ['Sept. 2021', '2021-09'],
    ['2025', '2025'],
    ['Summer 2020', '2020'],
    ['Expected 2027', '2027'],
    ['13/2025', '2025'], // not a month: keep the year rather than invent one
    ['Present', ''],
    ['', ''],
  ])('%s → %s', (input, expected) => {
    expect(toPartialDate(input)).toBe(expected);
  });
});

// The body a real generation produced for a student résumé: MM/YYYY dates.
const REAL_BODY = String.raw`\resheader{Yatharth Chopra}{yc@example.com \resdot +91 98103 54459 \resdot Gurugram, IN \resdot \href{https://linkedin.com/in/yatharth-chopra}{linkedin.com/in/yatharth-chopra} \resdot \href{https://github.com/yatharthchopra2424}{github.com/yatharthchopra2424}}

\section{Professional Summary}
\resline{Software Developer and B.Tech Computer Science student with practical experience in backend engineering.}

\section{Technical Skills}
\resskills{Programming \& Backend}{Python, SQL, R, Java, HTML, CSS, FastAPI, Node.js, Express.js}
\resskills{Data \& Analytics}{Power BI, Tableau, Pandas, NumPy, Machine Learning, RAG Workflows}

\section{Work Experience}
\resrole{Data Science Intern}{ARB Bearing PVT LTD}{Delhi}{04/2025 -- 06/2025}
\begin{reslist}
\resitem{Built an intuitive dashboard using Power BI and Python to optimize data pipelines.}
\resitem{Increased actionable insights by 60\% and reduced data interpretation time by 45\%.}
\end{reslist}

\section{Education}
\resedu{BTech in Computer Science}{K.R. Mangalam University}{Gurugram}{05/2027}
`;

describe('a real generation with MM/YYYY dates', () => {
  const doc = resumeFromMacroBody(buildDocument(REAL_BODY, 'resume'), { title: 'Backend Developer – Acme' });

  it('is a document the Studio can read back (this used to fail validation and vanish)', () => {
    const parsed = ResumeDocumentSchema.safeParse(doc);
    expect(parsed.success, JSON.stringify(parsed.success ? '' : parsed.error.issues.slice(0, 3))).toBe(true);
  });

  it('keeps the dates as real dates', () => {
    const job = doc.sections.find((s) => s.type === 'experience')!.entries[0];
    expect([job.startDate, job.endDate, job.current]).toEqual(['2025-04', '2025-06', false]);
    const edu = doc.sections.find((s) => s.type === 'education')!.entries[0];
    expect(edu.startDate).toBe('2027-05');
  });

  it('keeps both links and every section', () => {
    expect(doc.personal.links).toHaveLength(2);
    expect(doc.sections.map((s) => s.type)).toEqual(['summary', 'skills', 'experience', 'education']);
  });
});

describe('coerceResume', () => {
  it('clamps over-long fields and caps counts instead of rejecting the document', () => {
    const base = createSampleResume();
    const messy = {
      ...base,
      title: 'T'.repeat(500),
      personal: {
        ...base.personal,
        fullName: 'N'.repeat(400),
        links: Array.from({ length: 15 }, (_, i) => ({ id: `l${i}`, label: 'x'.repeat(200), url: 'https://x.io' })),
      },
    };
    expect(ResumeDocumentSchema.safeParse(messy).success).toBe(false);
    const fixed = ResumeDocumentSchema.safeParse(coerceResume(messy));
    expect(fixed.success).toBe(true);
    if (fixed.success) {
      expect(fixed.data.personal.links).toHaveLength(8);
      expect(fixed.data.title.length).toBeLessThanOrEqual(120);
    }
  });
});

describe('healResume', () => {
  it('rescues a document that was saved with an invalid date (already saved in the database)', () => {
    const saved = createSampleResume();
    saved.sections[1].entries[0].startDate = '04/2025';
    expect(ResumeDocumentSchema.safeParse(saved).success).toBe(false);
    const healed = healResume(saved);
    expect(healed?.sections[1].entries[0].startDate).toBe('2025-04');
  });

  it('returns a valid document untouched and null for non-résumé data', () => {
    const ok = createSampleResume();
    expect(healResume(ok)).toEqual(ok);
    expect(healResume(null)).toBeNull();
    expect(healResume({ hello: 'world' })).toBeNull();
  });
});
