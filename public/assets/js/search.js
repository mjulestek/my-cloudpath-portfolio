/* ============================================================
   search.js
   Command-palette style search modal (triggered by the nav icon
   or the "/" key) that indexes projects and static pages, and
   supports keyboard navigation.
   ============================================================ */

(function () {
  'use strict';

  const STATIC_PAGES = [
    { title: 'About', href: 'about.html', type: 'Page' },
    { title: 'Projects', href: 'projects.html', type: 'Page' },
    { title: 'Certifications', href: 'certifications.html', type: 'Page' },
    { title: 'Resume', href: 'resume.html', type: 'Page' },
    { title: 'Contact', href: 'contact.html', type: 'Page' }
  ];

  function buildIndex() {
    const projects = (window.PROJECTS || []).map(p => ({
      title: p.title, href: `project-details.html?id=${p.id}`, type: 'Project', sub: p.summary
    }));
    return [...STATIC_PAGES, ...projects];
  }

  function injectModal() {
    if (document.getElementById('searchModalOverlay')) return;
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.id = 'searchModalOverlay';
    div.innerHTML = `
      <div class="search-modal" role="dialog" aria-modal="true" aria-label="Site search">
        <div class="search-modal-input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input type="text" id="globalSearchInput" placeholder="Search projects, articles, pages\u2026" autocomplete="off" />
          <kbd>Esc</kbd>
        </div>
        <div class="search-results" id="globalSearchResults"></div>
      </div>`;
    document.body.appendChild(div);
  }

  function renderResults(items, query) {
    const resultsEl = document.getElementById('globalSearchResults');
    if (!resultsEl) return;
    if (!query) {
      resultsEl.innerHTML = `<div class="search-empty">Start typing to search the whole site.</div>`;
      return;
    }
    if (!items.length) {
      resultsEl.innerHTML = `<div class="search-empty">No results for \u201c${query}\u201d.</div>`;
      return;
    }
    resultsEl.innerHTML = items.slice(0, 8).map((item, i) => `
      <a href="${item.href}" class="search-result-item ${i === 0 ? 'active' : ''}" data-index="${i}">
        <strong>${item.title}</strong>
        <span>${item.type}${item.sub ? ' \u2014 ' + item.sub.slice(0, 70) : ''}</span>
      </a>`).join('');
  }

  function initSearch() {
    injectModal();
    const overlay = document.getElementById('searchModalOverlay');
    const input = document.getElementById('globalSearchInput');
    const trigger = document.getElementById('searchTrigger');
    const index = buildIndex();

    function open() {
      overlay.classList.add('open');
      document.body.classList.add('no-scroll');
      renderResults([], '');
      setTimeout(() => input.focus(), 60);
    }
    function close() {
      overlay.classList.remove('open');
      document.body.classList.remove('no-scroll');
      input.value = '';
    }

    if (trigger) trigger.addEventListener('click', open);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        open();
      }
      if (e.key === 'Escape') close();
    });

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      const items = q ? index.filter(item => (item.title + ' ' + (item.sub || '')).toLowerCase().includes(q)) : [];
      renderResults(items, q);
    });

    input.addEventListener('keydown', (e) => {
      const results = Array.from(document.querySelectorAll('.search-result-item'));
      if (!results.length) return;
      const activeIndex = results.findIndex(r => r.classList.contains('active'));
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        results[activeIndex]?.classList.remove('active');
        const next = results[(activeIndex + 1) % results.length];
        next.classList.add('active');
        next.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        results[activeIndex]?.classList.remove('active');
        const prev = results[(activeIndex - 1 + results.length) % results.length];
        prev.classList.add('active');
        prev.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        const active = document.querySelector('.search-result-item.active');
        if (active) window.location.href = active.getAttribute('href');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Slight delay so navigation.js has injected the trigger button first.
    setTimeout(initSearch, 0);
  });
})();
