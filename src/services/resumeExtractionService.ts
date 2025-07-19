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
    private static readonly API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
    private static readonly DEFAULT_MODEL_TYPE = 'OpenAI';
    private static readonly DEFAULT_MODEL = 'gpt-4o';

    static async extractResumeJson(
        file: File,
        options: ResumeExtractionOptions = {}
    ): Promise<ResumeExtractionResponse> {
        try {
            // This is now just a mock response since we use direct OpenAI integration
            // In practice, the text extraction happens in the modal and we use OpenAI directly
            console.log('Mock resume extraction for:', file.name);

            return {
                success: true,
                resume_json: {
                    personal: {
                        name: 'Extracted from resume',
                        email: '',
                        phone: '',
                        location: ''
                    },
                    experience: [],
                    skills: [],
                    education: []
                },
                extracted_text_length: 1000,
                message: 'Resume data extracted successfully'
            };
        } catch (error: any) {
            console.error('Error in mock resume extraction:', error);
            return {
                success: false,
                resume_json: null,
                extracted_text_length: 0,
                error: error.message || 'Failed to extract resume data'
            };
        }
    }

    // Validate file before processing
    static validateResumeFile(file: File): { isValid: boolean; error?: string } {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            'application/pdf',
            'text/plain'
        ];

        if (!allowedTypes.includes(file.type)) {
            return {
                isValid: false,
                error: 'Only PDF and text files are supported'
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
            hasApiKey: !!this.API_KEY,
            defaultModelType: this.DEFAULT_MODEL_TYPE,
            defaultModel: this.DEFAULT_MODEL
        };
    }

    // Parse the extracted resume JSON into a structured format
    static parseResumeData(resumeJson: any): any {
        try {
            if (!resumeJson) return null;

            return {
                personal: {
                    name: resumeJson.personal?.name || '',
                    email: resumeJson.personal?.email || '',
                    phone: resumeJson.personal?.phone || '',
                    location: resumeJson.personal?.location || ''
                },
                education: Array.isArray(resumeJson.education) ? resumeJson.education : [],
                experience: Array.isArray(resumeJson.experience) ? resumeJson.experience : [],
                skills: Array.isArray(resumeJson.skills) ? resumeJson.skills : []
            };
        } catch (error) {
            console.error('Error parsing resume data:', error);
            return null;
        }
    }
}