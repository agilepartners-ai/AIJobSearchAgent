# Vertex AI Integration for AI Job Search Agent

## 🎯 Overview

This integration adds **Google Cloud Vertex AI** with **Gemini 2.0 Flash** (or other Gemini models) to your AI Job Search Agent for intelligent resume and cover letter enhancement.

### ✨ Features

- ✅ **Resume Enhancement**: AI-powered resume optimization with ATS scoring
- ✅ **Cover Letter Generation**: Personalized cover letters tailored to job descriptions
- ✅ **Gemini 2.0 Flash**: Latest Google AI model for fast, high-quality responses
- ✅ **Automatic Retry Logic**: Handles rate limits and transient errors
- ✅ **Flexible Authentication**: Multiple credential options for different environments
- ✅ **Type-Safe**: Full TypeScript support with comprehensive types
- ✅ **Easy Integration**: Works seamlessly with existing AI enhancement service

---

## 🚀 Quick Start

### 1. Install Dependencies
Already done! The `@google-cloud/vertexai` package is installed.

### 2. Setup Credentials
Run the setup script:
```bash
npm run setup-vertex
```

This will:
- Validate your service account key file
- Generate base64 encoded credentials
- Create/update `.env.local` with proper configuration

### 3. Start Development Server
```bash
npm run dev
```

### 4. Test the Integration
```bash
# Test Vertex AI connection
curl -X POST http://localhost:3000/api/test-vertex

# Test resume enhancement
curl -X POST http://localhost:3000/api/vertex-enhance-resume \
  -H "Content-Type: application/json" \
  -d '{"resumeText":"Your resume...","jobDescription":"Job description..."}'
```

---

## 📁 Project Structure

```
AIJobSearchAgent/
├── src/
│   ├── services/
│   │   ├── vertexAIService.ts          # Main Vertex AI service
│   │   └── aiEnhancementService.ts     # Updated with Vertex AI support
│   └── pages/
│       └── api/
│           ├── vertex-enhance-resume.ts        # Resume enhancement endpoint
│           ├── vertex-generate-cover-letter.ts # Cover letter endpoint
│           └── test-vertex.ts                  # Connection test endpoint
├── scripts/
│   └── setup-vertex-credentials.js     # Credential setup script
├── tejas-vertex-test-key.json         # Your service account key
├── .env.local                         # Environment configuration (auto-generated)
├── VERTEX_AI_SETUP.md                # Detailed setup guide
├── VERTEX_AI_USAGE_EXAMPLES.md       # Code examples
├── VERTEX_AI_ENV_CONFIG.md           # Environment configuration guide
└── VERTEX_AI_README.md               # This file
```

---

## 🔧 Configuration

### Environment Variables

Your `.env.local` file should contain:

```env
# Vertex AI Credentials (choose one option)
GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64=<base64_string>
# OR
GOOGLE_APPLICATION_CREDENTIALS=./tejas-vertex-test-key.json

# Vertex AI Settings
GOOGLE_CLOUD_PROJECT=aiagent001-480703
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-2.0-flash-exp

# Model Configuration
NEXT_PUBLIC_RESUME_API_MODEL_TYPE=VertexAI
NEXT_PUBLIC_RESUME_API_MODEL=gemini-2.0-flash-exp
```

### Available Models

- `gemini-2.0-flash-exp` - Latest experimental (Recommended)
- `gemini-1.5-flash` - Stable, fast, cost-effective
- `gemini-1.5-pro` - Higher quality, slower, more expensive
- `gemini-1.0-pro` - Original Pro model

### Available Regions

- `us-central1` (Iowa) - Default
- `us-east4` (Virginia)
- `us-west1` (Oregon)
- `asia-east1` (Taiwan)
- `europe-west1` (Belgium)

---

## 💻 Usage

### Option 1: Direct Service Usage (Server-side)

```typescript
import { vertexAIService } from '@/services/vertexAIService';

const result = await vertexAIService.enhanceResume(
    resumeText,
    jobDescription,
    {
        model: 'gemini-2.0-flash-exp',
        temperature: 0.7,
        maxOutputTokens: 8192
    }
);
```

### Option 2: Via API Endpoints

```typescript
const response = await fetch('/api/vertex-enhance-resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jobDescription })
});

const data = await response.json();
```

### Option 3: Through AI Enhancement Service

```typescript
import { AIEnhancementService } from '@/services/aiEnhancementService';

const result = await AIEnhancementService.enhanceWithOpenAI(
    resumeText,
    jobDescription,
    {
        modelType: 'VertexAI',
        model: 'gemini-2.0-flash-exp'
    }
);
```

---

## 📊 Response Structure

```typescript
{
  success: true,
  analysis: {
    match_score: 85,                    // 0-100 match score
    strengths: [...],                   // Resume strengths
    gaps: [...],                        // Areas for improvement
    suggestions: [...],                 // Specific recommendations
    keyword_analysis: {
      missing_keywords: [...],          // Missing ATS keywords
      present_keywords: [...],          // Found keywords
      keyword_density_score: 72         // Keyword optimization score
    },
    section_recommendations: {
      skills: "...",                    // Skills section advice
      experience: "...",                // Experience section advice
      education: "..."                  // Education section advice
    }
  },
  enhancements: {
    enhanced_summary: "...",            // Improved professional summary
    enhanced_skills: [...],             // Optimized skills list
    enhanced_experience_bullets: [...], // Better experience bullets
    detailed_resume_sections: {
      professional_summary: "...",
      technical_skills: [...],
      soft_skills: [...],
      experience: [...],
      education: [...],
      projects: [...],
      certifications: [...]
    },
    detailed_cover_letter: {
      opening_paragraph: "...",
      body_paragraph: "...",
      closing_paragraph: "..."
    }
  },
  metadata: {
    model_used: "gemini-2.0-flash-exp",
    model_type: "VertexAI",
    timestamp: "2024-12-09T10:30:00Z"
  }
}
```

