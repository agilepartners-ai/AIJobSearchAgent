# Vertex AI Quick Reference Card

## 🚀 Quick Start (3 Steps)

```bash
# 1. Setup credentials
npm run setup-vertex

# 2. Start server
npm run dev

# 3. Test it works
curl -X POST http://localhost:3000/api/test-vertex
```

---

## 📝 Environment Variables

```env
# Required
GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64=<base64_string>
GOOGLE_CLOUD_PROJECT=aiagent001-480703
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-2.0-flash-exp
NEXT_PUBLIC_RESUME_API_MODEL_TYPE=VertexAI
```

---

## 💻 Usage Patterns

### Pattern 1: Direct Service (Server-side)
```typescript
import { vertexAIService } from '@/services/vertexAIService';

const result = await vertexAIService.enhanceResume(
    resumeText,
    jobDescription,
    { model: 'gemini-2.0-flash-exp' }
);
```

### Pattern 2: API Endpoint (Client/Server)
```typescript
const response = await fetch('/api/vertex-enhance-resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jobDescription })
});
const data = await response.json();
```

### Pattern 3: AI Enhancement Service (Existing)
```typescript
import { AIEnhancementService } from '@/services/aiEnhancementService';

const result = await AIEnhancementService.enhanceWithOpenAI(
    resumeText,
    jobDescription,
    { modelType: 'VertexAI' }
);
```

---

## 🎯 Available Models

| Model | Speed | Quality | Cost | Use Case |
|-------|-------|---------|------|----------|
| `gemini-2.0-flash-exp` | ⚡⚡⚡ | ⭐⭐⭐⭐ | 💰 | **Recommended** |
| `gemini-1.5-flash` | ⚡⚡⚡ | ⭐⭐⭐ | 💰 | Stable, fast |
| `gemini-1.5-pro` | ⚡⚡ | ⭐⭐⭐⭐⭐ | 💰💰💰 | High quality |
| `gemini-1.0-pro` | ⚡⚡ | ⭐⭐⭐⭐ | 💰💰 | Original |

---

## 🌍 Regions

| Region | Location | Latency (US) | Latency (Asia) | Latency (EU) |
|--------|----------|--------------|----------------|--------------|
| `us-central1` | Iowa | ⚡ Low | ⚡⚡ Medium | ⚡⚡ Medium |
| `us-east4` | Virginia | ⚡ Low | ⚡⚡⚡ High | ⚡⚡ Medium |
| `asia-east1` | Taiwan | ⚡⚡⚡ High | ⚡ Low | ⚡⚡⚡ High |
| `europe-west1` | Belgium | ⚡⚡ Medium | ⚡⚡⚡ High | ⚡ Low |

---

## 💰 Pricing (Gemini 2.0 Flash)

| Usage | Input Tokens | Output Tokens | Cost |
|-------|--------------|---------------|------|
| Per 1M tokens | 1,000,000 | 1,000,000 | $0.075 / $0.30 |
| Per enhancement | ~4,000 | ~6,000 | ~$0.002-$0.005 |
| 100 enhancements | ~400K | ~600K | ~$0.50 |
| 1,000 enhancements | ~4M | ~6M | ~$5.00 |

---

## 🔧 API Endpoints

### Test Connection
```bash
POST /api/test-vertex
```

### Enhance Resume
```bash
POST /api/vertex-enhance-resume
Body: { resumeText, jobDescription, options? }
```

### Generate Cover Letter
```bash
POST /api/vertex-generate-cover-letter
Body: { resumeText, jobDescription, options? }
```

---

## 📊 Response Structure

```typescript
{
  success: boolean,
  analysis: {
    match_score: number,        // 0-100
    strengths: string[],
    gaps: string[],
    suggestions: string[],
    keyword_analysis: {
      missing_keywords: string[],
      present_keywords: string[],
      keyword_density_score: number
    }
  },
  enhancements: {
    enhanced_summary: string,
    enhanced_skills: string[],
    enhanced_experience_bullets: string[],
    detailed_resume_sections: {...},
    detailed_cover_letter: {...}
  },
  metadata: {
    model_used: string,
    model_type: "VertexAI",
    timestamp: string
  }
}
```

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "Vertex AI not initialized" | Check `.env.local` exists and has credentials |
| "Failed to load credentials" | Run `npm run setup-vertex` |
| "Rate limit exceeded" | Wait a few minutes, check quota |
| "No valid JSON" | Lower temperature to 0.5-0.7 |
| Slow responses | Use Flash model, reduce tokens |

---

## 🔍 Testing Commands

```bash
# Test connection
curl -X POST http://localhost:3000/api/test-vertex

# Test resume enhancement
curl -X POST http://localhost:3000/api/vertex-enhance-resume \
  -H "Content-Type: application/json" \
  -d '{"resumeText":"John Doe...","jobDescription":"Senior Dev..."}'

# Test cover letter
curl -X POST http://localhost:3000/api/vertex-generate-cover-letter \
  -H "Content-Type: application/json" \
  -d '{"resumeText":"John Doe...","jobDescription":"Senior Dev..."}'
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `VERTEX_AI_README.md` | 📖 Main guide |
| `VERTEX_AI_SETUP.md` | 🔧 Setup instructions |
| `VERTEX_AI_USAGE_EXAMPLES.md` | 💻 Code examples |
| `VERTEX_AI_ENV_CONFIG.md` | ⚙️ Environment config |
| `test-vertex-integration.md` | ✅ Testing guide |
| `VERTEX_AI_SUMMARY.md` | 📝 What was added |
| `VERTEX_AI_QUICK_REFERENCE.md` | ⚡ This card |

---

## 🎯 Best Practices

1. ✅ **Validate inputs** before API calls
2. ✅ **Handle errors gracefully** with user messages
3. ✅ **Show progress** for better UX
4. ✅ **Cache results** when appropriate
5. ✅ **Monitor usage** to stay in quota
6. ✅ **Use Flash** for speed and cost
7. ✅ **Set token limits** to control costs
8. ✅ **Log important events** for debugging
9. ✅ **Test edge cases** thoroughly
10. ✅ **Rotate keys** every 90 days

---

## 🔒 Security Checklist

- [ ] Credentials in `.env.local` (not in code)
- [ ] `.env.local` in `.gitignore`
- [ ] Service account has minimal permissions
- [ ] Using base64 encoding for cloud
- [ ] Monitoring enabled in GCP Console
- [ ] Regular key rotation scheduled

---

## ⚡ Performance Tips

| Tip | Impact | Effort |
|-----|--------|--------|
| Use Flash model | ⚡⚡⚡ High | ⚡ Low |
| Reduce token limit | ⚡⚡ Medium | ⚡ Low |
| Cache responses | ⚡⚡⚡ High | ⚡⚡ Medium |
| Choose closer region | ⚡⚡ Medium | ⚡ Low |
| Batch requests | ⚡⚡ Medium | ⚡⚡⚡ High |

---

## 📞 Support

1. Check documentation files
2. Review server logs
3. Test with `/api/test-vertex`
4. Check GCP Console
5. Consult [Vertex AI docs](https://cloud.google.com/vertex-ai/docs)

---

## 🎉 Quick Win Checklist

- [ ] Run `npm run setup-vertex`
- [ ] Start server with `npm run dev`
- [ ] Test connection works
- [ ] Test resume enhancement
- [ ] Review response quality
- [ ] Integrate into UI
- [ ] Monitor costs
- [ ] Collect feedback

---

**Print this card for quick reference! 📄**

