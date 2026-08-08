/* ============================================================
   navigation.js
   Injects the sticky nav, status strip, mobile menu, and footer
   into every page from a single source of truth, wires up the
   theme toggle, scroll state, and back-to-top control.
   ============================================================ */

(function () {
  const CURRENT = document.body.getAttribute('data-page') || '';

  const NAV_LINKS = [
    { href: 'index.html', label: 'Home', key: 'home' },
    { href: 'about.html', label: 'About', key: 'about' },
    { href: 'projects.html', label: 'Projects', key: 'projects' },
    { href: 'certifications.html', label: 'Certifications', key: 'certifications' },
    { href: 'resume.html', label: 'Resume', key: 'resume' },
    { href: 'contact.html', label: 'Contact', key: 'contact' }
  ];

  const ICONS = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.5 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.46-1.2-1.11-1.52-1.11-1.52-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.05 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05a9.32 9.32 0 0 1 2.5-.34c.85 0 1.7.11 2.5.34 1.9-1.32 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.71 1.03 1.62 1.03 2.74 0 3.92-2.35 4.78-4.58 5.04.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .28.18.61.69.5A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.03-1.85-3.03-1.86 0-2.15 1.45-2.15 2.94v5.66H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'
  };

  function brand() {
    return '<a href="/" class="nav-brand"><span class="brand-mark">J</span>ules Munyaneza</a>';
  }

  function renderStatusStrip() {
    return `
    <div class="status-strip">
      <span class="dot"></span>
      <strong>All systems operational</strong>
      <span>&middot;</span>
      <span>Hamburg, DE &middot; UTC+1</span>
      <span>&middot;</span>
      <span>Open to new roles</span>
    </div>`;
  }

  function renderNav() {
    const links = NAV_LINKS.map(l => `<a href="${l.href}" class="${l.key === CURRENT ? 'active' : ''}">${l.label}</a>`).join('');
    return `
    <nav class="site-nav" id="siteNav">
      <div class="nav-inner">
        ${brand()}
        <div class="nav-links">${links}</div>
        <div class="nav-actions">
          <button class="icon-btn" id="searchTrigger" data-tooltip="Search (/)" aria-label="Open search">${ICONS.search}</button>
          <button class="icon-btn" id="themeToggle" data-tooltip="Toggle theme" aria-label="Toggle color theme">${ICONS.moon}</button>
          <a href="resume.html" class="btn btn-secondary btn-sm" style="margin-left:4px;">Resume</a>
          <button class="icon-btn nav-toggle" id="navToggle" aria-label="Open menu" aria-expanded="false">${ICONS.menu}</button>
        </div>
      </div>
    </nav>
    <div class="mobile-menu" id="mobileMenu">
      ${NAV_LINKS.map(l => `<a href="${l.href}">${l.label}</a>`).join('')}
      <div class="mobile-actions">
        <a href="https://github.com/mjulestek" target="_blank" rel="noopener" class="btn btn-secondary btn-block">GitHub</a>
        <a href="contact.html" class="btn btn-primary btn-block">Contact</a>
      </div>
    </div>`;
  }

  function renderFooter() {
    const year = new Date().getFullYear();
    return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            ${brand()}
            <p>DevOps &amp; Cloud Engineer building automated, Infrastructure-as-Code driven systems on AWS, Kubernetes, and Terraform. Currently based in Hamburg.</p>
            <div class="profile-social" style="margin-top:16px;">
              <a href="https://github.com/mjulestek" target="_blank" rel="noopener" class="icon-btn" aria-label="GitHub profile">${ICONS.github}</a>
              <a href="https://www.linkedin.com/in/jules-munyaneza-40418a364/" target="_blank" rel="noopener" class="icon-btn" aria-label="LinkedIn profile">${ICONS.linkedin}</a>
            </div>
          </div>
          <div class="footer-col">
            <h5>Site</h5>
            <a href="about.html">About</a>
            <a href="projects.html">Projects</a>
            <a href="certifications.html">Certifications</a>
          </div>
          <div class="footer-col">
            <h5>Work</h5>
            <a href="resume.html">Resume</a>
            <a href="contact.html">Contact</a>
            <a href="mailto:mjules.tek@gmail.com">mjules.tek@gmail.com</a>
          </div>
          <div class="footer-col">
            <h5>Legal</h5>
            <a href="privacy.html">Privacy policy</a>
            <span>&copy; ${year} Jules Munyaneza</span>
          </div>
        </div>
        <div class="footer-bottom">
          <span>Built with HTML, CSS &amp; vanilla JS &mdash; zero frameworks, zero build step.</span>
          <a href="https://github.com/mjulestek/my-cloudpath-portfolio/actions/workflows/deploy.yml" target="_blank" rel="noopener" style="display:flex;align-items:center;">
            <img src="https://github.com/mjulestek/my-cloudpath-portfolio/actions/workflows/deploy.yml/badge.svg" alt="Deploy workflow status" height="20">
          </a>
        </div>
      </div>
    </footer>
    <button class="back-to-top" id="backToTop" aria-label="Back to top">${ICONS.arrowUp}</button>`;
  }

  function mount() {
    const headerEl = document.getElementById('site-header');
    const footerEl = document.getElementById('site-footer');
    if (headerEl) headerEl.innerHTML = renderStatusStrip() + renderNav();
    if (footerEl) footerEl.innerHTML = renderFooter();

    wireNav();
    wireTheme();
    wireBackToTop();
  }

  function wireNav() {
    const nav = document.getElementById('siteNav');
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('mobileMenu');

    window.addEventListener('scroll', () => {
      if (!nav) return;
      nav.classList.toggle('scrolled', window.scrollY > 12);
    }, { passive: true });

    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open);
        toggle.innerHTML = open ? ICONS.close : ICONS.menu;
        document.body.classList.toggle('no-scroll', open);
      });
      menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.innerHTML = ICONS.menu;
        document.body.classList.remove('no-scroll');
      }));
    }
  }

  function wireTheme() {
    const btn = document.getElementById('themeToggle');
    const root = document.documentElement;
    const saved = window.__cpTheme || 'light';
    if (btn) btn.innerHTML = saved === 'light' ? ICONS.sun : ICONS.moon;

    if (btn) {
      btn.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('cp-theme', next); } catch (e) {}
        btn.innerHTML = next === 'light' ? ICONS.sun : ICONS.moon;
      });
    }
  }

  function wireBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 480);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  window.CP_ICONS = ICONS;
  document.addEventListener('DOMContentLoaded', mount);
})();
