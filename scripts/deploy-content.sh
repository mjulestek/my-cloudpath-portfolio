#!/usr/bin/env bash
#
# Content deploy — render __SITE_DOMAIN__ -> sync to S3 -> invalidate
# CloudFront. This is the SINGLE implementation of that logic in the repo:
# .github/workflows/deploy.yml calls this same script rather than
# reimplementing it, so there is exactly one place these three steps are
# defined, not two copies that can silently drift apart.
#
# Two calling contexts:
#   1. Manual (you, in a terminal) — SITE_BUCKET / CLOUDFRONT_DISTRIBUTION_ID
#      / SITE_DOMAIN are not set, so this script reads them live from
#      Terraform output.
#   2. GitHub Actions (.github/workflows/deploy.yml) — those three are
#      already set as environment variables (from repository variables,
#      see docs Phase 7.5) before this script runs, so it uses them
#      directly and skips the Terraform lookup entirely. This matters
#      beyond convenience: the deploy workflow's IAM role
#      (github-actions-deploy-role) deliberately has no permission to read
#      the Terraform state bucket (see docs Phase 7.3) — if this script
#      always shelled out to `terraform output`, it would fail under that
#      role. Skipping the lookup when the values are already known keeps
#      the deploy workflow within its intentionally narrow permissions.
#
# Run from ANYWHERE — it locates the repo root from its own file location,
# so `cd`ing into the wrong directory first (e.g. terraform/environments/prod)
# can't break it the way a raw `aws s3 sync public/ ...` command can.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TF_DIR="$REPO_ROOT/terraform/environments/prod"
PUBLIC_DIR="$REPO_ROOT/public"
BUILD_DIR="$REPO_ROOT/build"

echo "Repo root: $REPO_ROOT"

if [ ! -d "$PUBLIC_DIR" ]; then
  echo "ERROR: $PUBLIC_DIR not found. Is this script still inside scripts/ in the repo?"
  exit 1
fi

if [ -n "${SITE_BUCKET:-}" ] && [ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ] && [ -n "${SITE_DOMAIN:-}" ]; then
  echo "Using SITE_BUCKET / CLOUDFRONT_DISTRIBUTION_ID / SITE_DOMAIN already set in the environment (CI mode)."
else
  echo "Reading live values from Terraform state (manual mode)..."
  SITE_BUCKET=$(terraform -chdir="$TF_DIR" output -raw site_bucket_name)
  CLOUDFRONT_DISTRIBUTION_ID=$(terraform -chdir="$TF_DIR" output -raw cloudfront_distribution_id)
  SITE_DOMAIN=$(terraform -chdir="$TF_DIR" output -raw domain_name)
fi

echo "  Bucket:          $SITE_BUCKET"
echo "  Distribution ID: $CLOUDFRONT_DISTRIBUTION_ID"
echo "  Domain:          $SITE_DOMAIN"
echo

echo "Rendering public/ -> build/ (substituting __SITE_DOMAIN__)..."
rm -rf "$BUILD_DIR"
cp -r "$PUBLIC_DIR" "$BUILD_DIR"
if grep -rlq "__SITE_DOMAIN__" "$BUILD_DIR" 2>/dev/null; then
  grep -rl "__SITE_DOMAIN__" "$BUILD_DIR" | xargs -r sed -i "s#__SITE_DOMAIN__#$SITE_DOMAIN#g"
else
  echo "No __SITE_DOMAIN__ tokens found in build/ — skipping domain substitution."
fi

echo "Syncing to s3://$SITE_BUCKET ..."
aws s3 sync "$BUILD_DIR/" "s3://$SITE_BUCKET" \
  --delete \
  --cache-control "public,max-age=300"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths "/*"

echo
echo "Done. Verify at: https://$SITE_DOMAIN"
