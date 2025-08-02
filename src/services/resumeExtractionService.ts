export interface ResumeExtractionOptions {
    modelType?: string;
    model?: string;
    fileId?: string;
}

export interface ResumeExtractionResponse {
    success: boolean;
    resume_json: any;
    extracted_text_length: number;
    message?: string;
    error?: string;
}

export class ResumeExtractionService {
    private static readonly API_BASE_URL = process.env.NEXT_PUBLIC_RESUME_API_BASE_URL || 'https://resumebuilder-arfb.onrender.com';
    private static readonly API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    private static readonly DEFAULT_MODEL_TYPE = process.env.NEXT_PUBLIC_RESUME_API_MODEL_TYPE || 'OpenAI';
    private static readonly DEFAULT_MODEL = process.env.NEXT_PUBLIC_RESUME_API_MODEL || 'gpt-4o';

    static async extractResumeJson(
        file: File,
        options: ResumeExtractionOptions = {}
    ): Promise<ResumeExtractionResponse> {
        try {
            // Validate API key
            console.log(' [DEBUG] ResumeExtractionService - API_KEY value:', this.API_KEY ? `${this.API_KEY.substring(0, 20)}...` : 'NOT FOUND');
            console.log(' [DEBUG] ResumeExtractionService - API_KEY length:', this.API_KEY ? this.API_KEY.length : 0);
            if (!this.API_KEY) {
                throw new Error('OpenAI API key is not configured or invalid. Please check your environment variables.');
            }

            // Create form data
            const formData = new FormData();

            // Add the resume file
            formData.append('file', file);

            // Add required API key
            formData.append('api_key', this.API_KEY);

            // Add optional parameters with environment defaults
            formData.append('model_type', options.modelType || this.DEFAULT_MODEL_TYPE);
            formData.append('model', options.model || this.DEFAULT_MODEL);
            formData.append('file_id', options.fileId || `req_${Date.now()}`);

            // Make the request
            const response = await fetch(`${this.API_BASE_URL}/api/extract-resume-json`, {
                method: 'POST',
                body: formData,
                headers: {
                    // Add ngrok headers if needed
                    'ngrok-skip-browser-warning': 'true'
                },
                // 60 second timeout for AI processing
                signal: AbortSignal.timeout(600000) // 10 minutes
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return data;
        } catch (error: any) {
            console.error('Error extracting resume JSON:', error);

            // Provide more specific error messages
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. The AI processing is taking longer than expected. Please try again.');
            }

            if (error.message.includes('Failed to fetch')) {
                throw new Error('Unable to connect to the resume extraction service. Please check your internet connection and try again.');
            }

            throw new Error(error.message || 'Failed to extract resume data');
        }
    }

    // Validate file before processing
    static validateResumeFile(file: File): { isValid: boolean; error?: string } {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        if (!allowedTypes.includes(file.type)) {
            return {
                isValid: false,
                error: 'Only PDF, Word documents, and text files are supported'
            };
        }

        if (file.size > maxSize) {
            return {
                isValid: false,
                error: 'File size must be less than 10MB'
            };
        }

        if (file.size === 0) {
            return {
                isValid: false,
                error: 'File appears to be empty'
            };
        }

        return { isValid: true };
    }

    // Get current configuration for debugging
    static getConfiguration() {
        return {
            apiBaseUrl: this.API_BASE_URL,
            hasApiKey: !!this.API_KEY,
            defaultModelType: this.DEFAULT_MODEL_TYPE,
            defaultModel: this.DEFAULT_MODEL
        };
    }

    // Parse the extracted resume JSON into a structured format with enhanced detail
    static parseResumeData(resumeJson: any): any {
        try {
            // Handle different possible response formats
            let parsedData = resumeJson;

            if (typeof resumeJson === 'string') {
                parsedData = JSON.parse(resumeJson);
            }

            // Enhanced normalization with more detailed structure
            return {
                personal: {
                    name: parsedData.name || parsedData.full_name || '',
                    email: parsedData.email || '',
                    phone: parsedData.phone || parsedData.phone_number || '',
                    location: parsedData.location || parsedData.address || '',
                    linkedin: parsedData.linkedin || parsedData.linkedin_url || '',
                    website: parsedData.website || parsedData.portfolio || '',
                    // Enhanced personal info
                    summary: parsedData.summary || parsedData.professional_summary || '',
                    objective: parsedData.objective || ''
                },

                // Enhanced education with more detail
                education: Array.isArray(parsedData.education) ? parsedData.education.map((edu: any) => ({
                    school: edu.school || edu.institution || edu.university || '',
                    degree: edu.degree || edu.degree_type || '',
                    field: edu.field || edu.major || edu.field_of_study || '',
                    gpa: edu.gpa || '',
                    start_date: edu.start_date || edu.from || '',
                    end_date: edu.end_date || edu.to || '',
                    location: edu.location || '',
                    // Additional education details
                    honors: edu.honors || [],
                    relevant_coursework: edu.relevant_coursework || edu.coursework || [],
                    thesis: edu.thesis || '',
                    activities: edu.activities || []
                })) : [],

                // Enhanced experience with detailed breakdown
                experience: Array.isArray(parsedData.experience) ? parsedData.experience.map((exp: any) => ({
                    company: exp.company || exp.employer || '',
                    position: exp.position || exp.title || exp.job_title || '',
                    start_date: exp.start_date || exp.from || '',
                    end_date: exp.end_date || exp.to || '',
                    location: exp.location || '',
                    highlights: Array.isArray(exp.highlights) ? exp.highlights :
                        Array.isArray(exp.responsibilities) ? exp.responsibilities :
                            typeof exp.description === 'string' ? [exp.description] : [],
                    // Enhanced experience details
                    achievements: exp.achievements || [],
                    technologies: exp.technologies || exp.tech_stack || [],
                    team_size: exp.team_size || '',
                    budget_managed: exp.budget_managed || '',
                    key_metrics: exp.key_metrics || []
                })) : [],

                // Enhanced skills with categorization
                skills: {
                    technical: Array.isArray(parsedData.technical_skills) ? parsedData.technical_skills :
                        Array.isArray(parsedData.skills) ? parsedData.skills :
                            typeof parsedData.skills === 'string' ? parsedData.skills.split(',').map((s: string) => s.trim()) : [],
                    soft: parsedData.soft_skills || [],
                    languages: parsedData.programming_languages || [],
                    tools: parsedData.tools || [],
                    frameworks: parsedData.frameworks || []
                },

                // Enhanced projects with more detail
                projects: Array.isArray(parsedData.projects) ? parsedData.projects.map((proj: any) => ({
                    title: proj.title || proj.name || '',
                    url: proj.url || proj.link || '',
                    description: proj.description || '',
                    technologies: Array.isArray(proj.technologies) ? proj.technologies :
                        typeof proj.technologies === 'string' ? proj.technologies.split(',').map((t: string) => t.trim()) : [],
                    // Enhanced project details
                    duration: proj.duration || '',
                    team_size: proj.team_size || '',
                    role: proj.role || '',
                    achievements: proj.achievements || [],
                    github_url: proj.github_url || proj.github || '',
                    live_url: proj.live_url || proj.demo || ''
                })) : [],

                // Enhanced certifications
                certifications: Array.isArray(parsedData.certifications) ? parsedData.certifications.map((cert: any) => ({
                    name: cert.name || cert.title || '',
                    issuing_organization: cert.issuing_organization || cert.issuer || '',
                    issue_date: cert.issue_date || cert.date || '',
                    expiration_date: cert.expiration_date || cert.expires || '',
                    // Enhanced certification details
                    credential_id: cert.credential_id || cert.id || '',
                    verification_url: cert.verification_url || cert.url || '',
                    description: cert.description || ''
                })) : [],

                // Enhanced awards
                awards: Array.isArray(parsedData.awards) ? parsedData.awards.map((award: any) => ({
                    title: award.title || award.name || '',
                    issuer: award.issuer || award.organization || '',
                    date_received: award.date_received || award.date || '',
                    description: award.description || '',
                    // Enhanced award details
                    level: award.level || '', // e.g., "National", "Regional", "Company"
                    value: award.value || '', // monetary value if applicable
                    criteria: award.criteria || ''
                })) : [],

                // Enhanced languages
                languages: Array.isArray(parsedData.languages) ? parsedData.languages.map((lang: any) => ({
                    name: typeof lang === 'string' ? lang : lang.name || lang.language || '',
                    proficiency: typeof lang === 'object' ? lang.proficiency || lang.level || '' : '',
                    // Enhanced language details
                    certification: lang.certification || '',
                    years_experience: lang.years_experience || ''
                })) : [],

                // Additional enhanced sections
                volunteer: Array.isArray(parsedData.volunteer) ? parsedData.volunteer.map((vol: any) => ({
                    organization: vol.organization || '',
                    role: vol.role || vol.position || '',
                    start_date: vol.start_date || '',
                    end_date: vol.end_date || '',
                    description: vol.description || '',
                    achievements: vol.achievements || []
                })) : [],

                publications: Array.isArray(parsedData.publications) ? parsedData.publications.map((pub: any) => ({
                    title: pub.title || '',
                    publication: pub.publication || pub.journal || '',
                    date: pub.date || '',
                    authors: pub.authors || [],
                    url: pub.url || '',
                    description: pub.description || ''
                })) : [],

                // Metadata about the parsing
                parsing_metadata: {
                    sections_found: Object.keys(parsedData).length,
                    has_detailed_experience: Array.isArray(parsedData.experience) && parsedData.experience.length > 0,
                    has_projects: Array.isArray(parsedData.projects) && parsedData.projects.length > 0,
                    has_certifications: Array.isArray(parsedData.certifications) && parsedData.certifications.length > 0,
                    has_education: Array.isArray(parsedData.education) && parsedData.education.length > 0,
                    extraction_quality: 'enhanced_detailed'
                }
            };
        } catch (error) {
            console.error('Error parsing resume data:', error);
            return null;
        }
    }
}
