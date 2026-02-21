#!/bin/bash
# ============================================
# Deploy InterviewHub Frontend to Cloudflare Pages
# ============================================
#
# Prerequisites:
#   1. Install Wrangler CLI: npm install -g wrangler
#   2. Login: wrangler login
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
# ============================================

set -e

PROJECT_NAME="interviewhub"

echo "==> Installing dependencies..."
npm ci

echo "==> Building for production..."
npm run build

echo "==> Deploying to Cloudflare Pages..."
wrangler pages deploy dist --project-name="${PROJECT_NAME}"

echo ""
echo "============================================"
echo "Frontend deployed successfully!"
echo "URL: https://${PROJECT_NAME}.pages.dev"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Go to Cloudflare Dashboard > Pages > ${PROJECT_NAME} > Settings > Environment Variables"
echo "  2. Add: VITE_API_URL = https://your-cloud-run-url/api"
echo "  3. Add: VITE_SOCKET_URL = https://your-cloud-run-url"
echo "  4. Redeploy for env vars to take effect"
