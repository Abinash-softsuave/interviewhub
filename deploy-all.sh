#!/bin/bash
# =====================================================================
# InterviewHub - Full Deployment Script
# Deploys: Backend (GCP Cloud Run) + Frontend (Cloudflare Pages)
# =====================================================================
#
# Prerequisites:
#   - gcloud CLI installed and logged in
#   - wrangler CLI installed and logged in (npm i -g wrangler && wrangler login)
#   - MongoDB Atlas cluster created (see setup-atlas.md)
#
# Required environment variables (export before running):
#   export MONGODB_URI="mongodb+srv://..."
#   export JWT_SECRET="your-production-secret"
#   export CLIENT_URL=""  (will be updated after frontend deploys)
#   export JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"  (optional)
#   export JUDGE0_API_KEY="your-key"  (optional)
#
# Usage:
#   chmod +x deploy-all.sh
#   ./deploy-all.sh
# =====================================================================

set -e

echo "=========================================="
echo "  InterviewHub Deployment"
echo "=========================================="
echo ""

# --- Validate prerequisites ---
command -v gcloud >/dev/null 2>&1 || { echo "ERROR: gcloud CLI not installed. Install from https://cloud.google.com/sdk/docs/install"; exit 1; }
command -v wrangler >/dev/null 2>&1 || { echo "ERROR: wrangler CLI not installed. Run: npm i -g wrangler"; exit 1; }

if [ -z "$MONGODB_URI" ]; then
  echo "ERROR: MONGODB_URI not set. Export it before running."
  echo "  export MONGODB_URI=\"mongodb+srv://user:pass@cluster.mongodb.net/interviewhub\""
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo "WARNING: JWT_SECRET not set. Generating a random one..."
  JWT_SECRET=$(openssl rand -hex 32)
  echo "  Generated: ${JWT_SECRET:0:16}..."
fi

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo "ERROR: No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

REGION="us-central1"
BACKEND_SERVICE="interviewhub-api"
FRONTEND_PROJECT="interviewhub"

# ==============================
# STEP 1: Deploy Backend
# ==============================
echo ""
echo "[1/3] Deploying Backend to GCP Cloud Run..."
echo "     Project: ${PROJECT_ID}"
echo "     Region:  ${REGION}"
echo ""

cd server

gcloud builds submit --tag "gcr.io/${PROJECT_ID}/${BACKEND_SERVICE}" --quiet

gcloud run deploy "${BACKEND_SERVICE}" \
  --image "gcr.io/${PROJECT_ID}/${BACKEND_SERVICE}" \
  --platform managed \
  --region "${REGION}" \
  --port 4000 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,PORT=4000,MONGODB_URI=${MONGODB_URI},JWT_SECRET=${JWT_SECRET},JWT_EXPIRES_IN=7d,CLIENT_URL=https://${FRONTEND_PROJECT}.pages.dev,JUDGE0_API_URL=${JUDGE0_API_URL:-},JUDGE0_API_KEY=${JUDGE0_API_KEY:-}" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --timeout 300 \
  --quiet

BACKEND_URL=$(gcloud run services describe "${BACKEND_SERVICE}" --region "${REGION}" --format 'value(status.url)')
echo "Backend URL: ${BACKEND_URL}"

cd ..

# ==============================
# STEP 2: Deploy Frontend
# ==============================
echo ""
echo "[2/3] Deploying Frontend to Cloudflare Pages..."
echo ""

cd client

# Write production env
cat > .env.production <<EOF
VITE_API_URL=${BACKEND_URL}/api
VITE_SOCKET_URL=${BACKEND_URL}
EOF

npm ci
npm run build

wrangler pages deploy dist --project-name="${FRONTEND_PROJECT}" --commit-dirty=true

FRONTEND_URL="https://${FRONTEND_PROJECT}.pages.dev"

cd ..

# ==============================
# STEP 3: Update Backend CORS
# ==============================
echo ""
echo "[3/3] Updating backend CORS with frontend URL..."

gcloud run services update "${BACKEND_SERVICE}" \
  --region "${REGION}" \
  --update-env-vars "CLIENT_URL=${FRONTEND_URL}" \
  --quiet

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "  Frontend: ${FRONTEND_URL}"
echo "  Backend:  ${BACKEND_URL}"
echo "  Database: MongoDB Atlas (configured)"
echo ""
echo "  Test it:"
echo "    curl ${BACKEND_URL}/api/auth/login"
echo "    Open ${FRONTEND_URL} in browser"
echo ""
echo "=========================================="
