# Vertex AI Usage Examples

This document provides practical examples of how to use Vertex AI in your application for resume and cover letter enhancement.

## Table of Contents
1. [Basic Setup](#basic-setup)
2. [Resume Enhancement](#resume-enhancement)
3. [Cover Letter Generation](#cover-letter-generation)
4. [Using the AI Enhancement Service](#using-the-ai-enhancement-service)
5. [Frontend Integration](#frontend-integration)
6. [Error Handling](#error-handling)

---

## Basic Setup

### Environment Configuration
Make sure your `.env.local` file is configured:

```env
GOOGLE_APPLICATION_CREDENTIALS=./tejas-vertex-test-key.json
GOOGLE_CLOUD_PROJECT=aiagent001-480703
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-2.0-flash-exp
NEXT_PUBLIC_RESUME_API_MODEL_TYPE=VertexAI
```

---

## Resume Enhancement

### Example 1: Direct Service Usage (Server-side)

```typescript
import { vertexAIService } from '@/services/vertexAIService';

async function enhanceResume(resumeText: string, jobDescription: string) {
    try {
        // Initialize the service (only needed once)
        await vertexAIService.initialize();
        
        // Enhance resume
        const result = await vertexAIService.enhanceResume(
            resumeText,
            jobDescription,
            {
                model: 'gemini-2.0-flash-exp',
                temperature: 0.7,
                maxOutputTokens: 8192
            }
        );
        
        console.log('Match Score:', result.match_score);
        console.log('Enhanced Summary:', result.enhancements.enhanced_summary);
        console.log('Strengths:', result.analysis.strengths);
        
        return result;
    } catch (error) {
        console.error('Enhancement failed:', error);
        throw error;
    }
}

// Usage
const resumeText = `
John Doe
Software Engineer
Email: john@example.com

PROFESSIONAL SUMMARY
Experienced software engineer with 5 years in web development...

EXPERIENCE
Senior Developer at Tech Corp (2020-2024)
- Built scalable web applications
- Led team of 3 developers
...
`;

const jobDescription = `
We are looking for a Senior Full Stack Developer...
Requirements:
- 5+ years of experience
- React, Node.js, TypeScript
- Cloud platforms (AWS/GCP)
...
`;

const enhanced = await enhanceResume(resumeText, jobDescription);
```

### Example 2: Using API Endpoint (Client or Server)

```typescript
async function enhanceResumeViaAPI(resumeText: string, jobDescription: string) {
    const response = await fetch('/api/vertex-enhance-resume', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            resumeText,
            jobDescription,
            options: {
                model: 'gemini-2.0-flash-exp',
                temperature: 0.7,
                maxOutputTokens: 8192
            }
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Enhancement failed');
    }
    
    const data = await response.json();
    return data;
}

// Usage
const result = await enhanceResumeViaAPI(resumeText, jobDescription);
console.log('Success:', result.success);
console.log('Match Score:', result.analysis.match_score);
console.log('Enhanced Skills:', result.enhancements.enhanced_skills);
```

### Example 3: With Retry Logic

```typescript
import { vertexAIService } from '@/services/vertexAIService';

async function enhanceResumeWithRetry(
    resumeText: string,
    jobDescription: string
) {
    try {
        await vertexAIService.initialize();
        
        // Use built-in retry mechanism
        const result = await vertexAIService.enhanceResume(
            resumeText,
            jobDescription,
            {
                model: 'gemini-2.0-flash-exp',
                temperature: 0.7,
                maxOutputTokens: 8192
            }
        );
        
        return result;
    } catch (error) {
        console.error('All retry attempts failed:', error);
        throw error;
    }
}
```

---

## Cover Letter Generation

### Example 4: Generate Cover Letter

```typescript
import { vertexAIService } from '@/services/vertexAIService';

async function generateCoverLetter(
    resumeText: string,
    jobDescription: string
) {
    try {
        await vertexAIService.initialize();
        
        const coverLetter = await vertexAIService.generateCoverLetter(
            resumeText,
            jobDescription,
            {
                model: 'gemini-2.0-flash-exp',
                temperature: 0.8  // Higher temperature for more creative writing
            }
        );
        
        console.log('Generated Cover Letter:');
        console.log(coverLetter);
        
        return coverLetter;
    } catch (error) {
        console.error('Cover letter generation failed:', error);
        throw error;
    }
}
```

### Example 5: Cover Letter via API

```typescript
async function generateCoverLetterViaAPI(
    resumeText: string,
    jobDescription: string
) {
    const response = await fetch('/api/vertex-generate-cover-letter', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            resumeText,
            jobDescription,
            options: {
                model: 'gemini-2.0-flash-exp',
                temperature: 0.8
            }
        })
    });
    
    if (!response.ok) {
        throw new Error('Failed to generate cover letter');
    }
    
    const data = await response.json();
    return data.coverLetter;
}
```

---

## Using the AI Enhancement Service

### Example 6: Using Existing AI Enhancement Service

```typescript
import { AIEnhancementService } from '@/services/aiEnhancementService';

async function enhanceWithService(
    resumeText: string,
    jobDescription: string
) {
    try {
        // The service automatically routes to Vertex AI based on modelType
        const result = await AIEnhancementService.enhanceWithOpenAI(
            resumeText,
            jobDescription,
            {
                modelType: 'VertexAI',  // Use Vertex AI
                model: 'gemini-2.0-flash-exp',
                fileId: 'my-resume-v1'
            }
        );
        
        // Result follows the standard AIEnhancementResponse interface
        console.log('Success:', result.success);
        console.log('Match Score:', result.analysis.match_score);
        console.log('Enhanced Summary:', result.enhancements.enhanced_summary);
        console.log('Cover Letter:', result.enhancements.cover_letter_outline);
        
        return result;
    } catch (error) {
        console.error('Enhancement failed:', error);
        throw error;
    }
}
```

### Example 7: Validate Before Enhancement

```typescript
import { AIEnhancementService } from '@/services/aiEnhancementService';

async function enhanceWithValidation(
    resumeText: string,
    jobDescription: string
) {
    // Validate inputs first
    const validation = AIEnhancementService.validateEnhancementRequest(
        jobDescription,
        { text: resumeText }
    );
    
    if (!validation.isValid) {
        throw new Error(validation.error);
    }
    
    // Proceed with enhancement
    const result = await AIEnhancementService.enhanceWithOpenAI(
        resumeText,
        jobDescription,
        {
            modelType: 'VertexAI',
            model: 'gemini-2.0-flash-exp'
        }
    );
    
    // Normalize response to ensure all fields are present
    const normalized = AIEnhancementService.normalizeEnhancementResponse(result);
    
    return normalized;
}
```

---

## Frontend Integration

### Example 8: React Component

```typescript
import React, { useState } from 'react';
import { AIEnhancementService } from '@/services/aiEnhancementService';

export function ResumeEnhancer() {
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleEnhance = async () => {
        try {
            setLoading(true);
            setError('');
            
            const enhanced = await AIEnhancementService.enhanceWithOpenAI(
                resumeText,
                jobDescription,
                {
                    modelType: 'VertexAI',
                    model: 'gemini-2.0-flash-exp'
                }
            );
            
            setResult(enhanced);
        } catch (err: any) {
            setError(err.message || 'Enhancement failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="resume-enhancer">
            <h2>AI Resume Enhancement</h2>
            
            <div className="input-section">
                <textarea
                    placeholder="Paste your resume here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    rows={10}
                />
                
                <textarea
                    placeholder="Paste job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={10}
                />
                
                <button 
                    onClick={handleEnhance}
                    disabled={loading || !resumeText || !jobDescription}
                >
                    {loading ? 'Enhancing...' : 'Enhance Resume'}
                </button>
            </div>
            
            {error && (
                <div className="error">
                    {error}
                </div>
            )}
            
            {result && (
                <div className="results">
                    <h3>Match Score: {result.analysis.match_score}%</h3>
                    
                    <div className="enhanced-summary">
                        <h4>Enhanced Summary</h4>
                        <p>{result.enhancements.enhanced_summary}</p>
                    </div>
                    
                    <div className="strengths">
                        <h4>Strengths</h4>
                        <ul>
                            {result.analysis.strengths.map((strength, idx) => (
                                <li key={idx}>{strength}</li>
                            ))}
                        </ul>
                    </div>
                    
                    <div className="suggestions">
                        <h4>Suggestions</h4>
                        <ul>
                            {result.analysis.suggestions.map((suggestion, idx) => (
                                <li key={idx}>{suggestion}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
```

---

## Error Handling

### Example 9: Comprehensive Error Handling

```typescript
import { vertexAIService } from '@/services/vertexAIService';

async function enhanceWithErrorHandling(
    resumeText: string,
    jobDescription: string
) {
    try {
        await vertexAIService.initialize();
        
        const result = await vertexAIService.enhanceResume(
            resumeText,
            jobDescription
        );
        
        return {
            success: true,
            data: result
        };
        
    } catch (error: any) {
        // Handle specific error types
        if (error.message.includes('credentials')) {
            return {
                success: false,
                error: 'Authentication failed. Please check your Vertex AI credentials.',
                errorType: 'AUTH_ERROR'
            };
        }
        
        if (error.message.includes('quota') || error.message.includes('429')) {
            return {
                success: false,
                error: 'Rate limit exceeded. Please try again in a few minutes.',
                errorType: 'RATE_LIMIT'
            };
        }
        
        if (error.message.includes('503') || error.message.includes('UNAVAILABLE')) {
            return {
                success: false,
                error: 'Service temporarily unavailable. Please try again.',
                errorType: 'SERVICE_UNAVAILABLE'
            };
        }
        
        // Generic error
        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.',
            errorType: 'UNKNOWN_ERROR',
            details: error.message
        };
    }
}
```

### Example 10: Progress Tracking

```typescript
import { vertexAIService } from '@/services/vertexAIService';

async function enhanceWithProgress(
    resumeText: string,
    jobDescription: string,
    onProgress: (message: string, progress: number) => void
) {
    try {
        onProgress('Initializing Vertex AI...', 10);
        await vertexAIService.initialize();
        
        onProgress('Analyzing resume...', 30);
        
        onProgress('Generating enhancements...', 50);
        const result = await vertexAIService.enhanceResume(
            resumeText,
            jobDescription
        );
        
        onProgress('Processing results...', 90);
        
        onProgress('Complete!', 100);
        
        return result;
        
    } catch (error) {
        onProgress('Error occurred', 0);
        throw error;
    }
}

// Usage
const result = await enhanceWithProgress(
    resumeText,
    jobDescription,
    (message, progress) => {
        console.log(`${progress}%: ${message}`);
        // Update UI progress bar
    }
);
```

---

## Response Structure

Here's what you get back from the enhancement:

```typescript
{
  "success": true,
  "analysis": {
    "match_score": 85,
    "strengths": [
      "Strong technical skills alignment",
      "Relevant industry experience"
    ],
    "gaps": [
      "Missing cloud platform experience",
      "Could add more quantified achievements"
    ],
    "suggestions": [
      "Add specific AWS/GCP certifications",
      "Quantify team size and impact"
    ],
    "keyword_analysis": {
      "missing_keywords": ["AWS", "Kubernetes", "CI/CD"],
      "present_keywords": ["React", "Node.js", "TypeScript"],
      "keyword_density_score": 72
    },
    "section_recommendations": {
      "skills": "Add cloud platforms and DevOps tools",
      "experience": "Add more quantified achievements",
      "education": "Include relevant certifications"
    }
  },
  "enhancements": {
    "enhanced_summary": "Results-driven Senior Software Engineer...",
    "enhanced_skills": ["React", "Node.js", "TypeScript", "AWS"],
    "enhanced_experience_bullets": [
      "Led team of 5 developers to deliver...",
      "Improved application performance by 40%..."
    ],
    "detailed_resume_sections": {
      "professional_summary": "...",
      "technical_skills": [...],
      "experience": [...],
      "education": [...]
    },
    "detailed_cover_letter": {
      "opening_paragraph": "Dear Hiring Manager...",
      "body_paragraph": "Throughout my career...",
      "closing_paragraph": "I look forward to..."
    }
  },
  "metadata": {
    "model_used": "gemini-2.0-flash-exp",
    "model_type": "VertexAI",
    "timestamp": "2024-12-09T10:30:00Z"
  }
}
```

---

## Best Practices

1. **Always validate inputs** before sending to API
2. **Handle errors gracefully** with user-friendly messages
3. **Show progress indicators** for better UX
4. **Cache results** when appropriate to save costs
5. **Monitor API usage** to stay within quotas
6. **Use appropriate temperature** (0.7 for structured, 0.8-0.9 for creative)
7. **Set reasonable token limits** to control costs
8. **Implement retry logic** for transient failures
9. **Log important events** for debugging
10. **Test with various input sizes** to ensure robustness

---

## Testing Tips

### Test Different Resume Lengths
- Short resume (1 page): ~500-1000 tokens
- Medium resume (2 pages): ~1000-2000 tokens
- Long resume (3+ pages): ~2000-4000 tokens

### Test Different Job Descriptions
- Brief JD: ~200-500 tokens
- Detailed JD: ~500-1500 tokens
- Very detailed JD: ~1500-3000 tokens

### Test Edge Cases
- Resume with special characters
- Resume in different formats
- Very technical vs. very generic JDs
- Resumes with gaps or unusual formatting

---

## Monitoring

Track these metrics:
- **Success rate**: % of successful enhancements
- **Average response time**: Time to complete enhancement
- **Token usage**: Input + output tokens per request
- **Error rate**: % of failed requests
- **User satisfaction**: Quality of enhancements

---

For more information, see:
- [VERTEX_AI_SETUP.md](./VERTEX_AI_SETUP.md) - Setup guide
- [VERTEX_AI_ENV_CONFIG.md](./VERTEX_AI_ENV_CONFIG.md) - Environment configuration

