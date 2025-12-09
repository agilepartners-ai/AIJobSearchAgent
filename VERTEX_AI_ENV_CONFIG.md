# Vertex AI Environment Configuration

## Required Environment Variables

Add these variables to your `.env.local` file (for local development) or your deployment environment:

```env
# ===== Vertex AI Configuration =====

# Option 1: Base64 Encoded Service Account JSON (Recommended for Cloud)
GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64=<paste_base64_string_here>

# Option 2: JSON String (Alternative)
# GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}

# Option 3: File Path (For Local Development)
# GOOGLE_APPLICATION_CREDENTIALS=./tejas-vertex-test-key.json

# Vertex AI Settings
GOOGLE_CLOUD_PROJECT=aiagent001-480703
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-2.0-flash-exp

# ===== Model Configuration =====
# Set model type to use Vertex AI
NEXT_PUBLIC_RESUME_API_MODEL_TYPE=VertexAI
NEXT_PUBLIC_RESUME_API_MODEL=gemini-2.0-flash-exp
```

## How to Generate Base64 Encoded Credentials

### On Mac/Linux:
```bash
base64 -i tejas-vertex-test-key.json | tr -d '\n' > credentials-base64.txt
```

### On Windows (PowerShell):
```powershell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("tejas-vertex-test-key.json")) | Out-File -Encoding ASCII credentials-base64.txt
```

Then copy the contents of `credentials-base64.txt` and paste into your environment variable.

## Quick Start

1. **Create `.env.local` file** in your project root
2. **Copy the template** from above
3. **Add your credentials** using one of the three options
4. **Restart your development server**: `npm run dev`
5. **Test the connection**: Visit `http://localhost:3000/api/test-vertex`

## Verify Setup

Run this command to check if your credentials work:
```bash
curl -X POST http://localhost:3000/api/test-vertex
```

You should see a successful response with project information.

