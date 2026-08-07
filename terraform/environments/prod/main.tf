terraform {
  required_version = ">= 1.10.0" # native S3 state locking (use_lockfile) requires 1.10+
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

###############################################################################
# S3 bucket — static site content.
#
# The bucket stays fully PRIVATE. CloudFront reaches it via an Origin Access
# Control (OAC) further down — the current AWS-recommended pattern, which
# replaces the older Origin Access Identity (OAI) and avoids ever exposing
# S3 directly to the internet.
###############################################################################

resource "aws_s3_bucket" "site" {
  bucket = var.site_bucket_name

  # Safe here specifically because this bucket's contents are a DERIVED
  # output (deployed by Jenkins from public/ in Git), not a source of truth.
  # Without this, `terraform destroy` fails outright on a non-empty bucket
  # (or one with old object versions still present, even if it looks empty
  # in the console) — deliberately NOT set on the state bucket in
  # terraform/bootstrap, which holds the one thing that truly can't be
  # regenerated from anywhere else.
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket = aws_s3_bucket.site.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

###############################################################################
# ACM certificate.
#
# NOT managed by Terraform. Created manually in the ACM console (region
# us-east-1, required for CloudFront) and DNS-validated by hand in Namecheap
# — see docs/DEPLOYMENT_GUIDE.md Phase 4 for why this step is manual at all
# (no Route 53 zone for Terraform to auto-validate against).
#
# Terraform only needs the resulting ARN, supplied via var.acm_certificate_arn
# (see terraform.tfvars). This avoids Terraform polling ACM for issuance
# itself — the console's own status page does that instead, with no
# apply-time timeout to wait out.
###############################################################################

###############################################################################
# CloudFront distribution, with Origin Access Control (OAC) to the private
# S3 bucket above.
###############################################################################

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.site_bucket_name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = concat([var.domain_name], var.subject_alternative_names)
  price_class         = "PriceClass_100" # US/Canada/Europe edge locations only, cheapest tier

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    allowed_methods         = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD"]
    target_origin_id         = "s3-origin"
    viewer_protocol_policy   = "redirect-to-https"
    compress                 = true

    # AWS managed cache policy: "CachingOptimized"
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 404
    response_page_path = "/404.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

###############################################################################
# Bucket policy: allow ONLY this CloudFront distribution to read the bucket.
###############################################################################

data "aws_iam_policy_document" "allow_cloudfront" {
  statement {
    sid    = "AllowCloudFrontServicePrincipalReadOnly"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "allow_cloudfront" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.allow_cloudfront.json
}
