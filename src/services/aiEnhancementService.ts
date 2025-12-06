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

// Add: canonical section type for dynamic prompting
type CanonicalSection =
    | 'skills'
    | 'experience'
    | 'education'
    | 'projects'
    | 'certifications'
    | 'awards'
    | 'volunteer_work'
    | 'publications';

// Import the new unified Google GenAI SDK for Vertex AI
import { GoogleGenAI } from '@google/genai';

// NOTE: google-auth-library is NOT imported here to avoid webpack bundling issues
// It's only used internally by @google/genai SDK on the server-side

// OpenAI has been removed from the frontend. Provide a local stub
// implementation that preserves the public API surface and response
// shapes so the UI flow remains intact.

// NOTE: We intentionally avoid importing the OpenAI SDK anywhere in
// the frontend. The methods below return deterministic, typed
// fallback responses.

const getApiKey = (): string => '';

// Vertex AI Configuration - Industry Standard with Regional Endpoints
// Uses the new unified @google/genai SDK with vertexai: true
// NO FALLBACK - Vertex AI is the only supported backend
let _hasLoggedVertexAIConfig = false;
let cachedVertexAIClient: GoogleGenAI | null = null;
let vertexAIInitError: string | null = null;

// Get Vertex AI client (singleton pattern for efficiency)
// This function ONLY supports Vertex AI - no fallback to Gemini API
const getVertexAIClient = (): GoogleGenAI => {
    // Return cached client if already initialized
    if (cachedVertexAIClient !== null) {
        return cachedVertexAIClient;
    }
    
    // If we've already tried and failed, throw the cached error
    if (vertexAIInitError !== null) {
        throw new Error(vertexAIInitError);
    }
    
    try {
        const project = process.env.NEXT_PUBLIC_VERTEX_AI_PROJECT || '';
        const location = process.env.NEXT_PUBLIC_VERTEX_AI_LOCATION || 'global';
        
        // Validate required configuration
        if (!project) {
            vertexAIInitError = 'Vertex AI Project ID is not configured. Please set NEXT_PUBLIC_VERTEX_AI_PROJECT in your environment variables.';
            console.error('❌ [Vertex AI] ' + vertexAIInitError);
            throw new Error(vertexAIInitError);
        }
        
        // Validate location format
        const validLocations = ['global', 'us-central1', 'us-east1', 'us-west1', 'europe-west1', 'europe-west4', 'asia-east1', 'asia-northeast1', 'asia-southeast1'];
        if (!validLocations.includes(location) && !location.match(/^[a-z]+-[a-z]+\d+$/)) {
            console.warn(`⚠️ [Vertex AI] Unusual location "${location}". Expected one of: ${validLocations.join(', ')} or a valid region format.`);
        }
        
        // Browser environment check - Vertex AI requires server-side execution
        if (typeof window !== 'undefined') {
            vertexAIInitError = 'Vertex AI can only be used in server-side environments (API routes, SSR). Please ensure AI enhancement requests are made through an API route, not directly from the browser.';
            console.error('❌ [Vertex AI] ' + vertexAIInitError);
            throw new Error(vertexAIInitError);
        }
        
        // Get service account credentials
        const clientEmail = process.env.VERTEX_AI_CLIENT_EMAIL;
        let privateKey = process.env.VERTEX_AI_PRIVATE_KEY;
        
        if (!clientEmail || !privateKey) {
            vertexAIInitError = 'Vertex AI service account credentials are missing. Please set VERTEX_AI_CLIENT_EMAIL and VERTEX_AI_PRIVATE_KEY in your environment variables.';
            console.error('❌ [Vertex AI] ' + vertexAIInitError);
            throw new Error(vertexAIInitError);
        }

        // Fix private key format if needed (replace literal \n with actual newlines)
        // Also handle double escaped newlines just in case
        if (privateKey.includes('\\n')) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }
        if (privateKey.includes('\\\\n')) {
            privateKey = privateKey.replace(/\\\\n/g, '\n');
        }
        
        // Ensure the key has proper BEGIN/END markers if they were stripped or malformed
        if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            // If it looks like just the base64 part, wrap it
            if (!privateKey.includes('-----')) {
                privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
            }
        } else {
            // Ensure there are newlines after BEGIN and before END if they are missing
            // This is critical for JWT signature validation
            const beginMarker = '-----BEGIN PRIVATE KEY-----';
            const endMarker = '-----END PRIVATE KEY-----';
            
            if (privateKey.includes(beginMarker) && !privateKey.includes(beginMarker + '\n')) {
                privateKey = privateKey.replace(beginMarker, beginMarker + '\n');
            }
            
            if (privateKey.includes(endMarker) && !privateKey.includes('\n' + endMarker)) {
                privateKey = privateKey.replace(endMarker, '\n' + endMarker);
            }
        }
        
        // Create a temporary credentials file content for Google Auth
        // We'll use GOOGLE_APPLICATION_CREDENTIALS environment variable approach
        const credentialsJson = JSON.stringify({
            type: 'service_account',
            project_id: project,
            private_key_id: 'vertex-ai-key',
            private_key: privateKey,
            client_email: clientEmail,
            client_id: '',
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        });
        
        // Write credentials to a temporary file
        // This is the most reliable way to make Google Auth library pick up credentials
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        
        const tempDir = os.tmpdir();
        const credsFilePath = path.join(tempDir, `vertex-ai-creds-${Date.now()}.json`);
        
        try {
            fs.writeFileSync(credsFilePath, credentialsJson);
            process.env.GOOGLE_APPLICATION_CREDENTIALS = credsFilePath;
            console.log(`🔐 [Vertex AI] Credentials written to temp file: ${credsFilePath}`);
        } catch (err) {
            console.error('❌ [Vertex AI] Failed to write credentials file:', err);
            // Fallback to JSON env var if file write fails
            process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = credentialsJson;
        }
        
        // Server-side environment - Initialize Vertex AI with service account
        cachedVertexAIClient = new GoogleGenAI({
            vertexai: true,
            project: project,
            location: location,
            // Pass googleAuthOptions as a fallback if the env var isn't picked up automatically
            googleAuthOptions: {
                credentials: {
                    client_email: clientEmail,
                    private_key: privateKey,
                },
                projectId: project,
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            }
        });
        
        if (!_hasLoggedVertexAIConfig) {
            console.log(`🚀 [Vertex AI] Initialized successfully - Project: ${project}, Location: ${location}`);
            _hasLoggedVertexAIConfig = true;
        }
        
        return cachedVertexAIClient;
    } catch (error: any) {
        // Capture and cache the error for future calls
        if (!vertexAIInitError) {
            vertexAIInitError = error?.message || 'Unknown error initializing Vertex AI client';
        }
        console.error('❌ [Vertex AI] Failed to initialize client:', error);
        throw new Error(`Vertex AI initialization failed: ${vertexAIInitError}`);
    }
};

