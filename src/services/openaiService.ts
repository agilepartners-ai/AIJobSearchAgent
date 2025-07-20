import OpenAI from 'openai';

// Get API key from environment variables with proper browser compatibility
const getApiKey = (): string => {
    // For client-side, we need to use VITE_ prefix
    if (typeof window !== 'undefined') {
        // Browser environment
        return import.meta.env?.VITE_OPENAI_API_KEY ||
            (window as any).__OPENAI_API_KEY__ ||
            '';
    } else {
        // Server environment (if using SSR)
        return process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
    }
};

const openai = new OpenAI({
    apiKey: getApiKey(),
    dangerouslyAllowBrowser: true // Only for client-side usage
});

export interface ResumeOptimizationRequest {
    resumeText: string;
    jobDescription: string;
    applicantData?: {
        name?: string;
        email?: string; // This should be the real email from authentication
        phone?: string;
        location?: string;
    };
}

export interface AIOptimizationResults {
    matchScore: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    suggestions: string[];
    keywordAnalysis: {
        coverageScore: number;
        coveredKeywords: string[];
        missingKeywords: string[];
    };
    experienceOptimization: {
        company: string;
        position: string;
        relevanceScore: number;
        included: boolean;
        reasoning: string;
    }[];
    skillsOptimization: {
        technicalSkills: string[];
        softSkills: string[];
        missingSkills: string[];
    };
    aiEnhancements: {
        enhancedSummary: string;
        enhancedExperienceBullets: string[];
        coverLetterOutline: {
            opening: string;
            body: string;
            closing: string;
        };
        sectionRecommendations: {
            skills: string;
            experience: string;
            education: string;
        };
    };
    optimizedResumeText: string;
}

export interface GenerateResumeRequest {
    personalInfo: {
        name: string;
        email: string;
        phone: string;
        location: string;
        title: string;
    };
    experience: Array<{
        company: string;
        position: string;
        duration: string;
        description: string;
    }>;
    education: Array<{
        institution: string;
        degree: string;
        year: string;
    }>;
    skills: string[];
    jobDescription?: string;
    resumeType: 'professional' | 'creative' | 'technical';
}

export interface GenerateCoverLetterRequest {
    personalInfo: {
        name: string;
        email: string;
        phone: string;
        location: string;
    };
    jobDetails: {
        company: string;
        position: string;
        jobDescription: string;
    };
    experience: string;
    skills: string[];
    tone: 'professional' | 'enthusiastic' | 'creative';
}

export interface GeneratedResumeContent {
    summary: string;
    experience: Array<{
        company: string;
        position: string;
        duration: string;
        description: string;
        achievements: string[];
    }>;
    skills: {
        technical: string[];
        soft: string[];
        tools: string[];
    };
    additionalSections: {
        certifications: string[];
        projects: Array<{
            name: string;
            description: string;
            technologies?: string[];
        }>;
    };
}

export interface GeneratedCoverLetter {
    content: string;
    sections: {
        opening: string;
        body: string[];
        closing: string;
    };
}

export class OpenAIResumeOptimizer {
    private static createSystemPrompt(): string {
        return `You are an expert resume optimization AI assistant specializing in ATS optimization and job matching. Your task is to analyze a resume against a job description and provide comprehensive optimization recommendations.

You must respond with a valid JSON object containing the following structure:
{
  "matchScore": number (0-100),
  "summary": "string - overall assessment",
  "strengths": ["array of strengths"],
  "gaps": ["array of gaps/weaknesses"],
  "suggestions": ["array of specific improvement suggestions"],
  "keywordAnalysis": {
    "coverageScore": number (0-100),
    "coveredKeywords": ["keywords found in resume"],
    "missingKeywords": ["important keywords missing from resume"]
  },
  "experienceOptimization": [
    {
      "company": "string",
      "position": "string", 
      "relevanceScore": number (0-100),
      "included": boolean,
      "reasoning": "string"
    }
  ],
  "skillsOptimization": {
    "technicalSkills": ["prioritized technical skills"],
    "softSkills": ["prioritized soft skills"],
    "missingSkills": ["skills to add"]
  },
  "aiEnhancements": {
    "enhancedSummary": "AI-improved professional summary",
    "enhancedExperienceBullets": ["improved bullet points"],
    "coverLetterOutline": {
      "opening": "cover letter opening paragraph",
      "body": "cover letter body content",
      "closing": "cover letter closing paragraph"
    },
    "sectionRecommendations": {
      "skills": "recommendations for skills section",
      "experience": "recommendations for experience section", 
      "education": "recommendations for education section"
    }
  },
  "optimizedResumeText": "complete optimized resume text"
}

Focus on:
1. ATS optimization and keyword matching
2. Quantifiable achievements and metrics
3. Industry-specific terminology
4. Proper formatting and structure
5. Tailoring content to specific job requirements`;
    }

