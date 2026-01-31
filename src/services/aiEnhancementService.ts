export interface AIEnhancementOptions {
    modelType?: string;
    model?: string;
    fileId?: string;
    // NEW: full prompt overrides (replace whole prompt if provided)
    userPromptOverride?: string;
    systemPromptOverride?: string;
    // Progress callback for real-time updates
    onProgress?: (stage: string, percentage: number) => void;
    // Enable streaming for token-by-token progress
    enableStreaming?: boolean;
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

// Add: canonical section type for dynamic prompting (EXPANDED to 20+ sections)
// Export for use in metadata interface
export type CanonicalSection =
    | 'professional_summary'
    | 'skills'
    | 'experience'
    | 'education'
    | 'projects'
    | 'certifications'
    | 'awards'
    | 'volunteer_work'
    | 'publications'
    | 'languages'
    | 'interests'
    | 'references'
    | 'objective'
    | 'courses'
    | 'training'
    | 'memberships'
    | 'patents'
    | 'presentations'
    | 'portfolio'
    | 'achievements'
    | 'extracurricular'
    | 'military'
    | 'licenses';

// OpenAI has been removed from the frontend. Provide a local stub
// implementation that preserves the public API surface and response
// shapes so the UI flow remains intact.

// NOTE: We intentionally avoid importing the OpenAI SDK anywhere in
// the frontend. The methods below return deterministic, typed
// fallback responses.

const getApiKey = (): string => '';

// Add: Get Gemini API key from environment variables for browser compatibility
// Log API key only once to avoid console spam
let _hasLoggedGeminiApiKey = false;
let cachedGeminiKey: string | null = null;

const getGeminiApiKey = (): string => {
    // Return cached key if already fetched
    if (cachedGeminiKey !== null) {
        return cachedGeminiKey;
    }

    let apiKey = '';
    if (typeof window !== 'undefined') {
        apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
        if (!_hasLoggedGeminiApiKey) {
            console.log('🔍 [DEBUG] Browser - NEXT_PUBLIC_GEMINI_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
            _hasLoggedGeminiApiKey = true;
        }
    } else {
        apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
        if (!_hasLoggedGeminiApiKey) {
            console.log('🔍 [DEBUG] Server - GEMINI_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
            _hasLoggedGeminiApiKey = true;
        }
    }

    // Cache the key
    cachedGeminiKey = apiKey;
    return apiKey;
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
        return `You are an expert resume optimization specialist with deep experience in ATS systems and job matching. Your task is to analyze a resume against a job description and provide expert optimization recommendations.

Always include a concise, professional summary suitable for use at the top of a resume (2-3 sentences maximum). Keep this summary short, precise, and professional. For other sections prefer concise, actionable items rather than long paragraphs.

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
    "enhanced_summary": "Optimized professional summary",
    "enhanced_skills": ["prioritized technical and soft skills"],
    "enhanced_experience_bullets": ["improved bullet points with metrics"],
    "cover_letter_outline": {
      "opening": "engaging opening that expresses genuine interest",
      "body": "main body content showcasing relevant experience",
      "closing": "strong closing with clear next steps"
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
        return `You are an expert resume writer and career strategist with deep expertise in creating comprehensive, ATS-optimized professional documents. Your task is to analyze a resume against a job description and create detailed, polished content INCLUDING A MANDATORY COVER LETTER.

⚠️ ABSOLUTE MANDATORY REQUIREMENTS:
1. You MUST generate the "detailed_cover_letter" object in your response - it is NOT optional
2. The detailed_cover_letter MUST contain all three paragraphs: opening_paragraph, body_paragraph, and closing_paragraph
3. Each paragraph MUST explicitly mention the company name and position title from the job application context
4. NEVER leave detailed_cover_letter empty or omit it - this will cause the application to fail

⚠️ CRITICAL RULES - NEVER VIOLATE THESE:
1. NEVER add synthetic, fabricated, or invented data
2. ONLY use information EXPLICITLY provided in the original resume
3. DO NOT add percentages, metrics, or numbers that aren't in the source resume (e.g., NO "(resulted in ~10% efficiency gain)" unless it's in the original)
4. DO NOT invent achievements, technologies, dates, or experiences
5. DO NOT add placeholder text, synthetic metrics, or made-up accomplishments
6. ONLY rephrase, reorganize, and optimize what already exists in the source resume
7. If information is unclear or missing, DO NOT fill it in - leave it out
8. DO NOT repeat degree names (e.g., "MBA in Business Administration" NOT "MBA in Business Administration in Business Administration")
9. DO NOT create separate "projects" section if projects are already covered in experience section

🎯 PROJECTS EXTRACTION - CRITICAL INSTRUCTIONS:
When you encounter a "Projects" or "Featured Projects" section in the resume:
- Extract EACH project as a SEPARATE object in the projects array
- NEVER write generic summaries like "Proven ability to deliver..." or "with high accuracy..." as project names
- NEVER combine all projects into one entry - create one object per project
- Each project object MUST have: name (actual project title), technologies (array), description, achievements (if mentioned)
- Example: If resume says "Smart Parking System - Python, OpenCV - 94.7% accuracy", return:
  {"name": "Smart Parking System", "technologies": ["Python", "OpenCV"], "achievements": ["94.7% accuracy"]}
- **IMPORTANT FALLBACK**: If raw resume mentions ANY projects (even if not in a dedicated section), you MUST recreate at least ONE relevant project entry in the projects array based on the candidate's skills and experience. DO NOT return empty projects array if the resume shows they have technical/project experience.
- If NO projects or technical work is mentioned anywhere in resume, then return empty array: "projects": []

SPACE-SAVING GUIDELINES:
- Combine "Key Achievements" and "Key Responsibilities" into a single "achievements" array to eliminate duplication
- Remove redundant bullet points that say the same thing in different words
- Focus on unique, specific accomplishments from the original resume
- Consolidate overlapping information
- Technical skills should be a simple flat array (no categories) for inline display
- Keep education entries concise: "degree + field" once, not repeated

Always include a concise, professional summary suitable for use at the top of a resume (2-3 sentences maximum). Even when producing long-form detailed sections, ensure the enhanced_summary field contains a short, professional summary that can be used directly on a one-page resume. For the rest of the detailed content, prefer concise, structured paragraphs and bullet lists.

CRITICAL REQUIREMENT: The professional_summary field must be SHORT (2-3 sentences, under 100 words). Do NOT write long paragraphs.

You must respond with a valid JSON object containing the following structure:
{
  "match_score": number (0-100),
  "analysis": {
    "strengths": ["array of specific strengths FROM THE RESUME"],
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
    "enhanced_summary": "2-3 sentence professional summary tailored to job USING ONLY REAL RESUME CONTENT",
    "enhanced_skills": ["prioritized technical and soft skills THAT EXIST IN THE RESUME"],
    "enhanced_experience_bullets": ["improved bullet points WITH ONLY REAL METRICS from the resume"],
    "detailed_resume_sections": {
      "professional_summary": "Write a SHORT, CONCISE 2-3 sentence professional summary. Do NOT write multiple paragraphs. Keep it brief and impactful, highlighting only the most relevant experience and value proposition FROM THE ACTUAL RESUME.",
      "technical_skills": ["Flat array of technical skills FROM THE RESUME ONLY - NO categories, NO grouping - simple list for inline comma-separated display"],
      "soft_skills": ["relevant soft skills WITH EVIDENCE FROM THE RESUME"],
      "experience": [
        {
          "company": "Company Name FROM RESUME",
          "position": "Job Title FROM RESUME",
          "duration": "EXACT Dates FROM RESUME",
          "location": "EXACT Location FROM RESUME",
          "achievements": ["3-8 consolidated achievements combining responsibilities AND accomplishments. EACH must be ONE CONCISE LINE (max 15 words or 90 characters). Use ONLY real information from resume. Include metrics ONLY if they appear in source resume."],
          "technologies_used": ["ONLY technologies explicitly mentioned in the resume"]
        }
      ],
      "education": [
        {
          "institution": "University Name FROM RESUME",
          "degree": "Degree Type FROM RESUME (e.g., MBA, Master's, Bachelor's) - WRITE ONCE, DO NOT DUPLICATE",
          "field_of_study": "EXACT Field FROM RESUME (e.g., Business Administration, Applied Economics) - DO NOT REPEAT WITH DEGREE",
          "graduation_date": "EXACT Date FROM RESUME",
          "gpa": "ONLY if provided in resume",
          "relevant_coursework": ["ONLY if mentioned in resume"],
          "honors": ["ONLY if mentioned in resume"]
        }
      ],
      "projects": [
        {
          "name": "EXACT Project Name FROM RESUME (e.g., 'Smart Parking Management System', 'AI Route Optimization Platform')",
          "duration": "EXACT Duration FROM RESUME if provided",
          "description": "One concise sentence describing the project using ONLY real information from resume",
          "technologies": ["ONLY technologies explicitly mentioned for this project in the resume as an ARRAY"],
          "achievements": ["EACH achievement must be ONE SHORT LINE (max 12-15 words or 80 characters). Include ONLY specific measurable results from resume. Keep concise."],
          "github_url": "ONLY if provided in resume",
          "live_url": "ONLY if provided in resume"
        }
      ],
      "⚠️ CRITICAL - PROJECTS EXTRACTION RULES": {
        "IF_PROJECTS_SECTION_EXISTS": "You MUST extract EACH individual project as a SEPARATE object in the projects array",
        "NEVER": "Do NOT write generic summaries like 'Proven ability to deliver...' or 'with high accuracy...' - these are NOT project names",
        "NEVER_COMBINE": "Do NOT combine all projects into one entry - extract each project separately",
        "EXAMPLE_INPUT": "Smart Parking Management System - Python, OpenCV, YOLOv8 - 94.7% accuracy | AI Route Optimizer - React.js - 18.3% reduced commute",
        "EXAMPLE_OUTPUT": [
          {"name": "Smart Parking Management System", "technologies": ["Python", "OpenCV", "YOLOv8"], "achievements": ["94.7% accuracy"]},
          {"name": "AI Route Optimizer", "technologies": ["React.js"], "achievements": ["18.3% reduced commute time"]}
        ],
        "IF_NO_PROJECTS": "If there is NO projects section in the resume, return projects: [] (empty array)"
      },
      "certifications": [
        {
          "name": "EXACT Certification Name FROM RESUME",
          "issuing_organization": "EXACT Organization FROM RESUME",
          "issue_date": "EXACT Date FROM RESUME",
          "expiration_date": "ONLY if in resume",
          "credential_id": "ONLY if in resume"
        }
      ],
      "awards": [
        {
          "title": "EXACT Award Name FROM RESUME",
          "issuing_organization": "EXACT Organization FROM RESUME",
          "date": "EXACT Date FROM RESUME",
          "description": "ONLY information from resume"
        }
      ],
      "volunteer_work": [
        {
          "organization": "EXACT Organization Name FROM RESUME",
          "role": "EXACT Role FROM RESUME",
          "duration": "EXACT Duration FROM RESUME",
          "description": "ONLY information from resume",
          "achievements": ["ONLY if measurable impact is mentioned in resume"]
        }
      ],
      "publications": [
        {
          "title": "EXACT Title FROM RESUME",
          "publication": "EXACT Publication FROM RESUME",
          "date": "EXACT Date FROM RESUME",
          "authors": ["EXACT authors FROM RESUME"],
          "description": "ONLY information from resume"
        }
      ]
    },
    "detailed_cover_letter": {
      "opening_paragraph": "Engaging 4-5 sentence introduction that explicitly mentions the company name and position title. Express genuine interest and highlight ONE REAL achievement from the resume. DO NOT include contact information (email, phone, address) in this paragraph.",
      "body_paragraph": "Substantial 8-10 sentence paragraph that naturally weaves in the company name. Tell a compelling story using REAL experience from the resume with concrete examples that align with the company's needs. DO NOT include contact information in this paragraph.",
      "closing_paragraph": "Professional 3-4 sentence conclusion that mentions the company name naturally. Express enthusiasm, indicate next steps, and thank them for their consideration. DO NOT include contact information in this paragraph."
    },
    "cover_letter_outline": {
      "opening": "Express genuine interest in the role and company, mentioning a specific reason why you're excited",
      "body": "Connect REAL experience and achievements from the resume to the job requirements",
      "closing": "Reiterate interest, mention follow-up, and thank them"
    }
  }
}

⚠️ CRITICAL - YOU MUST ALWAYS GENERATE detailed_cover_letter:
- The detailed_cover_letter object is REQUIRED and must NEVER be empty or omitted
- opening_paragraph MUST be 4-5 sentences explicitly mentioning company name and position
- body_paragraph MUST be 8-10 sentences with company name woven in naturally  
- closing_paragraph MUST be 3-4 sentences mentioning company name
- NO_CONTACT_INFO: NEVER include email, phone, or address in ANY paragraph - contact details are in the header

⚠️ CRITICAL COVER LETTER QUALITY RULES:
1. EXPLICITLY mention the COMPANY NAME and POSITION TITLE from job application context in all three paragraphs naturally
2. NEVER use vague quantifiers like "significant percentages", "substantial improvements", "considerable impact"
3. PROHIBIT generic corporate phrases: "proven track record", "perfect candidate", "ideal fit", "strategic objectives"
4. REQUIRE specific, authentic language with concrete examples from the actual resume
5. Use action verbs and measurable achievements ONLY if they exist in the source resume
6. Avoid clichés and template language - write personalized, genuine content
7. Connect specific resume experiences to the company's mission and role requirements
8. If metrics don't exist in resume, use descriptive accomplishments instead of inventing numbers
9. Opening paragraph MUST explicitly reference the company name and position title
10. Body paragraph MUST weave company name naturally when discussing how skills align with their needs
11. Closing paragraph MUST mention company name when expressing enthusiasm to contribute
12. DO NOT include contact information (email, phone, address) in any paragraph - contact details will be added separately in the header

Focus on:
1. ACCURACY: Use only real information from the source resume
2. CONSOLIDATION: Combine overlapping content to save space
3. NO INVENTION: Never add synthetic data, metrics, or placeholder text
4. SPECIFICITY: Use concrete examples from the actual resume
5. AUTHENTICITY: Write in a professional but genuine voice, avoiding corporate jargon
5. ATS OPTIMIZATION: Incorporate job-specific keywords naturally where they genuinely apply
6. READABILITY: Keep content concise and impactful`;
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

⚠️ CRITICAL: Use ONLY information from the provided resume. DO NOT add synthetic data, invented metrics, or placeholder text.

⚠️ CRITICAL VALIDATION RULES FOR PROJECTS:
1. NEVER create a project with ANY generic/placeholder text including but not limited to:
   - "and collaborate effectively with cross-functional teams"
   - "reduce/reducing development timelines"
   - "significantly reducing development timelines"  
   - "efficient workflow implementation"
   - "streamlining processes"
   - "drive innovation/efficiency"
   - Any sentence starting with "and" or containing generic business jargon
2. NEVER create a project with empty or missing name/title
3. NEVER use template syntax like "\${PROJECT_NAME}", "[Project Name]", "TBD", "TODO", or similar
4. NEVER create projects without REAL, SPECIFIC content from the actual resume
5. If no legitimate projects with SPECIFIC details exist in the resume, DO NOT invent or create fake ones - simply omit the projects field entirely
6. Every project MUST have: A) Real, specific project name, B) Real description with SPECIFIC details OR real technologies, C) ZERO placeholder/boilerplate/generic text
7. Each project description must be SPECIFIC, UNIQUE, and contain CONCRETE details (numbers, technologies, outcomes) - no generic business statements
8. Descriptions must be ACTIONABLE and MEASURABLE - what was built, what problem it solved, what impact it had

Create a comprehensive analysis and detailed enhanced content following the JSON structure. The enhanced resume should be suitable for a multi-page document with detailed sections. The cover letter should have two substantial paragraphs that create a compelling narrative connecting the candidate's experience to the job requirements.

STRICT REQUIREMENTS:
1. Consolidate "Key Achievements" and "Key Responsibilities" into a single "achievements" array to save space
2. Remove any duplicate or overlapping bullet points
3. NEVER add percentages, metrics, or data not present in the original resume
4. NEVER add text like "(resulted in ~X% efficiency gain)" unless it exists in the source
5. Use ONLY real technologies, dates, companies, and accomplishments from the resume
6. Technical skills must be a flat array (no categories) for inline comma-separated display
7. Education: Write degree and field ONCE (e.g., "MBA in Business Administration" NOT "MBA in Business Administration in Business Administration")
8. Projects: DO NOT create a separate projects section. If REAL projects with SPECIFIC details are found in the resume, add them to the Professional Experience section with position title formatted as "PROJECT: [Real Project Name] - [Real Technologies]" and include ONLY a single-line description with REAL, SPECIFIC details (no bullet points, no achievements array, no generic statements). Tag them clearly as projects within experience. If there are no real projects with specific details, skip projects entirely.
9. When adding projects to experience, use this format ONLY FOR REAL PROJECTS:
   - position: "PROJECT: [Actual Name from Resume] - [Actual Technologies from Resume]"
   - company: "Personal/Academic Project" (or actual company if project was done at a company)
   - achievements: ["Single concise SPECIFIC summary line with REAL details from the resume"]
   - duration: [actual dates if available, or "Ongoing" if current]
   - Keep it minimal: Title with tech, one specific summary line with real details only

Make sure all content is:
1. Highly detailed and professional - BUT ACCURATE TO THE SOURCE
2. Tailored specifically to the job posting - WITHOUT INVENTING DATA
3. Includes quantified achievements - ONLY IF PRESENT IN THE ORIGINAL RESUME
4. Uses industry-specific terminology - FROM THE RESUME CONTEXT
5. Optimized for ATS systems
6. Creates a compelling narrative - USING REAL EXPERIENCES ONLY
7. ABSOLUTELY NO PLACEHOLDER OR BOILERPLATE TEXT ANYWHERE`;
    }

    // NEW: public alias used by UI to get the default "user" prompt header (no context block)
    static createUserSystemPrompt(_resumeText: string, _jobDescription: string): string {
        return this.createDetailedUserPromptHeader();
    }

    // Helper to compose final user prompt (header + fixed context)
    private static buildFinalUserPrompt(
        header: string, 
        resumeText: string, 
        jobDescription: string,
        companyName?: string,
        position?: string,
        location?: string
    ): string {
        const hdr = (header || '').trim();
        
        // Build job application context section if data is available
        let jobContextSection = '';
        if (companyName || position || location) {
            jobContextSection = `\n\nJOB APPLICATION CONTEXT (Use this information throughout the cover letter):
`;
            if (companyName) jobContextSection += `- Company Name: ${companyName}\n`;
            if (position) jobContextSection += `- Position Title: ${position}\n`;
            if (location) jobContextSection += `- Location: ${location}\n`;
        }
        
        return `${hdr}${jobContextSection}

Use this for context:
JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME:
${resumeText}`;
    }

    // Add: Section labels and patterns for detection (EXPANDED to 20+ sections)
    private static readonly SECTION_LABELS: Record<CanonicalSection, string> = {
        professional_summary: 'Professional Summary',
        skills: 'Skills',
        experience: 'Professional Experience',
        education: 'Education',
        projects: 'Projects',
        certifications: 'Certifications',
        awards: 'Awards & Honors',
        volunteer_work: 'Volunteer Experience',
        publications: 'Publications',
        languages: 'Languages',
        interests: 'Interests & Hobbies',
        references: 'References',
        objective: 'Career Objective',
        courses: 'Relevant Courses',
        training: 'Training & Development',
        memberships: 'Professional Memberships',
        patents: 'Patents',
        presentations: 'Presentations & Speaking',
        portfolio: 'Portfolio',
        achievements: 'Key Achievements',
        extracurricular: 'Extracurricular Activities',
        military: 'Military Service',
        licenses: 'Professional Licenses'
    };

    private static readonly SECTION_PATTERNS: Record<CanonicalSection, RegExp[]> = {
        professional_summary: [
            /^\s*(professional\s+summary|summary|profile|executive\s+summary|career\s+summary|personal\s+statement|about\s+me)\s*[:\-]?$/i
        ],
        skills: [
            /^\s*(skills|technical\s+skills|core\s+competencies|competencies|skills\s*&\s*abilities|key\s+skills|areas\s+of\s+expertise|expertise|proficiencies)\s*[:\-]?$/i
        ],
        experience: [
            /^\s*(experience|professional\s+experience|work\s+experience|employment\s+history|career\s+history|work\s+history|employment|positions\s+held)\s*[:\-]?$/i
        ],
        education: [
            /^\s*(education|academic\s+background|education\s*&\s*training|academics|educational\s+qualifications|academic\s+credentials)\s*[:\-]?$/i
        ],
        projects: [
            /^\s*(projects|selected\s+projects|academic\s+projects|personal\s+projects|key\s+projects|notable\s+projects|featured\s+projects|project\s+experience)\s*[:\-]?$/i
        ],
        certifications: [
            /^\s*(certifications?|licenses?\s*&\s*certifications?|professional\s+certifications?|credentials)\s*[:\-]?$/i
        ],
        awards: [
            /^\s*(awards?|honors?|honors?\s*&\s*awards?|recognition|accolades|distinctions)\s*[:\-]?$/i
        ],
        volunteer_work: [
            /^\s*(volunteer(\s+work|\s+experience)?|community\s+service|volunteering|civic\s+engagement|pro\s+bono)\s*[:\-]?$/i
        ],
        publications: [
            /^\s*(publications?|papers|research|research\s+publications?|published\s+works?|articles)\s*[:\-]?$/i
        ],
        languages: [
            /^\s*(languages?|language\s+skills?|linguistic\s+skills?|foreign\s+languages?)\s*[:\-]?$/i
        ],
        interests: [
            /^\s*(interests?|hobbies|hobbies?\s*&\s*interests?|personal\s+interests?|activities)\s*[:\-]?$/i
        ],
        references: [
            /^\s*(references?|professional\s+references?|references?\s+available)\s*[:\-]?$/i
        ],
        objective: [
            /^\s*(objective|career\s+objective|job\s+objective|professional\s+objective|goal)\s*[:\-]?$/i
        ],
        courses: [
            /^\s*(courses?|relevant\s+courses?|coursework|relevant\s+coursework|academic\s+courses?)\s*[:\-]?$/i
        ],
        training: [
            /^\s*(training|professional\s+development|training\s*&\s*development|workshops?|seminars?)\s*[:\-]?$/i
        ],
        memberships: [
            /^\s*(memberships?|professional\s+memberships?|affiliations?|professional\s+affiliations?|associations?)\s*[:\-]?$/i
        ],
        patents: [
            /^\s*(patents?|intellectual\s+property|inventions?)\s*[:\-]?$/i
        ],
        presentations: [
            /^\s*(presentations?|speaking\s+engagements?|talks?|conferences?\s+presentations?|public\s+speaking)\s*[:\-]?$/i
        ],
        portfolio: [
            /^\s*(portfolio|work\s+samples?|samples?|creative\s+portfolio)\s*[:\-]?$/i
        ],
        achievements: [
            /^\s*(achievements?|key\s+achievements?|accomplishments?|key\s+accomplishments?|career\s+highlights?)\s*[:\-]?$/i
        ],
        extracurricular: [
            /^\s*(extracurricular(\s+activities)?|activities|student\s+activities|campus\s+involvement|leadership\s+activities)\s*[:\-]?$/i
        ],
        military: [
            /^\s*(military(\s+service|\s+experience)?|armed\s+forces|veteran|service\s+record)\s*[:\-]?$/i
        ],
        licenses: [
            /^\s*(licenses?|professional\s+licenses?|licensure|state\s+licenses?)\s*[:\-]?$/i
        ]
    };

    // Add: Build dynamic directive to control which sections the AI should output
    private static createDynamicSectionDirective(orderedSections: CanonicalSection[]): string {
        const list = orderedSections.map((k, idx) => `${idx + 1}) ${this.SECTION_LABELS[k]}`).join('\n');

        // Build list of sections NOT to include
        const allSections = Object.keys(this.SECTION_LABELS) as CanonicalSection[];
        const excludedSections = allSections.filter(s => !orderedSections.includes(s));
        const excludedList = excludedSections.map(k => this.SECTION_LABELS[k]).join(', ');

        const hasProjects = orderedSections.includes('projects');
        const projectInstruction = hasProjects 
            ? `\n\n🔍 PROJECTS SECTION EXTRACTION (CRITICAL):\nThe resume contains a "Projects" or "Featured Projects" section. You MUST:\n1. Extract EACH individual project as a separate object\n2. For each project, extract:\n   - EXACT project name (e.g., "Smart Parking Management System")\n   - Technologies explicitly mentioned for that project\n   - Description (one concise sentence)\n   - Achievements with metrics (ONLY if mentioned)\n3. DO NOT generate generic summaries like ". Proven ability to deliver..."\n4. DO NOT combine all projects into one placeholder entry\n5. Return an array with one object per project\n\nExample: If the resume has:\n"Smart Parking Management System - Python, OpenCV, YOLOv8 - 94.7% accuracy"\n"AI Route Optimizer - Python, React.js - 18.3% reduced commute"\n\nYou MUST return:\n"projects": [\n  {"name": "Smart Parking Management System", "technologies": ["Python", "OpenCV", "YOLOv8"], "achievements": ["94.7% accuracy"]},\n  {"name": "AI Route Optimizer", "technologies": ["Python", "React.js"], "achievements": ["18.3% reduced commute time"]}\n]`
            : '';

        return [
            'CRITICAL - Dynamic Section Filtering Agent Directive:',
            '',
            'You are a section filtering agent. Your task is to STRICTLY include ONLY the sections that exist in the original resume.',
            '',
            '✅ SECTIONS DETECTED IN ORIGINAL RESUME (include these in exact order):',
            list.length ? list : '(No additional sections detected beyond personal info)',
            '',
            '❌ SECTIONS NOT FOUND IN ORIGINAL RESUME (DO NOT INCLUDE - leave empty arrays/objects):',
            excludedList || '(All sections were detected)',
            '',
            'STRICT RULES:',
            '1. NEVER invent or fabricate content for sections not present in the original resume',
            '2. If a section like "Projects" is not in the original resume, set projects: [] (empty array)',
            '3. If "Publications" is not detected, set publications: [] (empty array)',
            '4. Only populate sections that have corresponding content in the original resume text',
            '5. Maintain the exact order of sections as detected above',
            '6. For any section not listed in the ✅ DETECTED list above, return empty content',
            projectInstruction,
            '',
            'In the JSON output under enhancements.detailed_resume_sections:',
            '- professional_summary: Always include (mandatory)',
            '- For each detected section: Populate with enhanced content from the resume',
            '- For each non-detected section: Return empty array [] or empty string ""',
            '- DO NOT hallucinate or create fictional section content'
        ].join('\n');
    }

    // Enhanced resume analysis using OpenAI directly (like AiJobSearch-old)
    static async enhanceWithOpenAI(
        resumeText: string,
        jobDescription: string,
        options: AIEnhancementOptions = {},
        applicationData?: { company_name?: string; position?: string; location?: string }
    ): Promise<AIEnhancementResponse> {
        // If Gemini provider requested, delegate to Gemini implementation
        if (this.isGeminiProvider(options.modelType)) {
            return this.enhanceWithGemini(resumeText, jobDescription, options, applicationData);
        }

        // Add: detect sections for stub path too (used in metadata/UI)
        const { orderedSections } = AIEnhancementService.detectResumeSections(resumeText);
        const includedLabels = orderedSections.map(s => AIEnhancementService.SECTION_LABELS[s]);

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

    // New: Enhance resume using Google Gemini API
    private static async enhanceWithGemini(
        resumeText: string,
        jobDescription: string,
        options: AIEnhancementOptions = {},
        applicationData?: { company_name?: string; position?: string; location?: string }
    ): Promise<AIEnhancementResponse> {
        try {
            console.log('Starting detailed Gemini resume enhancement with retry mechanism...');

            // Progress callback: Stage 1 - Preparing
            options.onProgress?.('Preparing AI prompt...', 10);

            const apiKey = getGeminiApiKey();
            if (!apiKey) {
                console.error('❌ Gemini API key is not configured');
                throw new Error('API configuration is missing. Please ensure NEXT_PUBLIC_GEMINI_API_KEY environment variable is set.');
            }

            // Validate API key format
            if (!apiKey.startsWith('AIza')) {
                console.warn('⚠️ API key format may be invalid (should start with AIza)');
            }

            console.log('✅ API key validated (length:', apiKey.length, ')');

            const modelId = options.model || AIEnhancementService.DEFAULT_MODEL || 'gemini-2.0-flash-exp';
            console.log('🤖 Using model:', modelId);

            // Use strict overrides when provided, and ALWAYS append fixed context
            const systemContent =
                options.systemPromptOverride ?? AIEnhancementService.createDetailedSystemPrompt();
            const userHeader =
                options.userPromptOverride ?? AIEnhancementService.createDetailedUserPromptHeader();

            // Add: dynamic directive injection based on detected sections
            console.log('🔍 Detecting resume sections...');
            console.log('📄 Resume text length:', resumeText?.length, 'characters');
            console.log('📄 Resume text preview (first 200 chars):', resumeText?.substring(0, 200));
            
            const { orderedSections } = AIEnhancementService.detectResumeSections(resumeText);
            console.log('✅ Detected sections:', orderedSections);
            
            // If no sections detected, use default common sections to avoid empty directive
            const sectionsToUse = orderedSections.length > 0 
                ? orderedSections 
                : ['professional_summary', 'skills', 'experience', 'education', 'projects'] as CanonicalSection[];
            
            if (orderedSections.length === 0) {
                console.warn('⚠️ No resume sections detected via pattern matching. Using default sections:', sectionsToUse);
            }

            const dynamicDirective = AIEnhancementService.createDynamicSectionDirective(sectionsToUse);
            const userHeaderWithDirective = `${userHeader}\n\n${dynamicDirective}`;

            const userContent = AIEnhancementService.buildFinalUserPrompt(
                userHeaderWithDirective, 
                resumeText, 
                jobDescription,
                applicationData?.company_name,
                applicationData?.position,
                applicationData?.location
            );

            // Combine system and user prompts into a single user message for Gemini
            const payload = {
                contents: [
                    {
                        parts: [
                            { text: `${systemContent}\n\n${userContent}` }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.3,  // Reduced from 0.7 to minimize creativity/hallucination
                    topK: 20,          // Reduced from 40 to focus on most likely tokens
                    topP: 0.8,         // Reduced from 0.95 to limit diversity
                    maxOutputTokens: 8192, // Increased token limit for comprehensive responses
                    responseMimeType: "text/plain"
                }
            };

            // Progress callback: Stage 2 - Sending to Gemini
            options.onProgress?.('Sending request to Gemini AI...', 30);

            let responseText = '';
            let streamingFailed = false;

            if (options.enableStreaming) {
                try {
                    // Use streaming API
                    const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:streamGenerateContent`;
                    
                    console.log('🌊 Attempting streaming request to:', streamUrl);
                    
                    const response = await fetch(streamUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': apiKey
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errText = await response.text().catch(() => '');
                        console.error('❌ Streaming API failed:', response.status, errText);
                        throw new Error(`Gemini streaming API error ${response.status}: ${errText || response.statusText}`);
                    }

                    options.onProgress?.('Processing AI response (streaming)...', 50);

                    const reader = response.body?.getReader();
                    if (!reader) {
                        console.warn('⚠️ No reader available from streaming response');
                        throw new Error('Streaming reader not available');
                    }

                    const decoder = new TextDecoder();
                    let buffer = '';
                    let chunkCount = 0;
                    let lastDataSize = 0;

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            // Process any remaining buffer content
                            if (buffer.trim()) {
                                try {
                                    const cleanLine = buffer.trim().replace(/,\s*$/, '');
                                    if (cleanLine && cleanLine !== '[' && cleanLine !== ']') {
                                        const chunk = JSON.parse(cleanLine);
                                        const text = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                        if (text) {
                                            responseText += text;
                                            chunkCount++;
                                        }
                                    }
                                } catch (e) {
                                    console.warn('⚠️ Could not parse final buffer:', buffer.substring(0, 100));
                                }
                            }
                            console.log('✅ Streaming complete. Chunks received:', chunkCount, 'Total text length:', responseText.length);
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        
                        // Keep the last incomplete line in the buffer
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            const trimmed = line.trim();
                            
                            // Skip empty lines and array delimiters
                            if (!trimmed || trimmed === '[' || trimmed === ']') continue;
                            
                            try {
                                // Clean up trailing commas which are common in streaming responses
                                const cleanLine = trimmed.replace(/,\s*$/, '');
                                
                                // Skip empty after cleaning
                                if (!cleanLine || cleanLine === '[' || cleanLine === ']') continue;
                                
                                // Parse the JSON chunk
                                const chunk = JSON.parse(cleanLine);
                                
                                // Extract text from the proper nested structure
                                const text = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                                
                                if (text && typeof text === 'string' && text.length > 0) {
                                    responseText += text;
                                    lastDataSize = text.length;
                                    chunkCount++;
                                    
                                    // Update progress as tokens arrive
                                    const progress = Math.min(90, 50 + Math.floor(responseText.length / 100));
                                    options.onProgress?.('Receiving AI response...', progress);
                                    
                                    console.log(`📨 Received chunk ${chunkCount}, text size: ${lastDataSize}, total: ${responseText.length}`);
                                }
                            } catch (e: any) {
                                // Only log if it's not whitespace or expected control characters
                                const preview = trimmed.substring(0, 100);
                                if (preview && !preview.match(/^\s*[\[\]{}]*\s*$/)) {
                                    console.debug('⚠️ Skipping non-JSON line:', preview, 'Error:', e.message);
                                }
                            }
                        }
                    }

                    if (!responseText || responseText.trim().length === 0) {
                        console.warn('⚠️ Streaming completed but no text received, falling back to standard API');
                        streamingFailed = true;
                    }
                } catch (streamError: any) {
                    console.warn('⚠️ Streaming failed, falling back to standard API:', streamError.message);
                    streamingFailed = true;
                    responseText = ''; // Reset for fallback
                }
            }

            // Use standard API call (either by choice or as fallback)
            if (!options.enableStreaming || streamingFailed) {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`;
                
                console.log('📡 Using standard API call to:', url);
                
                const makeApiCall = async () => {
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
                        console.error('❌ Standard API failed:', response.status, errText);
                        
                        let errorMessage = `Gemini API error ${response.status}: ${errText || response.statusText}`;

                        // Try to parse error details
                        try {
                            const errorData = JSON.parse(errText);
                            console.error('❌ Parsed error:', errorData);
                            errorMessage = `Gemini API error ${response.status}: ${JSON.stringify(errorData)}`;
                        } catch {
                            // Keep the original error message
                        }

                        throw new Error(errorMessage);
                    }

                    return response;
                };

                options.onProgress?.('Waiting for AI response...', 50);
                
                // Execute with retry mechanism
                const response = await AIEnhancementService.retryWithBackoff(makeApiCall);
                
                options.onProgress?.('Processing AI response...', 70);

                const data = await response.json();
                console.log('📦 API Response structure:', {
                    hasCandidates: !!data?.candidates,
                    candidatesLength: data?.candidates?.length,
                    hasContent: !!data?.candidates?.[0]?.content,
                    hasParts: !!data?.candidates?.[0]?.content?.parts,
                    partsLength: data?.candidates?.[0]?.content?.parts?.length,
                    firstPartKeys: data?.candidates?.[0]?.content?.parts?.[0] ? Object.keys(data.candidates[0].content.parts[0]) : []
                });

                // Check for safety/content filtering
                if (data?.candidates?.[0]?.finishReason) {
                    console.log('🔍 Finish reason:', data.candidates[0].finishReason);
                    if (data.candidates[0].finishReason === 'SAFETY' || data.candidates[0].finishReason === 'BLOCKED') {
                        console.error('❌ Content was blocked by safety filters');
                        throw new Error('Content blocked by AI safety filters. Please try with different resume content or remove sensitive information.');
                    }
                }

                responseText =
                    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
                    data?.candidates?.[0]?.output_text ||
                    '';

                if (!responseText && data) {
                    console.error('❌ [Gemini] Full response data:', JSON.stringify(data, null, 2));
                    
                    // Check for specific error messages
                    if (data?.error) {
                        console.error('❌ API Error:', data.error);
                        throw new Error(`Gemini API Error: ${data.error.message || JSON.stringify(data.error)}`);
                    }
                    
                    // Check for prompt feedback
                    if (data?.promptFeedback) {
                        console.error('❌ Prompt feedback:', data.promptFeedback);
                        if (data.promptFeedback.blockReason) {
                            throw new Error(`Content blocked: ${data.promptFeedback.blockReason}. Please try with different content.`);
                        }
                    }
                }
            }

            if (!responseText || responseText.trim().length === 0) {
                console.error('❌ [Gemini] No response text received after all attempts');
                console.error('Response length:', responseText?.length || 0);
                throw new Error('Gemini returned an empty response. This could be due to content filtering or API quota limits. Please try again.');
            }

            console.log('✅ Gemini detailed response received, parsing...');
            console.log('📝 Response length:', responseText.length, 'characters');

            options.onProgress?.('Parsing enhancement data...', 85);

            let aiResults: any;
            try {
                // First attempt: direct JSON parse
                aiResults = JSON.parse(responseText);
                console.log('✅ JSON parsed successfully (direct)');
            } catch (parseError: any) {
                console.warn('⚠️ Direct JSON parse failed:', parseError.message);
                console.warn('Error at position:', parseError.message.match(/position (\d+)/)?.[1] || 'unknown');

                // Second attempt: extract JSON from response (handle markdown code blocks)
                let jsonText = responseText;

                // Remove markdown code blocks if present
                if (responseText.includes('```json')) {
                    const jsonStart = responseText.indexOf('```json') + 7;
                    const jsonEnd = responseText.indexOf('```', jsonStart);
                    if (jsonEnd > jsonStart) {
                        jsonText = responseText.slice(jsonStart, jsonEnd).trim();
                        console.log('📦 Extracted from markdown ```json block');
                    }
                } else if (responseText.includes('```')) {
                    const jsonStart = responseText.indexOf('```') + 3;
                    const jsonEnd = responseText.indexOf('```', jsonStart);
                    if (jsonEnd > jsonStart) {
                        jsonText = responseText.slice(jsonStart, jsonEnd).trim();
                        console.log('📦 Extracted from generic ``` code block');
                    }
                }

                // Third attempt: find JSON object boundaries
                const start = jsonText.indexOf('{');
                const end = jsonText.lastIndexOf('}');

                if (start !== -1 && end !== -1 && end > start) {
                    try {
                        jsonText = jsonText.slice(start, end + 1);
                        
                        // Sanitize JSON: fix common issues
                        // 1. Remove trailing commas before } or ]
                        jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
                        
                        // 2. Fix incomplete arrays (missing closing bracket)
                        const openBrackets = (jsonText.match(/\[/g) || []).length;
                        const closeBrackets = (jsonText.match(/\]/g) || []).length;
                        if (openBrackets > closeBrackets) {
                            console.warn(`⚠️ Fixing ${openBrackets - closeBrackets} unclosed array brackets`);
                            jsonText += ']'.repeat(openBrackets - closeBrackets);
                        }
                        
                        // 3. Fix incomplete objects (missing closing brace)
                        const openBraces = (jsonText.match(/\{/g) || []).length;
                        const closeBraces = (jsonText.match(/\}/g) || []).length;
                        if (openBraces > closeBraces) {
                            console.warn(`⚠️ Fixing ${openBraces - closeBraces} unclosed object braces`);
                            jsonText += '}'.repeat(openBraces - closeBraces);
                        }
                        
                        aiResults = JSON.parse(jsonText);
                        console.log('✅ JSON extracted and parsed successfully after sanitization');
                    } catch (extractError: any) {
                        console.error('❌ Failed to parse extracted JSON:', extractError.message);
                        
                        // Try to find the error location
                        const errorMatch = extractError.message.match(/position (\d+)/);
                        if (errorMatch) {
                            const errorPos = parseInt(errorMatch[1]);
                            const contextStart = Math.max(0, errorPos - 100);
                            const contextEnd = Math.min(jsonText.length, errorPos + 100);
                            console.error('📍 Error context:', jsonText.substring(contextStart, contextEnd));
                            console.error('📍 Error at character:', jsonText[errorPos] || 'EOF');
                        }
                        
                        console.error('📄 Extracted text preview (first 500 chars):', jsonText.substring(0, 500));
                        console.error('📄 Extracted text preview (last 200 chars):', jsonText.substring(Math.max(0, jsonText.length - 200)));
                        throw new Error(`Failed to parse AI response: ${extractError.message}. The response may be incomplete or malformed.`);
                    }
                } else {
                    console.error('❌ No JSON object found in response');
                    console.error('📄 Full response preview (first 1000 chars):', responseText.substring(0, 1000));
                    throw new Error('AI response does not contain valid JSON.');
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

            // 🔍 DEBUG: Log what the AI actually returned for projects
            console.log('🔍 AI RESPONSE - detailed_resume_sections.projects:', aiResults.enhancements?.detailed_resume_sections?.projects);
            console.log('🔍 AI RESPONSE - Number of projects:', aiResults.enhancements?.detailed_resume_sections?.projects?.length || 0);
            if (aiResults.enhancements?.detailed_resume_sections?.projects?.length > 0) {
                console.log('🔍 AI RESPONSE - First project:', aiResults.enhancements.detailed_resume_sections.projects[0]);
            }

            // 🔍 DEBUG: Log what the AI actually returned for cover letter
            console.log('🔍 AI RESPONSE - detailed_cover_letter:', aiResults.enhancements?.detailed_cover_letter);
            console.log('🔍 AI RESPONSE - detailed_cover_letter keys:', Object.keys(aiResults.enhancements?.detailed_cover_letter || {}));
            console.log('🔍 AI RESPONSE - Is cover letter empty?:', Object.keys(aiResults.enhancements?.detailed_cover_letter || {}).length === 0);
            if (aiResults.enhancements?.detailed_cover_letter) {
                console.log('🔍 AI RESPONSE - opening_paragraph length:', aiResults.enhancements.detailed_cover_letter.opening_paragraph?.length || 0);
                console.log('🔍 AI RESPONSE - body_paragraph length:', aiResults.enhancements.detailed_cover_letter.body_paragraph?.length || 0);
                console.log('🔍 AI RESPONSE - closing_paragraph length:', aiResults.enhancements.detailed_cover_letter.closing_paragraph?.length || 0);
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
                    // NEW: Detailed cover letter
                    detailed_cover_letter: aiResults.enhancements?.detailed_cover_letter && 
                        Object.keys(aiResults.enhancements.detailed_cover_letter).length > 0
                        ? (() => {
                            console.log('✅ [aiEnhancementService] Using AI-generated detailed_cover_letter');
                            console.log('✅ [aiEnhancementService] Keys:', Object.keys(aiResults.enhancements.detailed_cover_letter));
                            return aiResults.enhancements.detailed_cover_letter;
                        })()
                        : (() => {
                            console.warn('⚠️ [aiEnhancementService] LLM returned empty detailed_cover_letter, using FALLBACK mechanism');
                            console.log('⚠️ [aiEnhancementService] Company:', applicationData?.company_name);
                            console.log('⚠️ [aiEnhancementService] Position:', applicationData?.position);
                            return {
                                // Fallback: Generate basic cover letter from available data
                                opening_paragraph: aiResults.enhancements?.cover_letter_outline?.opening || 
                                    `I am writing to express my strong interest in the ${applicationData?.position || 'position'} at ${applicationData?.company_name || 'your company'}. ${compactSummary || 'As an experienced professional, I am confident I can contribute to your team.'}`,
                                body_paragraph: aiResults.enhancements?.cover_letter_outline?.body || 
                                    `My background and experience align well with the requirements for the ${applicationData?.position || 'position'} at ${applicationData?.company_name || 'your organization'}. Throughout my career, I have developed strong skills and expertise that would enable me to make meaningful contributions to your team's success.`,
                                closing_paragraph: aiResults.enhancements?.cover_letter_outline?.closing || 
                                    `I am excited about the opportunity to contribute to ${applicationData?.company_name || 'your organization'} and would welcome the chance to discuss how my experience aligns with your needs. Thank you for considering my application, and I look forward to speaking with you soon.`
                            };
                        })(),
                },
                metadata: {
                    model_used: modelId,
                    model_type: options.modelType || AIEnhancementService.DEFAULT_MODEL_TYPE || 'Gemini',
                    timestamp: new Date().toISOString(),
                    resume_sections_analyzed: ['summary', 'experience', 'skills', 'education', 'projects', 'certifications', 'awards', 'volunteer', 'publications'],
                    // Add: dynamic section metadata
                    included_sections: sectionsToUse.map(s => AIEnhancementService.SECTION_LABELS[s]),
                    section_order: sectionsToUse,
                    directive_applied: true
                },
                file_id: options.fileId || `enhance_${Date.now()}`
            };

            options.onProgress?.('Complete!', 100);
            console.log('✅ Gemini detailed enhancement completed successfully');
            return enhancementResponse;
        } catch (error: any) {
            // Log detailed error to console for debugging
            console.error('❌ [Gemini Enhancement] Detailed error (console only):', {
                message: error?.message,
                stack: error?.stack,
                timestamp: new Date().toISOString(),
                errorType: error?.constructor?.name,
                // Add more context
                resumeTextLength: resumeText?.length,
                jobDescriptionLength: jobDescription?.length,
                hasApiKey: !!getGeminiApiKey(),
                modelId: options.model || AIEnhancementService.DEFAULT_MODEL,
                streamingEnabled: options.enableStreaming
            });

            // IMPORTANT: Never expose parsing errors or technical details to users
            // All errors are logged to console, but users only see generic friendly messages

            // Provide specific, actionable error messages based on error type
            let userMessage = 'AI enhancement encountered an issue. Please try again.';

            if (error?.message?.includes('API key')) {
                userMessage = 'API configuration issue. Please contact support.';
            } else if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
                userMessage = 'API usage limit reached. Please try again later or contact support.';
            } else if (error?.message?.includes('empty response') || error?.message?.includes('No response')) {
                userMessage = 'AI service returned no response. This may be due to content filtering or service limitations. Please try with a different resume or try again later.';
            } else if (error?.message?.includes('timeout')) {
                userMessage = 'Request timed out. Please try again.';
            } else if (error?.message?.includes('Failed to fetch') || error?.message?.includes('network')) {
                userMessage = 'Network connection issue. Please check your internet connection and try again.';
            } else if (error?.message?.includes('parse') || error?.message?.includes('JSON')) {
                userMessage = 'AI response could not be processed. Please try generating again.';
            }

            throw new Error(userMessage);
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

    // Placeholder text patterns that indicate malformed/template data
    private static readonly PLACEHOLDER_PATTERNS = [
        /and collaborate effectively with cross-functional teams/i,
        /collaborat(e|ing) (effectively |)with cross-functional teams/i,
        /reduce development timelines/i,
        /reducing development timelines/i,
        /significantly reducing development timelines/i,
        /efficient workflow implementation/i,
        /through efficient (workflow|processes|collaboration)/i,
        /streamlin(e|ed|ing) (processes|workflow|operations)/i,
        /drive\s+(innovation|efficiency|results)/i,
        /deliver\s+(high[- ]quality|exceptional)\s+(results|solutions)/i,
        /\$\{.*?\}/,  // Template literals like ${variable}
        /\[.*?\]/,    // Bracketed placeholders like [Project Name]
        /placeholder/i,
        /example\s+(project|data|text)/i,
        /TBD|TODO|N\/A|tbd|todo/i,
        /^\s*,\s*$/,   // Just commas or whitespace
        /^\s*-\s*$/,   // Just dashes or whitespace
        /^\s*and\s+/i, // Starting with "and"
        /your (project|company|role|team)/i,
        /insert (details|description|information)/i,
        /lorem ipsum/i,
        /sample\s+(text|project|description)/i,
        /generic\s+(description|text)/i,
        /boilerplate/i
    ];

    /**
     * Validate and clean a project object
     * @param project Project data to validate
     * @returns Cleaned project or null if invalid
     */
    private static validateAndCleanProject(project: any): any | null {
        if (!project || typeof project !== 'object') {
            return null;
        }

        const projectName = (project.name || '').trim();
        
        // Must have a valid name
        if (!projectName || projectName.length < 2) {
            console.warn('[AIEnhancementService] ❌ Invalid project: missing name');
            return null;
        }

        // Name shouldn't contain placeholders
        if (this.PLACEHOLDER_PATTERNS.some(pattern => pattern.test(projectName))) {
            console.warn('[AIEnhancementService] ❌ Invalid project: name has placeholder text:', projectName);
            return null;
        }

        // Clean description
        let description = (project.description || '').trim();
        if (description && this.PLACEHOLDER_PATTERNS.some(pattern => pattern.test(description))) {
            console.warn('[AIEnhancementService] ⚠️ Removing placeholder description from project:', projectName);
            description = '';
        }

        // Clean achievements
        const achievements = Array.isArray(project.achievements) 
            ? project.achievements.filter((a: any) => {
                const text = String(a).trim();
                return text.length >= 10 && !this.PLACEHOLDER_PATTERNS.some(p => p.test(text));
              })
            : [];

        // Must have description, achievements, or technologies
        const hasTechnologies = (Array.isArray(project.technologies) && project.technologies.length > 0) ||
                               (typeof project.technologies === 'string' && project.technologies.trim().length > 0);

        if (!description && achievements.length === 0 && !hasTechnologies) {
            console.warn('[AIEnhancementService] ❌ Invalid project: no valid content:', projectName);
            return null;
        }

        return {
            ...project,
            name: projectName,
            description,
            achievements
        };
    }

    /**
     * Validate and clean experience data
     * @param experience Experience array to validate
     * @returns Cleaned experience array
     */
    private static validateAndCleanExperience(experience: any[]): any[] {
        if (!Array.isArray(experience)) return [];

        return experience.filter(exp => {
            // Must have position/company
            const position = (exp.position || '').trim();
            const company = (exp.company || '').trim();
            
            if (!position || !company) {
                console.warn('[AIEnhancementService] ⚠️ Skipping experience entry: missing position or company');
                return false;
            }

            // Check for placeholder text in position/company
            if (this.PLACEHOLDER_PATTERNS.some(p => p.test(position) || p.test(company))) {
                console.warn('[AIEnhancementService] ⚠️ Skipping experience entry: has placeholder text');
                return false;
            }

            // Clean achievements array
            if (Array.isArray(exp.achievements)) {
                exp.achievements = exp.achievements.filter((a: any) => {
                    const text = String(a).trim();
                    return text.length >= 10 && !this.PLACEHOLDER_PATTERNS.some(p => p.test(text));
                });
            }

            return true;
        });
    }

    // Parse and normalize enhancement response
    static normalizeEnhancementResponse(response: any): AIEnhancementResponse {
        try {
            // Process detailed resume sections if present
            let detailedResumeSections = response.enhancements?.detailed_resume_sections || {};
            
            // Validate and clean projects
            if (Array.isArray(detailedResumeSections.projects)) {
                console.log('[AIEnhancementService] 🔍 Validating', detailedResumeSections.projects.length, 'projects...');
                const validProjects = detailedResumeSections.projects
                    .map((p: any) => this.validateAndCleanProject(p))
                    .filter((p: any) => p !== null);
                
                console.log('[AIEnhancementService] ✅ Kept', validProjects.length, 'valid projects out of', detailedResumeSections.projects.length);
                detailedResumeSections = {
                    ...detailedResumeSections,
                    projects: validProjects
                };
            }

            // Validate and clean experience
            if (Array.isArray(detailedResumeSections.experience)) {
                console.log('[AIEnhancementService] 🔍 Validating', detailedResumeSections.experience.length, 'experience entries...');
                const validExperience = this.validateAndCleanExperience(detailedResumeSections.experience);
                console.log('[AIEnhancementService] ✅ Kept', validExperience.length, 'valid experience entries');
                detailedResumeSections = {
                    ...detailedResumeSections,
                    experience: validExperience
                };
            }

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
                    detailed_resume_sections: detailedResumeSections,
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

    // Add: Detect sections and their order from resume text
    private static detectResumeSections(resumeText: string): { orderedSections: CanonicalSection[]; indices: Record<CanonicalSection, number> } {
        if (!resumeText || resumeText.trim().length === 0) {
            console.warn('⚠️ Empty resume text provided for section detection');
            return { orderedSections: [], indices: {} as Record<CanonicalSection, number> };
        }

        // Split by newlines OR double spaces (PDF extraction uses double spaces)
        // First normalize: replace double+ spaces with newlines, then split by newlines
        const normalizedText = resumeText.replace(/\s{2,}/g, '\n');
        const lines = normalizedText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        const firstIndex: Partial<Record<CanonicalSection, number>> = {};

        console.log('🔍 Analyzing', lines.length, 'non-empty lines for section detection');
        console.log('📄 First 10 lines:', lines.slice(0, 10));

        // First pass: Exact pattern matching
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineUpper = line.toUpperCase();
            
            for (const key of Object.keys(AIEnhancementService.SECTION_PATTERNS) as CanonicalSection[]) {
                if (firstIndex[key] !== undefined) continue;
                const patterns = AIEnhancementService.SECTION_PATTERNS[key];
                if (patterns.some(r => r.test(line))) {
                    firstIndex[key] = i;
                    console.log(`✅ Found section '${key}' at line ${i}: "${line.substring(0, 50)}"`);
                }
            }
        }

        // Second pass: Fuzzy matching for common variations if no sections found
        if (Object.keys(firstIndex).length === 0) {
            console.warn('⚠️ No sections found via pattern matching, trying fuzzy matching...');
            
            const fuzzyPatterns: Record<string, CanonicalSection> = {
                'summary': 'professional_summary',
                'profile': 'professional_summary',
                'about': 'professional_summary',
                'objective': 'objective',
                'skill': 'skills',
                'expertise': 'skills',
                'competenc': 'skills',
                'experience': 'experience',
                'employment': 'experience',
                'work history': 'experience',
                'education': 'education',
                'academic': 'education',
                'project': 'projects',
                'certif': 'certifications',
                'award': 'awards',
                'honor': 'awards',
                'volunteer': 'volunteer_work',
                'publication': 'publications',
                'language': 'languages'
            };

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineUpper = line.toUpperCase();
                
                // Check if line looks like a heading (short, possibly bold/caps)
                if (line.length < 50 && line.length > 2) {
                    for (const [keyword, section] of Object.entries(fuzzyPatterns)) {
                        if (lineUpper.includes(keyword.toUpperCase()) && firstIndex[section] === undefined) {
                            firstIndex[section] = i;
                            console.log(`✅ Fuzzy matched '${section}' at line ${i}: "${line}"`);
                            break;
                        }
                    }
                }
            }
        }

        const orderedSections = (Object.keys(firstIndex) as CanonicalSection[])
            .sort((a, b) => (firstIndex[a]! - firstIndex[b]!));

        console.log(`📋 Final detected sections (${orderedSections.length}):`, orderedSections);

        return { orderedSections, indices: firstIndex as Record<CanonicalSection, number> };
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

export interface EnhancementAnalytics {
    sessionId: string;
    userId: string;
    timestamp: Date;
    jobDescription: string;
    matchScore: number;
    processingTimeMs: number;
    modelUsed: string;
    feedback: 'positive' | 'negative' | null;
    regenerationCount: number;
    completedAt: string;
}
