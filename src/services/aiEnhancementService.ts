export interface AIEnhancementOptions {
    modelType?: string;
    model?: string;
    fileId?: string;
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

export class AIEnhancementService {
    private static readonly API_BASE_URL = import.meta.env.VITE_RESUME_API_BASE_URL || 'https://resumebuilder-arfb.onrender.com';
    private static readonly API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
    private static readonly DEFAULT_MODEL_TYPE = import.meta.env.VITE_RESUME_API_MODEL_TYPE || 'OpenAI';
    private static readonly DEFAULT_MODEL = import.meta.env.VITE_RESUME_API_MODEL || 'gpt-4o';

    // Enhance resume with file upload
    static async enhanceWithFile(
        file: File,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        try {
            // Validate API key
            if (!this.API_KEY) {
                throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your environment variables.');
            }

            // Create form data
            const formData = new FormData();

            // Add the resume file
            formData.append('file', file);

            // Add required fields
            formData.append('job_description', jobDescription);
            formData.append('api_key', this.API_KEY);

            // Add optional parameters
            formData.append('model_type', options.modelType || this.DEFAULT_MODEL_TYPE);
            formData.append('model', options.model || this.DEFAULT_MODEL);
            formData.append('file_id', options.fileId || `enhance_${Date.now()}`);

            console.log('Making AI enhancement request with file to:', `${this.API_BASE_URL}/api/ai-enhance`);

            const response = await fetch(`${this.API_BASE_URL}/api/ai-enhance`, {
                method: 'POST',
                body: formData,
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                },
                // 2 minutes timeout for AI processing
                signal: AbortSignal.timeout(120000)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            console.log('AI enhancement successful:', {
                success: data.success,
                matchScore: data.analysis?.match_score,
                hasEnhancements: !!data.enhancements
            });

            return data;
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

    // Enhance resume with JSON data
    static async enhanceWithJson(
        resumeJson: any,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        try {
            // Validate API key
            if (!this.API_KEY) {
                throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your environment variables.');
            }

            const requestData: AIEnhancementRequest = {
                resume_json: resumeJson,
                job_description: jobDescription,
                api_key: this.API_KEY,
                model_type: options.modelType || this.DEFAULT_MODEL_TYPE,
                model: options.model || this.DEFAULT_MODEL,
                file_id: options.fileId || `enhance_${Date.now()}`
            };

            console.log('Making AI enhancement request with JSON to:', `${this.API_BASE_URL}/api/ai-enhance`);

            const response = await fetch(`${this.API_BASE_URL}/api/ai-enhance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(requestData),
                // 2 minutes timeout for AI processing
                signal: AbortSignal.timeout(120000)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            console.log('AI enhancement successful:', {
                success: data.success,
                matchScore: data.analysis?.match_score,
                hasEnhancements: !!data.enhancements
            });

            return data;
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
            apiBaseUrl: this.API_BASE_URL,
            hasApiKey: !!this.API_KEY,
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
                    }
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