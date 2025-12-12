import type { NextApiRequest, NextApiResponse } from 'next';
import { createVertex } from '@ai-sdk/google-vertex';
import { generateText } from 'ai';

// API route to handle resume enhancement with Vertex AI
// This runs on the server side where Vertex AI authentication works

interface EnhanceResumeRequest {
    resumeText: string;
    jobDescription: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
}

interface EnhanceResumeResponse {
    success: boolean;
    match_score?: number;
    analysis?: any;
    enhancements?: any;
    error?: string;
}

// Helper to reconstruct credentials from split environment variables
function getCredentialsFromEnv(): any {
    // Try single credential first (for local development)
    const credentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64;
    if (credentialsBase64) {
        return JSON.parse(Buffer.from(credentialsBase64, 'base64').toString());
    }
    
    // Try split credentials (for Netlify/Lambda with 4KB limit)
    // Credentials are split into GCP_CRED_PART_1, GCP_CRED_PART_2, etc.
    const parts: string[] = [];
    for (let i = 1; i <= 10; i++) {
        const part = process.env[`GCP_CRED_PART_${i}`];
        if (part) {
            parts.push(part);
        } else {
            break;
        }
    }
    
    if (parts.length > 0) {
        const fullBase64 = parts.join('');
        return JSON.parse(Buffer.from(fullBase64, 'base64').toString());
    }
    
    // Try individual credential fields (most compact approach)
    const privateKey = process.env.GCP_PRIVATE_KEY;
    const clientEmail = process.env.GCP_CLIENT_EMAIL;
    const projectId = process.env.GCP_PROJECT_ID;
    
    if (privateKey && clientEmail && projectId) {
        return {
            type: 'service_account',
            project_id: projectId,
            private_key: privateKey.replace(/\\n/g, '\n'),
            client_email: clientEmail,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
        };
    }
    
    throw new Error('No valid Google Cloud credentials found. Set GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64, GCP_CRED_PART_* variables, or individual GCP_PRIVATE_KEY + GCP_CLIENT_EMAIL.');
}

// Singleton for Vertex AI client
let vertexClient: ReturnType<typeof createVertex> | null = null;

function getVertexClient() {
    if (vertexClient) return vertexClient;

    const project = process.env.GCP_PROJECT_ID;
    const location = process.env.GCP_LOCATION || 'us-central1';

    if (!project) {
        throw new Error('GCP_PROJECT_ID is not configured');
    }

    // Get credentials using flexible approach
    const credentials = getCredentialsFromEnv();

    vertexClient = createVertex({
        project,
        location,
        googleAuthOptions: {
            credentials,
            projectId: project,
        },
    });

    console.log(`🚀 [Vertex AI] Initialized - Project: ${project}, Location: ${location}`);
    return vertexClient;
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
        const { resumeText, jobDescription, model, systemPrompt, userPrompt } = req.body as EnhanceResumeRequest;

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

        // Get Vertex AI client
        const vertex = getVertexClient();
        const modelId = model || 'gemini-2.0-flash';

        // Build prompt (use provided prompts or build default)
        let fullPrompt: string;
        if (systemPrompt && userPrompt) {
            fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
        } else {
            // Default prompt
            fullPrompt = buildDefaultPrompt(resumeText, jobDescription);
        }

        console.log(`📊 [API] Using model: ${modelId}, Prompt length: ${fullPrompt.length} chars`);

        // Call Vertex AI
        const result = await generateText({
            model: vertex(modelId),
            prompt: fullPrompt,
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192
        });

        const responseText = result?.text || '';

        if (!responseText) {
            throw new Error('Vertex AI returned an empty response');
        }

        console.log('✅ [API] Response received, parsing...');

        // Parse JSON response
        const aiResults = parseAIResponse(responseText);

        console.log('✅ [API] Enhancement completed successfully');

        return res.status(200).json({
            success: true,
            match_score: aiResults.match_score,
            analysis: aiResults.analysis,
            enhancements: aiResults.enhancements
        });

    } catch (error: any) {
        console.error('❌ [API] Enhancement error:', error);

        // Determine appropriate status code and message
        const errorMessage = error?.message || 'Unknown error occurred';
        
        // Map error types to appropriate HTTP status codes
        let statusCode = 500;
        let userMessage = errorMessage;

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
        } else if (errorMessage.includes('JSON') || errorMessage.includes('parse') || errorMessage.includes('SyntaxError')) {
            // JSON parsing errors - return 503 to trigger retry
            statusCode = 503;
            userMessage = 'AI response format issue. Please try again.';
        } else if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('network')) {
            statusCode = 503;
            userMessage = 'Network connection issue. Please try again.';
        }

        return res.status(statusCode).json({
            success: false,
            error: userMessage
        });
    }
}

