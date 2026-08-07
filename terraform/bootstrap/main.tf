###############################################################################
# BOOTSTRAP STACK
#
# This creates the S3 bucket used to store Terraform state for the MAIN
# stack (terraform/environments/prod). State locking is handled natively by
# the S3 backend itself (use_lockfile = true in backend-prod.hcl, Terraform
# >= 1.10) — no separate lock table needed.
#
# This stack intentionally uses LOCAL state, not remote state — you can't
# store this stack's state in a bucket that doesn't exist yet (chicken/egg).
#
# Run this ONCE per AWS account/environment. After it succeeds, commit the
# generated terraform.tfstate is fine to keep local/private (or move it to
# an existing "ops" bucket later) — it rarely needs to change again.
###############################################################################

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = var.state_bucket_name

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
