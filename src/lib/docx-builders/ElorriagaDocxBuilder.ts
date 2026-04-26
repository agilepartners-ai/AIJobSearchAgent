import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  BorderStyle,
  Packer,
  FileChild
} from 'docx';
import { UserProfileData } from '../../services/profileService';

export async function buildElorriagaDocx(data: UserProfileData): Promise<Blob> {
  const {
    fullName,
    email,
    phone,
    location,
    linkedin,
    portfolio,
    detailedResumeSections,
    jobProfile,
    workExperience,
    education,
    skills
  } = data;

  const contactItems = [
    location,
    phone,
    email,
    linkedin,
    portfolio
  ].filter(Boolean);

  const summary = detailedResumeSections?.professional_summary || jobProfile;
  const expList = detailedResumeSections?.experience || workExperience || [];
  const eduList = detailedResumeSections?.education || education || [];
  const skillList = detailedResumeSections?.technical_skills || skills || [];
  const certList = detailedResumeSections?.certifications || [];

  const children: FileChild[] = [];

  // Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: fullName?.toUpperCase() || 'YOUR NAME',
          bold: true,
          size: 28,
          font: 'Calibri',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: contactItems.join(' | '),
          size: 18,
          font: 'Calibri',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    })
  );

  // Summary
  if (summary) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: summary,
            size: 20,
            font: 'Calibri',
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 240 },
      })
    );
  }

  // Experience
  if (expList.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'EXPERIENCE',
            bold: true,
            size: 24,
            font: 'Calibri',
          }),
        ],
        border: {
          bottom: {
            color: '000000',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
        spacing: { before: 240, after: 120 },
      })
    );

    for (const exp of (expList as any[])) {
      const jobTitle = exp.position || exp.jobTitle;
      const company = exp.company;
      const duration = exp.duration;
      const bullets = exp.achievements || exp.responsibilities || [];

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${jobTitle}${company ? ` | ${company}` : ''}`,
              bold: true,
              size: 20,
            }),
            new TextRun({
              text: `\t${duration}`,
              bold: true,
              size: 18,
            }),
          ],
          tabStops: [
            {
              type: 'right',
              position: convertInchesToTwip(6.5),
            },
          ],
          spacing: { before: 120, after: 60 },
        })
      );

      for (const bullet of bullets) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: bullet,
                size: 18,
              }),
            ],
            bullet: { level: 0 },
            spacing: { after: 60 },
          })
        );
      }
    }
  }

  // Education
  if (eduList.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'EDUCATION',
            bold: true,
            size: 24,
            font: 'Calibri',
          }),
        ],
        border: {
          bottom: {
            color: '000000',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
        spacing: { before: 240, after: 120 },
      })
    );

    for (const edu of (eduList as any[])) {
      const degree = edu.degree;
      const institution = edu.institution;
      const date = edu.graduation_date || edu.graduationYear;

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${degree}, ${institution}`,
              bold: true,
              size: 18,
            }),
            new TextRun({
              text: `\t${date}`,
              size: 18,
            }),
          ],
          tabStops: [
            {
              type: 'right',
              position: convertInchesToTwip(6.5),
            },
          ],
          spacing: { after: 60 },
        })
      );
    }
  }

  // Skills
  if (skillList.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'SKILLS',
            bold: true,
            size: 24,
            font: 'Calibri',
          }),
        ],
        border: {
          bottom: {
            color: '000000',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
        spacing: { before: 240, after: 120 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: skillList.join(', '),
            size: 18,
          }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
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
