# CI/CD Pipeline for Google Cloud Run

This document provides instructions for setting up the CI/CD pipeline to build, publish, and deploy the AI Job Search Agent web application to Google Cloud Run.

## Overview

This directory contains all the necessary files for deploying to Google Cloud Run:

- `Dockerfile` - Multi-stage Docker build optimized for Cloud Run
- `nginx.conf` - Nginx configuration with dynamic port binding
- `cloudbuild.yaml` - Google Cloud Build configuration
- `deploy.sh` - Manual deployment script
- `.github-workflow-deploy-to-cloud-run.yml` - GitHub Actions workflow (move to `.github/workflows/`)

The deployment process:

1.  **Builds** a Docker image using the optimized Dockerfile
2.  **Pushes** the image to Google Artifact Registry
3.  **Deploys** to Cloud Run with proper configuration
4.  **Supports** both manual and automated CI/CD deployment

## Prerequisites

Before you can use this pipeline, you need:

*   A Google Cloud Platform (GCP) project for both development and production environments.
*   The `gcloud` CLI installed and authenticated locally for the initial setup.
*   Owner or sufficient IAM permissions in the GCP projects to create resources.
*   Docker installed locally (for manual deployment)

## Quick Deployment Guide

### Option 1: Manual Deployment (Recommended for testing)

1. **Set environment variables:**
   ```bash
   export PROJECT_ID="your-project-id"
   export SERVICE_NAME="myjobsearchagent"
   export REGION="us-central1"
   ```

2. **Run the deployment script:**
   ```bash
   chmod +x ci-cd-cloudrun/deploy.sh
   ./ci-cd-cloudrun/deploy.sh
   ```

### Option 2: Using Cloud Build directly

```bash
gcloud builds submit --config ci-cd-cloudrun/cloudbuild.yaml .
```

### Option 3: GitHub Actions (Automated CI/CD)

1. Move the workflow file: `mv ci-cd-cloudrun/.github-workflow-deploy-to-cloud-run.yml .github/workflows/deploy-to-cloud-run.yml`
2. Set up the required GitHub secrets (see detailed setup below)
3. Push to `main` or `develop` branch

## Setup Instructions 

Follow these steps for **each environment** (e.g., once for `dev` and once for `prod`).

### 1. Enable Google Cloud APIs

Enable the necessary APIs in your GCP project(s):

```bash
# Replace YOUR_PROJECT_ID with your actual GCP Project ID
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com --project=YOUR_PROJECT_ID
```

### 2. Create an Artifact Registry Repository

Create a Docker repository in Artifact Registry to store your images:

```bash
# Replace YOUR_PROJECT_ID, REPOSITORY_NAME, and GAR_LOCATION
gcloud artifacts repositories create REPOSITORY_NAME \
  --repository-format=docker \
  --location=GAR_LOCATION \
  --description="Docker repository for the application" \
  --project=YOUR_PROJECT_ID
```
*   `REPOSITORY_NAME`: e.g., `myjobsearchagent-dev-repo`
*   `GAR_LOCATION`: e.g., `us-central1` (must match the workflow file)

### 3. Create a Service Account

Create a dedicated service account for GitHub Actions to use for deployment:

```bash
# Replace YOUR_PROJECT_ID and a name for your service account
gcloud iam service-accounts create GITHUB_ACTIONS_SA \
  --display-name="GitHub Actions Deployer" \
  --project=YOUR_PROJECT_ID
```
*   `GITHUB_ACTIONS_SA`: e.g., `github-deployer-dev`

### 4. Grant IAM Permissions to the Service Account

Grant the necessary roles to your new service account:

```bash
# Replace YOUR_PROJECT_ID, GITHUB_ACTIONS_SA_EMAIL, and REPOSITORY_NAME
PROJECT_ID="YOUR_PROJECT_ID"
SA_EMAIL="GITHUB_ACTIONS_SA@${PROJECT_ID}.iam.gserviceaccount.com"

# Role for pushing to Artifact Registry
gcloud artifacts repositories add-iam-policy-binding REPOSITORY_NAME \
  --location=GAR_LOCATION \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer" \
  --project=${PROJECT_ID}

# Role for deploying to Cloud Run
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

# Role for the service account to act as a Cloud Run service identity
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"
```

### 5. Set up Workload Identity Federation

This is the most secure method for authenticating GitHub Actions to GCP, as it doesn't require exporting long-lived service account keys.

```bash
# Replace YOUR_PROJECT_ID, GITHUB_ACTIONS_SA_EMAIL, and your GitHub repo details
PROJECT_ID="YOUR_PROJECT_ID"
SA_EMAIL="GITHUB_ACTIONS_SA@${PROJECT_ID}.iam.gserviceaccount.com"
GH_REPO="your-github-username/your-repo-name"

# Create the Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Get the full ID of the pool
WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe "github-pool" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --format="value(name)")

# Create the Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Actions Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Allow the GitHub Actions service account to impersonate the GCP service account
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${GH_REPO}"
```

### 6. Configure GitHub Secrets

In your GitHub repository, go to `Settings` > `Secrets and variables` > `Actions` and add the following secrets. These are used by the workflow to authenticate and select the correct environment.

**For the Development Environment:**
*   `GCP_DEV_PROJECT_ID`: Your GCP Project ID for the dev environment.
*   `GCP_DEV_SERVICE_ACCOUNT`: The full email address of the service account you created for dev (e.g., `github-deployer-dev@your-project-id.iam.gserviceaccount.com`).

**For the Production Environment:**
*   `GCP_PROD_PROJECT_ID`: Your GCP Project ID for the prod environment.
*   `GCP_PROD_SERVICE_ACCOUNT`: The full email address of the service account you created for prod.

## How Environments Work

The workflow file (`deploy-to-cloud-run.yml`) uses conditional logic based on the Git branch:

*   **`develop` branch:** Uses the `GCP_DEV_*` secrets and deploys to a service named `myjobsearchagent-dev`.
*   **`main` branch:** Uses the `GCP_PROD_*` secrets and deploys to a service named `myjobsearchagent-prod`.

This ensures a clean separation between your deployment environments.
