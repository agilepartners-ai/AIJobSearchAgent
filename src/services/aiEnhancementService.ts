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

// NOTE: Vertex AI SDK (@ai-sdk/google-vertex) is NOT imported here because it uses
// Node.js-only modules (google-auth-library, net, etc.) that cannot be bundled for the browser.
// All Vertex AI API calls MUST go through the server-side API route at /api/enhance-resume.
// This service acts as a client-side facade that calls the API route.

// OpenAI has been removed from the frontend. Provide a local stub
// implementation that preserves the public API surface and response
// shapes so the UI flow remains intact.

// NOTE: We intentionally avoid importing any server-side SDK packages here.
// The methods below proxy to the API route which runs server-side.

const getApiKey = (): string => '';

export class AIEnhancementService {
    private static readonly API_KEY = getApiKey();
    // Hardcoded to reduce Netlify env var count (4KB Lambda limit)
    private static readonly DEFAULT_MODEL_TYPE = 'Gemini';
    private static readonly DEFAULT_MODEL = 'gemini-2.5-flash';
    
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
            // Check if error is retryable (503, 429, network errors, parsing errors)
            const isRetryable = 
                error.message?.includes('503') || 
                error.message?.includes('UNAVAILABLE') ||
                error.message?.includes('overloaded') ||
                error.message?.includes('429') ||
                error.message?.includes('Too Many Requests') ||
                error.message?.includes('RESOURCE_EXHAUSTED') ||
                error.message?.includes('Failed to fetch') ||
                error.message?.includes('NetworkError') ||
                error.message?.includes('response format') ||
                error.message?.includes('JSON') ||
                error.message?.includes('parse') ||
                error.message?.includes('temporarily') ||
                error.message?.includes('try again');

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
- Focus only on the most relevant skills and experience for this specific job

CRITICAL JSON FORMATTING REQUIREMENTS:
- Output ONLY valid JSON - no markdown code blocks, no explanations
- Use double quotes for ALL strings and property names
- Include commas between ALL array elements: ["item1", "item2", "item3"]
- Include commas between ALL object properties
- Do NOT include trailing commas before ] or }
- Escape any quotes inside strings with backslash`;
    }

    // Create system prompt for detailed AI enhancement
    private static createDetailedSystemPrompt(): string {
    return `You are a professional career consultant helping to refine and optimize resume and cover letter content. Write in a natural, human tone that sounds authentic and professional - avoid corporate jargon, buzzwords, or overly formal language. Create content that reads as if written by the candidate themselves, not by an automated system.

Always include a compact, crisp, professional summary suitable for use at the top of a resume (2-3 sentences maximum). Write in a natural, conversational yet professional tone. Use authentic language that a real person would use when describing their own experience. Avoid phrases that sound robotic or template-like.

CRITICAL REQUIREMENT: The professional_summary field must be SHORT (2-3 sentences, under 100 words) and sound genuinely written by a human, not generated by AI.

CRITICAL JSON FORMATTING REQUIREMENTS:
- Output ONLY valid JSON - no markdown code blocks, no explanations, no text before or after
- Use double quotes for ALL strings and property names  
- Include commas between ALL array elements: ["item1", "item2", "item3"]
- Include commas between ALL object properties
- Do NOT include trailing commas before ] or }
- Escape any quotes inside strings with backslash: \\"

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
      "professional_summary": "IMPORTANT: Write a SHORT, CONCISE 2-3 sentence professional summary in natural, human language. Avoid buzzwords, corporate jargon, or phrases that sound automated. Write as if the candidate is genuinely describing their experience in their own words. Keep it brief, authentic, and conversational yet professional.",
      "technical_skills": ["comprehensive list of technical skills categorized by proficiency"],
      "soft_skills": ["relevant soft skills with context"],
      "experience": [
        {
          "company": "Company Name",
          "position": "Enhanced Job Title",
          "duration": "Start Date - End Date",
          "location": "City, State",
          "achievements": ["3-5 quantified achievements with metrics, written in natural language"],
          "key_responsibilities": ["4-6 detailed responsibilities using action verbs, sounding authentic not templated"],
          "technologies_used": ["relevant technologies and tools"],
          "quantified_results": ["specific numbers, percentages, dollar amounts presented naturally"]
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
      "opening_paragraph": "4-5 sentence natural, genuine opening that expresses authentic interest in the specific role and company. Use personal, conversational language that sounds like a real person writing, not a template. Avoid clichés like 'I am writing to express my interest' - be more natural and direct.",
      "body_paragraph": "8-10 sentence paragraph written in first-person, conversational professional tone. Connect personal experiences to job requirements using specific examples. Avoid corporate buzzwords and clichés like 'synergy', 'paradigm shift', 'leverage', etc. Write as if having a genuine conversation about your qualifications. Use varied sentence structures and natural transitions.",
      "closing_paragraph": "3-4 sentence authentic closing that naturally expresses interest in next steps. Sound professional but personable, like you're writing to a real person, not filling out a form. Avoid overly formal phrases - be warm but professional."
    },
    "cover_letter_outline": {
      "opening": "Brief opening guidance",
      "body": "Main body guidance",
      "closing": "Closing guidance"
    }
  }
}

