import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';

/**
 * Vertex AI Service for Resume and Cover Letter Enhancement
 * Uses Gemini models via Google Cloud Vertex AI
 */

interface VertexAIConfig {
    project: string;
    location: string;
    model: string;
}

interface GenerateContentOptions {
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
}

export class VertexAIService {
    private static instance: VertexAIService;
    private vertexAI: VertexAI | null = null;
    private config: VertexAIConfig;
    private credentials: any = null;

    private constructor() {
        // Default configuration
        this.config = {
            project: process.env.GOOGLE_CLOUD_PROJECT || 'aiagent001-480703',
            location: process.env.VERTEX_AI_LOCATION || 'us-central1',
            model: process.env.VERTEX_AI_MODEL || 'gemini-2.0-flash-exp'
        };
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): VertexAIService {
        if (!VertexAIService.instance) {
            VertexAIService.instance = new VertexAIService();
        }
        return VertexAIService.instance;
    }

    /**
     * Initialize Vertex AI with credentials
     */
    public async initialize(): Promise<void> {
        if (this.vertexAI) {
            return; // Already initialized
        }

        try {
            // Load credentials from environment or file
            await this.loadCredentials();

            // Initialize Vertex AI client
            this.vertexAI = new VertexAI({
                project: this.config.project,
                location: this.config.location,
            });

            console.log('✅ Vertex AI initialized successfully');
            console.log(`📋 Project: ${this.config.project}`);
            console.log(`📋 Location: ${this.config.location}`);
            console.log(`📋 Model: ${this.config.model}`);
        } catch (error: any) {
            console.error('❌ Failed to initialize Vertex AI:', error.message);
            throw new Error(`Vertex AI initialization failed: ${error.message}`);
        }
    }

    /**
     * Load credentials from environment variable or file
     */
    private async loadCredentials(): Promise<void> {
        try {
            // Try loading from base64 encoded environment variable first
            const base64Creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64;
            if (base64Creds) {
                const decodedJson = Buffer.from(base64Creds, 'base64').toString('utf-8');
                this.credentials = JSON.parse(decodedJson);
                
                // Write to a temporary file for the SDK to use
                const fs = require('fs');
                const path = require('path');
                const tmpDir = require('os').tmpdir();
                const credPath = path.join(tmpDir, 'vertex-ai-creds.json');
                fs.writeFileSync(credPath, decodedJson);
                process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
                
                console.log('✅ Loaded credentials from base64 environment variable');
                return;
            }

            // Try loading from JSON environment variable
            const jsonCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
            if (jsonCreds) {
                this.credentials = JSON.parse(jsonCreds);
                
                // Write to a temporary file for the SDK to use
                const fs = require('fs');
                const path = require('path');
                const tmpDir = require('os').tmpdir();
                const credPath = path.join(tmpDir, 'vertex-ai-creds.json');
                fs.writeFileSync(credPath, jsonCreds);
                process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
                
                console.log('✅ Loaded credentials from JSON environment variable');
                return;
            }

            // Check if file path is already set
            const credFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
            if (credFilePath) {
                console.log(`ℹ️ Using credentials from file: ${credFilePath}`);
                return;
            }

            throw new Error('No Vertex AI credentials found. Please set GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64, GOOGLE_APPLICATION_CREDENTIALS_JSON, or GOOGLE_APPLICATION_CREDENTIALS environment variable.');
        } catch (error: any) {
            console.error('❌ Failed to load credentials:', error.message);
            throw new Error(`Failed to load Vertex AI credentials: ${error.message}`);
        }
    }

    /**
     * Get a generative model instance
     */
    private getGenerativeModel(
        modelName?: string,
        systemInstruction?: string
    ): GenerativeModel {
        if (!this.vertexAI) {
            throw new Error('Vertex AI not initialized. Call initialize() first.');
        }

        const model = this.vertexAI.getGenerativeModel({
            model: modelName || this.config.model,
            systemInstruction: systemInstruction ? {
                role: 'system',
                parts: [{ text: systemInstruction }]
            } : undefined
        });

        return model;
    }

