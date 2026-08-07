/* ============================================================
   blog.js
   Blog data (mirrors data/blog.json) plus rendering for the
   homepage latest-articles strip, the filterable blog grid with
   pagination, and the blog-post reading page with a live TOC.
   ============================================================ */

const BLOG_POSTS = [
  {
    slug: 'terraform-modules-that-scale',
    title: 'Terraform modules that survive a growing team',
    excerpt: 'The module patterns that kept our Terraform readable at 40 environments, and the ones that quietly turned into technical debt.',
    category: 'Infrastructure',
    tags: ['Terraform', 'IaC', 'Best Practices'],
    date: '2026-06-02',
    readingTime: 8,
    content: [
      { type: 'p', text: 'Every Terraform codebase starts clean. The first module is small, the variables are obvious, and one engineer holds the whole mental model in their head. None of that survives a second environment, let alone a fortieth.' },
      { type: 'h2', text: 'Start with the boundary, not the resource' },
      { type: 'p', text: 'The instinct is to wrap a single resource in a module the moment you reuse it twice. Resist that. A module should represent a boundary someone actually reasons about \u2014 a network, a service, a database \u2014 not a thin wrapper around one aws_instance block that saves four lines of HCL.' },
      { type: 'code', text: 'module "network" {\n  source  = "./modules/network"\n  cidr    = "10.20.0.0/16"\n  az_count = 3\n}' },
      { type: 'h2', text: 'Version pinning is not optional' },
      { type: 'p', text: 'An unpinned module source is a promise you cannot keep. Every module we publish gets a semantic version tag, and every consumer pins to a specific version. Upgrades are a deliberate pull request, not a surprise on the next apply.' },
      { type: 'h2', text: 'Outputs are the real API' },
      { type: 'p', text: 'Treat a module\u2019s outputs the way you would treat a public API contract. Adding an output is free. Removing or renaming one is a breaking change, and it should feel like one \u2014 a major version bump, a changelog entry, a heads-up in the team channel.' },
      { type: 'h2', text: 'What we stopped doing' },
      { type: 'p', text: 'We stopped writing one module per environment. Environment differences belong in variables and tfvars files, not in forked copies of the same module that drift apart within a quarter. We also stopped nesting modules more than two levels deep \u2014 the plan output becomes unreadable and nobody can tell which layer actually changed.' }
    ]
  },
  {
    slug: 'kubernetes-cost-without-cutting-reliability',
    title: 'Cutting Kubernetes cost without cutting reliability',
    excerpt: 'Bin-packing, spot capacity, and the three metrics we watched before touching a single request or limit.',
    category: 'Kubernetes',
    tags: ['Kubernetes', 'Cost', 'AWS'],
    date: '2026-05-14',
    readingTime: 7,
    content: [
      { type: 'p', text: 'The fastest way to blow a reliability budget is to chase a cost target with limits you picked from a spreadsheet instead of from data. We cut our cluster spend by a third without a single new incident, and the order of operations mattered more than any individual change.' },
      { type: 'h2', text: '1. Measure before you touch anything' },
      { type: 'p', text: 'We spent a full week just watching actual CPU and memory usage against requested values, per workload, before changing a single number. Requests set from guesses were, on average, 2.4x higher than what workloads actually used at p95.' },
      { type: 'h2', text: '2. Right-size requests, leave limits alone' },
      { type: 'p', text: 'Requests drive scheduling and bin-packing; that\u2019s where the waste lives. We left memory limits conservative to avoid OOM surprises, and tightened requests to match observed p95 usage plus a deliberate buffer.' },
      { type: 'code', text: 'resources:\n  requests:\n    cpu: 120m\n    memory: 256Mi\n  limits:\n    memory: 512Mi' },
      { type: 'h2', text: '3. Move stateless workloads to spot' },
      { type: 'p', text: 'Karpenter with a mixed spot/on-demand provisioner handled interruption gracefully once we added pod disruption budgets and a 60-second termination grace period. Stateful workloads stayed on-demand \u2014 the savings weren\u2019t worth the risk there.' },
      { type: 'h2', text: 'The metric that mattered most' },
      { type: 'p', text: 'Bin-packing efficiency \u2014 the ratio of requested resources to node capacity \u2014 told us more than the AWS bill did. Watching that number climb from 41% to 74% predicted the cost drop days before it showed up in billing.' }
    ]
  },
  {
    slug: 'incident-review-that-people-actually-read',
    title: 'Writing incident reviews people actually read',
    excerpt: 'Why our postmortems moved from a Google Doc nobody opened to a five-minute read the whole org references months later.',
    category: 'Reliability',
    tags: ['Incident Response', 'Process'],
    date: '2026-04-22',
    readingTime: 6,
    content: [
      { type: 'p', text: 'We used to write postmortems the way you\u2019d write a legal deposition: exhaustive, defensive, and dead on arrival. Nobody read past the timeline. The fixes that came out of them were vague \u2014 "improve monitoring" \u2014 and nobody owned them.' },
      { type: 'h2', text: 'Lead with impact, not chronology' },
      { type: 'p', text: 'The first three lines now answer: what broke, who felt it, for how long. The full timeline still exists, but it\u2019s below the fold for whoever needs to audit it later, not the thing every reader has to wade through first.' },
      { type: 'h2', text: 'Every action item gets a name and a date' },
      { type: 'p', text: 'An action item with no owner is a wish. We stopped accepting "the team will look into X" as a valid line item \u2014 it needs a name, a due date, and a linked ticket, or it doesn\u2019t go in the document.' },
      { type: 'h2', text: 'Blameless doesn\u2019t mean vague' },
      { type: 'p', text: 'Blameless review means we don\u2019t punish the engineer who typed the wrong command. It doesn\u2019t mean we\u2019re fuzzy about what happened. We say exactly what happened, in plain language, and focus the "why" on the system that made the mistake possible.' }
    ]
  },
  {
    slug: 'github-actions-vs-self-hosted-runners',
    title: 'GitHub Actions runners: when hosted stops being cheaper',
    excerpt: 'The break-even math we used to decide when self-hosted runners actually pay for themselves \u2014 and when they just add ops burden.',
    category: 'CI/CD',
    tags: ['GitHub Actions', 'CI/CD', 'Cost'],
    date: '2026-03-30',
    readingTime: 5,
    content: [
      { type: 'p', text: 'Self-hosted runners get pitched as an automatic cost win. They\u2019re not, until your CI minutes cross a specific threshold that\u2019s easy to calculate and easy to ignore under deadline pressure.' },
      { type: 'h2', text: 'The real cost of hosted minutes' },
      { type: 'p', text: 'At our usage \u2014 roughly 40,000 minutes a month across all repos \u2014 hosted runners cost more than a small always-on self-hosted pool, but not by as much as the sticker price suggests once you add engineering time for runner maintenance.' },
      { type: 'h2', text: 'What tipped us over' },
      { type: 'p', text: 'It wasn\u2019t the bill. It was build-cache reuse. Self-hosted runners on persistent nodes cut our average build time by 35% just from warm Docker layer caches, which hosted ephemeral runners can\u2019t give you without extra plumbing.' },
      { type: 'code', text: 'jobs:\n  build:\n    runs-on: [self-hosted, linux, x64, cache-warm]' },
      { type: 'h2', text: 'The maintenance tax is real' },
      { type: 'p', text: 'Someone now owns runner patching, scaling, and security updates. We budget four hours a month for it. If your team can\u2019t absorb that, the math changes even if the raw minutes math looks favorable.' }
    ]
  },
  {
    slug: 'zero-trust-networking-in-practice',
    title: 'Zero trust networking, minus the buzzword',
    excerpt: 'What actually changed when we moved from a flat VPC to per-service mTLS \u2014 and the two places it made things slower, on purpose.',
    category: 'Security',
    tags: ['Security', 'Networking', 'Kubernetes'],
    date: '2026-03-05',
    readingTime: 9,
    content: [
      { type: 'p', text: '"Zero trust" gets used as a marketing label more often than an architecture. Concretely, for us, it meant three changes: every service-to-service call is mutually authenticated, network position stops being a trust signal, and access decisions move to the identity layer.' },
      { type: 'h2', text: 'mTLS everywhere, via the mesh' },
      { type: 'p', text: 'We rolled out Linkerd\u2019s automatic mTLS across every namespace. The migration itself was uneventful \u2014 the mesh handled certificate rotation transparently \u2014 but it changed how we reason about network policy. A flat "allow from this subnet" rule is meaningless once identity, not IP, is the real perimeter.' },
      { type: 'h2', text: 'Where we deliberately added friction' },
      { type: 'p', text: 'Two internal admin tools that used to be reachable from anywhere on the VPN now require a short-lived, per-session token issued after an identity check, even for engineers already inside the network. Slower to access, and that was the point \u2014 network position stopped being sufficient proof of who you are.' },
      { type: 'h2', text: 'What we did not do' },
      { type: 'p', text: 'We didn\u2019t rip out network policies and rely on identity alone. Defense in depth still means both layers exist \u2014 a compromised identity shouldn\u2019t automatically mean free movement across every namespace.' }
    ]
  },
  {
    slug: 'on-call-rotation-that-does-not-burn-people-out',
    title: 'Designing an on-call rotation that doesn\u2019t burn people out',
    excerpt: 'The scheduling and alert-routing changes that cut our average on-call pages from 11 a week to 2, without lowering our SLOs.',
    category: 'Reliability',
    tags: ['On-call', 'Process', 'SRE'],
    date: '2026-02-11',
    readingTime: 6,
    content: [
      { type: 'p', text: 'Eleven pages a week sounds survivable until you\u2019re the one holding the pager. Most of them weren\u2019t incidents \u2014 they were noise that happened to be routed to a human at 3 a.m.' },
      { type: 'h2', text: 'Every alert needs a runbook or it gets deleted' },
      { type: 'p', text: 'We audited every alert rule and asked one question: is there a documented, actionable response? If not, the alert either got a runbook written for it that week, or it was deleted. About a third of our alerts didn\u2019t survive that audit.' },
      { type: 'h2', text: 'Route by severity, not by team' },
      { type: 'p', text: 'Anything that isn\u2019t user-facing and can wait until morning now routes to a ticket queue, not a page. Only SLO-threatening alerts wake someone up. That single change accounted for most of the drop.' },
      { type: 'h2', text: 'Rotation length matters more than headcount' },
      { type: 'p', text: 'We moved from weekly to three-day rotations. Shorter shifts meant a bad night didn\u2019t bleed into a bad week, and it made it easier for more engineers to take a turn without dreading it for days beforehand.' }
    ]
  }
];