// Robust JSON repair utilities
function repairJSON(jsonString: string): string {
    let text = jsonString;
    
    // Remove any BOM or invisible characters at the start
    text = text.replace(/^\uFEFF/, '').trim();
    
    // Remove any markdown formatting or extra text before/after JSON
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        text = text.slice(firstBrace, lastBrace + 1);
    }
    
    // Fix common issues with AI-generated JSON
    
    // 1. Remove trailing commas before ] or } (multiple passes for nested cases)
    for (let i = 0; i < 3; i++) {
        text = text.replace(/,(\s*[}\]])/g, '$1');
    }
    
    // 2. Fix missing commas between array elements - more comprehensive patterns
    // Handle: "value1" "value2" -> "value1", "value2"
    text = text.replace(/"(\s*)\n(\s*)"/g, '",$1\n$2"');
    // Handle: "value1"  "value2" on same line
    text = text.replace(/"(\s+)"/g, '", "');
    // Handle: } { -> }, {
    text = text.replace(/}(\s*)\n(\s*){/g, '},$1\n$2{');
    text = text.replace(/}(\s+){/g, '}, {');
    // Handle: ] " -> ], "
    text = text.replace(/](\s*)\n(\s*)"/g, '],$1\n$2"');
    text = text.replace(/](\s+)"/g, '], "');
    // Handle: " [ -> ", [
    text = text.replace(/"(\s*)\n(\s*)\[/g, '",$1\n$2[');
    // Handle: " { -> ", {
    text = text.replace(/"(\s*)\n(\s*){/g, '",$1\n$2{');
    // Handle: ] [ -> ], [
    text = text.replace(/](\s*)\n(\s*)\[/g, '],$1\n$2[');
    // Handle: } " -> }, "
    text = text.replace(/}(\s*)\n(\s*)"/g, '},$1\n$2"');
    
    // 3. Fix double commas that might have been introduced
    text = text.replace(/,(\s*),/g, ',');
    
    // 4. Fix missing quotes around property names (be careful with already quoted ones)
    text = text.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // 5. Replace single quotes with double quotes for string values
    text = text.replace(/:\s*'([^']*?)'/g, ': "$1"');
    
    // 6. Fix unquoted string values (simple cases)
    // Match: "key": value where value doesn't start with ", {, [, number, true, false, null
    text = text.replace(/":\s*([a-zA-Z][a-zA-Z0-9\s]*?)(\s*[,}\]])/g, (match, value, ending) => {
        const trimmedValue = value.trim();
        if (['true', 'false', 'null'].includes(trimmedValue.toLowerCase())) {
            return `": ${trimmedValue.toLowerCase()}${ending}`;
        }
        return `": "${trimmedValue}"${ending}`;
    });
    
    // 7. Fix newlines inside strings (replace with space)
    // This is tricky - we need to be careful not to break valid JSON
    // Look for patterns like "text\n  more text" inside string values
    text = text.replace(/"([^"]*)\n([^"]*)"/g, (match, before, after) => {
        // If this looks like it's inside a string value, fix it
        if (!before.includes(':') && !after.includes(':')) {
            return `"${before} ${after.trim()}"`;
        }
        return match;
    });
    
    // 8. Fix truncated JSON - try to close any unclosed structures
    const openBraces = (text.match(/{/g) || []).length;
    const closeBraces = (text.match(/}/g) || []).length;
    const openBrackets = (text.match(/\[/g) || []).length;
    const closeBrackets = (text.match(/]/g) || []).length;
    
    // Add missing closing brackets/braces
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
        text += ']';
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
        text += '}';
    }
    
    // 9. Remove any remaining trailing commas
    text = text.replace(/,(\s*[}\]])/g, '$1');
    
    // 10. Fix common escape issues - double-escaped quotes
    text = text.replace(/\\\\"/g, '\\"');
    
    return text;
}

