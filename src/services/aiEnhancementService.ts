export interface AIEnhancementOptions {
    modelType?: string;
    model?: string;
    fileId?: string;
    // NEW: full prompt overrides (replace whole prompt if provided)
    userPromptOverride?: string;
    systemPromptOverride?: string;
}

export interface AIEnhancementRequest {
    resume_json?: any;
    job_description: string;
    api_key: string;
    model_type?: string;
    model?: string;
    file_id?: string;
}

export interface KeywordAnalysis {
    missing_keywords: string[];
    present_keywords: string[];
    keyword_density_score: number;
}

export interface SectionRecommendations {
    skills: string;
    experience: string;
    education: string;
}

export interface Analysis {
    match_score: number;
    strengths: string[];
    gaps: string[];
    suggestions: string[];
    keyword_analysis: KeywordAnalysis;
    section_recommendations: SectionRecommendations;
}

export interface CoverLetterOutline {
    opening: string;
    body: string;
    closing: string;
}

export interface Enhancements {
    enhanced_summary: string;
    enhanced_skills: string[];
    enhanced_experience_bullets: string[];
    cover_letter_outline: CoverLetterOutline;
    // Add new detailed content fields
    detailed_resume_sections: {
        professional_summary: string;
        technical_skills: string[];
        soft_skills: string[];
        experience: DetailedExperience[];
        education: DetailedEducation[];
        projects: DetailedProject[];
        certifications: DetailedCertification[];
        awards: DetailedAward[];
        volunteer_work: DetailedVolunteerWork[];
        publications: DetailedPublication[];
    };
    detailed_cover_letter: {
        opening_paragraph: string;
        body_paragraph: string;
        closing_paragraph: string;
    };
}

export interface DetailedExperience {
    company: string;
    position: string;
    duration: string;
    location: string;
    achievements: string[];
    key_responsibilities: string[];
    technologies_used: string[];
    quantified_results: string[];
}

export interface DetailedEducation {
    institution: string;
    degree: string;
    field_of_study: string;
    graduation_date: string;
    gpa?: string;
    relevant_coursework: string[];
    honors: string[];
}

export interface DetailedProject {
    name: string;
    description: string;
    technologies: string[];
    achievements: string[];
    duration: string;
    team_size?: string;
    role: string;
}

export interface DetailedCertification {
    name: string;
    issuing_organization: string;
    issue_date: string;
    expiration_date?: string;
    credential_id?: string;
}

export interface DetailedAward {
    title: string;
    issuing_organization: string;
    date: string;
    description: string;
}

export interface DetailedVolunteerWork {
    organization: string;
    role: string;
    duration: string;
    description: string;
    achievements: string[];
}

export interface DetailedPublication {
    title: string;
    publication: string;
    date: string;
    authors: string[];
    description: string;
}

// Import OpenAI with proper error handling for browser compatibility
let OpenAI: any;

// Dynamically import OpenAI only when needed in browser environment
const getOpenAIInstance = async () => {
    if (typeof window === 'undefined') {
        throw new Error('OpenAI can only be used in browser environment');
    }

    if (!OpenAI) {
        try {
            const openaiModule = await import('openai');
            OpenAI = openaiModule.default;
        } catch (error) {
            console.error('Failed to import OpenAI:', error);
            throw new Error('Failed to load OpenAI library');
        }
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('OpenAI API key is not configured. Please set NEXT_PUBLIC_OPENAI_API_KEY in your environment variables.');
    }

    return new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
    });
};

// Get API key from environment variables with proper browser compatibility
const getApiKey = (): string => {
    let apiKey = '';
    if (typeof window !== 'undefined') {
        apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
        console.log('🔍 [DEBUG] Browser environment - NEXT_PUBLIC_OPENAI_API_KEY:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT FOUND');
    } else {
        apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
        console.log('🔍 [DEBUG] Server environment - OpenAI API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT FOUND');
    }
    console.log('🔍 [DEBUG] Final API key length:', apiKey.length);
    return apiKey;
};

