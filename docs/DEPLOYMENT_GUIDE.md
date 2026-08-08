# Deployment Runbook — Static Site on AWS

**Stack:** Git · GitHub · Jenkins · Terraform · S3 · CloudFront · ACM
**Audience:** written so a junior engineer with no prior exposure to this stack can follow every step and end up with a live site and a working CI/CD pipeline.

This document is organized in two parts:



Every step states **why** in 1–2 sentences, then **exactly what to do** — which button, which field, which command. Nothing is assumed to be "obvious."

⚠️ **Clipboard warning.** Some clipboard tools/browser extensions silently turn plain text into markdown links (`[text](url)`) on copy. If a pasted value ever contains a `[`, `]`, or `(https://` you didn't type, that's the cause, not a DNS or AWS fault. Prefer a source's own copy-icon button over copying from chat/documentation text, and paste into a plain text editor first when a value matters.

**On editing files in this guide:** any time you see "edit `file.tfvars`," open it in any text editor — VS Code (`code file.tfvars`), Notepad, or a terminal editor (`nano file.tfvars`). Save the file after editing before running the next command.

---

## Architecture

```
Developer ──push──▶ GitHub ──webhook──▶ Jenkins
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                                            │
             site-infra pipeline                          site-deploy pipeline
             (Jenkinsfile.infra)                           (Jenkinsfile.deploy)
             manual trigger, plan+approve+apply             runs on every push to main
                    │                                            │
                    ▼                                            ▼
              Terraform apply                              calls scripts/deploy-content.sh
                    │                                            │
                    ▼                                            ▼
     S3 (state, native lockfile)  ◀── remote state ──▶   S3 (site content, private)
                    │                                            │
                    ▼                                            │
     CloudFront (OAC) ◀── acm_certificate_arn (var) ─────────────┘
                    │
                    ▼
          Namecheap DNS (CNAME/ALIAS) ──▶ End user (HTTPS)

  ACM certificate: created manually in the console, DNS-validated by hand,
  then referenced by ARN — not created or polled by Terraform.

  scripts/deploy-content.sh is the SINGLE implementation of render/sync/
  invalidate — run by hand before Jenkins exists (Phase 6), and called
  directly by Jenkinsfile.deploy afterward (Phase 7). Never duplicated.
```

---
---

# Phase 0 — Tooling & Account Setup

**Exit condition:** Git, Terraform, and the AWS CLI are installed and verified; you have an AWS IAM user with configured credentials.

### 0.1 — Install Git

*Why:* version control for this project; also required on the Jenkins server later.

