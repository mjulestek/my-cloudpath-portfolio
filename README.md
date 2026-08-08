# CloudPath Portfolio

A personal portfolio site, deployed to AWS with a real CI/CD pipeline — Terraform for infrastructure, GitHub Actions for deployment. No servers to babysit, no AWS keys sitting in GitHub.

[![Deploy](https://github.com/mjulestek/my-cloudpath-portfolio/actions/workflows/deploy.yml/badge.svg)](https://github.com/mjulestek/my-cloudpath-portfolio/actions/workflows/deploy.yml)

**Stack:** Git · GitHub · GitHub Actions · Terraform · S3 · CloudFront · ACM

## Architecture

![Architecture diagram: developer pushes to GitHub, triggering an infra workflow and a deploy workflow, both authenticating to AWS via OIDC; the infra workflow manages IAM, S3 state and site buckets, and CloudFront with ACM; Namecheap DNS points to CloudFront; visitors reach the site over HTTPS](docs/images/architecture.jpg)

## How it works

- `public/` — the site itself. Plain HTML/CSS/JS, no build step.
- `terraform/` — the AWS infrastructure, as code: a private S3 bucket, CloudFront in front of it, the Terraform state backend.
- `.github/workflows/` — two pipelines. One deploys content on every push to `main`. The other applies infrastructure changes, but only after a human approves the plan.
- `scripts/deploy-content.sh` — the actual deploy logic. The pipeline calls it, but you can run it yourself too.
- AWS auth happens via OIDC. No access keys stored anywhere, ever.

## Setting this up yourself

Everything — every click, every command, every mistake made along the way and how to avoid it — is in [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md). Start there.

Rough shape of it:

1. Install Git, Terraform, the AWS CLI.
2. Bootstrap a Terraform state bucket.
3. Get an ACM certificate — manual, one-time, through the AWS console.
4. `terraform apply` the actual infrastructure.
5. Point your domain at CloudFront.
6. Wire up GitHub Actions — OIDC trust, two scoped IAM roles, a few repo variables.
7. Push.

## Using this as your own template

Two things in `public/` are still placeholders:

- Contact email — `assets/js/main.js`, `assets/js/navigation.js`
- Name, bio, resume — `index.html`, `about.html`, `resume.html`, `assets/resume.pdf`

Swap those in. Your real domain gets filled in automatically at deploy time — nothing else to touch.
