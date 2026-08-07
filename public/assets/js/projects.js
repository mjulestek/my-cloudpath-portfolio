/* ============================================================
   projects.js
   Project data (mirrors data/projects.json) plus rendering for
   the homepage featured strip, the filterable projects grid,
   and the project-details page.
   ============================================================ */

const PROJECTS = [
  {
    id: 'eks-platform',
    title: 'Multi-Tenant EKS Platform',
    summary: 'A self-service Kubernetes platform on EKS with GitOps delivery, giving 14 product teams isolated namespaces without a ticket queue.',
    provider: 'AWS',
    difficulty: 'Advanced',
    duration: '4 months',
    featured: true,
    tags: ['Kubernetes', 'Terraform', 'ArgoCD', 'AWS', 'Helm'],
    github: 'https://github.com/',
    problem: 'Fourteen product teams shared two hand-built EKS clusters. Every namespace, IAM role, and ingress rule required a platform-team ticket, and the average wait was three days \u2014 slow enough that teams started provisioning shadow infrastructure to route around it.',
    solution: 'Replaced the shared clusters with a Terraform-defined EKS platform where teams request a namespace through a Git pull request. ArgoCD reconciles the request into a fully-scoped namespace with network policy, resource quotas, and an IAM role bound by IRSA \u2014 no ticket, no platform engineer in the loop.',
    architecture: 'Three EKS clusters (dev, staging, prod) sit behind a shared VPC with private subnets per availability zone. Karpenter handles node autoscaling by workload shape, and every cluster add-on \u2014 ingress-nginx, cert-manager, external-dns \u2014 is itself an ArgoCD Application, so the platform manages itself the same way tenants manage their workloads.',
    cicd: [
      { stage: 'Lint & plan', detail: 'Terraform fmt, tflint, and a speculative plan posted as a PR comment.' },
      { stage: 'Policy check', detail: 'OPA/Conftest validates the plan against guardrails \u2014 no public S3, no 0.0.0.0/0 ingress.' },
      { stage: 'Apply', detail: 'Terraform Cloud applies on merge to main, with state locked per environment.' },
      { stage: 'Sync', detail: 'ArgoCD detects the new manifests and reconciles the cluster within 90 seconds.' },
      { stage: 'Verify', detail: 'Synthetic checks confirm the namespace, quota, and ingress are reachable before the PR is marked done.' }
    ],
    infra: {
      terraform: 'Reusable modules for VPC, EKS, IRSA, and namespace-as-a-product, versioned and pinned per environment.',
      docker: 'Distroless base images with a shared build cache, cutting average image size by 61%.',
      kubernetes: 'Namespace-per-team with ResourceQuota, NetworkPolicy default-deny, and Kyverno admission policies.',
      networking: 'Private subnets, VPC endpoints for S3/ECR, and an internal NLB per environment \u2014 no NAT gateway sprawl.',
      security: 'IRSA for pod-level IAM, OPA Gatekeeper for policy-as-code, and short-lived credentials via AWS SSO.',
      monitoring: 'Prometheus + Grafana per cluster, federated into a central Grafana with team-scoped dashboards.',
      cost: 'Karpenter consolidation and spot-friendly node pools cut compute spend by 34% year over year.'
    },
    lessons: [
      'Self-service only works if the guardrails are enforced in CI, not in a wiki page nobody reads.',
      'Namespace-as-a-product needed a real owner \u2014 treating it as "just YAML" caused drift within weeks.'
    ],
    future: [
      'Add a cost-per-namespace dashboard so teams see their own spend, not just the platform total.',
      'Migrate remaining stateful workloads to the EBS CSI driver with volume snapshots.'
    ],
    gallery: 3
  },
  {
    id: 'ci-cd-pipeline',
    title: 'Zero-Downtime CI/CD for Microservices',
    summary: 'A GitHub Actions to ArgoCD pipeline shipping 20+ microservices to production multiple times a day with automated rollback.',
    provider: 'Multi-cloud',
    difficulty: 'Intermediate',
    duration: '6 weeks',
    featured: true,
    tags: ['GitHub Actions', 'ArgoCD', 'Docker', 'Kubernetes'],
    github: 'https://github.com/',
    problem: 'Deploys were a Friday-afternoon Slack thread: build locally, SSH into a box, restart a process, hope. A bad deploy meant 20-40 minutes of manual rollback while the on-call engineer read through logs.',
    solution: 'Standardised every service on the same GitHub Actions workflow \u2014 build, test, scan, publish \u2014 and handed deployment to ArgoCD with an automated rollback triggered by failed health checks or an elevated error rate from Prometheus.',
    architecture: 'Each push to main builds a container image, runs unit and contract tests, scans with Trivy, and pushes to a private registry. ArgoCD Image Updater bumps the tag in a Git-tracked manifest repo, and a progressive rollout (Argo Rollouts, canary at 10/50/100%) verifies the new revision before it takes full traffic.',
    cicd: [
      { stage: 'Build & test', detail: 'Matrix build across services, unit + contract tests, ~4 minutes end to end.' },
      { stage: 'Scan', detail: 'Trivy blocks the pipeline on any critical CVE with a known fix available.' },
      { stage: 'Publish', detail: 'Image pushed to ECR with an immutable digest tag, never :latest.' },
      { stage: 'Canary', detail: 'Argo Rollouts shifts 10% of traffic, watches error rate and p99 latency for 5 minutes.' },
      { stage: 'Promote or rollback', detail: 'Automatic promotion to 100% on healthy metrics, automatic rollback on regression.' }
    ],
    infra: {
      terraform: 'ECR repositories, IAM roles for GitHub OIDC (no long-lived AWS keys in CI), and Argo Rollouts CRDs.',
      docker: 'Multi-stage builds shared across services via a common base image, refreshed weekly.',
      kubernetes: 'Argo Rollouts for canary analysis, backed by a Prometheus metric provider.',
      networking: 'Internal service mesh (Linkerd) for mTLS between services and traffic-split during canaries.',
      security: 'GitHub OIDC federation removes static cloud credentials from every workflow.',
      monitoring: 'Deployment markers pushed to Grafana so every dashboard shows exactly when a rollout happened.',
      cost: 'Shared runners and layer caching cut average CI minutes per service by 47%.'
    },
    lessons: [
      'Automated rollback is only trustworthy once the health signal is boring and well-tested \u2014 flaky checks erode confidence fast.',
      'Canary analysis windows needed to be longer for low-traffic services, or noise looked like a regression.'
    ],
    future: [
      'Add automatic dependency-bump PRs with the same canary gate applied to app code.',
      'Extend canary analysis to include business metrics, not just infra health.'
    ],
    gallery: 3
  },
  {
    id: 'observability-stack',
    title: 'Unified Observability Stack',
    summary: 'Consolidated five disconnected monitoring tools into one Prometheus, Loki, and Grafana stack with SLO-based alerting.',
    provider: 'AWS',
    difficulty: 'Intermediate',
    duration: '5 weeks',
    featured: true,
    tags: ['Prometheus', 'Grafana', 'Terraform', 'AWS'],
    github: 'https://github.com/',
    problem: 'Metrics lived in CloudWatch, logs in a paid SaaS tool, traces nowhere. Incident response meant four browser tabs and a lot of guessing about which system had the answer.',
    solution: 'Stood up Prometheus for metrics, Loki for logs, and Tempo for traces, all queried through one Grafana instance, and rebuilt every alert around SLOs instead of raw thresholds.',
    architecture: 'Prometheus scrapes via a sidecar on every pod, Loki ingests structured JSON logs shipped by Promtail, and Tempo receives OpenTelemetry traces. Grafana correlates all three with exemplars, so an alert links straight from a metric spike to the trace that caused it.',
    cicd: [
      { stage: 'Define SLO', detail: 'Each service ships an SLO manifest (99.9% availability, 300ms p95) reviewed in code review.' },
      { stage: 'Generate rules', detail: 'A Terraform module turns the SLO manifest into Prometheus recording and alerting rules.' },
      { stage: 'Deploy', detail: 'Rules and dashboards are applied via Grafana\u2019s Terraform provider, versioned with the service.' },
      { stage: 'Burn-rate alert', detail: 'Multi-window burn-rate alerts page only when the error budget is genuinely at risk.' }
    ],
    infra: {
      terraform: 'Grafana provider manages dashboards and alert rules as code, reviewed like any other change.',
      docker: 'Prometheus, Loki, and Tempo run as a Helm-managed stack with object storage backends.',
      kubernetes: 'Sidecar-based scraping with pod-level ServiceMonitors.',
      networking: 'Private ingress for Grafana, SSO-gated, no public dashboard exposure.',
      security: 'Read-only data source credentials, per-team RBAC folders in Grafana.',
      monitoring: 'The stack monitors itself \u2014 a meta-dashboard tracks Prometheus scrape health and Loki ingestion lag.',
      cost: 'Replacing the SaaS log tool saved roughly $4,200/month at current log volume.'
    },
    lessons: [
      'SLO-based alerting cut 3am pages by more than half once thresholds stopped firing on noise.',
      'Log volume needed active budgeting \u2014 unstructured debug logs quietly became the biggest cost driver.'
    ],
    future: [
      'Add long-term metric storage via Thanos for year-over-year capacity planning.',
      'Wire exemplars into every service, not just the top ten by traffic.'
    ],
    gallery: 3
  },
  {
    id: 'terraform-landing-zone',
    title: 'Multi-Account AWS Landing Zone',
    summary: 'A Terraform-and-Control-Tower landing zone that turns a new AWS account request into a fully governed environment in under 20 minutes.',
    provider: 'AWS',
    difficulty: 'Advanced',
    duration: '3 months',
    featured: false,
    tags: ['Terraform', 'AWS', 'Security', 'IAM'],
    github: 'https://github.com/',
    problem: 'New AWS accounts were provisioned by hand: a spreadsheet of steps, inconsistent tagging, and security baselines that depended on whoever ran the checklist that week.',
    solution: 'Built a landing zone on AWS Control Tower with Terraform-managed account factory customizations, so every new account inherits guardrails, logging, and network baselines automatically.',
    architecture: 'A dedicated management account runs Control Tower and Terraform Cloud. New accounts are requested via a Git PR to an account-manifest repo; a pipeline provisions the account, applies SCPs, wires up centralized logging to the audit account, and peers the account into the shared network.',
    cicd: [
      { stage: 'Request', detail: 'A PR adds an account manifest (name, OU, budget) to the repo.' },
      { stage: 'Provision', detail: 'Control Tower Account Factory creates the account inside the correct OU.' },
      { stage: 'Baseline', detail: 'Terraform applies SCPs, GuardDuty, Config rules, and centralized CloudTrail.' },
      { stage: 'Network', detail: 'Transit Gateway attachment and route propagation connect the account to shared services.' }
    ],
    infra: {
      terraform: 'Account factory customizations and SCP modules versioned per organizational unit.',
      docker: 'N/A \u2014 this project is account and network infrastructure, not workloads.',
      kubernetes: 'N/A for this project.',
      networking: 'Transit Gateway hub-and-spoke topology with centralized egress via a shared NAT account.',
      security: 'Service Control Policies deny risky actions org-wide; GuardDuty and Security Hub centralized in the audit account.',
      monitoring: 'Centralized CloudTrail and Config aggregator with Athena queries for audit requests.',
      cost: 'Consolidated billing and mandatory budget alarms cut unbudgeted spend surprises to zero over two quarters.'
    },
    lessons: [
      'SCPs are powerful enough to break things quietly \u2014 every new policy shipped to a sandbox OU first.',
      'A 20-minute account meant nothing if the requester still waited two days for a human to review the PR; the review itself needed a fast lane for low-risk manifests.'
    ],
    future: [
      'Auto-expire sandbox accounts that see no activity for 60 days.',
      'Add a self-service budget increase flow gated by a lightweight approval, not a ticket.'
    ],
    gallery: 2
  },
  {
    id: 'gcp-data-pipeline',
    title: 'Event-Driven Data Pipeline on GCP',
    summary: 'A serverless ingestion pipeline processing 40M events a day through Pub/Sub, Dataflow, and BigQuery with sub-minute latency.',
    provider: 'GCP',
    difficulty: 'Advanced',
    duration: '10 weeks',
    featured: false,
    tags: ['GCP', 'Terraform', 'Pub/Sub', 'BigQuery'],
    github: 'https://github.com/',
    problem: 'The analytics team ran a nightly batch job that took six hours and regularly failed halfway through, leaving dashboards a full day stale by the time anyone noticed.',
    solution: 'Replaced the nightly batch with a streaming pipeline: events land in Pub/Sub, a Dataflow job transforms and enriches them in near real time, and results land in partitioned BigQuery tables that dashboards query directly.',
    architecture: 'Application services publish events to Pub/Sub topics. A Dataflow (Apache Beam) streaming job windows and deduplicates events, enriches them against a Bigtable lookup, and writes to BigQuery with schema evolution handled automatically. Dead-lettered events land in a separate topic for replay.',
    cicd: [
      { stage: 'Build', detail: 'Beam pipeline packaged and tested against a local Pub/Sub emulator.' },
      { stage: 'Deploy', detail: 'Terraform provisions topics, subscriptions, and the Dataflow Flex Template.' },
      { stage: 'Canary window', detail: 'New pipeline version runs alongside the old one for 30 minutes, output compared row-for-row.' },
      { stage: 'Cutover', detail: 'Traffic fully shifts once row counts and latency match expectations.' }
    ],
    infra: {
      terraform: 'Pub/Sub topics, Dataflow Flex Templates, and BigQuery datasets defined and reviewed as code.',
      docker: 'Dataflow Flex Template packaged as a container for reproducible worker startup.',
      kubernetes: 'N/A \u2014 Dataflow manages its own worker pool.',
      networking: 'Private Google Access with no public IPs on Dataflow workers.',
      security: 'Per-topic IAM bindings and column-level security on sensitive BigQuery fields.',
      monitoring: 'Dataflow job metrics and Pub/Sub backlog age feed a Grafana dashboard with backlog-based alerting.',
      cost: 'Streaming replaced a six-hour daily batch job, cutting compute cost by 28% versus always-on batch capacity.'
    },
    lessons: [
      'Late-arriving events needed a real windowing strategy \u2014 a naive fixed window silently dropped ~2% of records.',
      'Schema evolution in BigQuery is forgiving until it isn\u2019t; a dry-run step against a staging dataset caught two breaking changes before production.'
    ],
    future: [
      'Add exactly-once semantics for the payment-events topic specifically.',
      'Move dashboard queries to BigQuery materialized views to cut warehouse cost further.'
    ],
    gallery: 2
  },
  {
    id: 'ansible-fleet',
    title: 'Configuration Management for a 300-Node Fleet',
    summary: 'Replaced manual server configuration with idempotent Ansible playbooks, cutting new-host provisioning from a day to nine minutes.',
    provider: 'On-prem',
    difficulty: 'Beginner',
    duration: '3 weeks',
    featured: false,
    tags: ['Ansible', 'Linux', 'Security'],
    github: 'https://github.com/',
    problem: 'Bare-metal and VM hosts were configured by hand from a wiki page that drifted out of date within a month of being written. No two "identical" servers were actually identical.',
    solution: 'Wrote idempotent Ansible playbooks and roles covering base OS hardening, user access, monitoring agents, and application runtimes, run against a dynamic inventory sourced from the internal CMDB.',
    architecture: 'A control node runs playbooks against hosts grouped by role (web, db, cache, bastion). Vault-encrypted variables hold secrets, and a nightly drift-detection run reports any host that no longer matches its intended state.',
    cicd: [
      { stage: 'Lint', detail: 'ansible-lint and a syntax check run on every pull request.' },
      { stage: 'Molecule test', detail: 'Roles are tested against a disposable container before merge.' },
      { stage: 'Apply', detail: 'Approved changes run against a canary host group first, then the full fleet.' },
      { stage: 'Drift check', detail: 'A nightly check-mode run flags any host that has drifted from its playbook state.' }
    ],
    infra: {
      terraform: 'N/A for this project \u2014 configuration management on existing hosts, not provisioning.',
      docker: 'N/A \u2014 bare-metal and VM fleet, not containerized.',
      kubernetes: 'N/A for this project.',
      networking: 'Bastion-only SSH access, host firewalls managed as an Ansible role.',
      security: 'Ansible Vault for secrets, automatic CIS benchmark hardening role applied fleet-wide.',
      monitoring: 'Node exporter and the logging agent installed and verified by the same playbook that configures the host.',
      cost: 'Provisioning time dropped from a full day of manual work to nine minutes, freeing roughly 15 hours/week of engineer time.'
    },
    lessons: [
      'Idempotency has to be tested, not assumed \u2014 two early roles were destructive on re-run until Molecule caught it.',
      'A drift report nobody reads is worse than no report; routing it into the team\u2019s existing alert channel is what made it stick.'
    ],
    future: [
      'Migrate remaining manually-managed legacy hosts into the same inventory.',
      'Add automated CVE patching for the base OS role with a maintenance-window gate.'
    ],
    gallery: 2
  }
];