    private static createUserPrompt(resumeText: string, jobDescription: string): string {
        return `Please analyze and optimize this resume for the given job description.

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME:
${resumeText}

Provide a comprehensive analysis and optimization following the JSON structure specified in the system prompt. Make sure all recommendations are specific, actionable, and tailored to this exact job posting.`;
    }

    static async optimizeResume(request: ResumeOptimizationRequest): Promise<AIOptimizationResults> {
        try {
            // Check if API key is available
            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error('OpenAI API key is not configured. Please add your API key to the environment variables.');
            }

            console.log('Starting OpenAI resume optimization...');

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: this.createSystemPrompt()
                    },
                    {
                        role: 'user',
                        content: this.createUserPrompt(request.resumeText, request.jobDescription)
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000,
                response_format: { type: 'json_object' }
            });

            const responseText = completion.choices[0]?.message?.content;
            if (!responseText) {
                throw new Error('No response from OpenAI');
            }

            console.log('OpenAI response received, parsing...');
            const aiResults = JSON.parse(responseText) as AIOptimizationResults;

            // Validate required fields
            if (typeof aiResults.matchScore !== 'number' || !aiResults.summary) {
                throw new Error('Invalid response structure from OpenAI');
            }

            console.log('OpenAI optimization completed successfully');
            return aiResults;

        } catch (error) {
            console.error('OpenAI optimization failed:', error);

            if (error instanceof Error) {
                if (error.message.includes('API key') || error.message.includes('401')) {
                    throw new Error('OpenAI API key is missing or invalid. Please check your configuration.');
                } else if (error.message.includes('quota') || error.message.includes('429')) {
                    throw new Error('OpenAI API quota exceeded. Please check your usage limits.');
                } else if (error.message.includes('JSON')) {
                    throw new Error('Failed to parse AI response. Please try again.');
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    throw new Error('Network error. Please check your internet connection and try again.');
                }
            }

            throw new Error(`AI optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async generateCoverLetter(
        resumeText: string,
        jobDescription: string,
        applicantData: ResumeOptimizationRequest['applicantData']
    ): Promise<string> {
        try {
            // Check if API key is available
            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error('OpenAI API key is not configured. Please add your API key to the environment variables.');
            }

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert cover letter writer. Create a professional, compelling cover letter that highlights the candidate's relevant experience and aligns with the job requirements.`
                    },
                    {
                        role: 'user',
                        content: `Create a professional cover letter for this job application.

APPLICANT INFO:
Name: ${applicantData?.name || 'Applicant'}
Email: ${applicantData?.email || 'applicant@email.com'} 
Phone: ${applicantData?.phone || ''}
Location: ${applicantData?.location || ''}

JOB DESCRIPTION:
${jobDescription}

RESUME CONTENT:
${resumeText}

Generate a compelling cover letter that uses the applicant's real name and email address provided above.`
                    }
                ],
                temperature: 0.8,
                max_tokens: 1000
            });

            return completion.choices[0]?.message?.content || 'Failed to generate cover letter';
        } catch (error) {
            console.error('Cover letter generation failed:', error);
            throw new Error('Failed to generate cover letter using AI');
        }
    }

    static async generateResumeContent(request: GenerateResumeRequest): Promise<GeneratedResumeContent> {
        try {
            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error('OpenAI API key is not configured. Please add your API key to the environment variables.');
            }

            const systemPrompt = `You are a professional resume writer with expertise in ATS optimization and modern hiring practices. Create enhanced resume content based on the provided information.

You must respond with a valid JSON object containing:
{
  "summary": "Professional summary text (2-3 sentences)",
  "experience": [
    {
      "company": "Company Name",
      "position": "Position Title", 
      "duration": "Duration",
      "description": "Enhanced description with achievements and metrics",
      "achievements": ["achievement 1", "achievement 2"]
    }
  ],
  "skills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"], 
    "tools": ["tool1", "tool2"]
  },
  "additionalSections": {
    "certifications": ["cert1", "cert2"],
    "projects": [
      {
        "name": "Project Name",
        "description": "Project description",
        "technologies": ["tech1", "tech2"]
      }
    ]
  }
}`;

            const userPrompt = `Generate enhanced resume content based on the following information:

Personal Information:
- Name: ${request.personalInfo.name}
- Email: ${request.personalInfo.email}
- Phone: ${request.personalInfo.phone}
- Location: ${request.personalInfo.location}
- Title: ${request.personalInfo.title}

Experience:
${request.experience.map(exp => `
- ${exp.position} at ${exp.company} (${exp.duration})
  ${exp.description}
`).join('')}

Education:
${request.education.map(edu => `
- ${edu.degree} from ${edu.institution} (${edu.year})
`).join('')}

Skills: ${request.skills.join(', ')}

${request.jobDescription ? `Target Job Description: ${request.jobDescription}` : ''}

Resume Type: ${request.resumeType}

Please generate:
1. A compelling professional summary (2-3 sentences)
2. Enhanced experience descriptions that are ATS-friendly and highlight achievements
3. A refined skills section organized by category
4. Additional sections that would strengthen this resume`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2000,
                response_format: { type: 'json_object' }
            });

            const responseText = completion.choices[0]?.message?.content;
            if (!responseText) {
                throw new Error('No response from OpenAI');
            }

            const result = JSON.parse(responseText) as GeneratedResumeContent;
            return result;

        } catch (error) {
            console.error('Resume content generation failed:', error);
            throw new Error(`Failed to generate resume content: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async generateCoverLetterContent(request: GenerateCoverLetterRequest): Promise<GeneratedCoverLetter> {
        try {
            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error('OpenAI API key is not configured. Please add your API key to the environment variables.');
            }

            const systemPrompt = `You are a professional cover letter writer with expertise in crafting compelling, personalized cover letters that get results. Always respond with valid JSON.

You must respond with a valid JSON object containing:
{
  "content": "Full cover letter content with proper formatting",
  "sections": {
    "opening": "Opening paragraph",
    "body": ["Body paragraph 1", "Body paragraph 2"],
    "closing": "Closing paragraph"
  }
}`;

            const userPrompt = `Generate a compelling cover letter based on the following information:

Personal Information:
- Name: ${request.personalInfo.name}
- Email: ${request.personalInfo.email}
- Phone: ${request.personalInfo.phone}
- Location: ${request.personalInfo.location}

Job Details:
- Company: ${request.jobDetails.company}
- Position: ${request.jobDetails.position}
- Job Description: ${request.jobDetails.jobDescription}

Experience Summary: ${request.experience}
Key Skills: ${request.skills.join(', ')}
Tone: ${request.tone}

Please generate a professional cover letter that:
1. Has a compelling opening that shows enthusiasm for the specific role
2. Highlights relevant experience and achievements that match the job requirements
3. Demonstrates knowledge of the company and role
4. Includes specific examples and metrics where possible
5. Has a strong closing with a call to action
6. Maintains a ${request.tone} tone throughout`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1500,
                response_format: { type: 'json_object' }
            });

            const responseText = completion.choices[0]?.message?.content;
            if (!responseText) {
                throw new Error('No response from OpenAI');
            }

            const result = JSON.parse(responseText) as GeneratedCoverLetter;
            return result;

        } catch (error) {
            console.error('Cover letter generation failed:', error);
            throw new Error(`Failed to generate cover letter: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