    /**
     * Generate content using Vertex AI Gemini models
     */
    public async generateContent(
        prompt: string,
        options: GenerateContentOptions = {}
    ): Promise<string> {
        await this.initialize();

        try {
            const model = this.getGenerativeModel(
                this.config.model,
                options.systemInstruction
            );

            const request = {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: options.temperature ?? 0.7,
                    maxOutputTokens: options.maxOutputTokens ?? 8192,
                    topP: options.topP ?? 0.95,
                    topK: options.topK ?? 40,
                }
            };

            console.log('🚀 Sending request to Vertex AI...');
            const result = await model.generateContent(request);
            
            // Extract text from response
            const response = result.response;
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

            if (!text) {
                console.error('❌ No text in response:', JSON.stringify(response, null, 2));
                throw new Error('No text content in Vertex AI response');
            }

            console.log('✅ Vertex AI response received');
            console.log(`📝 Response length: ${text.length} characters`);

            return text;
        } catch (error: any) {
            console.error('❌ Vertex AI generation error:', error.message);
            throw new Error(`Vertex AI generation failed: ${error.message}`);
        }
    }

    /**
     * Generate content with retry logic for handling rate limits and transient errors
     */
    public async generateContentWithRetry(
        prompt: string,
        options: GenerateContentOptions = {},
        maxRetries: number = 3
    ): Promise<string> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.generateContent(prompt, options);
            } catch (error: any) {
                lastError = error;
                
                // Check if error is retryable
                const isRetryable = 
                    error.message?.includes('503') || 
                    error.message?.includes('UNAVAILABLE') ||
                    error.message?.includes('overloaded') ||
                    error.message?.includes('429') ||
                    error.message?.includes('Too Many Requests') ||
                    error.message?.includes('RESOURCE_EXHAUSTED');

                if (!isRetryable || attempt === maxRetries) {
                    throw error;
                }

                // Calculate exponential backoff delay
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
                console.warn(`⚠️ Vertex AI error (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError || new Error('Vertex AI generation failed after retries');
    }

    /**
     * Enhance resume using Vertex AI
     */
    public async enhanceResume(
        resumeText: string,
        jobDescription: string,
        options: {
            model?: string;
            temperature?: number;
            maxOutputTokens?: number;
        } = {}
    ): Promise<any> {
        const systemInstruction = `You are an expert resume optimization AI assistant specializing in ATS optimization and job matching. Your task is to analyze a resume against a job description and provide comprehensive optimization recommendations.

Always include a compact, crisp, professional summary suitable for use at the top of a resume (2-3 sentences maximum). Keep this summary short, precise, and professional.

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
    "enhanced_summary": "AI-improved professional summary (2-3 sentences)",
    "enhanced_skills": ["prioritized technical and soft skills"],
    "enhanced_experience_bullets": ["improved bullet points with metrics"],
    "detailed_resume_sections": {
      "professional_summary": "SHORT 2-3 sentence professional summary",
      "technical_skills": ["comprehensive list of technical skills"],
      "soft_skills": ["relevant soft skills"],
      "experience": [detailed experience objects],
      "education": [detailed education objects],
      "projects": [detailed project objects],
      "certifications": [detailed certification objects]
    },
    "detailed_cover_letter": {
      "opening_paragraph": "engaging opening paragraph",
      "body_paragraph": "detailed body connecting experience to requirements",
      "closing_paragraph": "strong closing paragraph"
    },
    "cover_letter_outline": {
      "opening": "opening guidance",
      "body": "body guidance",
      "closing": "closing guidance"
    }
  }
}

Focus on:
1. ATS optimization and keyword matching
2. Quantifiable achievements and metrics
3. Industry-specific terminology
4. Proper formatting and structure
5. Tailoring content to specific job requirements

CRITICAL: The professional_summary must be SHORT (2-3 sentences, under 100 words).`;

        const userPrompt = `Please analyze and create detailed, comprehensive enhanced content for this resume and a personalized cover letter for the given job description.

Create a comprehensive analysis and detailed enhanced content following the JSON structure. Make sure all content is:
1. Highly detailed and professional
2. Tailored specifically to the job posting
3. Includes quantified achievements where possible
4. Uses industry-specific terminology
5. Optimized for ATS systems
6. Creates a compelling narrative for the candidate

CRITICAL: For the professional_summary field, write ONLY 2-3 SHORT sentences (maximum 100 words).

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME:
${resumeText}`;

        const responseText = await this.generateContentWithRetry(
            userPrompt,
            {
                systemInstruction,
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxOutputTokens ?? 8192,
            }
        );

        // Parse JSON response
        try {
            return this.parseAIResponse(responseText);
        } catch (error: any) {
            console.error('❌ Failed to parse AI response:', error.message);
            throw new Error('Failed to parse AI response. Please try again.');
        }
    }

    /**
     * Parse AI response and extract JSON
     */
    private parseAIResponse(responseText: string): any {
        try {
            // First attempt: direct JSON parse
            return JSON.parse(responseText);
        } catch (parseError) {
            console.warn('⚠️ Direct JSON parse failed, attempting extraction...');
            
            // Second attempt: extract JSON from markdown code blocks
            let jsonText = responseText;
            
            if (responseText.includes('```json')) {
                const jsonStart = responseText.indexOf('```json') + 7;
                const jsonEnd = responseText.indexOf('```', jsonStart);
                if (jsonEnd > jsonStart) {
                    jsonText = responseText.slice(jsonStart, jsonEnd).trim();
                }
            } else if (responseText.includes('```')) {
                const jsonStart = responseText.indexOf('```') + 3;
                const jsonEnd = responseText.indexOf('```', jsonStart);
                if (jsonEnd > jsonStart) {
                    jsonText = responseText.slice(jsonStart, jsonEnd).trim();
                }
            }
            
            // Third attempt: find JSON object boundaries
            const start = jsonText.indexOf('{');
            const end = jsonText.lastIndexOf('}');
            
            if (start !== -1 && end !== -1 && end > start) {
                jsonText = jsonText.slice(start, end + 1);
                return JSON.parse(jsonText);
            }
            
            throw new Error('No valid JSON found in response');
        }
    }

    /**
     * Generate cover letter using Vertex AI
     */
    public async generateCoverLetter(
        resumeText: string,
        jobDescription: string,
        options: {
            model?: string;
            temperature?: number;
        } = {}
    ): Promise<string> {
        const systemInstruction = `You are an expert cover letter writer. Create compelling, personalized cover letters that connect candidate experience to job requirements.`;

        const userPrompt = `Create a professional cover letter for this job application.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE RESUME:
${resumeText}

Write a compelling cover letter with:
1. Strong opening that mentions the specific role and company
2. 2-3 paragraphs connecting relevant experience to job requirements
3. Specific examples and achievements
4. Enthusiastic closing with call to action`;

        return await this.generateContentWithRetry(
            userPrompt,
            {
                systemInstruction,
                temperature: options.temperature ?? 0.8,
                maxOutputTokens: 2048,
            }
        );
    }

    /**
     * Get current configuration
     */
    public getConfig(): VertexAIConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    public updateConfig(config: Partial<VertexAIConfig>): void {
        this.config = { ...this.config, ...config };
        // Reset client to reinitialize with new config
        this.vertexAI = null;
    }
}

// Export singleton instance
export const vertexAIService = VertexAIService.getInstance();

