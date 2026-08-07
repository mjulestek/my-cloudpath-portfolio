# Static Site on AWS — S3 + CloudFront + ACM

Stack: Git · GitHub · GitHub Actions · Terraform · S3 · CloudFront · ACM.

Full runbook, in two parts — **Part I: Infrastructure Provisioning** (one-time, produces a live HTTPS site) and **Part II: Deployment & CI/CD** (GitHub Actions, OIDC-authenticated, no server to run) — with the reasoning behind every step: **[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)**.

## Repo layout

```
.
├── public/                        # CloudPath portfolio site (HTML/CSS/JS, no build step)
│   ├── assets/{css,js,images}/
│   ├── data/                      # portable JSON mirror of projects/blog/certs
│   └── *.html                     # domain refs use __SITE_DOMAIN__ (rendered at deploy time)
├── terraform/
│   ├── bootstrap/                 # one-time: state bucket only (native S3 locking, no lock table)
│   └── environments/
│       └── prod/                  # all resources defined directly here (no module layer)
├── .github/
│   └── workflows/
│       ├── infra.yml              # terraform plan → approve (GitHub Environment) → apply
│       └── deploy.yml             # calls scripts/deploy-content.sh on every push to main
├── scripts/
│   └── deploy-content.sh          # single implementation: render __SITE_DOMAIN__ → s3 sync → cloudfront invalidation
└── docs/
    ├── DEPLOYMENT_GUIDE.md        # full phased runbook
    └── PORTFOLIO_DESIGN_NOTES.md  # content-editing guide, design tokens
```

## Before you deploy

Two placeholders in `public/` need your real info — contact email (currently `hello@cloudpath.dev`, in `assets/js/main.js` and `assets/js/navigation.js`) and name/bio/resume content (`index.html`, `about.html`, `resume.html`, `assets/resume.pdf`). Everything else (domain in canonical/OG tags, `robots.txt`, `sitemap.xml`) is templated as `__SITE_DOMAIN__` and filled in automatically by the deploy workflow — see `docs/DEPLOYMENT_GUIDE.md` Appendix D.

## Quickstart

```bash
# Phase 0 — install Git, Terraform >=1.10, AWS CLI; create an IAM user; `aws configure`

# PART I — INFRASTRUCTURE PROVISIONING

# Phase 1 — create + push the GitHub repo
git init && git add . && git commit -m "chore: initial project scaffold"

# Phase 2 — bootstrap the Terraform state backend (once)
cd terraform/bootstrap && terraform init && terraform apply

# Phase 3 — create + DNS-validate your ACM certificate manually in the
# AWS console (see docs/DEPLOYMENT_GUIDE.md) — Terraform doesn't create
# certificates in this project, it just references one by ARN

# Phase 4 — provision core infra
cd terraform/environments/prod
terraform init -backend-config=backend-prod.hcl
# set acm_certificate_arn (and the rest) in terraform.tfvars first
terraform apply

# Phase 5 — point domain at CloudFront (manual, in Namecheap)
terraform output cloudfront_domain_name

# Phase 6 (optional) — deploy content manually, before Actions exists
./scripts/deploy-content.sh

# PART II — DEPLOYMENT & CI/CD

# Phase 7 — set up OIDC trust, IAM roles, repo variables, push the
# workflow files in .github/workflows/ — no server, no static AWS keys
```

See `docs/DEPLOYMENT_GUIDE.md` for the full explanation of each step, troubleshooting, security notes, and teardown.