// Reset Vertex AI client (useful for testing or re-initialization)
const resetVertexAIClient = (): void => {
    cachedVertexAIClient = null;
    vertexAIInitError = null;
    _hasLoggedVertexAIConfig = false;
};

export class AIEnhancementService {
    private static readonly API_KEY = getApiKey();
    private static readonly DEFAULT_MODEL_TYPE = process.env.NEXT_PUBLIC_RESUME_API_MODEL_TYPE || 'Stub';
    private static readonly DEFAULT_MODEL = process.env.NEXT_PUBLIC_RESUME_API_MODEL || 'stub-model';
    
    // Retry configuration
    private static readonly MAX_RETRIES = 8;
    private static readonly INITIAL_RETRY_DELAY = 1000; // 1 second
    private static readonly MAX_RETRY_DELAY = 60000; // 60 seconds

    // Helper: detect Gemini provider (supports typo "Gemnin")
    private static isGeminiProvider(modelType?: string) {
        const t = (modelType || this.DEFAULT_MODEL_TYPE || '').toLowerCase();
        return t === 'gemini' || t === 'gemnin';
    }

    /**
     * Exponential backoff retry helper with jitter
     * Retries API calls with exponentially increasing delays
     */
    private static async retryWithBackoff<T>(
        fn: () => Promise<T>,
        retryCount = 0
    ): Promise<T> {
        try {
            return await fn();
        } catch (error: any) {
            // Check if error is retryable (503, 429, network errors)
            const isRetryable = 
                error.message?.includes('503') || 
                error.message?.includes('UNAVAILABLE') ||
                error.message?.includes('overloaded') ||
                error.message?.includes('429') ||
                error.message?.includes('Too Many Requests') ||
                error.message?.includes('RESOURCE_EXHAUSTED') ||
                error.message?.includes('Failed to fetch') ||
                error.message?.includes('NetworkError');

            if (!isRetryable || retryCount >= this.MAX_RETRIES) {
                // Log to console only, don't show to user
                console.error(`❌ [AI Enhancement] Final error after ${retryCount} retries:`, error.message);
                throw error;
            }

            // Calculate delay with exponential backoff and jitter
            const baseDelay = Math.min(
                this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
                this.MAX_RETRY_DELAY
            );
            const jitter = Math.random() * 1000; // 0-1 second random jitter
            const delay = baseDelay + jitter;

            console.warn(
                `⚠️ [AI Enhancement] Retry ${retryCount + 1}/${this.MAX_RETRIES} after ${Math.round(delay)}ms. Error: ${error.message}`
            );

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));