Focus on:
1. Writing in natural, human language - avoid robotic or template-like phrasing
2. Using authentic, conversational yet professional tone throughout
3. Creating content that sounds like it was genuinely written by the candidate
4. Including specific examples and quantified achievements in a natural way
5. Incorporating job keywords naturally without stuffing or forced language
6. Avoiding AI-sounding phrases, corporate buzzwords, and clichés
7. Making the cover letter sound like a real person expressing genuine interest
8. Never mentioning AI, automated tools, or that content was generated
9. Writing as if you ARE the candidate sharing your own authentic story`;
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

    // Enhance resume using Google Vertex AI via server-side API route
    // This method calls the /api/enhance-resume endpoint which handles the Vertex AI SDK
    private static async enhanceWithGemini(
        resumeText: string,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        try {
            console.log('🚀 [AI Enhancement] Starting resume enhancement via API route...');

            // Validate inputs before making API call
            if (!resumeText || resumeText.trim().length < 50) {
                throw new Error('Resume text is too short or empty. Please provide a valid resume with at least 50 characters.');
            }
            
            if (!jobDescription || jobDescription.trim().length < 30) {
                throw new Error('Job description is too short or empty. Please provide a valid job description with at least 30 characters.');
            }

            const modelId = options.model || this.DEFAULT_MODEL || 'gemini-2.0-flash';
            console.log(`📊 [AI Enhancement] Using model: ${modelId}`);

            // Generate prompts (these helper methods are purely client-side computation)
            const systemContent = options.systemPromptOverride ?? this.createDetailedSystemPrompt();
            const userHeader = options.userPromptOverride ?? this.createDetailedUserPromptHeader();

            // Add: dynamic directive injection based on detected sections/order
            const { orderedSections } = this.detectResumeSections(resumeText);
            const dynamicDirective = this.createDynamicSectionDirective(orderedSections);
            const userHeaderWithDirective = `${userHeader}\n\n${dynamicDirective}`;

            const userContent = this.buildFinalUserPrompt(userHeaderWithDirective, resumeText, jobDescription);

            // Combine system and user prompts
            const fullPrompt = `${systemContent}\n\n${userContent}`;
            console.log(`📝 [AI Enhancement] Prompt length: ${fullPrompt.length} characters`);

            // Make API call to server-side endpoint with retry logic
            const makeApiCall = async () => {
                const response = await fetch('/api/enhance-resume', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        resumeText,
                        jobDescription,
                        model: modelId,
                        systemPrompt: systemContent,
                        userPrompt: userContent,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error || `Server error: ${response.status}`;
                    
                    // Map HTTP status codes to appropriate error types for retry logic
                    if (response.status === 429) {
                        throw new Error('AI service quota exceeded. Please wait a moment and try again.');
                    }
                    if (response.status === 503) {
                        throw new Error('AI service temporarily unavailable. Retrying...');
                    }
                    if (response.status === 504) {
                        throw new Error('AI request timed out. Please try again.');
                    }
                    if (response.status === 401 || response.status === 403) {
                        throw new Error('AI service authentication error. Please contact support.');
                    }
                    
                    throw new Error(errorMessage);
                }

                return response.json();
            };

            // Execute with retry mechanism
            const aiResults = await this.retryWithBackoff(makeApiCall);

            if (!aiResults || !aiResults.success) {
                throw new Error(aiResults?.error || 'AI enhancement failed. Please try again.');
            }

            // Ensure the enhanced_summary is compact (2-3 sentences max)
            const ensureCompactSummary = (text: string, maxSentences = 3): string => {
                if (!text || typeof text !== 'string') return '';
                const cleaned = text.replace(/\s+/g, ' ').trim();
                const sentences = cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned];
                if (sentences.length <= maxSentences) return sentences.join(' ').trim();
                return sentences.slice(0, maxSentences).map(s => s.trim()).join(' ').trim();
            };

            // Extract and process summary
            const aiProvidedSummary = aiResults.enhancements?.enhanced_summary || 
                aiResults.enhancements?.detailed_resume_sections?.professional_summary || '';
            const compactSummary = ensureCompactSummary(aiProvidedSummary || '');

            const enhancementResponse: AIEnhancementResponse = {
                success: true,
                analysis: {
                    match_score: aiResults.match_score || aiResults.analysis?.match_score || 0,
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
                    included_sections: orderedSections.map(s => this.SECTION_LABELS[s]),
                    section_order: orderedSections,
                    directive_applied: true
                },
                file_id: options.fileId || `enhance_${Date.now()}`
            };

            console.log('✅ [AI Enhancement] Enhancement completed successfully');
            return enhancementResponse;
        } catch (error: any) {
            console.error('❌ [AI Enhancement] Error:', {
                message: error?.message,
                timestamp: new Date().toISOString()
            });

            // Re-throw with original message for user visibility
            throw error;
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
        // Client-side: we can only check public env vars
        // Server-side credentials are not exposed to the browser
        // Hardcoded to reduce Netlify env var count (4KB Lambda limit)
        const modelType = 'Gemini';
        const model = 'gemini-2.5-flash';
        
        // Vertex AI is considered configured if model type is Gemini
        // Actual credential validation happens server-side in the API route
        const isVertexAIConfigured = modelType.toLowerCase() === 'gemini' || 
                                     modelType.toLowerCase() === 'vertexai' ||
                                     modelType.toLowerCase() === 'vertex';
        
        return {
            hasApiKey: false, // No longer using client-side API keys
            isVertexAIConfigured: isVertexAIConfigured,
            isVertexAIReady: isVertexAIConfigured, // Trust server-side config
            vertexAIError: null,
            vertexAIProject: 'configured-server-side',
            vertexAILocation: 'us-central1',
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
