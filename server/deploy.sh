#!/bin/bash
# ============================================
# Deploy InterviewHub Backend to GCP Cloud Run
# ============================================
#
# Prerequisites:
#   1. Install gcloud CLI: https://cloud.google.com/sdk/docs/install
#   2. Login: gcloud auth login
#   3. Create project: gcloud projects create interviewhub --name="InterviewHub"
#   4. Set project: gcloud config set project interviewhub
#   5. Enable APIs:
#      gcloud services enable run.googleapis.com
#      gcloud services enable cloudbuild.googleapis.com
#      gcloud services enable artifactregistry.googleapis.com
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
# ============================================

set -e

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
SERVICE_NAME="interviewhub-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "==> Building container image..."
gcloud builds submit --tag "${IMAGE_NAME}" .

echo "==> Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --port 4000 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "PORT=4000" \
  --set-env-vars "MONGODB_URI=${MONGODB_URI}" \
  --set-env-vars "JWT_SECRET=${JWT_SECRET}" \
  --set-env-vars "JWT_EXPIRES_IN=7d" \
  --set-env-vars "CLIENT_URL=${CLIENT_URL}" \
  --set-env-vars "JUDGE0_API_URL=${JUDGE0_API_URL}" \
  --set-env-vars "JUDGE0_API_KEY=${JUDGE0_API_KEY}" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --timeout 300

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format 'value(status.url)')
echo ""
echo "============================================"
echo "Backend deployed successfully!"
echo "URL: ${SERVICE_URL}"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Set this URL as VITE_API_URL in your frontend .env"
echo "  2. Update CLIENT_URL env var to your Cloudflare Pages URL:"
echo "     gcloud run services update ${SERVICE_NAME} --region ${REGION} --set-env-vars CLIENT_URL=https://your-app.pages.dev"
