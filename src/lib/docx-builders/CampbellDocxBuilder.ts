import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  BorderStyle,
  Packer,
  FileChild,
  Table,
  TableRow,
  TableCell,
  WidthType
} from 'docx';
import { UserProfileData } from '../../services/profileService';

export async function buildCampbellDocx(data: UserProfileData): Promise<Blob> {
  const {
    fullName,
    email,
    phone,
    location,
    detailedResumeSections,
    jobProfile,
    workExperience,
    education,
    skills,
    references
  } = data;

  const summary = detailedResumeSections?.professional_summary || jobProfile;
  const expList = detailedResumeSections?.experience || workExperience || [];
  const eduList = detailedResumeSections?.education || education || [];
  const skillList = detailedResumeSections?.technical_skills || skills || [];
  const refs = references ? (typeof references === 'string' ? [references] : references) : [];

  const children: FileChild[] = [];

  // Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: fullName?.toUpperCase() || 'YOUR NAME',
          bold: true,
          size: 36,
        }),
      ],
      border: {
        bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 24 },
      },
      spacing: { after: 240 },
    })
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          // Left Sidebar
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'OBJECTIVE', bold: true, size: 18 })],
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [new TextRun({ text: summary || '', size: 16 })],
                spacing: { after: 240 },
              }),
              new Paragraph({
                children: [new TextRun({ text: 'SKILLS & ABILITIES', bold: true, size: 18 })],
                spacing: { after: 120 },
              }),
              ...skillList.map((s: any) => new Paragraph({
                children: [new TextRun({ text: `• ${s}`, size: 16 })],
                spacing: { after: 60 },
              })),
              ...(refs.length > 0 ? [
                new Paragraph({
                  children: [new TextRun({ text: 'REFERENCES', bold: true, size: 18 })],
                  spacing: { before: 240, after: 120 },
                }),
                ...refs.map((r: any) => new Paragraph({
                  children: [new TextRun({ text: typeof r === 'string' ? r : `${r.name}, ${r.company}`, size: 16 })],
                  spacing: { after: 60 },
                }))
              ] : [])
            ],
          }),
          // Right Column
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'EXPERIENCE', bold: true, size: 18 })],
                alignment: AlignmentType.RIGHT,
                border: { bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 6 } },
                spacing: { after: 120 },
              }),
              ... (expList as any[]).flatMap(exp => {
                const jobTitle = exp.position || exp.jobTitle;
                const company = exp.company;
                const duration = exp.duration;
                const bullets = exp.achievements || exp.responsibilities || [];
                return [
                  new Paragraph({
                    children: [
                      new TextRun({ text: company, bold: true, size: 18 }),
                      new TextRun({ text: `\t${duration}`, size: 16 }),
                    ],
                    tabStops: [{ type: 'right', position: convertInchesToTwip(4) }],
                  }),
                  new Paragraph({ children: [new TextRun({ text: jobTitle, italics: true, size: 16 })], spacing: { after: 60 } }),
                  ...bullets.map((b: any) => new Paragraph({ children: [new TextRun({ text: b, size: 16 })], bullet: { level: 0 }, spacing: { after: 40 } })),
                  new Paragraph({ children: [], spacing: { after: 120 } })
                ];
              }),
              new Paragraph({
                children: [new TextRun({ text: 'EDUCATION', bold: true, size: 18 })],
                alignment: AlignmentType.RIGHT,
                border: { bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 6 } },
                spacing: { before: 240, after: 120 },
              }),
              ... (eduList as any[]).map((edu: any) => new Paragraph({
                children: [
                  new TextRun({ text: edu.institution, bold: true, size: 18 }),
                  new TextRun({ text: `\t${edu.graduation_date || edu.graduationYear}`, size: 16 }),
                ],
                tabStops: [{ type: 'right', position: convertInchesToTwip(4) }],
                spacing: { after: 60 },
              }))
            ],
            margins: { left: convertInchesToTwip(0.25) }
          })
        ]
      })
    ]
  });

  children.push(table);

  // Bottom contact bar
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: [email, location, phone].filter(Boolean).join(' · '),
          size: 16,
          color: '666666',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 480 },
    })
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: convertInchesToTwip(0.75), right: convertInchesToTwip(0.75), bottom: convertInchesToTwip(0.75), left: convertInchesToTwip(0.75) }
        }
      },
      children
    }]
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}
