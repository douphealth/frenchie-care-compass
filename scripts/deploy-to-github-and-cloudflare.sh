#!/usr/bin/env bash
# Production release helper. Refuses to push or deploy unless explicitly confirmed.
# This does not run from CI. The owner runs it by hand after reviewing the diff.
set -euo pipefail

if [ "${CONFIRM_PRODUCTION_DEPLOY:-}" != "1" ]; then
  echo "Refusing to deploy. This script pushes the current branch to GitHub main and runs wrangler deploy."
  echo "Set CONFIRM_PRODUCTION_DEPLOY=1 only when you intend to change production."
  exit 1
fi

REPO_URL="https://github.com/douphealth/frenchie-care-compass.git"
BRANCH="main"

echo "1/4 Running typecheck, unit tests, and production build..."
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run build

echo "2/4 Preparing git commit on ${BRANCH}..."
if [ ! -d ".git" ]; then
  git init
  git remote add origin "$REPO_URL"
  git checkout -B "$BRANCH"
fi

git add -A
if git diff --cached --quiet; then
  echo "No file changes to commit."
else
  git commit -m "chore(release): launch-ready care compass"
fi

echo "3/4 Pushing to GitHub (${BRANCH}) to trigger Cloudflare Pages..."
git push -u origin "$BRANCH"

echo "4/4 Deploying the Cloudflare Worker for care-plan.frenchyfab.com..."
(cd worker && npx wrangler deploy)

echo "Done. Check https://care-plan.frenchyfab.com/api/ffab-care/v1/health"