// Try multiple parsing strategies
function parseAIResponse(responseText: string): any {
    const strategies: Array<() => any> = [];
    
    // Strategy 1: Direct parse
    strategies.push(() => JSON.parse(responseText));
    
    // Strategy 2: Extract from ```json code block
    strategies.push(() => {
        if (responseText.includes('```json')) {
            const start = responseText.indexOf('```json') + 7;
            const end = responseText.indexOf('```', start);
            if (end > start) {
                const jsonText = responseText.slice(start, end).trim();
                return JSON.parse(jsonText);
            }
        }
        throw new Error('No json code block');
    });
    
    // Strategy 3: Extract from ``` code block (without json tag)
    strategies.push(() => {
        if (responseText.includes('```')) {
            const start = responseText.indexOf('```') + 3;
            // Skip the language identifier if present
            const lineEnd = responseText.indexOf('\n', start);
            const contentStart = lineEnd > start ? lineEnd + 1 : start;
            const end = responseText.indexOf('```', contentStart);
            if (end > contentStart) {
                const jsonText = responseText.slice(contentStart, end).trim();
                return JSON.parse(jsonText);
            }
        }
        throw new Error('No code block');
    });
    
    // Strategy 4: Find JSON object boundaries
    strategies.push(() => {
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
            const jsonText = responseText.slice(jsonStart, jsonEnd + 1);
            return JSON.parse(jsonText);
        }
        throw new Error('No JSON boundaries found');
    });
    
    // Strategy 5: Repair and parse
    strategies.push(() => {
        const repaired = repairJSON(responseText);
        return JSON.parse(repaired);
    });
    
    // Strategy 6: Extract JSON, repair, and parse
    strategies.push(() => {
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
            const jsonText = responseText.slice(jsonStart, jsonEnd + 1);
            const repaired = repairJSON(jsonText);
            return JSON.parse(repaired);
        }
        throw new Error('No JSON to repair');
    });
    
    // Strategy 7: Extract from code block, repair, and parse
    strategies.push(() => {
        let jsonText = responseText;
        if (responseText.includes('```json')) {
            const start = responseText.indexOf('```json') + 7;
            const end = responseText.indexOf('```', start);
            if (end > start) {
                jsonText = responseText.slice(start, end).trim();
            }
        } else if (responseText.includes('```')) {
            const start = responseText.indexOf('```') + 3;
            const lineEnd = responseText.indexOf('\n', start);
            const contentStart = lineEnd > start ? lineEnd + 1 : start;
            const end = responseText.indexOf('```', contentStart);
            if (end > contentStart) {
                jsonText = responseText.slice(contentStart, end).trim();
            }
        }
        const repaired = repairJSON(jsonText);
        return JSON.parse(repaired);
    });
    
    // Strategy 8: Aggressive cleanup - remove all control characters and retry
    strategies.push(() => {
        let cleaned = responseText
            .replace(/[\x00-\x1F\x7F]/g, ' ') // Remove control characters
            .replace(/\s+/g, ' ')              // Normalize whitespace
            .trim();
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
            cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
        }
        return JSON.parse(repairJSON(cleaned));
    });
    
    // Strategy 9: Line-by-line array element repair
    strategies.push(() => {
        let jsonText = responseText;
        // Extract from code block if present
        if (responseText.includes('```json')) {
            const start = responseText.indexOf('```json') + 7;
            const end = responseText.indexOf('```', start);
            if (end > start) {
                jsonText = responseText.slice(start, end).trim();
            }
        } else if (responseText.includes('```')) {
            const start = responseText.indexOf('```') + 3;
            const lineEnd = responseText.indexOf('\n', start);
            const contentStart = lineEnd > start ? lineEnd + 1 : start;
            const end = responseText.indexOf('```', contentStart);
            if (end > contentStart) {
                jsonText = responseText.slice(contentStart, end).trim();
            }
        }
        
        // Extract JSON boundaries
        const jsonStart = jsonText.indexOf('{');
        const jsonEnd = jsonText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
            jsonText = jsonText.slice(jsonStart, jsonEnd + 1);
        }
        
        // Line-by-line repair
        const lines = jsonText.split('\n');
        const repairedLines: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const trimmedLine = line.trim();
            const nextLine = i < lines.length - 1 ? lines[i + 1]?.trim() : '';
            
            // Check if this line ends without a comma but should have one
            // Line ends with " or } or ] and next line starts with " or { or [
            if (trimmedLine && !trimmedLine.endsWith(',') && !trimmedLine.endsWith('{') && 
                !trimmedLine.endsWith('[') && !trimmedLine.endsWith(':')) {
                
                const endsWithValue = trimmedLine.endsWith('"') || 
                                     trimmedLine.endsWith('}') || 
                                     trimmedLine.endsWith(']') ||
                                     /\d$/.test(trimmedLine) ||
                                     trimmedLine.endsWith('true') ||
                                     trimmedLine.endsWith('false') ||
                                     trimmedLine.endsWith('null');
                
                const nextStartsWithValue = nextLine.startsWith('"') || 
                                           nextLine.startsWith('{') || 
                                           nextLine.startsWith('[');
                
                if (endsWithValue && nextStartsWithValue) {
                    line = line.trimEnd() + ',';
                }
            }
            
            repairedLines.push(line);
        }
        
        const repaired = repairedLines.join('\n');
        // Apply standard repairs too
        return JSON.parse(repairJSON(repaired));
    });
    
    // Strategy 10: Try to parse with JSON5-like tolerance (manual implementation)
    strategies.push(() => {
        let jsonText = responseText;
        // Extract JSON
        const jsonStart = jsonText.indexOf('{');
        const jsonEnd = jsonText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
            jsonText = jsonText.slice(jsonStart, jsonEnd + 1);
        }
        
        // Very aggressive fixes
        // Remove all newlines and normalize spaces
        jsonText = jsonText.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
        
        // Fix common array issues: "a" "b" -> "a", "b"
        jsonText = jsonText.replace(/" "/g, '", "');
        jsonText = jsonText.replace(/} {/g, '}, {');
        jsonText = jsonText.replace(/] "/g, '], "');
        jsonText = jsonText.replace(/" \[/g, '", [');
        jsonText = jsonText.replace(/" {/g, '", {');
        jsonText = jsonText.replace(/} "/g, '}, "');
        jsonText = jsonText.replace(/] \[/g, '], [');
        
        // Remove trailing commas
        jsonText = jsonText.replace(/,\s*}/g, '}');
        jsonText = jsonText.replace(/,\s*]/g, ']');
        
        return JSON.parse(jsonText);
    });
    
    // Try each strategy
    const errors: string[] = [];
    for (let i = 0; i < strategies.length; i++) {
        try {
            const result = strategies[i]();
            if (result && typeof result === 'object') {
                console.log(`✅ [API] JSON parsed successfully using strategy ${i + 1}`);
                return result;
            }
        } catch (err: any) {
            errors.push(`Strategy ${i + 1}: ${err.message}`);
        }
    }
    
    // All strategies failed - log details and return fallback
    console.error('❌ [API] All JSON parsing strategies failed:', errors.join('; '));
    console.error('❌ [API] Response text (first 500 chars):', responseText.slice(0, 500));
    console.error('❌ [API] Response text (last 500 chars):', responseText.slice(-500));
    
    // Return a fallback response structure instead of throwing
    // This allows the user to at least get some result
    return createFallbackResponse(responseText);
}

