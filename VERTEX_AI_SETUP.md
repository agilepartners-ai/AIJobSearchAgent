# Vertex AI Setup Guide for AI Job Search Agent

This guide provides step-by-step instructions for setting up Google Cloud Vertex AI for the AI Job Search Agent.

## Prerequisites

1.  A Google Cloud Platform (GCP) Account.
2.  A Project created in the GCP Console.
3.  Billing enabled for your project (Vertex AI requires a billing account, though it has a free tier).

## Step 1: Enable the Vertex AI API

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Select your project from the top dropdown.
3.  In the search bar, type **"Vertex AI API"**.
4.  Click on **"Vertex AI API"** from the Marketplace results.
5.  Click **Enable**.

## Step 2: Create a Service Account

The application uses a Service Account to authenticate with Google Cloud securely from the server side.

1.  In the Google Cloud Console, go to **IAM & Admin** > **Service Accounts**.
2.  Click **+ CREATE SERVICE ACCOUNT**.
3.  **Service account details**:
    *   **Name**: `ai-job-agent-sa` (or similar).
    *   **ID**: This will auto-populate.
    *   **Description**: "Service account for AI Job Search Agent".
    *   Click **Create and Continue**.
4.  **Grant this service account access to project**:
    *   **Role**: Select **Vertex AI User** (or `Vertex AI Administrator` for full access).
    *   Click **Continue**.
5.  Click **Done**.

## Step 3: Generate a JSON Key

1.  In the Service Accounts list, click on the email address of the service account you just created.
2.  Go to the **Keys** tab.
3.  Click **Add Key** > **Create new key**.
4.  Select **JSON**.
5.  Click **Create**.
6.  A JSON file will automatically download to your computer. **Keep this file secure!** It contains your private credentials.

## Step 4: Configure Environment Variables

You need to extract values from the downloaded JSON file and add them to your `.env` file in the project root.

Open the downloaded JSON file. It will look something like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "ai-job-agent-sa@your-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

Update your `.env` file with the following variables:

```env
# Google Cloud Project ID
VERTEX_AI_PROJECT_ID=your-project-id

# The region where you want to run the model (e.g., us-central1)
VERTEX_AI_LOCATION=us-central1

# The client email from the JSON file
VERTEX_AI_CLIENT_EMAIL=ai-job-agent-sa@your-project-id.iam.gserviceaccount.com

# The private key from the JSON file
# IMPORTANT: Copy the entire string including "-----BEGIN PRIVATE KEY-----" and "\n" characters.
VERTEX_AI_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...YOUR_KEY_CONTENT...\n-----END PRIVATE KEY-----\n"
```

### ⚠️ Important Note on Private Keys

The `VERTEX_AI_PRIVATE_KEY` is sensitive to formatting.
*   **Copy the value exactly** as it appears in the JSON file.
*   It usually contains `\n` characters. **Do not replace them with actual newlines** in the `.env` file. Keep them as literal `\n` characters.
*   The application code includes logic to automatically handle these newline characters correctly.

## Step 5: Verify Setup

1.  Restart your development server to load the new environment variables:
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```
2.  Navigate to the **Dashboard** or **Job Search** page.
3.  Try to use the **AI Resume Enhancement** feature.

## Troubleshooting

### "Vertex AI service account credentials are missing"
*   Check that `VERTEX_AI_CLIENT_EMAIL` and `VERTEX_AI_PRIVATE_KEY` are set in your `.env` file.
*   Ensure you restarted the server after changing `.env`.

### "Invalid JWT Signature" or "Could not load default credentials"
*   This usually means the `VERTEX_AI_PRIVATE_KEY` is malformed.
*   Ensure the key starts with `-----BEGIN PRIVATE KEY-----` and ends with `-----END PRIVATE KEY-----`.
*   Ensure you copied the `\n` characters exactly from the JSON file.

### "Vertex AI API has not been used in project..."
*   You forgot to enable the API. Go back to **Step 1** and enable the "Vertex AI API".

### "Permission denied" or "403 Forbidden"
*   The service account does not have the correct role.
*   Go to **IAM & Admin** > **IAM**.
*   Find the service account email.
*   Click the pencil icon (Edit).
*   Add the role **Vertex AI User**.