/* ---- Deterministic topology art per project (signature visual motif) ---- */
function projectArt(project, seedIndex) {
  const palette = ['#1e9e5c', '#f5a623', '#167a47'];
  const color = palette[seedIndex % palette.length];
  let seed = 0;
  for (const ch of project.id) seed += ch.charCodeAt(0);
  const rand = (n) => ((seed * (n + 7) * 13) % 97) / 97;

  const nodes = Array.from({ length: 6 }).map((_, i) => ({
    x: 40 + rand(i) * 220,
    y: 30 + rand(i + 3) * 140
  }));
  const edges = [[0,1],[1,2],[2,3],[3,4],[1,4],[4,5],[0,3]];

  const lines = edges.map(([a,b]) => `<line x1="${nodes[a].x}" y1="${nodes[a].y}" x2="${nodes[b].x}" y2="${nodes[b].y}" stroke="${color}" stroke-opacity="0.4" stroke-width="1.6"/>`).join('');
  const dots = nodes.map((n, i) => `<circle cx="${n.x}" cy="${n.y}" r="${i === 0 ? 6 : 4}" fill="${i === 0 ? color : '#ffffff'}" stroke="${color}" stroke-width="1.8"/>`).join('');

  return `<svg viewBox="0 0 300 190" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <rect width="300" height="190" fill="#f2f9f4"/>
    <g>${lines}${dots}</g>
  </svg>`;
}

