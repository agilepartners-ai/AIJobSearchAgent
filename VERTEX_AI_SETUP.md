# Vertex AI Integration Guide

This guide explains how to set up and use Vertex AI with Gemini models for resume and cover letter enhancement in your AI Job Search Agent application.

## Overview

Vertex AI provides access to Google's Gemini models through Google Cloud Platform. This integration uses:
- **Gemini 2.0 Flash Exp** (or other Gemini models)
- **Service Account Authentication**
- **Automatic retry logic** for handling rate limits
- **JSON response parsing** for structured data

## Prerequisites

1. **Google Cloud Project** with Vertex AI API enabled
2. **Service Account** with Vertex AI permissions
3. **Service Account Key** (JSON file)

## Setup Instructions

### 1. Google Cloud Setup

#### Enable Vertex AI API
```bash
gcloud services enable aiplatform.googleapis.com
```

#### Create Service Account (if not already created)
```bash
gcloud iam service-accounts create vertex-ai-service \
    --display-name="Vertex AI Service Account"
```

#### Grant Permissions
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:vertex-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"
```

#### Create Service Account Key
```bash
gcloud iam service-accounts keys create vertex-ai-key.json \
    --iam-account=vertex-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 2. Configure Environment Variables

You have **three options** for providing credentials:

#### Option 1: Base64 Encoded JSON (Recommended for Cloud Deployment)
```bash
# Encode your service account key
base64 -i tejas-vertex-test-key.json

# Add to .env.local or environment variables
GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64=<base64_encoded_string>
```

#### Option 2: JSON String (Good for environment variables)
```bash
# Add the entire JSON as a string
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"...","private_key":"..."}'
```

#### Option 3: File Path (Best for Local Development)
```bash
# Point to the JSON file
GOOGLE_APPLICATION_CREDENTIALS=./tejas-vertex-test-key.json
```

### 3. Set Vertex AI Configuration

Add these to your `.env.local` file:

```env
# Vertex AI Settings
GOOGLE_CLOUD_PROJECT=Project_id_here
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-2.0-flash-exp

# Model Configuration
NEXT_PUBLIC_RESUME_API_MODEL_TYPE=VertexAI
NEXT_PUBLIC_RESUME_API_MODEL=gemini-2.0-flash-exp
```

### 4. Available Regions

Choose the region closest to your users or where you have quota:

- `us-central1` (Iowa)
- `us-east4` (Virginia)
- `us-west1` (Oregon)
- `asia-east1` (Taiwan)
- `asia-northeast1` (Tokyo)
- `europe-west1` (Belgium)
- `europe-west4` (Netherlands)

## Available Gemini Models

### Current Models (as of Dec 2024)
- `gemini-2.0-flash-exp` - Latest experimental Flash model (Recommended)
- `gemini-1.5-flash` - Stable Flash model
- `gemini-1.5-pro` - Pro model with higher capabilities
- `gemini-1.0-pro` - Original Pro model

### Choosing a Model

**For Resume Enhancement:**
- **Recommended**: `gemini-2.0-flash-exp`
  - Fast responses
  - Good quality
  - Cost-effective
  
- **High Quality**: `gemini-1.5-pro`
  - Best quality
  - Slower responses
  - Higher cost

## Usage

### Option 1: Use Vertex AI Directly in Your Code

```typescript
import { vertexAIService } from './services/vertexAIService';

// Enhance resume
const enhancement = await vertexAIService.enhanceResume(
    resumeText,
    jobDescription,
    {
        model: 'gemini-2.0-flash-exp',
        temperature: 0.7,
        maxOutputTokens: 8192
    }
);

// Generate cover letter
const coverLetter = await vertexAIService.generateCoverLetter(
    resumeText,
    jobDescription,
    {
        model: 'gemini-2.0-flash-exp',
        temperature: 0.8
    }
);
```

### Option 2: Use API Endpoints

#### Enhance Resume
```bash
curl -X POST http://localhost:3000/api/vertex-enhance-resume \
  -H "Content-Type: application/json" \
  -d '{
    "resumeText": "Your resume text here...",
    "jobDescription": "Job description here...",
    "options": {
      "model": "gemini-2.0-flash-exp",
      "temperature": 0.7,
      "maxOutputTokens": 8192
    }
  }'
```