// Create a fallback response when JSON parsing fails
function createFallbackResponse(responseText: string): any {
    console.warn('⚠️ [API] Using fallback response due to parsing failure');
    
    // Try to extract any useful information from the text
    const hasStrengths = responseText.toLowerCase().includes('strength');
    const hasGaps = responseText.toLowerCase().includes('gap') || responseText.toLowerCase().includes('weakness');
    
    return {
        match_score: 70, // Default moderate score
        analysis: {
            strengths: hasStrengths 
                ? ['Resume analysis completed but full parsing failed - please regenerate for detailed results']
                : ['Unable to fully analyze - please try again'],
            gaps: hasGaps
                ? ['Some areas for improvement identified - regenerate for details']
                : [],
            suggestions: [
                'Please try generating again for complete analysis',
                'Consider simplifying resume format if issues persist'
            ],
            keyword_analysis: {
                missing_keywords: [],
                present_keywords: [],
                keyword_density_score: 50
            },
            section_recommendations: {
                skills: 'Unable to analyze - please regenerate',
                experience: 'Unable to analyze - please regenerate',
                education: 'Unable to analyze - please regenerate'
            }
        },
        enhancements: {
            enhanced_summary: 'Please regenerate for an enhanced summary.',
            enhanced_skills: [],
            enhanced_experience_bullets: [],
            cover_letter_outline: {
                opening: 'Please regenerate for cover letter content.',
                body: '',
                closing: ''
            },
            detailed_resume_sections: {},
            detailed_cover_letter: {}
        },
        metadata: {
            parsing_fallback: true,
            original_response_length: responseText.length
        }
    };
}

