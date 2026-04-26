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

export async function buildBareseDocx(data: UserProfileData): Promise<Blob> {
  const {
    fullName,
    email,
    phone,
    location,
    currentJobTitle,
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
  const title = currentJobTitle || (detailedResumeSections?.experience?.[0]?.position) || 'Professional';

  const children: FileChild[] = [];

  // Header
  children.push(
    new Paragraph({
      children: [new TextRun({ text: fullName || 'YOUR NAME', bold: true, size: 36 })],
      spacing: { after: 60 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: title.toUpperCase(), size: 20, color: '666666' })],
      spacing: { after: 240 },
    })
  );

  // Contact Row
  const contactTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: phone || '', size: 16 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: email || '', size: 16 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: location || '', size: 16 })], alignment: AlignmentType.RIGHT })] }),
        ]
      })
    ]
  });
  children.push(contactTable);
  children.push(new Paragraph({ children: [], spacing: { after: 480 } }));

  // Helper to create a labeled row
  const createLabeledRow = (label: string, contentChildren: FileChild[]) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 16 })] })],
        }),
        new TableCell({
          width: { size: 80, type: WidthType.PERCENTAGE },
          children: contentChildren,
        }),
      ]
    });
  };

  const bodyRows: TableRow[] = [];

  // Objective
  if (summary) {
    bodyRows.push(createLabeledRow('Objective', [
      new Paragraph({ children: [new TextRun({ text: summary, size: 16 })], spacing: { after: 240 } })
    ]));
  }

  // Education
  if (eduList.length > 0) {
    bodyRows.push(createLabeledRow('Education', (eduList as any[]).flatMap(edu => [
      new Paragraph({
        children: [
          new TextRun({ text: edu.institution, bold: true, size: 18 }),
        ],
        tabStops: [{ type: 'right', position: convertInchesToTwip(4.5) }],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: edu.degree || edu.field_of_study || '', size: 16 }),
          new TextRun({ text: `\t${edu.graduation_date || edu.graduationYear || ''}`, bold: true, size: 16 }),
        ],
        tabStops: [{ type: 'right', position: convertInchesToTwip(4.5) }],
        spacing: { after: 120 },
      })
    ])));
  }

  // Key Skills
  if (skillList.length > 0) {
    bodyRows.push(createLabeledRow('Key Skills', [
      new Paragraph({
        children: [new TextRun({ text: skillList.join(' • '), size: 16 })],
        spacing: { after: 240 }
      })
    ]));
  }

  // Experience
  if (expList.length > 0) {
    bodyRows.push(createLabeledRow('Experience', (expList as any[]).flatMap(exp => {
      const jobTitle = exp.position || exp.jobTitle;
      const company = exp.company;
      const duration = exp.duration;
      const bullets = exp.achievements || exp.responsibilities || [];
      return [
        new Paragraph({
          children: [
            new TextRun({ text: company, bold: true, size: 18 }),
            new TextRun({ text: `\t${duration}`, bold: true, size: 16 }),
          ],
          tabStops: [{ type: 'right', position: convertInchesToTwip(4.5) }],
        }),
        new Paragraph({ children: [new TextRun({ text: jobTitle, italics: true, size: 16 })], spacing: { after: 60 } }),
        ...bullets.map((b: any) => new Paragraph({ children: [new TextRun({ text: b, size: 16 })], bullet: { level: 0 }, spacing: { after: 40 } })),
        new Paragraph({ children: [], spacing: { after: 120 } })
      ];
    })));
  }

  const bodyTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: bodyRows
  });

  children.push(bodyTable);

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
