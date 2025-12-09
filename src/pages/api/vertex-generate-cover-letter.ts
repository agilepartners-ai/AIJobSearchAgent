import type { NextApiRequest, NextApiResponse } from 'next';
import { vertexAIService } from '../../services/vertexAIService';

/**
 * API endpoint for cover letter generation using Vertex AI
 * POST /api/vertex-generate-cover-letter
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed. Use POST.' 
        });
    }

    try {
        const { resumeText, jobDescription, options = {} } = req.body;

        // Validate required fields
        if (!resumeText || typeof resumeText !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'resumeText is required and must be a string'
            });
        }

        if (!jobDescription || typeof jobDescription !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'jobDescription is required and must be a string'
            });
        }

        // Validate minimum lengths
        if (resumeText.trim().length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Resume text is too short. Please provide at least 50 characters.'
            });
        }

        if (jobDescription.trim().length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Job description is too short. Please provide at least 50 characters.'
            });
        }

        console.log('🚀 Starting Vertex AI cover letter generation...');

        // Generate cover letter using Vertex AI
        const coverLetter = await vertexAIService.generateCoverLetter(
            resumeText,
            jobDescription,
            {
                model: options.model,
                temperature: options.temperature
            }
        );

        console.log('✅ Vertex AI cover letter generated successfully');

        // Return cover letter
        return res.status(200).json({
            success: true,
            coverLetter,
            metadata: {
                model_used: vertexAIService.getConfig().model,
                model_type: 'VertexAI',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('❌ Vertex AI cover letter generation error:', error);

        // Return user-friendly error message
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate cover letter with Vertex AI',
            timestamp: new Date().toISOString()
        });
    }
}