// Build default prompt for resume enhancement
function buildDefaultPrompt(resumeText: string, jobDescription: string): string {
    return `You are an expert resume analyst and career coach. Analyze the following resume against the job description and provide comprehensive enhancement suggestions.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

CRITICAL JSON FORMATTING REQUIREMENTS:
1. Respond with ONLY valid JSON - no markdown, no explanations, no text before or after
2. Use double quotes for ALL strings
3. Include commas between ALL array elements: ["item1", "item2", "item3"]
4. Include commas between ALL object properties
5. Do NOT include trailing commas before ] or }
6. Do NOT use single quotes - only double quotes
7. Escape any quotes inside strings with backslash: \\"

Respond with this exact JSON structure (fill in the values):
{
  "match_score": 75,
  "analysis": {
    "strengths": ["strength1", "strength2", "strength3"],
    "gaps": ["gap1", "gap2"],
    "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
    "keyword_analysis": {
      "missing_keywords": ["keyword1", "keyword2"],
      "present_keywords": ["keyword1", "keyword2"],
      "keyword_density_score": 70
    },
    "section_recommendations": {
      "skills": "recommendation text",
      "experience": "recommendation text",
      "education": "recommendation text"
    }
  },
  "enhancements": {
    "enhanced_summary": "A compelling 2-3 sentence professional summary.",
    "enhanced_skills": ["skill1", "skill2", "skill3"],
    "enhanced_experience_bullets": ["Achievement bullet 1", "Achievement bullet 2"],
    "cover_letter_outline": {
      "opening": "Opening paragraph text",
      "body": "Body paragraph text",
      "closing": "Closing paragraph text"
    }
  }
}

OUTPUT ONLY THE JSON OBJECT. NO OTHER TEXT.`;
}

// Disable body size limit for larger resumes (default is 1mb)
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb',
        },
    },
};