function slugify(s) { return s.toLowerCase(); }

function readingBadge(minutes) {
  return `<span class="badge">${minutes} min read</span>`;
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function blogCard(post, index) {
  return `
  <article class="card reveal" style="--i:${index % 6};overflow:hidden;">
    <a href="blog-post.html?slug=${post.slug}" class="project-media" style="aspect-ratio:16/9;">
      ${projectArtForBlog(post, index)}
      <span class="project-provider">${post.category}</span>
    </a>
    <div class="project-body">
      <h3 style="font-size:1.15rem;"><a href="blog-post.html?slug=${post.slug}">${post.title}</a></h3>
      <p class="project-desc">${post.excerpt}</p>
      <div class="project-meta-row" style="border-top:none;padding-top:4px;">
        <span class="mono">${formatDate(post.date)}</span>
        ${readingBadge(post.readingTime)}
      </div>
    </div>
  </article>`;
}

function projectArtForBlog(post, index) {
  if (typeof projectArt === 'function') {
    return projectArt({ id: post.slug }, index);
  }
  return '';
}

function renderLatestPosts() {
  const el = document.getElementById('latestPosts');
  if (!el) return;
  const latest = BLOG_POSTS.slice(0, 3);
  el.innerHTML = latest.map(blogCard).join('');
  document.dispatchEvent(new Event('cp:content-mounted'));
}

function renderBlogGrid() {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  const searchInput = document.getElementById('blogSearch');
  const chips = document.querySelectorAll('#categoryChips .chip');
  const pagination = document.getElementById('blogPagination');
  const emptyState = document.getElementById('blogEmpty');

  let activeCategory = 'All';
  let query = '';
  let page = 1;
  const perPage = 4;

  function filtered() {
    return BLOG_POSTS.filter(p => {
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      const haystack = (p.title + ' ' + p.excerpt + ' ' + p.tags.join(' ')).toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }

  function apply() {
    const list = filtered();
    const totalPages = Math.max(1, Math.ceil(list.length / perPage));
    page = Math.min(page, totalPages);
    const start = (page - 1) * perPage;
    const pageItems = list.slice(start, start + perPage);

    grid.innerHTML = pageItems.map(blogCard).join('');
    if (emptyState) emptyState.style.display = list.length ? 'none' : 'block';

    if (pagination) {
      let html = '';
      for (let i = 1; i <= totalPages; i++) {
        html += `<button class="chip ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      pagination.innerHTML = totalPages > 1 ? html : '';
      pagination.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => { page = parseInt(btn.getAttribute('data-page'), 10); apply(); window.scrollTo({ top: grid.offsetTop - 120, behavior: 'smooth' }); });
      });
    }

    document.dispatchEvent(new Event('cp:content-mounted'));
  }

  if (searchInput) searchInput.addEventListener('input', (e) => { query = e.target.value; page = 1; apply(); });
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCategory = chip.getAttribute('data-category');
    page = 1;
    apply();
  }));

  apply();
}

function renderBlogPost() {
  const wrap = document.getElementById('blogPostContent');
  if (!wrap) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const post = BLOG_POSTS.find(p => p.slug === slug) || BLOG_POSTS[0];

  document.title = `${post.title} \u2014 CloudPath Blog`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', post.excerpt);

  const headings = post.content.filter(b => b.type === 'h2');
  const toc = headings.map((h, i) => `<a href="#h-${i}" class="toc-link">${h.text}</a>`).join('');

  let hIndex = -1;
  const body = post.content.map(block => {
    if (block.type === 'h2') { hIndex++; return `<h2 id="h-${hIndex}">${block.text}</h2>`; }
    if (block.type === 'p') return `<p>${block.text}</p>`;
    if (block.type === 'code') return `<pre class="code-block"><code>${block.text.replace(/</g, '&lt;')}</code></pre>`;
    return '';
  }).join('');

  const related = BLOG_POSTS.filter(p => p.slug !== post.slug && p.category === post.category).slice(0, 2);
  const fallback = BLOG_POSTS.filter(p => p.slug !== post.slug).slice(0, 2);
  const relatedPosts = (related.length ? related : fallback);

  document.getElementById('breadcrumbCurrent').textContent = post.title;

  wrap.innerHTML = `
    <div class="page-hero container band-soft" style="border-radius:0 0 32px 32px;">
      <div class="dot-cluster" style="bottom:16px; left:5%;"></div>
      <div class="breadcrumbs">
        <a href="index.html">Home</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        <a href="blog.html">Blog</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        <span>${post.title}</span>
      </div>
      <span class="badge accent">${post.category}</span>
      <h1 style="margin-top:16px;max-width:820px;">${post.title}</h1>
      <div class="project-meta-row" style="border:none;justify-content:flex-start;gap:20px;margin-top:20px;">
        <span class="mono">${formatDate(post.date)}</span>
        <span class="mono">${post.readingTime} min read</span>
      </div>
    </div>

    <div class="container">
      <div class="blog-post-layout">
        <aside class="toc-aside reveal-left">
          <h5 class="mono" style="font-size:0.75rem;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:14px;letter-spacing:0.05em;">On this page</h5>
          ${toc}
          <h5 class="mono" style="font-size:0.75rem;text-transform:uppercase;color:var(--text-tertiary);margin:24px 0 12px;letter-spacing:0.05em;">Share</h5>
          <div style="display:flex;gap:8px;">
            <button class="icon-btn" data-share="twitter" aria-label="Share on X" data-tooltip="Share on X">${window.CP_ICONS ? '' : ''}<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18.9 3H22l-7.6 8.7L23.3 21h-6.9l-5.4-6.6L4.8 21H1.7l8.1-9.3L1 3h7l4.9 6 6-6z"/></svg></button>
            <button class="icon-btn" data-share="linkedin" aria-label="Share on LinkedIn" data-tooltip="Share on LinkedIn">${window.CP_ICONS ? window.CP_ICONS.linkedin : ''}</button>
            <button class="icon-btn" id="copyLinkBtn" data-tooltip="Copy link" aria-label="Copy link" style="font-size:0.7rem;">Copy link</button>
          </div>
        </aside>
        <article class="blog-post-body reveal">
          ${body}
        </article>
      </div>
    </div>

    <section class="section-tight container">
      <div class="section-head"><span class="eyebrow">Keep reading</span><h2>Related articles</h2></div>
      <div class="project-grid grid-cols-2">
        ${relatedPosts.map((p, i) => blogCard(p, i)).join('')}
      </div>
    </section>

    <section class="section-tight container">
      <div class="card band-soft reveal-scale" style="padding:56px;text-align:center;border:none;position:relative;overflow:hidden;">
        <div class="dot-cluster" style="top:16px; right:7%;"></div>
        <div class="dot-cluster" style="bottom:16px; left:8%; width:56px; height:56px;"></div>
        <span class="eyebrow" style="justify-content:center;">Have a similar problem?</span>
        <h2 style="margin-bottom:16px;">Let's talk <span class="hl">infrastructure</span></h2>
        <p style="max-width:460px;margin:0 auto 28px;">Happy to compare notes, or talk through how this would apply to your setup.</p>
        <div class="hero-actions" style="justify-content:center;margin:0;">
          <a href="contact.html" class="btn btn-primary">Get in touch</a>
          <a href="blog.html" class="btn btn-secondary">Back to all articles</a>
        </div>
      </div>
    </section>
  `;

  initShareButtonsLocal();
  document.dispatchEvent(new Event('cp:content-mounted'));
}

function initShareButtonsLocal() {
  document.querySelectorAll('[data-share]').forEach(btn => {
    btn.addEventListener('click', () => {
      const network = btn.getAttribute('data-share');
      const url = encodeURIComponent(window.location.href);
      const title = encodeURIComponent(document.title);
      const map = {
        twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
      };
      if (map[network]) window.open(map[network], '_blank', 'noopener,width=600,height=520');
    });
  });
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        copyLinkBtn.textContent = 'Copied';
        setTimeout(() => { copyLinkBtn.textContent = 'Copy link'; }, 1600);
      } catch (e) { /* no-op */ }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderLatestPosts();
  renderBlogGrid();
  renderBlogPost();
});

window.BLOG_POSTS = BLOG_POSTS;
