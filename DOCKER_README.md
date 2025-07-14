# Docker Deployment Guide for Google Cloud Run

This guide provides instructions for building and deploying the AIJobSearchAgent application to Google Cloud Run using Docker.

## 📋 Prerequisites

- Docker installed locally
- Google Cloud SDK (`gcloud`) installed and configured
- Google Cloud project with billing enabled
- Required APIs enabled (Cloud Build, Cloud Run, Container Registry)

## 🏗️ Building the Image Locally

### 1. Build the Docker image

```bash
# Make the build script executable
chmod +x docker/build.sh

# Build and test the image
./docker/build.sh latest
```

### 2. Run locally for testing

```bash
# Run the container
docker run -p 8080:8080 aijobsearchagent:latest

# Test the application
curl http://localhost:8080/health
curl http://localhost:8080/
```

## 🚀 Deploying to Google Cloud Run

### Option 1: Using the deployment script (Recommended)

1. **Configure the deployment script:**
   ```bash
   # Edit docker/deploy-cloud-run.sh
   PROJECT_ID="your-actual-project-id"
   SERVICE_NAME="aijobsearchagent"
   REGION="us-central1"
   ```

2. **Run the deployment:**
   ```bash
   chmod +x docker/deploy-cloud-run.sh
   ./docker/deploy-cloud-run.sh latest
   ```

### Option 2: Manual deployment

1. **Authenticate with Google Cloud:**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable required APIs:**
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

3. **Build and push the image:**
   ```bash
   # Build using Cloud Build
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/aijobsearchagent:latest

   # Or build locally and push
   docker build -t gcr.io/YOUR_PROJECT_ID/aijobsearchagent:latest .
   docker push gcr.io/YOUR_PROJECT_ID/aijobsearchagent:latest
   ```

4. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy aijobsearchagent \
     --image gcr.io/YOUR_PROJECT_ID/aijobsearchagent:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --memory 512Mi \
     --cpu 1 \
     --min-instances 0 \
     --max-instances 10
   ```

### Option 3: Automated CI/CD with Cloud Build

1. **Set up Cloud Build trigger:**
   - Connect your repository to Cloud Build
   - Create a trigger that uses the `cloudbuild.yaml` file
   - Configure environment variables

2. **Push to your repository:**
   ```bash
   git push origin main
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
# Edit .env with your actual values
```

### Required Environment Variables for Production:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_TAVUS_API_KEY`: Your Tavus API key (if using AI features)

### Cloud Run Environment Variables:

Set these in Cloud Run console or via gcloud:

```bash
gcloud run services update aijobsearchagent \
  --region us-central1 \
  --set-env-vars "VITE_SUPABASE_URL=https://your-project.supabase.co" \
  --set-env-vars "VITE_SUPABASE_ANON_KEY=your-anon-key"
```

## 🔍 Monitoring and Debugging

### Health Checks

The application includes a health check endpoint at `/health`:

```bash
curl https://your-service-url.run.app/health
```

### Viewing Logs

```bash
# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=aijobsearchagent" --limit 50

# Stream logs in real-time
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=aijobsearchagent"
```

### Debugging Container Issues

```bash
# Run container interactively
docker run -it --entrypoint /bin/sh aijobsearchagent:latest

# Check container logs
docker logs container-id
```

## 🛡️ Security Features

The Docker image includes several security best practices:

- **Non-root user**: Runs as user `nextjs` (UID 1001)
- **Minimal base image**: Uses Alpine Linux for smaller attack surface
- **Security headers**: Configured in Nginx
- **Health checks**: Built-in health monitoring
- **Resource limits**: CPU and memory constraints

## 📊 Performance Optimization

- **Multi-stage build**: Reduces final image size
- **Nginx caching**: Static assets cached for 1 year
- **Gzip compression**: Enabled for text-based assets
- **Resource limits**: Optimized for Cloud Run

## 🔄 Updating the Application

1. **Make your changes**
2. **Build new image:**
   ```bash
   ./docker/build.sh v1.1.0
   ```
3. **Deploy update:**
   ```bash
   ./docker/deploy-cloud-run.sh v1.1.0
   ```

## 📈 Scaling Configuration

Cloud Run automatically scales based on traffic. Current configuration:

- **Min instances**: 0 (scales to zero when no traffic)
- **Max instances**: 10
- **Concurrency**: 80 requests per instance
- **Memory**: 512Mi
- **CPU**: 1 vCPU
- **Timeout**: 300 seconds

Adjust these values in the deployment script based on your needs.

## 🆘 Troubleshooting

### Common Issues:

1. **Build failures**: Check Docker logs and ensure all dependencies are available
2. **Health check failures**: Verify Nginx configuration and port settings
3. **Permission errors**: Ensure proper file ownership and permissions
4. **Memory issues**: Increase memory allocation in Cloud Run settings

### Getting Help:

- Check Cloud Run logs in Google Cloud Console
- Use `docker logs` for local debugging
- Verify environment variables are set correctly
- Test health endpoint: `curl https://your-service.run.app/health`

## 📝 Additional Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)