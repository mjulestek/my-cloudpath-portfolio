/* ============================================================
   projects.js
   Project data (mirrors data/projects.json) plus rendering for
   the homepage featured strip, the filterable projects grid,
   and the project-details page.
   ============================================================ */

const PROJECTS = [
  {
    id: 'aws-portfolio-deployment',
    title: 'This Portfolio — AWS Static Site with Terraform & GitHub Actions',
    summary: 'The site you\u2019re looking at right now \u2014 live at techworld-with-jules.com, deployed on AWS with Terraform and a working GitHub Actions CI/CD pipeline authenticated via OIDC, no stored AWS credentials anywhere.',
    provider: 'AWS',
    difficulty: 'Intermediate',
    duration: 'Ongoing',
    featured: true,
    tags: ['Terraform', 'AWS', 'GitHub Actions', 'CloudFront', 'S3'],
    github: 'https://github.com/mjulestek/my-cloudpath-portfolio',
    problem: 'Most portfolio sites hide their own infrastructure behind a hosting dashboard. I wanted mine to double as proof of the skills it\u2019s advertising \u2014 provisioned as code and deployed through a real pipeline, not a few clicks in a control panel.',
    solution: 'Built on a private S3 bucket behind CloudFront, provisioned entirely with Terraform. GitHub Actions runs two separate workflows \u2014 one applies infrastructure changes only after a human approves the plan, the other deploys content automatically on every push \u2014 both authenticating to AWS via OIDC, with no access keys stored anywhere. The contact form posts straight to Web3Forms and WhatsApp is a plain click-to-chat link, so neither needed a database or any extra AWS compute to add. The whole visual system \u2014 colors, type, the sharpened geometry \u2014 is a deliberate design token system built from scratch, not a theme.',
    architecture: 'A private S3 bucket holds the site files, reachable only through CloudFront using Origin Access Control \u2014 there is no public path to the bucket at all. TLS comes from an ACM certificate, DNS-validated by hand since the domain isn\u2019t on Route 53. Terraform state lives in a separate S3 bucket with native state locking, no DynamoDB table required.',
    cicd: [
      { stage: 'Push to main', detail: 'Any change under public/ triggers the deploy workflow automatically.' },
      { stage: 'Render', detail: 'A shell script substitutes the real domain into every page before upload.' },
      { stage: 'Sync', detail: 'aws s3 sync uploads the rendered site and removes anything no longer present.' },
      { stage: 'Invalidate', detail: 'CloudFront\u2019s cache is invalidated so the change is visible within seconds, not minutes.' },
      { stage: 'Infra changes', detail: 'A separate, manually-triggered workflow plans Terraform changes and waits for approval before applying.' }
    ],
    infra: {
      terraform: 'One flat main.tf provisions the S3 bucket, CloudFront distribution, Origin Access Control, and bucket policy \u2014 no module layer, since there\u2019s only one environment to call it from.',
      docker: 'Not used \u2014 this is a static site with nothing to containerize.',
      kubernetes: 'Not used here.',
      networking: 'CloudFront terminates TLS and serves globally; the origin bucket has no public network path at all.',
      security: 'GitHub Actions authenticates via OIDC \u2014 no AWS access keys stored in the repo, ever. Two IAM roles, scoped separately for infrastructure and content deploys.',
      monitoring: 'CloudFront and S3 access logging is available natively; not yet wired into a dashboard.',
      cost: 'Pay-as-you-go S3 and CloudFront, no fixed server cost \u2014 a few dollars a month at this traffic level.'
    },
    lessons: [
      'A GitHub Actions OIDC token\u2019s subject claim isn\u2019t always the plain repo:org/repo:ref:branch format the AWS console wizard assumes \u2014 some accounts get an ID-suffixed version. Diagnosed by reading the literal token from CloudTrail rather than re-checking the trust policy a third time.',
      'An IAM policy with a placeholder half-replaced \u2014 one bucket ARN fixed, one still literally &lt;bucket-name&gt; \u2014 produces a specific, confusing symptom: S3 ListBucket denied while PutObject still works fine. Worth a quick grep for a stray "&lt;" before saving any edited policy.',
      'The Terraform state bucket and the site bucket ended up in genuinely different AWS regions \u2014 not a mistake, just how they were each set up. Needed a separate region variable once the backend config moved into CI, since one shared value couldn\u2019t correctly serve both.'
    ],
    future: [
      'Wire the existing CloudFront access logs into a small dashboard instead of leaving them unused in S3.',
      'Add a staging environment before reusing this exact pattern on a second project.',
      'Bring back a real blog section once there\u2019s actual writing worth publishing \u2014 the placeholder posts got removed rather than shipped under my own name.'
    ],
    gallery: 2
  },
  {
    id: 'eks-infrastructure',
    title: 'Automated AWS EKS Infrastructure & Microservices Delivery',
    summary: 'A Terraform-provisioned VPC and EKS cluster running a multi-container microservices app \u2014 MongoDB and Redis \u2014 deployed via Helm across dedicated namespaces.',
    provider: 'AWS',
    difficulty: 'Advanced',
    duration: 'Personal project',
    featured: true,
    tags: ['Terraform', 'AWS', 'EKS', 'Kubernetes', 'Helm'],
    github: 'https://github.com/mjulestek',
    problem: 'Wanted real hands-on experience with a multi-service Kubernetes environment on AWS \u2014 not a local minikube cluster, but one that forces actual decisions about IAM, networking, and state management.',
    solution: 'Used Terraform modules to provision a custom VPC with public and private subnets, IAM roles, and an EKS cluster, with state stored remotely in S3. Deployed a multi-container microservices application backed by MongoDB and Redis using Helm, organized into dedicated Kubernetes namespaces.',
    architecture: 'A custom VPC spans public and private subnets across availability zones. EKS runs in the private subnets, with IAM roles scoped per workload rather than one broad cluster-wide role. Terraform state is remote, so the whole environment can be rebuilt from code.',
    cicd: [
      { stage: 'Provision', detail: 'terraform apply builds the VPC, IAM roles, and EKS cluster from versioned modules.' },
      { stage: 'Configure', detail: 'kubectl and Helm connect to the new cluster once it\u2019s up.' },
      { stage: 'Deploy', detail: 'Helm charts install the microservices, MongoDB, and Redis into their own namespaces.' },
      { stage: 'Verify', detail: 'Namespace isolation and resource boundaries are checked before calling it done.' }
    ],
    infra: {
      terraform: 'Reusable modules for the VPC, IAM, and EKS \u2014 the same pattern used across the other Terraform projects here.',
      docker: 'Application services run as containers, scheduled by Kubernetes.',
      kubernetes: 'Workloads split across dedicated namespaces for clear separation between services.',
      networking: 'Public and private subnets per availability zone, EKS nodes kept in the private subnets.',
      security: 'IAM roles scoped per component instead of one broad cluster-wide role.',
      monitoring: 'Not the focus of this project \u2014 see the Kubernetes Observability project below.',
      cost: 'The EKS control plane and worker nodes are the main cost driver \u2014 kept small and torn down when not actively in use.'
    },
    lessons: [
      'Terraform modules earn their complexity fast once you\u2019re managing a VPC, IAM, and EKS together \u2014 copy-pasted resources across environments get messy quickly.',
      'Namespace-per-service is simple to set up and immediately clarifies which component owns what.'
    ],
    future: [
      'Add Terraform-managed autoscaling instead of a statically-sized node group.',
      'Put a proper ingress controller in front of the services instead of relying on port-forwarding for access.'
    ],
    gallery: 2
  },
  {
    id: 'jenkins-cicd-platform',
    title: 'CI/CD Platform with Jenkins Shared Libraries',
    summary: 'Reusable Jenkins Shared Libraries standardizing build, test, and deploy across multiple projects \u2014 semantic versioning, Docker builds, and artifact publishing to Nexus and ECR.',
    provider: 'Self-hosted',
    difficulty: 'Intermediate',
    duration: 'Personal project',
    featured: true,
    tags: ['Jenkins', 'Groovy', 'Docker', 'Nexus', 'AWS ECR'],
    github: 'https://github.com/mjulestek',
    problem: 'Every project ending up with its own hand-written Jenkinsfile means the same build logic gets copy-pasted and slowly drifts apart \u2014 a fix in one pipeline never reaches the others.',
    solution: 'Wrote reusable Jenkins Shared Libraries in Groovy that standardize the build-test-publish sequence across projects. Individual pipelines call into the shared library instead of repeating logic, triggered automatically by GitHub and GitLab webhooks.',
    architecture: 'A central Shared Library repository holds the pipeline logic. Each project\u2019s own Jenkinsfile is a thin wrapper that calls into the library, passing only its own project-specific parameters.',
    cicd: [
      { stage: 'Trigger', detail: 'A push to GitHub or GitLab fires a webhook that starts the pipeline.' },
      { stage: 'Version', detail: 'Semantic versioning is applied automatically by the shared library logic.' },
      { stage: 'Build & test', detail: 'Maven or npm builds run depending on the project type.' },
      { stage: 'Package', detail: 'A Docker image is built as the pipeline\u2019s final artifact.' },
      { stage: 'Publish', detail: 'Images and artifacts are pushed to Sonatype Nexus Repository or Amazon ECR.' }
    ],
    infra: {
      terraform: 'Not used directly \u2014 infrastructure for the Jenkins host itself is managed separately.',
      docker: 'Every pipeline produces a Docker image as its final build artifact.',
      kubernetes: 'Not used in this specific project.',
      networking: 'Jenkins reaches GitHub, GitLab, and the artifact registries over standard outbound HTTPS.',
      security: 'Registry and Git credentials are stored in Jenkins\u2019 own credential store, never hardcoded in a Jenkinsfile.',
      monitoring: 'Build status is visible per-pipeline in Jenkins; no separate dashboard layered on top.',
      cost: 'Runs on existing infrastructure \u2014 no additional cloud spend tied specifically to this project.'
    },
    lessons: [
      'A shared library only pays off once more than one project actually uses it \u2014 the first migration is the hard one.',
      'Groovy\u2019s flexibility is also a risk: without discipline, \u201cshared\u201d logic quietly grows per-project special cases.'
    ],
    future: [
      'Add automated tests for the shared library itself, not just the projects that consume it.',
      'Document its public functions properly so onboarding a new project doesn\u2019t require reading the source.'
    ],
    gallery: 2
  },
  {
    id: 'engineering-platform',
    title: 'Engineering Platform & Portfolio Dashboard',
    summary: 'A self-hosted engineering dashboard built with Next.js and React, integrating GitHub, Jenkins, Nexus, and AWS S3 through REST APIs, containerized and served behind Nginx.',
    provider: 'Self-hosted',
    difficulty: 'Advanced',
    duration: 'Personal project',
    featured: true,
    tags: ['Next.js', 'React', 'TypeScript', 'Docker', 'Nginx'],
    github: 'https://github.com/mjulestek',
    problem: 'Wanted a portfolio that was also a genuinely useful tool \u2014 one dashboard to check GitHub activity, Jenkins builds, and Nexus artifacts instead of switching between four different tabs.',
    solution: 'Built a production-style engineering platform with Next.js and React, integrating GitHub, Jenkins, Nexus Repository, YouTube, and AWS S3 through their REST APIs. Containerized with Docker and Docker Compose, served through Nginx as a reverse proxy on Hetzner Cloud.',
    architecture: 'A Next.js application runs behind Nginx, which handles TLS termination and routing. Docker Compose ties the app together with its dependencies for consistent local development and deployment.',
    cicd: [
      { stage: 'Build', detail: 'The Next.js app is built and containerized with Docker.' },
      { stage: 'Test', detail: 'GitHub Actions runs checks on every push.' },
      { stage: 'Deploy', detail: 'Docker Compose brings up the app and Nginx together on the server.' }
    ],
    infra: {
      terraform: 'Planned but not yet in place \u2014 the Hetzner Cloud server is currently provisioned by hand.',
      docker: 'The app and its dependencies run as Docker Compose services.',
      kubernetes: 'Not used \u2014 single-host deployment is enough at this scale.',
      networking: 'Nginx reverse-proxies requests to the app container and terminates TLS.',
      security: 'API tokens for GitHub, Jenkins, and Nexus are kept out of the codebase via environment variables.',
      monitoring: 'Not yet wired up \u2014 a reasonable next step.',
      cost: 'A single small Hetzner Cloud instance, chosen deliberately to keep this affordable.'
    },
    lessons: [
      'Integrating several REST APIs into one dashboard surfaces a lot of small inconsistencies in how each service structures its responses.',
      'Docker Compose is enough structure for a single-host personal project \u2014 Kubernetes would have been overkill here.'
    ],
    future: [
      'Replace the manually-provisioned Hetzner server with Terraform, matching the approach used on the AWS projects.',
      'Add authentication so the dashboard could eventually be shared, not just used locally.'
    ],
    gallery: 3
  },
  {
    id: 'terraform-ansible-provisioning',
    title: 'Dynamic Infrastructure Provisioning with Terraform & Ansible',
    summary: 'AWS EC2 infrastructure provisioned with Terraform, configured automatically through Ansible Dynamic Inventory \u2014 no static host list to maintain by hand.',
    provider: 'AWS',
    difficulty: 'Intermediate',
    duration: 'Personal project',
    featured: false,
    tags: ['Terraform', 'Ansible', 'AWS EC2', 'Linux'],
    github: 'https://github.com/mjulestek',
    problem: 'A static Ansible inventory file falls out of date the moment infrastructure changes \u2014 a host gets added or removed in Terraform and the inventory doesn\u2019t know until someone remembers to update it by hand.',
    solution: 'Provisioned EC2 infrastructure with Terraform, then used Ansible\u2019s Dynamic Inventory to discover hosts automatically based on AWS tags, removing the static inventory file entirely. Modular Ansible roles handle server hardening, user management, and Docker installation.',
    architecture: 'Terraform provisions EC2 instances tagged consistently by role. Ansible\u2019s AWS dynamic inventory plugin queries those tags directly at run time, so the inventory always reflects exactly what Terraform has created.',
    cicd: [
      { stage: 'Provision', detail: 'terraform apply creates or updates EC2 instances with role-based tags.' },
      { stage: 'Discover', detail: 'Ansible dynamic inventory queries AWS directly \u2014 no manual inventory file to update.' },
      { stage: 'Configure', detail: 'Modular Ansible roles handle hardening, users, and Docker installation.' },
      { stage: 'Deploy', detail: 'Docker Compose brings up multi-container applications on the configured hosts.' }
    ],
    infra: {
      terraform: 'Provisions the EC2 instances and applies the AWS tags Ansible reads afterward.',
      docker: 'Docker Compose deploys multi-container applications once hosts are configured.',
      kubernetes: 'Not used \u2014 this project is specifically about VM-based provisioning, not container orchestration.',
      networking: 'Standard EC2 networking, security groups scoped per role.',
      security: 'Ansible roles include baseline Linux hardening as a standard step, not an afterthought.',
      monitoring: 'Not the focus of this project.',
      cost: 'EC2 instances sized minimally and stopped when not actively in use for testing.'
    },
    lessons: [
      'Dynamic inventory removes an entire category of \u201cthe inventory file is stale\u201d bugs, at the cost of needing correct AWS tagging discipline instead.',
      'Modular Ansible roles are worth the upfront structure \u2014 a single monolithic playbook gets unreadable fast.'
    ],
    future: [
      'Add Ansible Vault for secrets instead of relying on environment variables alone.',
      'Extend the same dynamic-inventory pattern to a second cloud provider to see how portable it really is.'
    ],
    gallery: 2
  },
  {
    id: 'k8s-observability',
    title: 'Kubernetes Observability & Monitoring Platform',
    summary: 'A Prometheus, Grafana, and Alertmanager stack for Kubernetes, using the kube-prometheus-stack Helm chart to monitor cluster health and application performance.',
    provider: 'AWS',
    difficulty: 'Intermediate',
    duration: 'Personal project',
    featured: false,
    tags: ['Kubernetes', 'Prometheus', 'Grafana', 'Helm'],
    github: 'https://github.com/mjulestek',
    problem: 'A Kubernetes cluster with no monitoring is a black box \u2014 deployments and scaling changes happen with no visibility into what actually happened to resource usage or application health afterward.',
    solution: 'Deployed the kube-prometheus-stack via Helm, configuring Prometheus scraping and ServiceMonitors, Node Exporter for host-level metrics, Alertmanager for notifications, and Grafana dashboards covering cluster health, infrastructure metrics, and application performance.',
    architecture: 'Prometheus scrapes metrics from cluster components and application pods via ServiceMonitors. Node Exporter runs as a DaemonSet for host-level metrics. Grafana queries Prometheus directly for dashboards, and Alertmanager routes alerts based on Prometheus rules.',
    cicd: [
      { stage: 'Install', detail: 'The kube-prometheus-stack Helm chart installs Prometheus, Grafana, and Alertmanager together.' },
      { stage: 'Configure scraping', detail: 'ServiceMonitors are added per application to expose the right metrics.' },
      { stage: 'Build dashboards', detail: 'Grafana dashboards are set up for cluster health and application performance.' },
      { stage: 'Configure alerts', detail: 'Alertmanager rules are tuned toward real issues, not noise.' }
    ],
    infra: {
      terraform: 'Not used for this project \u2014 the cluster itself comes from the EKS project above.',
      docker: 'Prometheus, Grafana, and Alertmanager all run as containers via the Helm chart.',
      kubernetes: 'The whole point of this project \u2014 DaemonSets, ServiceMonitors, and standard Kubernetes primitives throughout.',
      networking: 'Grafana is exposed internally only; no public-facing dashboard by default.',
      security: 'Default Grafana credentials changed immediately; RBAC scoped to the monitoring namespace.',
      monitoring: 'This is the monitoring project \u2014 Prometheus and Grafana monitor the cluster that runs them, too.',
      cost: 'Runs inside the existing EKS cluster \u2014 no separate infrastructure cost.'
    },
    lessons: [
      'The kube-prometheus-stack chart bundles a lot by default \u2014 worth reading through what\u2019s actually enabled rather than accepting every default.',
      'Alert rules that page on any threshold breach get noisy fast; tuning them down to genuinely actionable alerts took real iteration.'
    ],
    future: [
      'Add Loki for log aggregation alongside the existing metrics stack.',
      'Set up long-term metric storage instead of relying on Prometheus\u2019s default retention window.'
    ],
    gallery: 2
  }
];