// Add: Get Gemini API key from environment variables for browser compatibility
const getGeminiApiKey = (): string => {
    let apiKey = '';
    if (typeof window !== 'undefined') {
        apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
        console.log('🔍 [DEBUG] Browser - NEXT_PUBLIC_GEMINI_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
    } else {
        apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
        console.log('🔍 [DEBUG] Server - GEMINI_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
    }
    return apiKey;
};

export class AIEnhancementService {
    private static readonly API_KEY = getApiKey();
    private static readonly DEFAULT_MODEL_TYPE = process.env.NEXT_PUBLIC_RESUME_API_MODEL_TYPE || 'OpenAI';
    private static readonly DEFAULT_MODEL = process.env.NEXT_PUBLIC_RESUME_API_MODEL || 'gpt-4o';

    // Helper: detect Gemini provider (supports typo "Gemnin")
    private static isGeminiProvider(modelType?: string) {
        const t = (modelType || this.DEFAULT_MODEL_TYPE || '').toLowerCase();
        return t === 'gemini' || t === 'gemnin';
    }

    // Create system prompt for AI enhancement (matching old repo pattern)
    private static createSystemPrompt(): string {
        return `You are an expert resume optimization AI assistant specializing in ATS optimization and job matching. Your task is to analyze a resume against a job description and provide comprehensive optimization recommendations.

You must respond with a valid JSON object containing the following structure:
{
  "match_score": number (0-100),
  "analysis": {
    "strengths": ["array of strengths"],
    "gaps": ["array of gaps/weaknesses"],
    "suggestions": ["array of specific improvement suggestions"],
    "keyword_analysis": {
      "missing_keywords": ["important keywords missing from resume"],
      "present_keywords": ["keywords found in resume"],
      "keyword_density_score": number (0-100)
    },
    "section_recommendations": {
      "skills": "recommendations for skills section",
      "experience": "recommendations for experience section", 
      "education": "recommendations for education section"
    }
  },
  "enhancements": {
    "enhanced_summary": "AI-improved professional summary",
    "enhanced_skills": ["prioritized technical and soft skills"],
    "enhanced_experience_bullets": ["improved bullet points with metrics"],
    "cover_letter_outline": {
      "opening": "compelling opening paragraph",
      "body": "main body content highlighting relevant experience",
      "closing": "strong closing with call to action"
    }
  }
}

Focus on:
1. ATS optimization and keyword matching
2. Quantifiable achievements and metrics
3. Industry-specific terminology
4. Proper formatting and structure
5. Tailoring content to specific job requirements`;
    }

    // Create system prompt for detailed AI enhancement
    private static createDetailedSystemPrompt(): string {
        return `You are an expert resume and cover letter writer specializing in creating comprehensive, ATS-optimized, multi-page professional documents. Your task is to analyze a resume against a job description and create detailed, enhanced content.

You must respond with a valid JSON object containing the following structure:
{
  "match_score": number (0-100),
  "analysis": {
    "strengths": ["array of specific strengths"],
    "gaps": ["array of gaps/weaknesses"],
    "suggestions": ["array of specific improvement suggestions"],
    "keyword_analysis": {
      "missing_keywords": ["important keywords missing from resume"],
      "present_keywords": ["keywords found in resume"],
      "keyword_density_score": number (0-100)
    },
    "section_recommendations": {
      "skills": "recommendations for skills section",
      "experience": "recommendations for experience section", 
      "education": "recommendations for education section"
    }
  },
  "enhancements": {
    "enhanced_summary": "2-3 sentence professional summary tailored to job",
    "enhanced_skills": ["prioritized technical and soft skills relevant to job"],
    "enhanced_experience_bullets": ["improved bullet points with metrics and achievements"],
    "detailed_resume_sections": {
      "professional_summary": "3-4 paragraph detailed professional summary highlighting relevant experience and value proposition",
      "technical_skills": ["comprehensive list of technical skills categorized by proficiency"],
      "soft_skills": ["relevant soft skills with context"],
      "experience": [
        {
          "company": "Company Name",
          "position": "Enhanced Job Title",
          "duration": "Start Date - End Date",
          "location": "City, State",
          "achievements": ["3-5 quantified achievements with metrics"],
          "key_responsibilities": ["4-6 detailed responsibilities using action verbs"],
          "technologies_used": ["relevant technologies and tools"],
          "quantified_results": ["specific numbers, percentages, dollar amounts"]
        }
      ],
      "education": [
        {
          "institution": "University Name",
          "degree": "Degree Type",
          "field_of_study": "Major/Field",
          "graduation_date": "Month Year",
          "gpa": "GPA if impressive",
          "relevant_coursework": ["courses relevant to target job"],
          "honors": ["academic honors and achievements"]
        }
      ],
      "projects": [
        {
          "name": "Project Name",
          "description": "2-3 sentence detailed description",
          "technologies": ["technologies used"],
          "achievements": ["quantified results and impact"],
          "duration": "timeframe",
          "team_size": "if applicable",
          "role": "your specific role"
        }
      ],
      "certifications": [
        {
          "name": "Certification Name",
          "issuing_organization": "Organization",
          "issue_date": "Month Year",
          "expiration_date": "Month Year if applicable",
          "credential_id": "ID if available"
        }
      ],
      "awards": [
        {
          "title": "Award Name",
          "issuing_organization": "Organization",
          "date": "Month Year",
          "description": "Brief description of achievement"
        }
      ],
      "volunteer_work": [
        {
          "organization": "Organization Name",
          "role": "Volunteer Role",
          "duration": "Start - End",
          "description": "Description of work",
          "achievements": ["measurable impact"]
        }
      ],
      "publications": [
        {
          "title": "Publication Title",
          "publication": "Journal/Conference Name",
          "date": "Month Year",
          "authors": ["author names"],
          "description": "Brief description of contribution"
        }
      ]
    },
    "detailed_cover_letter": {
      "opening_paragraph": "4-5 sentence engaging opening that mentions specific job title, company, and highlights most relevant qualification with enthusiasm",
      "body_paragraph": "8-10 sentence detailed paragraph connecting specific experiences to job requirements, using concrete examples and quantified achievements that demonstrate value to the company",
      "closing_paragraph": "3-4 sentence strong closing that reiterates interest, mentions next steps, and includes professional sign-off"
    },
    "cover_letter_outline": {
      "opening": "Brief opening guidance",
      "body": "Main body guidance",
      "closing": "Closing guidance"
    }
  }
}

Focus on:
1. Creating comprehensive, multi-page content suitable for experienced professionals
2. Using specific examples and quantified achievements
3. Incorporating job-specific keywords naturally
4. Ensuring ATS optimization while maintaining readability
5. Creating compelling narratives that connect experience to job requirements
6. Providing detailed sections that showcase full professional profile
7. Making cover letter highly personalized and compelling`;
    }

    // Create user prompt
    private static createUserPrompt(resumeText: string, jobDescription: string): string {
        return `Please analyze and optimize this resume for the given job description.

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME:
${resumeText}

Provide a comprehensive analysis and optimization following the JSON structure specified in the system prompt. Make sure all recommendations are specific, actionable, and tailored to this exact job posting.`;
    }

    // Create detailed user prompt (kept for reference/compat)
    private static createDetailedUserPrompt(resumeText: string, jobDescription: string): string {
        return `Please analyze and create detailed, comprehensive enhanced content for this resume and a personalized cover letter for the given job description.

        Create a comprehensive analysis and detailed enhanced content following the JSON structure. The enhanced resume should be suitable for a multi-page document with detailed sections. The cover letter should have two substantial paragraphs that create a compelling narrative connecting the candidate's experience to the job requirements.

Make sure all content is:
1. Highly detailed and professional
2. Tailored specifically to the job posting
3. Includes quantified achievements where possible
4. Uses industry-specific terminology
5. Optimized for ATS systems
6. Creates a compelling narrative for the candidate

Use this for context:
JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME:
${resumeText}`;
    }

    // NEW: header-only template (editable part in UI)
    private static createDetailedUserPromptHeader(): string {
        return `Please analyze and create detailed, comprehensive enhanced content for this resume and a personalized cover letter for the given job description.

Create a comprehensive analysis and detailed enhanced content following the JSON structure. The enhanced resume should be suitable for a multi-page document with detailed sections. The cover letter should have two substantial paragraphs that create a compelling narrative connecting the candidate's experience to the job requirements.

Make sure all content is:
1. Highly detailed and professional
2. Tailored specifically to the job posting
3. Includes quantified achievements where possible
4. Uses industry-specific terminology
5. Optimized for ATS systems
6. Creates a compelling narrative for the candidate`;
    }

    // NEW: public alias used by UI to get the default "user" prompt header (no context block)
    static createUserSystemPrompt(_resumeText: string, _jobDescription: string): string {
        return this.createDetailedUserPromptHeader();
    }

    // Helper to compose final user prompt (header + fixed context)
    private static buildFinalUserPrompt(header: string, resumeText: string, jobDescription: string): string {
        const hdr = (header || '').trim();
        return `${hdr}

Use this for context:
JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME:
${resumeText}`;
    }

    // Enhanced resume analysis using OpenAI directly (like AiJobSearch-old)
    static async enhanceWithOpenAI(
        resumeText: string,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        // Route to Gemini if requested (supports "Gemini" and "Gemnin")
        if (this.isGeminiProvider(options.modelType)) {
            return this.enhanceWithGemini(resumeText, jobDescription, options);
        }

        try {
            console.log('Starting detailed OpenAI resume enhancement...');

            const openai = await getOpenAIInstance();

            // Use strict overrides when provided, and ALWAYS append fixed context
            const systemContent =
                options.systemPromptOverride ?? this.createDetailedSystemPrompt();
            const userHeader =
                options.userPromptOverride ?? this.createDetailedUserPromptHeader();
            const userContent = this.buildFinalUserPrompt(userHeader, resumeText, jobDescription);

            const completion = await openai.chat.completions.create({
                model: options.model || this.DEFAULT_MODEL,
                messages: [
                    { role: 'system', content: systemContent },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.7,
                max_tokens: 6000,
                response_format: { type: 'json_object' }
            });

            const responseText = completion.choices[0]?.message?.content;
            if (!responseText) {
                throw new Error('No response from OpenAI');
            }

            console.log('OpenAI detailed response received, parsing...');
            const aiResults = JSON.parse(responseText);

            // Transform to our expected format with detailed content
            const enhancementResponse: AIEnhancementResponse = {
                success: true,
                analysis: {
                    match_score: aiResults.match_score || 0,
                    strengths: aiResults.analysis?.strengths || [],
                    gaps: aiResults.analysis?.gaps || [],
                    suggestions: aiResults.analysis?.suggestions || [],
                    keyword_analysis: {
                        missing_keywords: aiResults.analysis?.keyword_analysis?.missing_keywords || [],
                        present_keywords: aiResults.analysis?.keyword_analysis?.present_keywords || [],
                        keyword_density_score: aiResults.analysis?.keyword_analysis?.keyword_density_score || 0
                    },
                    section_recommendations: {
                        skills: aiResults.analysis?.section_recommendations?.skills || '',
                        experience: aiResults.analysis?.section_recommendations?.experience || '',
                        education: aiResults.analysis?.section_recommendations?.education || ''
                    }
                },
                enhancements: {
                    enhanced_summary: aiResults.enhancements?.enhanced_summary || '',
                    enhanced_skills: aiResults.enhancements?.enhanced_skills || [],
                    enhanced_experience_bullets: aiResults.enhancements?.enhanced_experience_bullets || [],
                    cover_letter_outline: {
                        opening: aiResults.enhancements?.cover_letter_outline?.opening || '',
                        body: aiResults.enhancements?.cover_letter_outline?.body || '',
                        closing: aiResults.enhancements?.cover_letter_outline?.closing || ''
                    },
                    // Add detailed content
                    detailed_resume_sections: aiResults.enhancements?.detailed_resume_sections || {},
                    detailed_cover_letter: aiResults.enhancements?.detailed_cover_letter || {}
                },
                metadata: {
                    model_used: options.model || this.DEFAULT_MODEL,
                    model_type: options.modelType || this.DEFAULT_MODEL_TYPE,
                    timestamp: new Date().toISOString(),
                    resume_sections_analyzed: ['summary', 'experience', 'skills', 'education', 'projects', 'certifications', 'awards', 'volunteer', 'publications']
                },
                file_id: options.fileId || `enhance_${Date.now()}`
            };

            console.log('OpenAI detailed enhancement completed successfully');
            return enhancementResponse;

        } catch (error: any) {
            console.error('OpenAI enhancement failed:', error);

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

            throw new Error(`AI enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // New: Enhance resume using Google Gemini API
    private static async enhanceWithGemini(
        resumeText: string,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        try {
            console.log('Starting detailed Gemini resume enhancement...');

            const apiKey = getGeminiApiKey();
            if (!apiKey) {
                throw new Error('Gemini API key is not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY in your environment variables.');
            }

            const modelId = options.model || this.DEFAULT_MODEL || 'gemini-2.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`;

            // Use strict overrides when provided, and ALWAYS append fixed context
            const systemContent =
                options.systemPromptOverride ?? this.createDetailedSystemPrompt();
            const userHeader =
                options.userPromptOverride ?? this.createDetailedUserPromptHeader();
            const userContent = this.buildFinalUserPrompt(userHeader, resumeText, jobDescription);

            // Combine system and user prompts into a single user message for Gemini
            const payload = {
                contents: [
                    {
                        parts: [
                            { text: `${systemContent}\n\n${userContent}` }
                        ]
                    }
                ]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new Error(`Gemini API error ${response.status}: ${errText || response.statusText}`);
            }

            const data = await response.json();
            const responseText =
                data?.candidates?.[0]?.content?.parts?.[0]?.text ||
                data?.candidates?.[0]?.output_text ||
                '';

            if (!responseText) {
                throw new Error('No response from Gemini');
            }

            console.log('Gemini detailed response received, parsing...');
            let aiResults: any;
            try {
                aiResults = JSON.parse(responseText);
            } catch (e) {
                // Attempt to extract JSON substring as a fallback
                const start = responseText.indexOf('{');
                const end = responseText.lastIndexOf('}');
                if (start !== -1 && end !== -1 && end > start) {
                    aiResults = JSON.parse(responseText.slice(start, end + 1));
                } else {
                    throw new Error('Failed to parse AI response. Please try again.');
                }
            }

            const enhancementResponse: AIEnhancementResponse = {
                success: true,
                analysis: {
                    match_score: aiResults.match_score || 0,
                    strengths: aiResults.analysis?.strengths || [],
                    gaps: aiResults.analysis?.gaps || [],
                    suggestions: aiResults.analysis?.suggestions || [],
                    keyword_analysis: {
                        missing_keywords: aiResults.analysis?.keyword_analysis?.missing_keywords || [],
                        present_keywords: aiResults.analysis?.keyword_analysis?.present_keywords || [],
                        keyword_density_score: aiResults.analysis?.keyword_analysis?.keyword_density_score || 0
                    },
                    section_recommendations: {
                        skills: aiResults.analysis?.section_recommendations?.skills || '',
                        experience: aiResults.analysis?.section_recommendations?.experience || '',
                        education: aiResults.analysis?.section_recommendations?.education || ''
                    }
                },
                enhancements: {
                    enhanced_summary: aiResults.enhancements?.enhanced_summary || '',
                    enhanced_skills: aiResults.enhancements?.enhanced_skills || [],
                    enhanced_experience_bullets: aiResults.enhancements?.enhanced_experience_bullets || [],
                    cover_letter_outline: {
                        opening: aiResults.enhancements?.cover_letter_outline?.opening || '',
                        body: aiResults.enhancements?.cover_letter_outline?.body || '',
                        closing: aiResults.enhancements?.cover_letter_outline?.closing || ''
                    },
                    detailed_resume_sections: aiResults.enhancements?.detailed_resume_sections || {},
                    detailed_cover_letter: aiResults.enhancements?.detailed_cover_letter || {}
                },
                metadata: {
                    model_used: modelId,
                    model_type: options.modelType || this.DEFAULT_MODEL_TYPE || 'Gemini',
                    timestamp: new Date().toISOString(),
                    resume_sections_analyzed: ['summary', 'experience', 'skills', 'education', 'projects', 'certifications', 'awards', 'volunteer', 'publications']
                },
                file_id: options.fileId || `enhance_${Date.now()}`
            };

            console.log('Gemini detailed enhancement completed successfully');
            return enhancementResponse;
        } catch (error: any) {
            console.error('Gemini enhancement failed:', error);

            if (error instanceof Error) {
                if (error.message.includes('API key') || error.message.includes('401')) {
                    throw new Error('Gemini API key is missing or invalid. Please check your configuration.');
                } else if (error.message.includes('quota') || error.message.includes('429')) {
                    throw new Error('Gemini API quota exceeded. Please check your usage limits.');
                } else if (error.message.includes('JSON')) {
                    throw new Error('Failed to parse AI response. Please try again.');
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    throw new Error('Network error. Please check your internet connection and try again.');
                }
            }

            throw new Error(`AI enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Enhance resume with file upload (fallback to backend if needed)
    static async enhanceWithFile(
        file: File,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        try {
            // First try to extract text from file and use OpenAI directly
            const { extractTextFromPDF } = await import('../utils/pdfUtils');
            const extractionResult = await extractTextFromPDF(file);

            if (extractionResult.text && extractionResult.text.length > 50) {
                console.log('Using extracted text with AI directly...');
                // Route via enhanceWithOpenAI, which now dispatches to Gemini when needed
                return await this.enhanceWithOpenAI(extractionResult.text, jobDescription, options);
            } else {
                throw new Error('Unable to extract sufficient text from file');
            }
        } catch (error: any) {
            console.error('Error in AI enhancement with file:', error);

            if (error.name === 'AbortError') {
                throw new Error('AI enhancement timed out. The analysis is taking longer than expected. Please try again.');
            }

            if (error.message.includes('Failed to fetch')) {
                throw new Error('Unable to connect to the AI enhancement service. Please check your internet connection and try again.');
            }

            throw new Error(error.message || 'Failed to enhance resume with AI');
        }
    }

    // Enhance resume with JSON data using OpenAI directly
    static async enhanceWithJson(
        resumeJson: any,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        try {
            // Convert JSON resume data to text format for OpenAI
            let resumeText = '';

            if (resumeJson.personal) {
                resumeText += `PERSONAL INFORMATION:\n`;
                resumeText += `Name: ${resumeJson.personal.name || ''}\n`;
                resumeText += `Email: ${resumeJson.personal.email || ''}\n`;
                resumeText += `Phone: ${resumeJson.personal.phone || ''}\n`;
                resumeText += `Location: ${resumeJson.personal.location || ''}\n\n`;
            }

            if (resumeJson.summary) {
                resumeText += `PROFESSIONAL SUMMARY:\n${resumeJson.summary}\n\n`;
            }

            if (resumeJson.experience && Array.isArray(resumeJson.experience)) {
                resumeText += `WORK EXPERIENCE:\n`;
                resumeJson.experience.forEach((exp: any) => {
                    resumeText += `${exp.position || ''} at ${exp.company || ''} (${exp.duration || ''})\n`;
                    if (exp.description) resumeText += `${exp.description}\n`;
                    if (exp.achievements && Array.isArray(exp.achievements)) {
                        exp.achievements.forEach((achievement: string) => {
                            resumeText += `• ${achievement}\n`;
                        });
                    }
                    resumeText += '\n';
                });
            }

            if (resumeJson.education && Array.isArray(resumeJson.education)) {
                resumeText += `EDUCATION:\n`;
                resumeJson.education.forEach((edu: any) => {
                    resumeText += `${edu.degree || ''} from ${edu.institution || ''} (${edu.year || ''})\n`;
                });
                resumeText += '\n';
            }

            if (resumeJson.skills) {
                resumeText += `SKILLS:\n`;
                if (Array.isArray(resumeJson.skills)) {
                    resumeText += resumeJson.skills.join(', ') + '\n';
                } else if (typeof resumeJson.skills === 'object') {
                    Object.entries(resumeJson.skills).forEach(([category, skills]) => {
                        if (Array.isArray(skills)) {
                            resumeText += `${category}: ${skills.join(', ')}\n`;
                        }
                    });
                }
            }

            console.log('Using JSON resume data with AI directly...');
            // Route via enhanceWithOpenAI, which now dispatches to Gemini when needed
            return await this.enhanceWithOpenAI(resumeText, jobDescription, options);

        } catch (error: any) {
            console.error('Error in AI enhancement with JSON:', error);

            if (error.name === 'AbortError') {
                throw new Error('AI enhancement timed out. The analysis is taking longer than expected. Please try again.');
            }

            if (error.message.includes('Failed to fetch')) {
                throw new Error('Unable to connect to the AI enhancement service. Please check your internet connection and try again.');
            }

            throw new Error(error.message || 'Failed to enhance resume with AI');
        }
    }

    // Get current configuration for debugging
    static getConfiguration() {
        return {
            hasApiKey: !!this.API_KEY,
            hasGeminiApiKey: !!getGeminiApiKey(),
            defaultModelType: this.DEFAULT_MODEL_TYPE,
            defaultModel: this.DEFAULT_MODEL
        };
    }

    // Validate enhancement request
    static validateEnhancementRequest(jobDescription: string, resumeData?: any): { isValid: boolean; error?: string } {
        if (!jobDescription || jobDescription.trim().length === 0) {
            return {
                isValid: false,
                error: 'Job description is required for AI enhancement'
            };
        }

        if (jobDescription.trim().length < 50) {
            return {
                isValid: false,
                error: 'Job description is too short. Please provide a more detailed job description (at least 50 characters).'
            };
        }

        if (resumeData && typeof resumeData !== 'object') {
            return {
                isValid: false,
                error: 'Resume data must be a valid object'
            };
        }

        return { isValid: true };
    }

    // Parse and normalize enhancement response
    static normalizeEnhancementResponse(response: any): AIEnhancementResponse {
        try {
            // Ensure all required fields exist with defaults
            return {
                success: response.success || false,
                analysis: {
                    match_score: response.analysis?.match_score || 0,
                    strengths: Array.isArray(response.analysis?.strengths) ? response.analysis.strengths : [],
                    gaps: Array.isArray(response.analysis?.gaps) ? response.analysis.gaps : [],
                    suggestions: Array.isArray(response.analysis?.suggestions) ? response.analysis.suggestions : [],
                    keyword_analysis: {
                        missing_keywords: Array.isArray(response.analysis?.keyword_analysis?.missing_keywords)
                            ? response.analysis.keyword_analysis.missing_keywords : [],
                        present_keywords: Array.isArray(response.analysis?.keyword_analysis?.present_keywords)
                            ? response.analysis.keyword_analysis.present_keywords : [],
                        keyword_density_score: response.analysis?.keyword_analysis?.keyword_density_score || 0
                    },
                    section_recommendations: {
                        skills: response.analysis?.section_recommendations?.skills || '',
                        experience: response.analysis?.section_recommendations?.experience || '',
                        education: response.analysis?.section_recommendations?.education || ''
                    }
                },
                enhancements: {
                    enhanced_summary: response.enhancements?.enhanced_summary || '',
                    enhanced_skills: Array.isArray(response.enhancements?.enhanced_skills)
                        ? response.enhancements.enhanced_skills : [],
                    enhanced_experience_bullets: Array.isArray(response.enhancements?.enhanced_experience_bullets)
                        ? response.enhancements.enhanced_experience_bullets : [],
                    cover_letter_outline: {
                        opening: response.enhancements?.cover_letter_outline?.opening || '',
                        body: response.enhancements?.cover_letter_outline?.body || '',
                        closing: response.enhancements?.cover_letter_outline?.closing || ''
                    },
                    detailed_resume_sections: response.enhancements?.detailed_resume_sections || {},
                    detailed_cover_letter: response.enhancements?.detailed_cover_letter || {}
                },
                metadata: {
                    model_used: response.metadata?.model_used || 'gpt-4o',
                    model_type: response.metadata?.model_type || 'OpenAI',
                    timestamp: response.metadata?.timestamp || new Date().toISOString(),
                    resume_sections_analyzed: Array.isArray(response.metadata?.resume_sections_analyzed)
                        ? response.metadata.resume_sections_analyzed : []
                },
                file_id: response.file_id || `enhance_${Date.now()}`,
                error: response.error,
                message: response.message
            };
        } catch (error) {
            console.error('Error normalizing enhancement response:', error);
            throw new Error('Failed to process AI enhancement response');
        }
    }
}

export interface AIEnhancementMetadata {
    model_used: string;
    model_type: string;
    timestamp: string;
    resume_sections_analyzed: string[];
}

export interface AIEnhancementResponse {
    success: boolean;
    analysis: Analysis;
    enhancements: Enhancements;
    metadata: AIEnhancementMetadata;
    file_id: string;
    error?: string;
    message?: string;
}