#### Generate Cover Letter
```bash
curl -X POST http://localhost:3000/api/vertex-generate-cover-letter \
  -H "Content-Type: application/json" \
  -d '{
    "resumeText": "Your resume text here...",
    "jobDescription": "Job description here...",
    "options": {
      "model": "gemini-2.0-flash-exp",
      "temperature": 0.8
    }
  }'
```

### Option 3: Use Through AI Enhancement Service

The AI Enhancement Service automatically routes to Vertex AI when configured:

```typescript
import { AIEnhancementService } from './services/aiEnhancementService';

const result = await AIEnhancementService.enhanceWithOpenAI(
    resumeText,
    jobDescription,
    {
        modelType: 'VertexAI',  // or 'Vertex' or 'vertex-ai'
        model: 'gemini-2.0-flash-exp'
    }
);
```

## Features

### Automatic Retry Logic
The service automatically retries failed requests with exponential backoff:
- Retries on 503, 429, and network errors
- Up to 3 retries with exponential backoff
- Jitter to avoid thundering herd

### JSON Response Parsing
Automatically extracts and parses JSON from:
- Direct JSON responses
- Markdown code blocks (```json)
- Text with embedded JSON

### Structured Output
Returns comprehensive analysis including:
- Match score (0-100)
- Strengths and gaps
- Keyword analysis
- Section recommendations
- Enhanced resume sections
- Cover letter content

## Testing

### Test Vertex AI Connection
```bash
curl -X POST http://localhost:3000/api/test-vertex \
  -H "Content-Type: application/json"
```

### Test Resume Enhancement
```bash
npm run dev
# Navigate to your app and test the resume enhancement feature
```

## Monitoring and Logging

The service logs important events:
- ✅ Successful initialization
- 🚀 Request start
- ⚠️ Retry attempts
- ❌ Errors
- 📝 Response details

Check your console/logs for detailed information.

## Pricing

Vertex AI pricing depends on:
- **Model**: Flash models are cheaper than Pro models
- **Tokens**: Input and output tokens are counted
- **Region**: Some regions have different pricing

**Approximate Costs (as of Dec 2024):**
- Gemini 2.0 Flash: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- Gemini 1.5 Pro: $1.25 per 1M input tokens, $5.00 per 1M output tokens

**Estimate for Resume Enhancement:**
- Input: ~2,000-5,000 tokens (resume + job description)
- Output: ~3,000-8,000 tokens (enhanced content)
- Cost per enhancement: $0.002-$0.005 (Flash) or $0.03-$0.05 (Pro)

## Troubleshooting

### Error: "Vertex AI not initialized"
- Check that credentials are properly set in environment variables
- Verify the service account has proper permissions

### Error: "Failed to load credentials"
- Ensure the JSON is valid
- Check that the file path is correct (for file-based auth)
- Verify base64 encoding is correct (for base64 auth)

### Error: "No valid JSON found in response"
- The model might have returned text instead of JSON
- Try adjusting the temperature (lower = more structured)
- Check the system instruction is being sent correctly

### Rate Limit Errors
- The service automatically retries with backoff
- If persistent, check your quota in Google Cloud Console
- Consider upgrading your quota or switching regions

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate service account keys** regularly
4. **Use minimal permissions** for service accounts
5. **Enable audit logging** in Google Cloud Console
6. **Monitor usage** to detect anomalies

## Migration from Gemini API

If you're currently using the direct Gemini API:

1. **Keep existing Gemini API code** - it still works
2. **Add Vertex AI as option** - set `modelType: 'VertexAI'`
3. **Test both implementations** - compare quality and performance
4. **Gradually migrate** - switch users over time
5. **Monitor costs** - Vertex AI pricing is different

## Support

For issues or questions:
1. Check Google Cloud Console for API status
2. Review logs for error messages
3. Test with the `/api/test-vertex` endpoint
4. Check Vertex AI documentation: https://cloud.google.com/vertex-ai/docs

## Next Steps

1. ✅ Configure environment variables
2. ✅ Test connection with `/api/test-vertex`
3. ✅ Test resume enhancement
4. ✅ Monitor performance and costs
5. ✅ Adjust model and settings as needed