- **Windows:** download from [git-scm.com](https://git-scm.com), run the installer, accept the defaults.
- **macOS:** `brew install git`, or install Xcode Command Line Tools (`xcode-select --install`).
- **Linux (Debian/Ubuntu):** `sudo apt update && sudo apt install git`

Verify:
```bash
git --version
```

### 0.2 — Install Terraform (≥ 1.10)

*Why:* provisions every AWS resource in this project as code. Version 1.10+ specifically is required for native S3 state locking, used in Phase 4.

- **Windows:** `choco install terraform`, or download the zip from [terraform.io/downloads](https://developer.hashicorp.com/terraform/downloads) and add the extracted folder to your PATH.
- **macOS:** `brew tap hashicorp/tap && brew install hashicorp/tap/terraform`
- **Linux:** follow the apt-repository instructions on the Terraform downloads page (varies by distro).

Verify:
```bash
terraform version
```

### 0.3 — Install the AWS CLI (v2)

*Why:* lets Terraform and this project's deploy script authenticate to AWS; also used directly for troubleshooting throughout this guide.

Download the installer for your OS from [aws.amazon.com/cli](https://aws.amazon.com/cli/) and run it.

Verify:
```bash
aws --version
```

### 0.4 — Create an IAM user and configure credentials

*Why:* Terraform and the AWS CLI need a credential to act on your AWS account. A dedicated IAM user (not your root account login) is the standard practice — it can be revoked or rotated without touching the account itself.

1. Sign in at **console.aws.amazon.com**.
2. Search bar (top) → type **IAM** → open it.
3. Left sidebar → **Users** → **Create user**.
4. **User name** → e.g. `terraform-admin` → **Next**.
5. **Permissions options** → **Attach policies directly** → search `AdministratorAccess` → check it → **Next** → **Create user**.

   *This is broad on purpose for a personal/learning project run from your own machine — Phase 7 covers creating narrower, task-specific credentials for Jenkins.*
6. Click into the user you just created → tab **Security credentials** → scroll to **Access keys** → **Create access key**.
7. Choose **Command Line Interface (CLI)** → check the confirmation checkbox → **Next** → **Create access key**.
8. **Download the .csv file** — this is the only time AWS shows you the Secret Access Key.

Now configure the CLI to use it:
```bash
aws configure
```
Answer the four prompts:
```
AWS Access Key ID [None]: <paste from the .csv>
AWS Secret Access Key [None]: <paste from the .csv>
Default region name [None]: us-east-1
Default output format [None]: json
```

Verify:
```bash
aws sts get-caller-identity
```
Should print your account ID and the IAM user's ARN — confirms the CLI can reach AWS as you.

---
---

# PART I — INFRASTRUCTURE PROVISIONING

**Exit condition for this part:** the site is live at your real domain over HTTPS, serving actual content. Nothing in Part I depends on Jenkins.

## Phase 1 — Source Control Foundation

**Exit condition:** repository on GitHub with the project pushed, `main` protected.

### 1.1 — Create the GitHub repository

*Why:* GitHub is the trigger source for both Jenkins pipelines (Part II) and the single source of truth for application and infrastructure code together.

1. Go to **github.com** → click the **+** icon (top-right) → **New repository**.
2. **Repository name** → e.g. `aws-static-site-deploy`.
3. Choose **Private** or **Public**.
4. **Do not** check "Add a README file" — you already have project files locally.
5. **Create repository**. Copy the remote URL shown on the next page (the `https://github.com/...` or `git@github.com:...` one).

### 1.2 — Initialize and push

```bash
cd aws-static-site-deploy
git init
git add .
git commit -m "chore: initial project scaffold"
git remote add origin <the URL you copied>
git branch -M main
git push -u origin main
```

### 1.3 — Protect the main branch

*Why:* `main` drives production deploys automatically (Part II). A merge gate prevents an unreviewed change from reaching production directly.

GitHub repo page → **Settings → Branches → Add branch protection rule** → **Branch name pattern** → `main` → check **Require a pull request before merging** → **Create**.

---

## Phase 2 — Terraform State Backend

**Exit condition:** an S3 bucket exists for remote state; its name is recorded for Phase 4.

### 2.1 — Why this runs separately, with local state

*Why:* the S3 backend needs its bucket to exist before Terraform can store state in it — you cannot bootstrap a backend using the backend it will manage. This stack uses local state, once, purely to create the bucket every other stack will use.

Reference file: `terraform/bootstrap/main.tf`

### 2.2 — Set variables

*Why:* S3 bucket names must be globally unique across every AWS account on Earth, so a project-specific name is required.

```bash
cd terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars
```
Edit `terraform.tfvars`:
```hcl
aws_region        = "us-east-1"
state_bucket_name = "yourname-terraform-state-2026"   # must be globally unique
```

⚠️ Record this name now. Phase 4 requires a **second, different** bucket name for site content. Reusing the same name produces `BucketAlreadyOwnedByYou` in Phase 4 — a confusing error, since it reads as a permissions problem rather than a naming collision.

### 2.3 — Initialize and apply

*Why:* `terraform init` downloads the AWS provider plugin. `terraform apply` creates the versioned, encrypted S3 bucket that will hold every future `terraform.tfstate`. State locking happens natively through the S3 backend (Phase 4.1) — no DynamoDB table is created or required.

```bash
terraform init
terraform plan
terraform apply
```
Terraform prints the plan again and asks:
```
Enter a value:
```
Type `yes` and press Enter — this is the point AWS actually creates the resource.

⚠️ **Region consistency.** S3 bucket names are global, but each bucket lives in one region. If `aws_region` in `terraform.tfvars` ever diverges from the bucket's real region (a different CLI profile, a typo, a different machine), reads against the bucket's sub-resources fail with `PermanentRedirect` (`StatusCode: 301`) instead of a clear error. Check with `aws s3api get-bucket-location --bucket <name>` if this happens.

⚠️ **Reusing this template in an account where an older version already ran:** earlier versions of this stack also created a DynamoDB table named `terraform-state-locks`. The current template does not. A leftover table from a prior run causes `ResourceInUseException: Table already exists` here — it's unused and safe to delete: `aws dynamodb delete-table --table-name terraform-state-locks --region us-east-1`.

### 2.4 — Record the output

```bash
terraform output state_bucket_name
```
Copy this value — needed in Phase 4.1. This stack's own local `terraform.tfstate` is now sensitive (it describes your state infrastructure); it's already excluded via `.gitignore`.

---

## Phase 3 — ACM Certificate

**Exit condition:** a certificate in ACM (`us-east-1`) shows status **Issued**, covering every domain name this site will serve.

*Why this is manual, not Terraform-managed:* an earlier version of this stack had Terraform both request the certificate and poll ACM until issued, waiting up to 45 minutes per attempt. Every DNS mistake surfaced only after that wait, with no visibility into why. The ACM console shows the same validation records and live status immediately, with no polling and no timeout.

### 3.1 — Request the certificate

1. AWS Console → search **Certificate Manager** → open it.
2. Confirm the region dropdown (top-right) reads **US East (N. Virginia)** — required for CloudFront regardless of where your other resources live.
3. **Request a certificate → Request a public certificate → Next**.
4. **Fully qualified domain name** → your apex domain, e.g. `yourdomain.com`.
5. If you also want `www` now: click **Add another name to this certificate** → enter `www.yourdomain.com`. Otherwise leave it apex-only — fewer names means fewer DNS records that can go wrong on a first deploy.
6. **Validation method** → **DNS validation** (should already be selected) → leave **Key algorithm** at its default → **Request**.

### 3.2 — Add the DNS validation record(s)

1. Click into the new certificate → scroll to **Domains**. Each row has its own **CNAME name** and **CNAME value**, each with a small copy icon next to it — use those, not manual text selection.
2. For each row: click the copy icon next to **CNAME name**, paste into a plain text file first, and trim it down to the label before your base domain. For a `www` row, the trimmed label ends in `.www` — this is the single most common mistake at this step, and it produces no error message, only a certificate stuck indefinitely at `Pending validation`.
3. Copy **CNAME value** with its own copy icon.
4. Go to **Namecheap → Domain List → Manage → Advanced DNS → Add New Record**.
5. **Type** dropdown → **CNAME Record**. **Host** → the trimmed label from step 2. **Value** → the value from step 3, pasted exactly, including the trailing dot. **TTL** → leave as **Automatic**. Click the green checkmark to save.
6. Repeat for every row from step 1.

### 3.3 — Confirm issuance

*Why:* the certificate's console page re-checks and updates its own status automatically — no terminal command needed.

Wait for **Issued** at the top of the certificate's page; each domain row must independently show **Success** first.

⚠️ **Still `Pending validation` after 20+ minutes:** don't troubleshoot Terraform or networking — the DNS record is almost certainly wrong. Go back to Namecheap and *read* (don't copy) the Host/Value fields directly off the screen, comparing character-by-character against what ACM's console shows. Independently verify propagation at **dnschecker.org** (record type CNAME, the exact hostname from 3.2) before waiting further. If it shows nothing after 15–20 minutes on a record that looks correct, delete the row and re-add it fresh.

Copy the certificate's **ARN** from the top of the page once issued — needed in Phase 4.2.

---

## Phase 4 — Core Infrastructure

**Exit condition:** `terraform apply` completes in a single pass; S3 bucket and CloudFront distribution both exist.

*Structural note:* every resource here — S3 bucket, CloudFront distribution, Origin Access Control, bucket policy — is defined directly in `terraform/environments/prod/main.tf`, not split into module files. A module layer adds indirection without reuse value when there's only one call site.

### 4.1 — Configure the backend

*Why:* remote state in S3 is what makes concurrent or CI-driven `terraform apply` runs safe. Locking uses Terraform's native S3 lockfile (`use_lockfile = true`, requires Terraform ≥ 1.10) — no DynamoDB table.

```bash
cd terraform/environments/prod
cp backend-prod.hcl.example backend-prod.hcl
```
Edit `backend-prod.hcl`:
```hcl
bucket       = "yourname-terraform-state-2026"   # from Phase 2.4's output — NOT the placeholder value
region       = "us-east-1"
use_lockfile = true
```

```bash
terraform init -backend-config=backend-prod.hcl
```

⚠️ `cp file.example file` copies the placeholder content verbatim — it does not fill in real values for you. `terraform init` failing with `S3 bucket "yourcompany-terraform-state" does not exist` means this edit step was skipped.

### 4.2 — Set variables

```bash
cp terraform.tfvars.example terraform.tfvars
```
Edit `terraform.tfvars`:
```hcl
aws_region                = "us-east-1"
site_bucket_name          = "yourname-portfolio-site"     # globally unique, DIFFERENT from state bucket
domain_name                = "yourdomain.com"
subject_alternative_names  = []                            # or ["www.yourdomain.com"] if requested in Phase 3
acm_certificate_arn        = "arn:aws:acm:us-east-1:...:certificate/..."   # from Phase 3.3
```

| Field | What it does | Why it matters |
|---|---|---|
| `site_bucket_name` | Names the S3 bucket holding site content | Must be globally unique and different from `state_bucket_name` (Phase 2.2), or you get `BucketAlreadyOwnedByYou` |
| `domain_name` | The apex domain this site serves | Must exactly match what you requested in Phase 3.1 |
| `subject_alternative_names` | Any additional aliases (e.g. `www`) | Must exactly match the additional names on the Phase 3 certificate |
| `acm_certificate_arn` | Which certificate CloudFront uses | Must be `ISSUED` and cover every name above — CloudFront rejects a mismatched or pending certificate at apply time with a clear error |

### 4.3 — Plan, then apply

```bash
terraform plan
```
Expect: one `aws_s3_bucket`, one `aws_cloudfront_distribution`, one `aws_cloudfront_origin_access_control`, one `aws_s3_bucket_policy`. No ACM resources — Terraform doesn't create certificates in this project.

```bash
terraform apply
```
Type `yes` when prompted. With an already-issued certificate ARN supplied, there's nothing left to poll — this typically finishes in under a couple of minutes (CloudFront propagation is the slowest part, not certificate validation).

⚠️ **State upload failure** (`failed to upload state` / a network timeout writing to S3) writes recovery state to a local file, `errored.tfstate`, and says so in the error. Don't re-run `apply` first — confirm network stability (`nslookup google.com`), then `terraform state push errored.tfstate`, then `terraform plan` to confirm it landed, before continuing.

### 4.4 — Security model

*Why (learning):* the bucket has `block_public_acls`/`block_public_policy` all `true` — never reachable directly. A bucket policy grants read access only to this specific CloudFront distribution's ARN, via Origin Access Control — the current AWS-recommended pattern. Finding the bucket name grants nothing without the distribution.

### 4.5 — Why `force_destroy = true` on the site bucket, and not the state bucket

*Why (learning):* without it, `terraform destroy` fails on a non-empty bucket — including one that looks empty in the console but still holds old object versions, since versioning is enabled. The site bucket's content is always reproducible from `public/` in Git (Phase 6), so `force_destroy = true` is safe. The state bucket **is** the original — its `.tfstate` exists nowhere else — so it keeps `force_destroy` unset and `lifecycle { prevent_destroy = true }` instead.

---

## Phase 5 — DNS Cutover

**Exit condition:** the domain resolves to CloudFront over HTTPS.

*Certificate validation already happened in Phase 3 — this phase only routes traffic.*

### 5.1 — Point the domain at CloudFront

```bash
terraform output cloudfront_domain_name
```
Copy the printed value (looks like `d1a2b3c4d5e6f7.cloudfront.net`).

In **Namecheap → Domain List → Manage → Advanced DNS → Add New Record**:

- **Apex/root** (`yourdomain.com`) → **Type: ALIAS Record** → **Host: `@`** → **Value:** the CloudFront domain above. *(Namecheap doesn't support CNAME at the root — a DNS spec limitation, not a Namecheap one — ALIAS behaves like a CNAME but is legal at the apex. If your plan doesn't offer ALIAS, use domain forwarding instead.)*
- **`www`** (only if it's on the certificate from Phase 3) → **Type: CNAME Record** → **Host: `www`** → **Value:** same CloudFront domain.

⚠️ **Every `terraform destroy` + `apply` cycle changes the CloudFront domain.** It is not stable across a destroy/recreate. Both records above need updating to the new value after any full recreate — not just the first time.

### 5.2 — Verify

```bash
curl -I https://<domain>
```
Expect `HTTP/2 200` and `server: CloudFront`. At this point in the runbook you'll instead get `HTTP/2 403` with `server: AmazonS3` — expected, not a fault: DNS, TLS, and CloudFront are all working, but the bucket has no content yet. Phase 6 resolves this.

An SSL handshake failure on an alias means either the DNS record wasn't updated or the certificate doesn't cover that name — check `nslookup <name>` against the CloudFront domain, and confirm the alias is present with `aws cloudfront get-distribution --id <id> --query "Distribution.DistributionConfig.Aliases"`.

---

## Phase 6 — Manual Content Deploy

**Exit condition:** the site returns `200` with real content, using `scripts/deploy-content.sh` — without requiring Jenkins.

### 6.1 — Why this phase exists

*Why:* Part I so far produces working infrastructure that is empty. Confirming the site actually renders correctly before building a full CI/CD pipeline around it is the right order. `scripts/deploy-content.sh` is the one implementation of the deploy logic — `Jenkinsfile.deploy` later calls this exact script rather than reimplementing it (Phase 7.5), so there's never a second copy to keep in sync.

### 6.2 — What the script does

1. Resolves the repo root from its own file location — works from any directory, unlike a raw `aws s3 sync public/ ...` typed from wherever your terminal happens to be.
2. Gets `site_bucket_name` / `cloudfront_distribution_id` / `domain_name` from `terraform output` when run manually (values change on every destroy/recreate, so nothing is hardcoded); uses pre-set environment variables instead when run from Jenkins (Phase 7.5).
3. Copies `public/` into a `build/` directory, replacing every `__SITE_DOMAIN__` token with the real domain (Appendix D). `public/` stays domain-agnostic in Git; `build/` is generated and gitignored.
4. `aws s3 sync build/ s3://<bucket> --delete` — makes the bucket match `build/` exactly, removing anything no longer present.
5. Invalidates the CloudFront cache for `/*`, so the change is visible immediately instead of after the cache TTL.

### 6.3 — Run it

```bash
chmod +x scripts/deploy-content.sh
./scripts/deploy-content.sh
```
No arguments, no config file — everything it needs comes from Terraform state and the script's own location.

### 6.4 — When to use it

- **Now**, to replace Phase 5.2's `403` with a working site.
- Any time you edit `public/` and want to see the result live without needing Jenkins.
- After any `terraform destroy` + `apply` cycle — the new bucket starts empty again.
- After Part II exists, as a manual escape hatch for an ad hoc push outside the normal PR/pipeline flow (Phase 9.1 remains the default path).

### 6.5 — Verify

```bash
curl -I https://<domain>
```
Expect `HTTP/2 200` and `server: CloudFront` now.

**Part I is complete once this returns `200`.**

---
---

# PART II — DEPLOYMENT & CI/CD

**Exit condition for this part:** a push to `main` deploys content automatically within minutes; infrastructure changes require explicit human approval before applying.

## Phase 7 — CI/CD Pipeline Setup

*Assumption:* a Jenkins server already exists and is reachable. Before starting, confirm plugins: Jenkins → **Manage Jenkins → Plugins → Installed** — check for `Pipeline`, `Git`, `GitHub`, `AWS Credentials`, `Credentials Binding`. Install any missing ones under **Available plugins**; `AWS Credentials` specifically is easy to miss.

### 7.1 — Scoped AWS credentials

*Why:* the infra and deploy pipelines must not share one credential — infra needs S3/CloudFront/IAM-policy permissions, deploy only writes to one bucket and invalidates one distribution. Narrower scope limits the damage of a leaked credential.

**7.1a — Infra IAM policy and user**

1. AWS Console → **IAM → Policies → Create policy → JSON tab**, paste:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "TerraformStateAccess",
         "Effect": "Allow",
         "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
         "Resource": ["arn:aws:s3:::<state-bucket-name>", "arn:aws:s3:::<state-bucket-name>/*"]
       },
       {
         "Sid": "SiteBucketManagement",
         "Effect": "Allow",
         "Action": ["s3:*"],
         "Resource": ["arn:aws:s3:::<site-bucket-name>", "arn:aws:s3:::<site-bucket-name>/*"]
       },
       {
         "Sid": "CloudFrontManagement",
         "Effect": "Allow",
         "Action": ["cloudfront:*"],
         "Resource": "*"
       }
     ]
   }
   ```
   Replace `<state-bucket-name>` and `<site-bucket-name>` with your real bucket names. CloudFront doesn't support per-resource ARNs for most create/list actions, hence `"Resource": "*"` there — scoping is carried by the S3 statements.
2. **Next** → name it `jenkins-infra-policy` → **Create policy**.
3. **IAM → Users → Create user** → name `jenkins-infra` → **Next** → **Attach policies directly** → search and check `jenkins-infra-policy` → **Next** → **Create user**.
4. Click into the user → **Security credentials** → **Create access key** → **Application running outside AWS** → **Next** → **Create access key**. Copy both values now — the secret is shown once.

**7.1b — Deploy IAM policy and user**

Same steps, with this policy instead (name it `jenkins-deploy-policy`, user `jenkins-deploy`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SiteBucketReadWrite",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::<site-bucket-name>", "arn:aws:s3:::<site-bucket-name>/*"]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation", "cloudfront:ListInvalidations"],
      "Resource": "*"
    }
  ]
}
```
This credential can't touch the state bucket, ACM, or anything on CloudFront beyond invalidation — a leak here can overwrite site content, nothing more.

