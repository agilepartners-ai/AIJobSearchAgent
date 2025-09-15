// src/services/aiEnhancementService.ts

import { GoogleGenAI } from '@google/genai';

// Initialize the Google GenAI client with your API key
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });

/**
 * Creates a new, powerful prompt that instructs the AI to act as a professional
 * resume writer and rewrite the entire resume.
 * @param resumeText The original resume content.
 * @param jobDescription The target job description.
 * @returns A string containing the detailed prompt for the AI model.
 */
function createFullResumeRewritePrompt(resumeText: string, jobDescription: string): string {
  return `
    **Role:** You are an expert career coach and professional resume writer.

    **Task:** Rewrite the following resume to be perfectly tailored for the provided job description.
    Your goal is to create a compelling, professional, and modern resume that highlights the candidate's
    most relevant skills and experiences. The output should be the full text of the new resume and nothing else.

    **Instructions:**
    1.  **Analyze the Job Description:** Identify the key skills, qualifications, and responsibilities required for the role.
    2.  **Rewrite the Summary:** Craft a powerful, concise professional summary that immediately grabs the recruiter's attention and aligns with the job's core requirements.
    3.  **Optimize Experience Bullet Points:** Rephrase the experience bullet points to use action verbs and quantify achievements. Directly map the candidate's accomplishments to the needs outlined in the job description.
    4.  **Tailor Skills Section:** Reorganize and highlight the skills that are most relevant to the job. Remove any irrelevant skills.
    5.  **Maintain Professional Tone:** Ensure the entire resume is well-written, grammatically correct, and uses a professional tone.
    6.  **Output Format:** Return ONLY the full, rewritten resume text. Do not include any introductory phrases, explanations, or markdown formatting like "Here is the rewritten resume:".

    ---
    **Original Resume:**
    ${resumeText}
    ---
    **Target Job Description:**
    ${jobDescription}
    ---

    **Rewritten Resume Text:**
  `;
}

/**
 * A direct call to the Gemini model to generate a completely rewritten resume.
 * @param resumeText The original resume text.
 * @param jobDescription The job description to tailor the resume for.
 * @returns A promise that resolves to the full text of the newly generated resume.
 */
export const generateFullResumeFromAI = async (
  resumeText: string,
  jobDescription: string
): Promise<string> => {
  try {
    const prompt = createFullResumeRewritePrompt(resumeText, jobDescription);

    console.log("Generating a full resume rewrite from AI...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });
    const text = response.text;
    console.log("Successfully received rewritten resume text from AI.");

    return text?.trim() || '';

  } catch (error) {
    console.error('Error communicating with Generative AI:', error);
    throw new Error('Failed to generate new resume with AI.');
  }
};
