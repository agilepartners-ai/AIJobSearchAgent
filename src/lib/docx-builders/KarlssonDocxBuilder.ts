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

export async function buildKarlssonDocx(data: UserProfileData): Promise<Blob> {
  const {
    fullName,
    email,
    phone,
    website,
    portfolio,
    detailedResumeSections,
    jobProfile,
    currentJobTitle,
    workExperience,
    education,
    skills
  } = data;

  const title = currentJobTitle || jobProfile?.split('.')[0] || 'Professional';
  const summary = detailedResumeSections?.professional_summary || jobProfile;
  const expList = detailedResumeSections?.experience || workExperience || [];
  const eduList = detailedResumeSections?.education || education || [];
  const skillList = detailedResumeSections?.technical_skills || skills || [];

  const children: FileChild[] = [];

  // Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: fullName?.toUpperCase() || 'YOUR NAME',
          bold: true,
          size: 32,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title.toUpperCase(),
          size: 18,
          color: '666666',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    })
  );

  // For Karlsson, we use a Table for the two-column layout
  const table = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
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
          // Left Column
          new TableCell({
            width: {
              size: 30,
              type: WidthType.PERCENTAGE,
            },
            shading: {
              fill: '1F2937',
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'CONTACT',
                    bold: true,
                    color: 'FFFFFF',
                    size: 18,
                  }),
                ],
                spacing: { before: 240, after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: phone || '',
                    color: 'CCCCCC',
                    size: 16,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: email || '',
                    color: 'CCCCCC',
                    size: 16,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: website || portfolio || '',
                    color: 'CCCCCC',
                    size: 16,
                  }),
                ],
                spacing: { after: 240 },
              }),
              
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'SKILLS',
                    bold: true,
                    color: 'FFFFFF',
                    size: 18,
                  }),
                ],
                spacing: { after: 120 },
              }),
              ...skillList.map((skill: any) => new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${skill}`,
                    color: 'CCCCCC',
                    size: 16,
                  }),
                ],
                spacing: { after: 60 },
              }))
            ],
          }),
          // Right Column
          new TableCell({
            width: {
              size: 70,
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'PROFILE',
                    bold: true,
                    size: 18,
                  }),
                ],
                spacing: { before: 240, after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: summary || '',
                    size: 18,
                  }),
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 240 },
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: 'EXPERIENCE',
                    bold: true,
                    size: 18,
                  }),
                ],
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
                      new TextRun({ text: jobTitle, bold: true, size: 18 }),
                      new TextRun({ text: `\t${duration}`, bold: true, size: 16 }),
                    ],
                    tabStops: [{ type: 'right', position: convertInchesToTwip(4.5) }],
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: company, size: 16, italics: true })],
                    spacing: { after: 60 },
                  }),
                  ...bullets.map((b: any) => new Paragraph({
                    children: [new TextRun({ text: b, size: 16 })],
                    bullet: { level: 0 },
                    spacing: { after: 40 },
                  })),
                  new Paragraph({ children: [], spacing: { after: 120 } })
                ];
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: 'EDUCATION',
                    bold: true,
                    size: 18,
                  }),
                ],
                spacing: { after: 120 },
              }),
              ... (eduList as any[]).map((edu: any) => new Paragraph({
                children: [
                  new TextRun({ text: `${edu.degree}, ${edu.institution}`, bold: true, size: 18 }),
                  new TextRun({ text: `\t${edu.graduation_date || edu.graduationYear}`, size: 16 }),
                ],
                tabStops: [{ type: 'right', position: convertInchesToTwip(4.5) }],
                spacing: { after: 120 },
              }))
            ],
            margins: {
              left: convertInchesToTwip(0.2),
            }
          }),
        ],
      }),
    ],
  });

  children.push(table);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.5),
              right: convertInchesToTwip(0.5),
              bottom: convertInchesToTwip(0.5),
              left: convertInchesToTwip(0.5),
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}