/* ---- Deterministic topology art per project (signature visual motif) ----
   Always renders on a dark "blueprint" panel regardless of site theme —
   same intentional choice as the terminal staying dark in light mode,
   reinforcing the schematic/engineering-drawing motif. One project has
   a real architecture diagram instead of generated art — used as-is
   rather than replaced with a synthetic substitute. */
function projectArt(project, seedIndex) {
  if (project.id === 'aws-portfolio-deployment') {
    return `<img src="assets/images/projects/aws-portfolio-architecture.jpg" alt="Architecture diagram for this deployment" style="width:100%;height:100%;object-fit:contain;object-position:center;display:block;">`;
  }
  const palette = ['#D4954B', '#64707C', '#B87D42'];
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
  const dots = nodes.map((n, i) => `<circle cx="${n.x}" cy="${n.y}" r="${i === 0 ? 6 : 4}" fill="${i === 0 ? color : '#F1EFEA'}" stroke="${color}" stroke-width="1.8"/>`).join('');

  return `<svg viewBox="0 0 300 190" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <rect width="300" height="190" fill="#16181C"/>
    <g>${lines}${dots}</g>
  </svg>`;
}

function providerBadgeColor(provider) {
  return { AWS: 'accent', 'Self-hosted': 'amber' }[provider] || '';
}

