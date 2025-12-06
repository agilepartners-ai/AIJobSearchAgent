import type { NextApiRequest, NextApiResponse } from 'next';
import { AIEnhancementService, AIEnhancementResponse } from '../../services/aiEnhancementService';

// API route to handle resume enhancement with Vertex AI
// This runs on the server side where Vertex AI authentication works

interface EnhanceResumeRequest {
    resumeText: string;
    jobDescription: string;
    options?: {
        modelType?: string;
        model?: string;
        fileId?: string;
        userPromptOverride?: string;
        systemPromptOverride?: string;
    };
}

interface EnhanceResumeResponse {
    success: boolean;
    data?: AIEnhancementResponse;
    error?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<EnhanceResumeResponse>
) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }

    try {
        const { resumeText, jobDescription, options } = req.body as EnhanceResumeRequest;

        // Validate required fields
        if (!resumeText || typeof resumeText !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Resume text is required and must be a string.'
            });
        }

        if (!jobDescription || typeof jobDescription !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Job description is required and must be a string.'
            });
        }

        // Validate minimum lengths
        if (resumeText.trim().length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Resume text is too short. Please provide at least 50 characters.'
            });
        }

        if (jobDescription.trim().length < 30) {
            return res.status(400).json({
                success: false,
                error: 'Job description is too short. Please provide at least 30 characters.'
            });
        }

        console.log('🚀 [API] Starting Vertex AI resume enhancement...');
        console.log(`📝 [API] Resume length: ${resumeText.length} chars, Job description length: ${jobDescription.length} chars`);

        // Call the AI Enhancement Service (this runs server-side, so Vertex AI works)
        const result = await AIEnhancementService.enhanceWithOpenAI(
            resumeText,
            jobDescription,
            options || {}
        );

        console.log('✅ [API] Enhancement completed successfully');

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error: any) {
        console.error('❌ [API] Enhancement error:', error);

        // Determine appropriate status code and message
        const errorMessage = error?.message || 'Unknown error occurred';
        
        // Map error types to appropriate HTTP status codes
        let statusCode = 500;
        let userMessage = 'AI enhancement failed. Please try again.';

        if (errorMessage.includes('not configured') || errorMessage.includes('configuration')) {
            statusCode = 503;
            userMessage = 'AI service is not properly configured. Please contact support.';
        } else if (errorMessage.includes('authentication') || errorMessage.includes('permission') || errorMessage.includes('PERMISSION_DENIED')) {
            statusCode = 403;
            userMessage = 'AI service authentication failed. Please contact support.';
        } else if (errorMessage.includes('quota') || errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            statusCode = 429;
            userMessage = 'AI service is temporarily at capacity. Please wait a moment and try again.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('DEADLINE_EXCEEDED')) {
            statusCode = 504;
            userMessage = 'AI request timed out. Please try again with a shorter resume or job description.';
        } else if (errorMessage.includes('unavailable') || errorMessage.includes('UNAVAILABLE')) {
            statusCode = 503;
            userMessage = 'AI service is temporarily unavailable. Please try again in a few moments.';
        } else if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
            statusCode = 502;
            userMessage = 'AI response could not be processed. Please try again.';
        }

        return res.status(statusCode).json({
            success: false,
            error: userMessage
        });
    }
}

// Disable body size limit for larger resumes (default is 1mb)
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb',
        },
    },
};