**7.1c — Add both to Jenkins**

1. Jenkins → **Manage Jenkins → Credentials** → click the **(global)** store → **Add Credentials**.
2. **Kind** → **AWS Credentials**. **ID** → type exactly `aws-infra-creds` (must match `Jenkinsfile.infra` exactly — this is a lookup key, not a label). **Access Key ID** / **Secret Access Key** → from 7.1a. **Create**.
3. Repeat: **ID** → `aws-deploy-creds`, values from 7.1b.

*(If Jenkins runs on an EC2 instance, attach an IAM role with both policies to the instance directly instead, and remove `withCredentials` from both Jenkinsfiles — no long-lived keys is strictly better.)*

### 7.2 — Infra pipeline job

*Why:* enforces plan-before-apply as a repeatable process with a mandatory human approval gate.

1. Jenkins dashboard → **New Item** → name `site-infra` → select **Pipeline** → **OK**.
2. Scroll to **Pipeline** section → **Definition** → **Pipeline script from SCM**.
3. **SCM** → **Git** → **Repository URL** → your repo's clone URL.
4. If private: **Credentials** → **Add → Jenkins** → Kind **Username with password** (GitHub username + a Personal Access Token, not your account password) → **Add**, then select it.
5. **Branches to build** → `*/main`. **Script Path** → `jenkins/Jenkinsfile.infra`. **Save**.

