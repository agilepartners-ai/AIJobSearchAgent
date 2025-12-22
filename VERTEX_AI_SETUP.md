# Vertex AI Setup Guide for AI Job Search Agent

This guide provides step-by-step instructions for setting up Google Cloud Vertex AI for the AI Job Search Agent.

## Prerequisites

1. A Google Cloud Platform (GCP) Account.
2. A Project created in the GCP Console.
3. Billing enabled for your project (Vertex AI requires a billing account, though it has a free tier).

## Step 1: Enable the Vertex AI API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project from the top dropdown.
3. In the search bar, type **"Vertex AI API"**.
4. Click on **"Vertex AI API"** from the Marketplace results.
5. Click **Enable**.

## Step 2: Create a Service Account

The application uses a Service Account to authenticate with Google Cloud securely from the server side.

1. In the Google Cloud Console, go to **IAM & Admin** > **Service Accounts**.
2. Click **+ CREATE SERVICE ACCOUNT**.
3. **Service account details**:
   - **Name**: `ai-job-agent-sa` (or similar).
   - **ID**: This will auto-populate.
   - **Description**: "Service account for AI Job Search Agent".
   - Click **Create and Continue**.
4. **Grant this service account access to project**:
   - **Role**: Select **Vertex AI User** (or `Vertex AI Administrator` for full access).
   - Click **Continue**.
5. Click **Done**.

## Step 3: Generate a JSON Key

1. In the Service Accounts list, click on the email address of the service account you just created.
2. Go to the **Keys** tab.
3. Click **Add Key** > **Create new key**.
4. Select **JSON**.
5. Click **Create**.
6. A JSON file will automatically download to your computer. **Keep this file secure!** It contains your private credentials.

## Step 4: Configure Environment Variables

You need to encode the entire JSON key file as Base64 and add it to your `.env` file.

### On Linux/Mac:
```bash
# Navigate to the directory with your JSON file
cd /path/to/download

# Encode the JSON file to Base64
cat your-service-account-key.json | base64 -w 0

# Copy the output (one long string)
```

### On Windows (PowerShell):
```powershell
# Navigate to the directory with your JSON file
cd C:\path\to\download

# Encode the JSON file to Base64
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("your-service-account-key.json"))

# Copy the output (one long string)
```

### Update your `.env` file:

```env
# Google Cloud Project ID (from the JSON file's "project_id" field)
GCP_PROJECT_ID=your-project-id

# The region where you want to run the model
GCP_LOCATION=us-central1

# The entire service account JSON file, Base64 encoded
GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64=ewogICJ0eXBlIjog....(your Base64 string)....
```

## Step 5: Verify Setup

1. Restart your development server to load the new environment variables:
   ```bash
   pnpm dev
   # or
   npm run dev
   # or
   yarn dev
   ```

2. Navigate to the **Dashboard** or **Job Search** page.
3. Try to use the **AI Resume Enhancement** feature.

## Troubleshooting

### "GCP_PROJECT_ID is not configured"
- Check that `GCP_PROJECT_ID` is set in your `.env` file.
- Ensure you restarted the server after changing `.env`.

### "GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64 is not configured"
- Check that you've encoded the entire JSON key file to Base64.
- Ensure the Base64 string is on a single line (no line breaks).
- Ensure you restarted the server after changing `.env`.

### "Invalid JWT Signature" or "Could not load default credentials"
- This usually means the Base64 string is corrupted or incomplete.
- Re-encode the JSON file and try again.
- Make sure the JSON file wasn't modified before encoding.

### "Vertex AI API has not been used in project..."
- You forgot to enable the API. Go back to **Step 1** and enable the "Vertex AI API".

### "Permission denied" or "403 Forbidden"
- The service account does not have the correct role.
- Go to **IAM & Admin** > **IAM**.
- Find the service account email.
- Click the pencil icon (Edit).
- Add the role **Vertex AI User**.

## SDK Information

This project uses the `@ai-sdk/google-vertex` package from Vercel's AI SDK for Vertex AI integration. The key features:

- **Base64 Credentials**: The entire service account JSON is encoded as Base64, eliminating private key formatting issues.
- **Server-Side Only**: The Vertex AI SDK runs only on the server (in API routes), not in the browser.
- **Model**: Uses `gemini-2.0-flash` by default (configurable via `NEXT_PUBLIC_RESUME_API_MODEL`).

For more information, see the [AI SDK Google Vertex documentation](https://sdk.vercel.ai/providers/ai-sdk-providers/google-vertex).
