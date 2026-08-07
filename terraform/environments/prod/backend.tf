# Partial backend config. Actual values (bucket, region, use_lockfile) come
# from backend-prod.hcl, passed at init time:
#
#   terraform init -backend-config=backend-prod.hcl
#
# Keeping these out of version-controlled .tf files means the same code
# can be reused for other environments (staging, etc.) with a different
# -backend-config file.
#
# Locking uses Terraform's native S3 lockfile mechanism (use_lockfile = true,
# requires Terraform >= 1.10) rather than a separate DynamoDB table — one
# fewer resource to provision and pay for, with the same guarantee: only one
# `apply` can hold the lock at a time.

terraform {
  backend "s3" {
    key     = "prod/static-site/terraform.tfstate"
    encrypt = true
  }
}