function providerBadgeColor(provider) {
  return { AWS: 'accent', GCP: 'amber', Azure: 'amber', 'Multi-cloud': '', 'On-prem': '' }[provider] || '';
}

function projectCard(project, index) {
  return `
  <article class="card project-card reveal" style="--i:${index % 6}">
    <a href="project-details.html?id=${project.id}" class="project-media" aria-hidden="true">
      ${projectArt(project, index)}
      <span class="project-provider">${project.provider}</span>
    </a>
    <div class="project-body">
      <h3><a href="project-details.html?id=${project.id}">${project.title}</a></h3>
      <p class="project-desc">${project.summary}</p>
      <div class="project-tags">
        ${project.tags.slice(0, 4).map(t => `<span class="badge">${t}</span>`).join('')}
      </div>
      <div class="project-meta-row">
        <span>${project.difficulty}</span>
        <span>${project.duration}</span>
      </div>
    </div>
  </article>`;
}

function renderFeaturedProjects() {
  const el = document.getElementById('featuredProjects');
  if (!el) return;
  const featured = PROJECTS.filter(p => p.featured);
  el.innerHTML = featured.map(projectCard).join('');
  document.dispatchEvent(new Event('cp:content-mounted'));
}

function renderProjectsGrid() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;

  const searchInput = document.getElementById('projectSearch');
  const chips = document.querySelectorAll('#providerChips .chip');
  const sortSelect = document.getElementById('projectSort');
  const emptyState = document.getElementById('projectsEmpty');
  const countLabel = document.getElementById('projectsCount');

  let activeProvider = 'All';
  let query = '';
  let sortBy = 'featured';

  function apply() {
    let list = PROJECTS.filter(p => {
      const matchesProvider = activeProvider === 'All' || p.provider === activeProvider;
      const haystack = (p.title + ' ' + p.summary + ' ' + p.tags.join(' ')).toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      return matchesProvider && matchesQuery;
    });

    if (sortBy === 'title') list = list.slice().sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'difficulty') {
      const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
      list = list.slice().sort((a, b) => order[a.difficulty] - order[b.difficulty]);
    } else {
      list = list.slice().sort((a, b) => (b.featured === true) - (a.featured === true));
    }

    grid.innerHTML = list.map(projectCard).join('');
    if (countLabel) countLabel.textContent = `${list.length} project${list.length === 1 ? '' : 's'}`;
    if (emptyState) emptyState.style.display = list.length ? 'none' : 'block';
    if (window.CPAnimations) window.CPAnimations.refreshReveal();
    document.dispatchEvent(new Event('cp:reveal-refresh'));
  }

  if (searchInput) searchInput.addEventListener('input', (e) => { query = e.target.value; apply(); });
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeProvider = chip.getAttribute('data-provider');
    apply();
  }));
  if (sortSelect) sortSelect.addEventListener('change', (e) => { sortBy = e.target.value; apply(); });

  apply();
}