function projectCard(project, index) {
  return `
  <article class="card project-card reveal" style="--i:${index % 6}">
    <a href="project-details.html?id=${project.id}" class="project-media" aria-hidden="true">
      ${projectArt(project, index)}
      ${project.id === 'aws-portfolio-deployment' ? '<span class="project-live-badge">Live</span>' : ''}
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

  document.title = `${project.title} \u2014 Jules Munyaneza`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', project.summary);

  document.getElementById('breadcrumbCurrent').textContent = project.title;

  wrap.innerHTML = `
    <div class="page-hero container band-soft" style="border-radius:0 0 8px 8px;">
      <div class="dot-cluster" style="top:20px; right:6%;"></div>
      <div class="breadcrumbs" id="breadcrumbNav">
        <a href="/">Home</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        <a href="projects.html">Projects</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        <span>${project.title}</span>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
        <div class="badge accent">${project.provider}</div>
        ${project.id === 'aws-portfolio-deployment' ? '<div class="badge success">Live &middot; deployed &amp; fully functioning</div>' : ''}
      </div>
      <h1 class="reveal in-view" style="max-width:820px;">${project.title}</h1>
      <p style="max-width:640px;font-size:1.05rem;margin-top:16px;">${project.summary}</p>
      <div class="hero-actions" style="margin-top:28px;align-items:center;">
        ${project.id === 'aws-portfolio-deployment' ? '<a href="https://techworld-with-jules.com/" target="_blank" rel="noopener" class="btn btn-primary">Visit live site &rarr;</a>' : ''}
        <a href="${project.github}" target="_blank" rel="noopener" class="btn ${project.id === 'aws-portfolio-deployment' ? 'btn-secondary' : 'btn-primary'}">View source on GitHub</a>
        <a href="projects.html" class="btn btn-secondary">Back to all projects</a>
        ${project.id === 'aws-portfolio-deployment' ? '<a href="https://github.com/mjulestek/my-cloudpath-portfolio/actions/workflows/deploy.yml" target="_blank" rel="noopener"><img src="https://github.com/mjulestek/my-cloudpath-portfolio/actions/workflows/deploy.yml/badge.svg" alt="Deploy workflow status" height="28"></a>' : ''}
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
          ${project.id === 'aws-portfolio-deployment' ? '<img src="assets/images/projects/aws-portfolio-architecture.jpg" alt="Architecture diagram: developer pushes to GitHub, triggering an infra workflow and a deploy workflow, both authenticating to AWS via OIDC; the infra workflow manages IAM, S3 state and site buckets, and CloudFront with ACM; Namecheap DNS points to CloudFront; visitors reach the site over HTTPS" style="max-width:600px;width:100%;display:block;margin-top:20px;border-radius:var(--radius-lg);border:1px solid var(--border);">' : ''}
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
