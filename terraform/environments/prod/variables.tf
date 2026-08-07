variable "aws_region" {
  description = "Primary AWS region for non-CloudFront/ACM resources"
  type        = string
  default     = "us-east-1"
}

variable "site_bucket_name" {
  description = "Globally-unique S3 bucket name for the static site content"
  type        = string
}

variable "domain_name" {
  description = "Primary domain, e.g. example.com"
  type        = string
}

variable "subject_alternative_names" {
  description = "Additional domain aliases, e.g. [\"www.example.com\"]"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ARN of a manually-created, already-ISSUED ACM certificate in us-east-1, covering domain_name and every entry in subject_alternative_names. Created and DNS-validated by hand in the ACM console — see docs/DEPLOYMENT_GUIDE.md Phase 4."
  type        = string
}
