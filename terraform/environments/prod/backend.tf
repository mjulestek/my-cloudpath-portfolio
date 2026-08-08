

terraform {
  backend "s3" {
    key     = "prod/static-site/terraform.tfstate"
    encrypt = true
  }
}
