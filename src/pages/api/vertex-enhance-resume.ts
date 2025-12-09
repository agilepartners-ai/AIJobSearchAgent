import type { NextApiRequest, NextApiResponse } from 'next';
import { vertexAIService } from '../../services/vertexAIService';

/**
 * API endpoint for resume enhancement using Vertex AI
 * POST /api/vertex-enhance-resume
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

        console.log('🚀 Starting Vertex AI resume enhancement...');
        console.log(`📝 Resume length: ${resumeText.length} characters`);
        console.log(`📋 Job description length: ${jobDescription.length} characters`);

        // Enhance resume using Vertex AI
        const enhancement = await vertexAIService.enhanceResume(
            resumeText,
            jobDescription,
            {
                model: options.model,
                temperature: options.temperature,
                maxOutputTokens: options.maxOutputTokens
            }
        );

        console.log('✅ Vertex AI enhancement completed successfully');

        // Return enhanced resume data
        return res.status(200).json({
            success: true,
            analysis: enhancement.analysis || {},
            enhancements: enhancement.enhancements || {},
            metadata: {
                model_used: vertexAIService.getConfig().model,
                model_type: 'VertexAI',
                timestamp: new Date().toISOString(),
                resume_sections_analyzed: [
                    'summary',
                    'experience',
                    'skills',
                    'education',
                    'projects',
                    'certifications'
                ]
            },
            file_id: `vertex_enhance_${Date.now()}`
        });

    } catch (error: any) {
        console.error('❌ Vertex AI enhancement error:', error);

        // Return user-friendly error message
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to enhance resume with Vertex AI',
            timestamp: new Date().toISOString()
        });
    }
}

