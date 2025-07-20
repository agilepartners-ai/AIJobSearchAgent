import { OpenAIResumeOptimizer } from './openaiService';

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
    private static readonly API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
    private static readonly DEFAULT_MODEL_TYPE = 'OpenAI';
    private static readonly DEFAULT_MODEL = 'gpt-4o';

    // Convert extracted resume text to enhancement response using OpenAI
    static async enhanceWithText(
        resumeText: string,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        try {
            // Validate API key
            if (!this.API_KEY) {
                throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your environment variables.');
            }

            console.log('Starting AI enhancement with OpenAI...');

            // Call OpenAI service directly
            const aiResults = await OpenAIResumeOptimizer.optimizeResume({
                resumeText: resumeText,
                jobDescription: jobDescription
            });

            // Transform OpenAI results to AIEnhancementResponse format
            const enhancementResponse: AIEnhancementResponse = {
                success: true,
                analysis: {
                    match_score: aiResults.matchScore,
                    strengths: aiResults.strengths,
                    gaps: aiResults.gaps,
                    suggestions: aiResults.suggestions,
                    keyword_analysis: {
                        missing_keywords: aiResults.keywordAnalysis.missingKeywords,
                        present_keywords: aiResults.keywordAnalysis.coveredKeywords,
                        keyword_density_score: aiResults.keywordAnalysis.coverageScore
                    },
                    section_recommendations: aiResults.aiEnhancements.sectionRecommendations
                },
                enhancements: {
                    enhanced_summary: aiResults.aiEnhancements.enhancedSummary,
                    enhanced_skills: aiResults.skillsOptimization.technicalSkills.concat(aiResults.skillsOptimization.softSkills),
                    enhanced_experience_bullets: aiResults.aiEnhancements.enhancedExperienceBullets,
                    cover_letter_outline: aiResults.aiEnhancements.coverLetterOutline
                },
                metadata: {
                    model_used: this.DEFAULT_MODEL,
                    model_type: this.DEFAULT_MODEL_TYPE,
                    timestamp: new Date().toISOString(),
                    resume_sections_analyzed: ['personal', 'experience', 'skills', 'education']
                },
                file_id: options.fileId || `enhance_${Date.now()}`
            };

            console.log('AI enhancement successful with OpenAI');
            return enhancementResponse;

        } catch (error: any) {
            console.error('Error in AI enhancement with OpenAI:', error);

            if (error.message.includes('API key')) {
                throw new Error('OpenAI API key is not properly configured. Please check your environment variables.');
            }

            throw new Error(error.message || 'Failed to enhance resume with AI');
        }
    }

    // Legacy method - now uses direct OpenAI
    static async enhanceWithFile(
        file: File,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        // Extract text from file first
        const text = await this.extractTextFromFile(file);
        return this.enhanceWithText(text, jobDescription, options);
    }

    // Legacy method - now uses direct OpenAI  
    static async enhanceWithJson(
        resumeJson: any,
        jobDescription: string,
        options: AIEnhancementOptions = {}
    ): Promise<AIEnhancementResponse> {
        // Convert JSON to text format
        const resumeText = this.convertJsonToText(resumeJson);
        return this.enhanceWithText(resumeText, jobDescription, options);
    }

    // Helper method to extract text from file
    private static async extractTextFromFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Helper method to convert JSON to text
    private static convertJsonToText(resumeJson: any): string {
        if (!resumeJson) return '';

        let text = '';

        // Add personal information
        if (resumeJson.personal) {
            text += `${resumeJson.personal.name || ''}\n`;
            text += `${resumeJson.personal.email || ''}\n`;
            text += `${resumeJson.personal.phone || ''}\n`;
            text += `${resumeJson.personal.location || ''}\n\n`;
        }

        // Add experience
        if (resumeJson.experience && Array.isArray(resumeJson.experience)) {
            text += 'EXPERIENCE:\n';
            resumeJson.experience.forEach((exp: any) => {
                text += `${exp.position || ''} at ${exp.company || ''}\n`;
                text += `${exp.description || ''}\n\n`;
            });
        }

        // Add skills
        if (resumeJson.skills) {
            text += 'SKILLS:\n';
            if (Array.isArray(resumeJson.skills.technical)) {
                text += `Technical: ${resumeJson.skills.technical.join(', ')}\n`;
            }
            if (Array.isArray(resumeJson.skills.soft)) {
                text += `Soft Skills: ${resumeJson.skills.soft.join(', ')}\n`;
            }
        }

        return text;
    }

    // Get current configuration for debugging
    static getConfiguration() {
        return {
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
