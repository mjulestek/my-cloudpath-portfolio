
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