---

## 🎨 Frontend Integration Example

```typescript
import { AIEnhancementService } from '@/services/aiEnhancementService';

function ResumeEnhancer() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleEnhance = async () => {
        setLoading(true);
        try {
            const enhanced = await AIEnhancementService.enhanceWithOpenAI(
                resumeText,
                jobDescription,
                { modelType: 'VertexAI' }
            );
            setResult(enhanced);
        } catch (error) {
            console.error('Enhancement failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <button onClick={handleEnhance} disabled={loading}>
                {loading ? 'Enhancing...' : 'Enhance Resume'}
            </button>
            {result && (
                <div>
                    <h3>Match Score: {result.analysis.match_score}%</h3>
                    <p>{result.enhancements.enhanced_summary}</p>
                </div>
            )}
        </div>
    );
}
```

---

## 🔍 Testing

### Test Connection
```bash
curl -X POST http://localhost:3000/api/test-vertex
```

Expected response:
```json
{
  "success": true,
  "project": "Project_id_here",
  "email": "vertex-ai-test@Project_id_here.iam.gserviceaccount.com"
}
```

### Test Resume Enhancement
```bash
curl -X POST http://localhost:3000/api/vertex-enhance-resume \
  -H "Content-Type: application/json" \
  -d '{
    "resumeText": "John Doe\nSoftware Engineer\n...",
    "jobDescription": "We are looking for a Senior Developer..."
  }'
```

---

## 💰 Pricing

**Gemini 2.0 Flash (Approximate)**
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

**Typical Resume Enhancement:**
- Input: ~3,000-5,000 tokens (resume + job description)
- Output: ~5,000-8,000 tokens (enhanced content)
- **Cost per enhancement: ~$0.002-$0.005** (less than half a cent!)

**Monthly Estimates:**
- 100 enhancements: ~$0.50
- 1,000 enhancements: ~$5.00
- 10,000 enhancements: ~$50.00

---

## 🛡️ Security Best Practices

1. ✅ **Never commit credentials** to version control
2. ✅ **Use environment variables** for all sensitive data
3. ✅ **Rotate service account keys** regularly (every 90 days)
4. ✅ **Use minimal permissions** for service accounts
5. ✅ **Enable audit logging** in Google Cloud Console
6. ✅ **Monitor API usage** for anomalies
7. ✅ **Use base64 encoding** for cloud deployments
8. ✅ **Keep `.env.local`** in `.gitignore`

---

## 🐛 Troubleshooting

### Error: "Vertex AI not initialized"
**Solution:** Check that credentials are properly set in `.env.local`

### Error: "Failed to load credentials"
**Solution:** 
- Verify JSON is valid
- Check file path is correct
- Ensure base64 encoding is correct

### Error: "No valid JSON found in response"
**Solution:**
- Lower the temperature (0.5-0.7)
- Check system instruction is being sent
- Try a different model

### Rate Limit Errors
**Solution:**
- Service automatically retries with backoff
- Check quota in Google Cloud Console
- Consider upgrading quota or switching regions

### Connection Timeout
**Solution:**
- Check internet connection
- Verify firewall settings
- Try a different region

---

## 📚 Documentation

- **[VERTEX_AI_SETUP.md](./VERTEX_AI_SETUP.md)** - Detailed setup instructions
- **[VERTEX_AI_USAGE_EXAMPLES.md](./VERTEX_AI_USAGE_EXAMPLES.md)** - Code examples
- **[VERTEX_AI_ENV_CONFIG.md](./VERTEX_AI_ENV_CONFIG.md)** - Environment configuration

---

## 🎯 Key Benefits

### vs. Direct Gemini API
- ✅ Better rate limits and quotas
- ✅ Enterprise-grade SLA
- ✅ Better integration with GCP services
- ✅ More control over deployment regions
- ✅ Better monitoring and logging

### vs. OpenAI
- ✅ Lower cost (Flash models)
- ✅ Faster responses (Flash models)
- ✅ Better for structured outputs
- ✅ Integrated with Google Cloud ecosystem

---

## 🚀 Next Steps

1. ✅ **Test the integration** with sample resumes
2. ✅ **Monitor performance** and costs
3. ✅ **Adjust model settings** based on quality needs
4. ✅ **Implement caching** to reduce API calls
5. ✅ **Add user feedback** to improve prompts
6. ✅ **Scale gradually** and monitor quotas

---

## 📞 Support

For issues or questions:
1. Check the documentation files
2. Review Google Cloud Console for API status
3. Check application logs for detailed errors
4. Test with `/api/test-vertex` endpoint
5. Consult [Vertex AI documentation](https://cloud.google.com/vertex-ai/docs)

---

## 📝 License

This integration is part of the AI Job Search Agent project.

---

**Happy Enhancing! 🎉**