Don't trigger it yet — Phase 8 covers the first run.

### 7.3 — Deploy pipeline job

*Why:* content changes are frequent and low-risk — this pipeline runs unattended, using the narrower credential from 7.1b.

1. Jenkins dashboard → **New Item** → name `site-deploy` → **Pipeline** → **OK**.
2. Same steps 2–5 as 7.2, except **Script Path** → `jenkins/Jenkinsfile.deploy`.
3. Before saving: check **This project is parameterized** → **Add Parameter → String Parameter**, three times:

   | Name | Default Value |
   |---|---|
   | `SITE_BUCKET` | `terraform output site_bucket_name` |
   | `CLOUDFRONT_DISTRIBUTION_ID` | `terraform output cloudfront_distribution_id` |
   | `SITE_DOMAIN` | `terraform output domain_name` |

   *Why default values:* a webhook-triggered build has no human present to fill in a form — Jenkins uses each parameter's default automatically. This is what makes the pipeline unattended, and what lets `scripts/deploy-content.sh` skip its Terraform lookup (Phase 6.2) when called from here.
4. **Save**.

### 7.4 — GitHub webhook

*Why:* without it, Jenkins only learns of new commits via manual trigger or polling.

On `site-deploy`: **Configure → Build Triggers** → check **GitHub hook trigger for GITScm polling** → **Save**. Leave unchecked on `site-infra` (stays manual, per 7.2's "why").

On GitHub: repo → **Settings → Webhooks → Add webhook**. **Payload URL** → `https://<jenkins-domain>/github-webhook/` (trailing slash required). **Content type** → `application/json`. **Which events** → **Just the push event**. Confirm **Active** → **Add webhook**.

⚠️ Requires Jenkins reachable from the internet. If it's on a laptop or internal network, the webhook fails silently (check the webhook's **Recent Deliveries** tab for a red X). `Build Now` still works regardless.

