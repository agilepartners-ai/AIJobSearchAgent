// src/pages/api/generate-resume.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { generateFullResumeFromAI } from '../../services/aiEnhancementService';
import { generateOptimizedResume } from '../../services/resumeGenerationService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      res.status(400).json({ error: 'Resume text and job description are required.' });
      return;
    }

    // 1. Get the rewritten resume text from the AI
    const rewrittenResumeText = await generateFullResumeFromAI(resumeText, jobDescription);

    // 2. Generate a new .docx file from that text
    const docxBuffer = await generateOptimizedResume(rewrittenResumeText);

    // 3. Send the generated document back to the client
    res.setHeader('Content-Disposition', 'attachment; filename="Optimized-Resume.docx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.status(200).send(docxBuffer);

  } catch (error) {
    console.error('Error in /api/generate-resume:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Failed to generate resume.', details: errorMessage });
  }
}