            // Recursive retry
            return this.retryWithBackoff(fn, retryCount + 1);
        }
    }

    // Create system prompt for AI enhancement (matching old repo pattern)
    private static createSystemPrompt(): string {
    return `You are an expert resume optimization AI assistant specializing in ATS optimization and job matching. Your task is to analyze a resume against a job description and provide comprehensive optimization recommendations.

Always include a compact, crisp, professional summary suitable for use at the top of a resume (2-3 sentences maximum). Keep this summary short, precise, and professional. For other sections prefer concise, actionable items rather than long paragraphs.

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
5. Tailoring content to specific job requirements

CRITICAL INSTRUCTIONS FOR PROFESSIONAL SUMMARY:
- The professional_summary field MUST be SHORT and CONCISE (2-3 sentences maximum)
- Do NOT write multiple paragraphs or long-winded summaries
- Keep it under 100 words
- Make every word count - be impactful and specific
- Focus only on the most relevant skills and experience for this specific job`;
    }

    // Create system prompt for detailed AI enhancement
    private static createDetailedSystemPrompt(): string {
    return `You are an expert resume and cover letter writer specializing in creating comprehensive, ATS-optimized, multi-page professional documents. Your task is to analyze a resume against a job description and create detailed, enhanced content.

Always include a compact, crisp, professional summary suitable for use at the top of a resume (2-3 sentences maximum). Even when producing long-form detailed sections, ensure the enhanced_summary field contains a short, professional blurb that can be used directly on a one-page resume. For the rest of the detailed content, prefer concise, structured paragraphs and bullet lists.

CRITICAL REQUIREMENT: The professional_summary field must be SHORT (2-3 sentences, under 100 words). Do NOT write long paragraphs.

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
      "professional_summary": "IMPORTANT: Write a SHORT, CONCISE 2-3 sentence professional summary. Do NOT write multiple paragraphs. Keep it brief and impactful, highlighting only the most relevant experience and value proposition.",
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

    // Helper: ensure a compact professional summary (2-3 sentences)
    private static ensureCompactSummary(text: string, maxSentences = 3): string {
        if (!text || typeof text !== 'string') return '';
        const cleaned = text.replace(/\s+/g, ' ').trim();
        const sentences = cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned];
        if (sentences.length <= maxSentences) return sentences.join(' ').trim();
        return sentences.slice(0, maxSentences).map(s => s.trim()).join(' ').trim();
    }

    // Compact summary with optional character cap (default 300 chars)
    private static formatCompactSummary(text: string, maxSentences = 3, charCap = 300): string {
        const s = this.ensureCompactSummary(text, maxSentences);
        if (!s) return '';
        if (s.length <= charCap) return s;
        // truncate at nearest sentence boundary under charCap if possible
        const sentences = s.match(/[^.!?]+[.!?]?/g) || [s.slice(0, charCap)];
        let out = '';
        for (const sent of sentences) {
            if ((out + ' ' + sent).trim().length > charCap) break;
            out = (out + ' ' + sent).trim();
        }
        if (!out) return s.slice(0, charCap).trim();
        return out;
    }

    // Create detailed user prompt (kept for reference/compat)
    private static createDetailedUserPrompt(resumeText: string, jobDescription: string): string {
    return `Please analyze and create detailed, comprehensive enhanced content for this resume and a personalized cover letter for the given job description.

Always include a compact, crisp, professional summary suitable for the top of a resume (2-3 sentences maximum). Place this short summary in the enhancements.enhanced_summary field so it can be used on a one-page resume. When producing the longer detailed sections, keep language concise and use bullet lists where possible.

    Create a comprehensive analysis and detailed enhanced content following the JSON structure. The enhanced resume should be suitable for a multi-page document with detailed sections. The cover letter should have two substantial paragraphs that create a compelling narrative connecting the candidate's experience to the job requirements.

CRITICAL: For the professional_summary field, write ONLY 2-3 SHORT sentences (maximum 100 words). Do NOT write multiple paragraphs. Keep it concise and impactful.

Make sure all content is:
1. Highly detailed and professional (but keep the top summary compact)
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

    // Add: Section labels and patterns for detection
    private static readonly SECTION_LABELS: Record<CanonicalSection, string> = {
        skills: 'Skills',
        experience: 'Experience',
        education: 'Education',
        projects: 'Projects',
        certifications: 'Certifications',
        awards: 'Awards',
        volunteer_work: 'Volunteer Work',
        publications: 'Publications'
    };

    private static readonly SECTION_PATTERNS: Record<CanonicalSection, RegExp[]> = {
        skills: [
            /^\s*(skills|technical skills|core competencies|competencies|skills & abilities|key skills)\s*[:\-]?$/i
        ],
        experience: [
            /^\s*(experience|professional experience|work experience|employment history|career history)\s*[:\-]?$/i
        ],
        education: [
            /^\s*(education|academic background|education & training|academics)\s*[:\-]?$/i
        ],
        projects: [
            /^\s*(projects|selected projects|academic projects|personal projects)\s*[:\-]?$/i
        ],
        certifications: [
            /^\s*(certifications?|licenses?|certifications? & licenses?)\s*[:\-]?$/i
        ],
        awards: [
            /^\s*(awards?|honors|honors & awards|achievements)\s*[:\-]?$/i
        ],
        volunteer_work: [
            /^\s*(volunteer( work)?|community service|volunteering|extracurricular)\s*[:\-]?$/i
        ],
        publications: [
            /^\s*(publications?|papers|research|research publications)\s*[:\-]?$/i
        ]
    };

    // Add: Detect sections and their order from resume text
    private static detectResumeSections(resumeText: string): { orderedSections: CanonicalSection[]; indices: Record<CanonicalSection, number> } {
        if (!resumeText) return { orderedSections: [], indices: {} as Record<CanonicalSection, number> };

        const lines = resumeText.split(/\r?\n/).map(l => l.trim());
        const firstIndex: Partial<Record<CanonicalSection, number>> = {};

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const key of Object.keys(this.SECTION_PATTERNS) as CanonicalSection[]) {
                if (firstIndex[key] !== undefined) continue;
                const patterns = this.SECTION_PATTERNS[key];
                if (patterns.some(r => r.test(line))) {
                    firstIndex[key] = i;
                }
            }
        }

        const orderedSections = (Object.keys(firstIndex) as CanonicalSection[])
            .sort((a, b) => (firstIndex[a]! - firstIndex[b]!));

        return { orderedSections, indices: firstIndex as Record<CanonicalSection, number> };
    }

    // Add: Build dynamic directive to control which sections the AI should output
    private static createDynamicSectionDirective(orderedSections: CanonicalSection[]): string {
        const list = orderedSections.map((k, idx) => `${idx + 1}) ${this.SECTION_LABELS[k]}`).join('\n');

        return [
            'Dynamic section directive:',
            '- Mandatory: Include a Professional Summary at the top.',
            '- After the Professional Summary, include ONLY the following sections, in this exact order:',
            list.length ? list : '(No additional sections detected. Do not invent new sections.)',
            '- Do NOT add or invent sections that are not present in the original resume.',
            '- In the JSON output under enhancements.detailed_resume_sections:',
            '  - If Skills is present, populate technical_skills and soft_skills as appropriate (leave empty if unclear).',
            '  - For sections not listed above, leave them empty and do not fabricate content.'
        ].join('\n');
    }

    // Enhanced resume analysis using OpenAI directly (like AiJobSearch-old)
    static async enhanceWithOpenAI(
        resumeText: string,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        // If Gemini provider requested, delegate to Gemini implementation
        if (this.isGeminiProvider(options.modelType)) {
            return this.enhanceWithGemini(resumeText, jobDescription, options);
        }

        // Add: detect sections for stub path too (used in metadata/UI)
        const { orderedSections } = this.detectResumeSections(resumeText);
        const includedLabels = orderedSections.map(s => this.SECTION_LABELS[s]);

        // Return a deterministic stubbed response to preserve UI flow.
        const matchScore = Math.min(85, Math.max(40, Math.floor((resumeText.length % 100) + 40)));

    const enhancementResponse: AIEnhancementResponse = {
            success: true,
            analysis: {
                match_score: matchScore,
                strengths: ['Relevant experience', 'Clear formatting'],
                gaps: [],
                suggestions: ['Add quantifiable achievements where possible', 'Include job-specific keywords in skills section'],
                keyword_analysis: {
                    missing_keywords: [],
                    present_keywords: [],
                    keyword_density_score: Math.round(matchScore * 0.7)
                },
                section_recommendations: {
                    skills: 'Prioritize technical skills relevant to the job',
                    experience: 'Bulletize achievements with metrics',
                    education: 'List relevant coursework if applicable'
                }
            },
            enhancements: {
                    enhanced_summary: this.formatCompactSummary('Experienced professional with demonstrated expertise relevant to the role.'),
                enhanced_skills: [],
                enhanced_experience_bullets: [],
                cover_letter_outline: {
                    opening: 'Introduce yourself and mention the role you are applying for.',
                    body: 'Connect 2-3 key experiences to the job requirements.',
                    closing: 'Express enthusiasm and request next steps.'
                },
                detailed_resume_sections: {
                    professional_summary: 'Experienced professional with relevant background tailored to the position.',
                    technical_skills: [],
                    soft_skills: [],
                    experience: [],
                    education: [],
                    projects: [],
                    certifications: [],
                    awards: [],
                    volunteer_work: [],
                    publications: []
                },
                detailed_cover_letter: {
                    opening_paragraph: '',
                    body_paragraph: '',
                    closing_paragraph: ''
                }
            },
            metadata: {
                model_used: options.model || this.DEFAULT_MODEL,
                model_type: options.modelType || this.DEFAULT_MODEL_TYPE,
                timestamp: new Date().toISOString(),
                resume_sections_analyzed: ['summary', 'experience', 'skills', 'education'],
                // Add: dynamic section metadata
                included_sections: includedLabels,
                section_order: orderedSections,
                directive_applied: false
            },
            file_id: options.fileId || `enhance_stub_${Date.now()}`
        };

        return enhancementResponse;
    }

    // Enhance resume using Google Vertex AI (unified SDK - NO FALLBACK)
    private static async enhanceWithGemini(
        resumeText: string,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        try {
            console.log('🚀 [Vertex AI] Starting resume enhancement with retry mechanism...');

            // Validate inputs before making API call
            if (!resumeText || resumeText.trim().length < 50) {
                throw new Error('Resume text is too short or empty. Please provide a valid resume with at least 50 characters.');
            }
            
            if (!jobDescription || jobDescription.trim().length < 30) {
                throw new Error('Job description is too short or empty. Please provide a valid job description with at least 30 characters.');
            }

            // Get Vertex AI client - throws error if not configured
            let client: GoogleGenAI;
            try {
                client = getVertexAIClient();
            } catch (initError: any) {
                console.error('❌ [Vertex AI] Client initialization failed:', initError.message);
                throw new Error(`AI service is not properly configured: ${initError.message}`);
            }

            const modelId = options.model || this.DEFAULT_MODEL || 'gemini-2.5-flash';
            console.log(`📊 [Vertex AI] Using model: ${modelId}`);

            // Use strict overrides when provided, and ALWAYS append fixed context
            const systemContent =
                options.systemPromptOverride ?? this.createDetailedSystemPrompt();
            const userHeader =
                options.userPromptOverride ?? this.createDetailedUserPromptHeader();

            // Add: dynamic directive injection based on detected sections/order
            const { orderedSections } = this.detectResumeSections(resumeText);
            const dynamicDirective = this.createDynamicSectionDirective(orderedSections);
            const userHeaderWithDirective = `${userHeader}\n\n${dynamicDirective}`;

            const userContent = this.buildFinalUserPrompt(userHeaderWithDirective, resumeText, jobDescription);

            // Combine system and user prompts
            const fullPrompt = `${systemContent}\n\n${userContent}`;
            console.log(`📝 [Vertex AI] Prompt length: ${fullPrompt.length} characters`);

            // Wrap the API call in retry logic with enhanced error handling
            const makeApiCall = async () => {
                try {
                    const result = await client.models.generateContent({
                        model: modelId,
                        contents: fullPrompt,
                        config: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 8192
                        }
                    });

                    if (!result) {
                        throw new Error('Vertex AI returned an empty response');
                    }

                    return result;
                } catch (apiError: any) {
                    // Enhanced error categorization for Vertex AI
                    const errorMessage = apiError?.message || String(apiError);
                    const statusCode = apiError?.status || apiError?.code || '';
                    
                    // Categorize errors for better user feedback and retry logic
                    if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('403')) {
                        throw new Error('Vertex AI permission denied. Please check your service account permissions and ensure the Vertex AI API is enabled in your GCP project.');
                    }
                    
                    if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('404')) {
                        throw new Error(`Model "${modelId}" not found. Please verify the model name is correct and available in your region.`);
                    }
                    
                    if (errorMessage.includes('INVALID_ARGUMENT') || errorMessage.includes('400')) {
                        throw new Error('Invalid request to Vertex AI. The prompt may be malformed or exceed limits.');
                    }
                    
                    if (errorMessage.includes('UNAUTHENTICATED') || errorMessage.includes('401')) {
                        throw new Error('Vertex AI authentication failed. Please check your service account credentials and ensure they are properly configured.');
                    }
                    
                    if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
                        throw new Error('Vertex AI quota exceeded. Please wait a moment and try again, or check your GCP billing and quotas.');
                    }
                    
                    if (errorMessage.includes('UNAVAILABLE') || errorMessage.includes('503') || errorMessage.includes('overloaded')) {
                        throw new Error(`Vertex AI service temporarily unavailable (${statusCode}). Retrying...`);
                    }
                    
                    if (errorMessage.includes('DEADLINE_EXCEEDED') || errorMessage.includes('504')) {
                        throw new Error('Vertex AI request timed out. The request may be too complex. Please try again.');
                    }
                    
                    // Re-throw with context for retry mechanism
                    throw new Error(`Vertex AI API error: ${errorMessage}`);
                }
            };

            // Execute with retry mechanism
            const result = await this.retryWithBackoff(makeApiCall);
            const responseText = result?.text || '';

            if (!responseText) {
                console.error('❌ [Vertex AI] No response text received.');
                throw new Error('Vertex AI returned an empty response. Please try again.');
            }

            console.log('✅ [Vertex AI] Response received, parsing...');
            console.log('📝 [Vertex AI] Response length:', responseText.length, 'characters');
            
            let aiResults: any;
            try {
                // First attempt: direct JSON parse
                aiResults = JSON.parse(responseText);
                console.log('✅ [Vertex AI] JSON parsed successfully (direct)');
            } catch (parseError) {
                console.warn('⚠️ [Vertex AI] Direct JSON parse failed, attempting extraction...');
                
                // Second attempt: extract JSON from response (handle markdown code blocks)
                let jsonText = responseText;
                
                // Remove markdown code blocks if present
                if (responseText.includes('```json')) {
                    const jsonStart = responseText.indexOf('```json') + 7;
                    const jsonEnd = responseText.indexOf('```', jsonStart);
                    if (jsonEnd > jsonStart) {
                        jsonText = responseText.slice(jsonStart, jsonEnd).trim();
                        console.log('📦 [Vertex AI] Extracted from markdown ```json block');
                    }
                } else if (responseText.includes('```')) {
                    const jsonStart = responseText.indexOf('```') + 3;
                    const jsonEnd = responseText.indexOf('```', jsonStart);
                    if (jsonEnd > jsonStart) {
                        jsonText = responseText.slice(jsonStart, jsonEnd).trim();
                        console.log('📦 [Vertex AI] Extracted from generic ``` code block');
                    }
                }
                
                // Third attempt: find JSON object boundaries
                const start = jsonText.indexOf('{');
                const end = jsonText.lastIndexOf('}');
                
                if (start !== -1 && end !== -1 && end > start) {
                    try {
                        jsonText = jsonText.slice(start, end + 1);
                        aiResults = JSON.parse(jsonText);
                        console.log('✅ [Vertex AI] JSON extracted and parsed successfully');
                    } catch (extractError) {
                        console.error('❌ [Vertex AI] Failed to parse extracted JSON:', extractError);
                        console.error('📄 [Vertex AI] Extracted text preview (first 500 chars):', jsonText.substring(0, 500));
                        console.error('📄 [Vertex AI] Extracted text preview (last 200 chars):', jsonText.substring(Math.max(0, jsonText.length - 200)));
                        throw new Error('Failed to parse AI response. The response format is invalid. Please try again.');
                    }
                } else {
                    console.error('❌ [Vertex AI] No JSON object found in response');
                    console.error('📄 [Vertex AI] Full response preview (first 1000 chars):', responseText.substring(0, 1000));
                    throw new Error('AI response does not contain valid JSON. Please try again.');
                }
            }

            // Ensure the enhanced_summary is compact (2-3 sentences max)
            const ensureCompactSummary = (text: string, maxSentences = 3): string => {
                if (!text || typeof text !== 'string') return '';
                // Normalize whitespace
                const cleaned = text.replace(/\s+/g, ' ').trim();
                // Split into sentences using a simple regex
                const sentences = cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned];
                if (sentences.length <= maxSentences) return sentences.join(' ').trim();
                // Return first maxSentences sentences joined
                return sentences.slice(0, maxSentences).map(s => s.trim()).join(' ').trim();
            };

            // Fallback: try to extract a professional summary from AI detailed sections or the original resume text
            const extractSummaryFromResumeText = (text: string): string => {
                if (!text || typeof text !== 'string') return '';
                const normalized = text.replace(/\r/g, '');
                // Look for headings like PROFESSIONAL SUMMARY, PROFESSIONAL SUMMARY:, SUMMARY, SUMMARY:\n
                const headingRegex = /(^|\n)\s*(PROFESSIONAL SUMMARY|PROFESSIONAL SUMMARY:|PROFESSIONAL SUMMARY\n|PROFESSIONAL SUMMARY\s*-|SUMMARY|SUMMARY:)\s*\n?/i;
                const match = normalized.match(headingRegex);
                if (match && match.index !== undefined) {
                    const start = match.index + match[0].length;
                    // Take up to next double newline or 300 characters
                    const rest = normalized.slice(start);
                    const endIdx = rest.search(/\n\s*\n/);
                    const snippet = endIdx === -1 ? rest.slice(0, 500) : rest.slice(0, endIdx);
                    return snippet.replace(/\n+/g, ' ').trim();
                }

                // If no heading, try to take the first 200-300 chars as a fallback
                return normalized.split('\n').slice(0, 4).join(' ').slice(0, 500).trim();
            };

            const aiProvidedSummary = aiResults.enhancements?.enhanced_summary || aiResults.enhancements?.detailed_resume_sections?.professional_summary || '';
            let compactSummary = ensureCompactSummary(aiProvidedSummary || '');

            if (!compactSummary) {
                // Try extracting from the original resume text passed to this function
                const extracted = extractSummaryFromResumeText(resumeText || '');
                compactSummary = ensureCompactSummary(extracted || '');
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
                    enhanced_summary: compactSummary || aiResults.enhancements?.enhanced_summary || '',
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
                    model_type: 'VertexAI',
                    timestamp: new Date().toISOString(),
                    resume_sections_analyzed: ['summary', 'experience', 'skills', 'education', 'projects', 'certifications', 'awards', 'volunteer', 'publications'],
                    // Add: dynamic section metadata
                    included_sections: orderedSections.map(s => this.SECTION_LABELS[s]),
                    section_order: orderedSections,
                    directive_applied: true
                },
                file_id: options.fileId || `enhance_${Date.now()}`
            };

            console.log('✅ [Vertex AI] Enhancement completed successfully');
            return enhancementResponse;
        } catch (error: any) {
            // Log detailed error to console for debugging
            console.error('❌ [Vertex AI] Enhancement error:', {
                message: error?.message,
                stack: error?.stack,
                timestamp: new Date().toISOString(),
                errorType: error?.constructor?.name
            });

            // Categorize errors and provide user-friendly messages
            const errorMessage = error?.message || '';
            
            // Configuration errors - be specific
            if (errorMessage.includes('not configured') || errorMessage.includes('not properly configured')) {
                throw new Error('AI service configuration error. Please contact support.');
            }
            
            // Authentication/Permission errors
            if (errorMessage.includes('permission') || errorMessage.includes('authentication') || errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('UNAUTHENTICATED')) {
                throw new Error('AI service authentication error. Please contact support.');
            }
            
            // Quota/Rate limit errors
            if (errorMessage.includes('quota') || errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
                throw new Error('AI service is temporarily at capacity. Please wait a moment and try again.');
            }
            
            // Service unavailable
            if (errorMessage.includes('unavailable') || errorMessage.includes('UNAVAILABLE') || errorMessage.includes('503')) {
                throw new Error('AI service is temporarily unavailable. Please try again in a few moments.');
            }
            
            // Timeout errors
            if (errorMessage.includes('timeout') || errorMessage.includes('DEADLINE_EXCEEDED') || errorMessage.includes('timed out')) {
                throw new Error('AI request timed out. Please try again with a shorter resume or job description.');
            }
            
            // Parse errors - safe to show as they're already user-friendly
            if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
                throw new Error('AI enhancement completed but encountered a formatting issue. Please try again.');
            }
            
            // Browser environment error
            if (errorMessage.includes('server-side') || errorMessage.includes('browser')) {
                throw new Error('AI enhancement must be processed through the server. Please refresh the page and try again.');
            }
            
            // Generic fallback - don't expose internal details
            throw new Error('AI enhancement encountered an issue. Please try again.');
        }
    }

    // Enhance resume with file upload
    static async enhanceWithFile(
        file: File,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        try {
            // First try to extract text from file and use Vertex AI
            const { extractTextFromPDF } = await import('../utils/pdfUtils');
            const extractionResult = await extractTextFromPDF(file);

            if (extractionResult.text && extractionResult.text.length > 50) {
                console.log('📄 [Vertex AI] Using extracted text from file...');
                // Route via enhanceWithOpenAI, which dispatches to Vertex AI
                return await this.enhanceWithOpenAI(extractionResult.text, jobDescription, options);
            } else {
                throw new Error('Unable to extract sufficient text from file. Please ensure the file contains readable text.');
            }
        } catch (error: any) {
            console.error('❌ [Vertex AI] Error in AI enhancement with file:', error);

            if (error.name === 'AbortError') {
                throw new Error('AI enhancement timed out. The analysis is taking longer than expected. Please try again.');
            }

            if (error.message.includes('Failed to fetch')) {
                throw new Error('Unable to connect to the AI service. Please check your internet connection and try again.');
            }

            throw new Error(error.message || 'Failed to enhance resume with AI. Please try again.');
        }
    }

    // Enhance resume with JSON data using Vertex AI
    static async enhanceWithJson(
        resumeJson: any,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        try {
            // Convert JSON resume data to text format for Vertex AI
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

            console.log('📄 [Vertex AI] Using JSON resume data...');
            // Route via enhanceWithOpenAI, which dispatches to Vertex AI
            return await this.enhanceWithOpenAI(resumeText, jobDescription, options);

        } catch (error: any) {
            console.error('❌ [Vertex AI] Error in AI enhancement with JSON:', error);

            if (error.name === 'AbortError') {
                throw new Error('AI enhancement timed out. The analysis is taking longer than expected. Please try again.');
            }

            if (error.message.includes('Failed to fetch')) {
                throw new Error('Unable to connect to the AI service. Please check your internet connection and try again.');
            }

            throw new Error(error.message || 'Failed to enhance resume with AI. Please try again.');
        }
    }

    // Get current configuration for debugging
    static getConfiguration() {
        const project = process.env.NEXT_PUBLIC_VERTEX_AI_PROJECT || '';
        const location = process.env.NEXT_PUBLIC_VERTEX_AI_LOCATION || 'global';
        const clientEmail = typeof window === 'undefined' ? process.env.VERTEX_AI_CLIENT_EMAIL : undefined;
        const privateKey = typeof window === 'undefined' ? process.env.VERTEX_AI_PRIVATE_KEY : undefined;
        
        // Check if Vertex AI is configured (without initializing the client)
        const isVertexAIReady = !!(
            typeof window === 'undefined' && 
            project && 
            location && 
            clientEmail && 
            privateKey
        );
        
        let vertexAIError: string | null = null;
        if (!isVertexAIReady && typeof window === 'undefined') {
            if (!project) {
                vertexAIError = 'Vertex AI Project ID is not configured';
            } else if (!clientEmail || !privateKey) {
                vertexAIError = 'Vertex AI service account credentials are missing';
            }
        }
        
        return {
            hasApiKey: !!this.API_KEY,
            isVertexAIConfigured: !!project,
            isVertexAIReady: isVertexAIReady,
            vertexAIError: vertexAIError,
            vertexAIProject: project,
            vertexAILocation: location,
            defaultModelType: this.DEFAULT_MODEL_TYPE,
            defaultModel: this.DEFAULT_MODEL,
            isServerSide: typeof window === 'undefined'
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
                    enhanced_summary: this.ensureCompactSummary(response.enhancements?.enhanced_summary || ''),
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
    // Add: optional metadata to aid UI/debugging for dynamic prompting
    included_sections?: string[];  // Human-friendly labels in order
    section_order?: CanonicalSection[]; // Canonical keys in order
    directive_applied?: boolean; // Whether dynamic directive was injected
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
