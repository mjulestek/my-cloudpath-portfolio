output "site_bucket_name" {
  value = aws_s3_bucket.site.id
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.site.domain_name
  description = "CNAME target for your apex/www records in Namecheap"
}

output "domain_name" {
  value       = var.domain_name
  description = "Real site domain — consumed by scripts/deploy-content.sh for domain templating"
}