function renderProjectDetails() {
  const wrap = document.getElementById('projectDetails');
  if (!wrap) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const project = PROJECTS.find(p => p.id === id) || PROJECTS[0];
  const index = PROJECTS.findIndex(p => p.id === project.id);

  document.title = `${project.title} \u2014 CloudPath`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', project.summary);

  document.getElementById('breadcrumbCurrent').textContent = project.title;

  wrap.innerHTML = `
    <div class="page-hero container band-soft" style="border-radius:0 0 32px 32px;">
      <div class="dot-cluster" style="top:20px; right:6%;"></div>
      <div class="breadcrumbs" id="breadcrumbNav">
        <a href="index.html">Home</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        <a href="projects.html">Projects</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        <span>${project.title}</span>
      </div>
      <div class="badge accent" style="margin-bottom:16px;">${project.provider}</div>
      <h1 class="reveal in-view" style="max-width:820px;">${project.title}</h1>
      <p style="max-width:640px;font-size:1.05rem;margin-top:16px;">${project.summary}</p>
      <div class="hero-actions" style="margin-top:28px;">
        <a href="${project.github}" target="_blank" rel="noopener" class="btn btn-primary">View source on GitHub</a>
        <a href="projects.html" class="btn btn-secondary">Back to all projects</a>
      </div>
      <div class="project-tags" style="margin-top:24px;">
        ${project.tags.map(t => `<span class="badge">${t}</span>`).join('')}
      </div>
    </div>

    <div class="container">
      <div class="project-media reveal" style="aspect-ratio:21/8;border-radius:20px;margin-bottom:64px;">
        ${projectArt(project, index)}
      </div>
    </div>

    <section class="section-tight container">
      <div class="tabs">
        <button class="tab-btn active" data-tab="overview">Overview</button>
        <button class="tab-btn" data-tab="architecture">Architecture</button>
        <button class="tab-btn" data-tab="pipeline">CI/CD pipeline</button>
        <button class="tab-btn" data-tab="infra">Infrastructure</button>
        <button class="tab-btn" data-tab="lessons">Lessons &amp; next steps</button>
      </div>
      <div>
        <div class="tab-panel active" data-panel="overview">
          <h3>The problem</h3>
          <p style="margin:14px 0 28px;max-width:760px;">${project.problem}</p>
          <h3>The solution</h3>
          <p style="margin:14px 0;max-width:760px;">${project.solution}</p>
        </div>
        <div class="tab-panel" data-panel="architecture">
          <h3>Cloud architecture</h3>
          <p style="margin:14px 0;max-width:760px;">${project.architecture}</p>
        </div>
        <div class="tab-panel" data-panel="pipeline">
          <h3>CI/CD pipeline</h3>
          <div class="timeline" style="margin-top:24px;">
            ${project.cicd.map((step, i) => `
              <div class="timeline-item">
                <div class="timeline-date">Stage ${String(i + 1).padStart(2, '0')}</div>
                <h4>${step.stage}</h4>
                <p>${step.detail}</p>
              </div>`).join('')}
          </div>
        </div>
        <div class="tab-panel" data-panel="infra">
          <h3>Infrastructure breakdown</h3>
          <div class="project-grid grid-cols-2" style="margin-top:24px;">
            ${['terraform','docker','kubernetes','networking','security','monitoring','cost'].map(k => `
              <div class="card" style="padding:22px;">
                <h4 style="text-transform:capitalize;margin-bottom:8px;color:var(--accent);">${k === 'cost' ? 'Cost optimization' : k}</h4>
                <p style="font-size:0.9rem;">${project.infra[k]}</p>
              </div>`).join('')}
          </div>
        </div>
        <div class="tab-panel" data-panel="lessons">
          <h3>Lessons learned</h3>
          <ul style="margin:14px 0 28px;padding-left:0;">
            ${project.lessons.map(l => `<li style="display:flex;gap:10px;margin-bottom:10px;color:var(--text-secondary);font-size:0.95rem;"><span style="color:var(--accent);">&rarr;</span>${l}</li>`).join('')}
          </ul>
          <h3>Future improvements</h3>
          <ul style="margin:14px 0;padding-left:0;">
            ${project.future.map(l => `<li style="display:flex;gap:10px;margin-bottom:10px;color:var(--text-secondary);font-size:0.95rem;"><span style="color:var(--accent-amber);">&rarr;</span>${l}</li>`).join('')}
          </ul>
        </div>
      </div>
    </section>

    <section class="section-tight container">
      <div class="section-head"><span class="eyebrow">Gallery</span><h2>Screens &amp; diagrams</h2></div>
      <div class="project-grid">
        ${Array.from({ length: project.gallery }).map((_, i) => `
          <div class="card project-media reveal" style="aspect-ratio:16/10;">${projectArt(project, index + i + 1)}</div>`).join('')}
      </div>
    </section>

    <section class="section-tight container">
      <div class="card reveal" style="padding:48px;text-align:center;">
        <h3>Next up</h3>
        <p style="margin:12px auto 24px;max-width:480px;">${PROJECTS[(index + 1) % PROJECTS.length].title}</p>
        <a href="project-details.html?id=${PROJECTS[(index + 1) % PROJECTS.length].id}" class="btn btn-primary">View next project</a>
      </div>
    </section>
  `;

  document.dispatchEvent(new Event('cp:content-mounted'));
}

document.addEventListener('DOMContentLoaded', () => {
  renderFeaturedProjects();
  renderProjectsGrid();
  renderProjectDetails();
});

window.PROJECTS = PROJECTS;