### 7.5 — What each pipeline does

*Why (learning):* `Jenkinsfile.deploy`'s **Deploy** stage calls `scripts/deploy-content.sh` directly (Phase 6.2) — with `SITE_BUCKET`/`CLOUDFRONT_DISTRIBUTION_ID`/`SITE_DOMAIN` already set as job parameters, so the script skips its Terraform-lookup fallback. The only difference between a manual run and a pipeline run is *what triggers it* and *which credential runs it* — the deploy logic itself has exactly one implementation. `Jenkinsfile.infra` runs `plan`, saves the plan artifact, pauses on an `input` step, and only runs `apply` against that exact saved plan if approved.

---

## Phase 8 — Verification & Go-Live

### 8.1 — First infra pipeline run

*Why:* the approval-gate pause is worth seeing deliberately once, not discovering mid-emergency.

1. `site-infra` → **Build with Parameters** (not "Build Now" — this job has a parameter). **ACTION** → `plan` → **Build**.
2. Click the build number → **Console Output**. It runs `init`/`fmt`/`validate`/`plan`, then stops — `apply`/`destroy` are skipped entirely when `ACTION=plan`.
3. Confirm the plan shows no changes (Part I already applied this by hand).

For a real apply later (Phase 9.2): `ACTION=apply` runs `plan`, then pauses at **Approval** with a **Proceed**/**Abort** link. Read the plan in that run's own console output before clicking **Proceed**.

### 8.2 — Smoke test the deploy pipeline

1. Edit `public/index.html` — a small, visible change.
2. ```bash
   git add public/index.html
   git commit -m "test: smoke test deploy pipeline"
   git push
   ```
3. `site-deploy` should start within seconds (check the webhook's **Recent Deliveries** tab if not).
4. Click the running build → **Console Output** — watch **Checkout → Sanity Check → Deploy**. The **Deploy** stage is where `scripts/deploy-content.sh` actually runs, so its progress (rendering, syncing, invalidating) appears inside that single stage.
5. On `SUCCESS`, load the domain in a private/incognito browser window and confirm the change.

### 8.3 — Cache invalidation

*Why (learning):* CloudFront caches at edge locations; without invalidation, a change can be invisible for the cache TTL (`max-age=300` here) even after the origin updates. 8.2 already proved this step works.

### 8.4 — Rollback strategy

*Why:* deploys must be reversible without a Terraform run. S3 versioning is enabled, so reverting content is a Git revert:

```bash
git revert <bad-commit-sha>
git push
```
This triggers `site-deploy` exactly like any other push.

---

## Phase 9 — Operations & Maintenance

### 9.1 — Routine content changes

Edit `public/` → PR → merge to `main` → `site-deploy` runs automatically. No AWS console interaction required. `scripts/deploy-content.sh` (Phase 6) remains available for ad hoc pushes outside this flow, but this is the default path.

### 9.2 — Infrastructure changes

Edit `terraform/**` → PR → merge → `site-infra` → **Build with Parameters** → `ACTION=plan` first, always. Read the output. If correct, run again with `ACTION=apply` and approve at the gate after re-reading that run's own plan.

### 9.3 — Certificate renewal

*Why (learning):* ACM auto-renews provided the DNS validation records from Phase 3 remain published — do not remove them after initial validation. This is true regardless of whether Terraform or the console requested the certificate.

### 9.4 — Adding another domain alias later

*Why:* the same mechanism as Phase 3, deliberately deferred to a calmer moment rather than blocking the first deploy.

1. Request a **new** certificate covering existing name(s) plus the new one — ACM certificates can't have names added after issuance.
2. DNS-validate per Phase 3.2 — even an *already-validated* name gets a different validation record on a new certificate; don't reuse an old CNAME.
3. Update `subject_alternative_names` and `acm_certificate_arn` in `terraform.tfvars`.
4. `terraform plan` — expect `aws_cloudfront_distribution.site` to update in place, not replace.
5. `terraform apply`.
6. Add the new alias's routing CNAME (Phase 5.1 pattern) — same `cloudfront_domain_name` as before.
7. Delete the superseded certificate from ACM once confirmed working.

### 9.5 — Teardown

*Why:* ordered removal avoids orphaned billable resources — CloudFront distributions need to disable before deletion, and Terraform handles that ordering.

```bash
cd terraform/environments/prod
terraform destroy
# only if permanently decommissioning:
cd ../../bootstrap
terraform destroy
```

Also manually: delete the ACM certificate (Terraform never created it), remove the DNS records from Namecheap, delete the `site-infra`/`site-deploy` Jenkins jobs, remove the GitHub webhook, deactivate the two IAM users from 7.1.

---
---

# Appendices

## Appendix A — Troubleshooting

| Symptom | Cause | Reference |
|---|---|---|
| ACM stuck at `Pending validation` 20+ minutes | DNS record missing, mistyped, or belongs to a different certificate | Phase 3.3 |
| Pasted value contains `[`, `]`, or `(https://` | Clipboard tool/extension corrupted the copy | Top of document |
| `terraform destroy` fails with `BucketNotEmpty`, or a bucket survives destroy silently | `force_destroy` not set, or old object versions remain despite an empty-looking listing | Phase 4.5 — `aws s3 rb s3://<bucket> --force` cleans up manually |
| `Error: creating S3 Bucket ... BucketAlreadyOwnedByYou` | `site_bucket_name` equals `state_bucket_name` | Phase 2.2 / 4.2 |
| `PermanentRedirect`, `StatusCode: 301` on bucket sub-resource reads | `aws_region` doesn't match the bucket's real region | Phase 2.3 |
| `ResourceInUseException: Table already exists: terraform-state-locks` | Leftover table from an older version of this template; current template doesn't create one | Phase 2.3 |
| `failed to upload state`, then `errored.tfstate` written | Network/DNS blip on your machine mid-apply | Phase 4.3 |
| CloudFront rejects the certificate ARN at apply time | ARN doesn't match `domain_name`/`subject_alternative_names`, or isn't `ISSUED` | Phase 4.2 |
| `403` from CloudFront, `server: AmazonS3` | Bucket empty (nothing deployed yet) or OAC/policy misconfigured | Phase 6 — `scripts/deploy-content.sh` |
| `aws s3 sync public/ ...`: `The user-provided path public/ does not exist` | Command run from inside `terraform/environments/prod` instead of the repo root | Use `scripts/deploy-content.sh` (Phase 6) instead — path-independent |
| SSL handshake failure on an alias | DNS record not updated to current CloudFront domain, or certificate doesn't cover that name | Phase 5.1 / 5.2 |
| Deployed content not visible | CloudFront cache not invalidated | Phase 8.3 |
| `terraform init` backend error | `backend-prod.hcl` values don't match Phase 2's bootstrap output | Phase 4.1 |
| Two `terraform apply` runs conflict | Expected — S3 native lockfile blocking concurrent writes | Phase 4.1 |
| `Warning: Deprecated Parameter ... dynamodb_table` | Cosmetic; migrate to `use_lockfile = true` when convenient | Phase 4.1 |

## Appendix B — Recovery Playbook

**ACM stuck pending, suspected bad DNS record:**
1. Read the exact CNAME name/value from the certificate's ACM page directly — don't rely on memory.
2. Read (don't copy) the corresponding row in your DNS provider's UI.
3. Compare character-by-character: trailing dot on the value, correct subdomain segment on the host, no stray brackets.
4. Fix by typing directly into the provider's form field.
5. Wait for ACM's own status to update — no `apply`, no `nslookup` required for this check.

**State forked after a failed upload (`errored.tfstate` exists):**
```bash
nslookup google.com                   # confirm network is stable
terraform state push errored.tfstate  # do this before any further apply
terraform plan                        # confirm it landed cleanly
```

**Bucket name collision after a failed apply:**
```bash
# fix site_bucket_name in terraform.tfvars, then:
terraform plan
```
The colliding resource never actually succeeded — nothing to destroy, just recreate under the corrected name.

**State confusing enough that you don't trust it — full reset (`environments/prod` only, never `bootstrap`):**
```bash
cd terraform/environments/prod
terraform destroy
terraform apply
```
Safe because every Terraform-managed resource here is reproducible from code. The ACM certificate is unaffected either way — Terraform never touches it, so Phase 3 does not need repeating. Remember Phase 5.1's warning: both DNS records need updating to the new CloudFront domain afterward, and the new bucket starts empty — re-run `scripts/deploy-content.sh` (Phase 6) once DNS is updated.

## Appendix C — Security Notes

- Prefer an EC2 instance profile over static AWS keys for Jenkins.
- The site bucket is never public — verify with a direct `https://<bucket>.s3.amazonaws.com/index.html` request; expect a denial.
- Terraform state holds resource metadata, not application secrets — SSE-S3 (already configured) is sufficient here.
- ACM certificates are referenced only by ARN — Terraform's IAM credentials never need ACM permissions (7.1a), removing one capability a leaked credential could have.
- `force_destroy = true` on the site bucket (4.5) is a deliberate tradeoff for reproducible content — do not apply the same setting to any future bucket holding data that isn't reproducible elsewhere.
- `scripts/deploy-content.sh` (Phase 6) runs under whatever AWS credentials are active in your own shell — typically broader than the dedicated `aws-deploy-creds` Jenkins uses (7.1b). Fine for occasional manual use; routine deploys should still go through the pipeline (9.1) once it exists.

## Appendix D — Site Content (CloudPath Portfolio)

`public/` is a complete static portfolio site — plain HTML/CSS/JS, no build tooling, no backend. Every hardcoded domain reference (canonical URL, Open Graph/Twitter tags, JSON-LD, `robots.txt`, `sitemap.xml`) uses the literal token `__SITE_DOMAIN__`, substituted by `scripts/deploy-content.sh` (Phase 6.2) — run manually before Jenkins exists, or called by the deploy pipeline's **Deploy** stage afterward (Phase 7.5). One implementation either way.

**Before first deploy**, two placeholders need real values:

| Item | Where | Placeholder |
|---|---|---|
| Contact email | `assets/js/main.js`, `assets/js/navigation.js` | `hello@cloudpath.dev` |
| Name / bio / resume | `index.html`, `about.html`, `resume.html`, `assets/resume.pdf` | sample content |

Projects, blog posts, and certifications are data-driven — edit the arrays in `assets/js/projects.js` / `assets/js/blog.js`, and the cards in `certifications.html`. `data/*.json` mirrors the same content for portability, not the live source — see `PORTFOLIO_DESIGN_NOTES.md` for the full content-editing guide.

`project-details.html` and `blog-post.html` render content client-side from a `?id=`/`?slug=` query parameter — no per-item static file or unique URL path. Keeps file count small; search engines that don't execute JavaScript won't index individual items.

## Appendix E — Cost Considerations

- S3, CloudFront, and ACM are pay-as-you-go with no fixed minimum; a low-traffic static site typically runs low single-digit USD/month. ACM certificates are free.
- No DynamoDB table is created by this template. An earlier version included one for state locking; it was removed once native S3 locking made it redundant.
- CloudFront `price_class` is `PriceClass_100` (US/Canada/Europe edge locations only) — the cheapest tier; widen it for a global audience.
