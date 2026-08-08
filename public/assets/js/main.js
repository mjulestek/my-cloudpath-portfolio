/* ============================================================
   main.js
   Tabs, accordions, copy-to-clipboard, share buttons, and small
   page-wide utilities shared across every page.
   ============================================================ */

(function () {
  'use strict';

  /* ---- Tabs ---- */
  function initTabs() {
    document.querySelectorAll('.tabs').forEach(tabGroup => {
      const buttons = tabGroup.querySelectorAll('.tab-btn');
      const panelWrap = tabGroup.nextElementSibling;
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-tab');
          buttons.forEach(b => b.classList.toggle('active', b === btn));
          if (panelWrap) {
            panelWrap.querySelectorAll('.tab-panel').forEach(p => {
              p.classList.toggle('active', p.getAttribute('data-panel') === target);
            });
          }
        });
      });
    });
  }

  /* ---- Accordion ---- */
  function initAccordion() {
    document.querySelectorAll('.accordion-item').forEach(item => {
      const trigger = item.querySelector('.accordion-trigger');
      const panel = item.querySelector('.accordion-panel');
      if (!trigger || !panel) return;
      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        item.closest('.accordion')?.querySelectorAll('.accordion-item').forEach(other => {
          if (other !== item) {
            other.classList.remove('open');
            const p = other.querySelector('.accordion-panel');
            if (p) p.style.maxHeight = null;
          }
        });
        item.classList.toggle('open', !isOpen);
        panel.style.maxHeight = !isOpen ? panel.scrollHeight + 'px' : null;
      });
    });
  }

  /* ---- Copy to clipboard (email, credential IDs) ---- */
  function initCopyButtons() {
    document.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const value = btn.getAttribute('data-copy');
        try {
          await navigator.clipboard.writeText(value);
          const original = btn.textContent;
          btn.textContent = 'Copied';
          setTimeout(() => { btn.textContent = original; }, 1600);
        } catch (e) {
          window.prompt('Copy this value:', value);
        }
      });
    });
  }

  /* ---- Share buttons (blog post) ---- */
  function initShareButtons() {
    document.querySelectorAll('[data-share]').forEach(btn => {
      btn.addEventListener('click', () => {
        const network = btn.getAttribute('data-share');
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(document.title);
        const map = {
          twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
          reddit: `https://www.reddit.com/submit?url=${url}&title=${title}`
        };
        if (map[network]) window.open(map[network], '_blank', 'noopener,width=600,height=520');
      });
    });

    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          copyLinkBtn.textContent = 'Link copied';
          setTimeout(() => { copyLinkBtn.textContent = 'Copy link'; }, 1600);
        } catch (e) { /* no-op */ }
      });
    }
  }

  /* ---- Print button (resume) ---- */
  function initPrintButton() {
    document.querySelectorAll('[data-print]').forEach(btn => {
      btn.addEventListener('click', () => window.print());
    });
  }

  /* ---- Footer year (fallback for elements outside injected footer) ---- */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(el => {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---- Contact form ----
     Sends directly to Web3Forms (https://web3forms.com), which forwards the
     submission straight to an inbox. No server, no database, no AWS
     resource of any kind — just a POST to their API. Get a free access key
     at web3forms.com (takes ~30 seconds, no account needed) and paste it
     below. Free tier: 250 submissions/month, stored 30 days on their side
     as a backup in case an email bounces. */
  const WEB3FORMS_ACCESS_KEY = 'bb56822c-f948-4c2d-b6af-f599e4788b1e';

  function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('formStatus');
      const name = form.querySelector('#name')?.value.trim();
      const email = form.querySelector('#email')?.value.trim();
      const message = form.querySelector('#message')?.value.trim();
      const botcheck = form.querySelector('#botcheck')?.checked;

      if (!name || !email || !message) {
        if (status) { status.textContent = 'Please fill in every field before sending.'; status.className = 'form-status error'; }
        return;
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        if (status) { status.textContent = 'That email address doesn\u2019t look right.'; status.className = 'form-status error'; }
        return;
      }
      if (botcheck) return; // honeypot field a real visitor never touches

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending\u2026'; }
      if (status) { status.textContent = ''; status.className = 'form-status'; }

      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: WEB3FORMS_ACCESS_KEY,
            subject: `Portfolio contact from ${name}`,
            from_name: name,
            name,
            email,
            message,
            replyto: email
          })
        });
        const result = await response.json();

        if (result.success) {
          if (status) { status.textContent = 'Message sent \u2014 thanks, I\u2019ll get back to you soon.'; status.className = 'form-status success'; }
          form.reset();
        } else {
          throw new Error(result.message || 'Something went wrong.');
        }
      } catch (err) {
        if (status) { status.textContent = 'Couldn\u2019t send that \u2014 email me directly at mjules.tek@gmail.com instead.'; status.className = 'form-status error'; }
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
      }
    });
  }

  /* ---- Technology marquee / carousel ---- */
  const TECH_STACK = [
    { name: 'AWS', icon: '<path d="M4 15c4 3 12 3 16 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M7 8a5 5 0 0 1 9-3 4 4 0 0 1 1 7.9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' },
    { name: 'Docker', icon: '<rect x="3" y="10" width="4" height="4" fill="currentColor"/><rect x="8" y="10" width="4" height="4" fill="currentColor"/><rect x="13" y="10" width="4" height="4" fill="currentColor"/><rect x="8" y="5" width="4" height="4" fill="currentColor"/><path d="M2 14c0 4 4 6 9 6 6 0 10-3 11-8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' },
    { name: 'Kubernetes', icon: '<path d="M12 2l8 4.5v9L12 20l-8-4.5v-9z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/><circle cx="12" cy="11" r="2.4" stroke="currentColor" stroke-width="1.6" fill="none"/>' },
    { name: 'Terraform', icon: '<path d="M4 4l7 4v7l-7-4z" fill="currentColor"/><path d="M12 8l7-4v7l-7 4z" fill="currentColor" opacity="0.5"/><path d="M12 16l7-4v7l-7 4z" fill="currentColor" opacity="0.8"/>' },
    { name: 'Linux', icon: '<circle cx="12" cy="9" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 12c0 4-2 5-2 8h12c0-3-2-4-2-8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' },
    { name: 'GitHub', icon: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><path d="M9 17c-3 1-3-1-4-1" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>' },
    { name: 'Jenkins', icon: '<circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M6 20c1-4 4-6 6-6s5 2 6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' },
    { name: 'Helm', icon: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7" stroke="currentColor" stroke-width="1.3"/>' },
    { name: 'Grafana', icon: '<path d="M4 20V12l4-3v11z" fill="currentColor" opacity="0.6"/><path d="M10 20V8l4-4v16z" fill="currentColor" opacity="0.85"/><path d="M16 20v-8l4-3v11z" fill="currentColor"/>' },
    { name: 'Prometheus', icon: '<path d="M12 3c4 3 6 6 6 10a6 6 0 1 1-12 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 2-9z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>' },
    { name: 'Ansible', icon: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 5v3M12 16v3M5 12h3M16 12h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' },
    { name: 'GitLab', icon: '<path d="M12 20L4 9l3-6 5 6 5-6 3 6z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>' },
    { name: 'Nexus', icon: '<rect x="4" y="4" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.8" fill="none"/><rect x="13" y="4" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.8" fill="none"/><rect x="4" y="13" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.8" fill="none"/><rect x="13" y="13" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.8" fill="none"/>' }
  ];

  function renderTechMarquee() {
    document.querySelectorAll('[data-tech-marquee]').forEach(el => {
      const track = document.createElement('div');
      track.className = 'marquee-track';
      track.innerHTML = TECH_STACK.map(t => `
        <div class="tech-chip">
          <svg viewBox="0 0 24 24">${t.icon}</svg>
          ${t.name}
        </div>`).join('');
      const wrap = document.createElement('div');
      wrap.className = 'marquee-wrap';
      wrap.appendChild(track);
      el.appendChild(wrap);
    });
    document.dispatchEvent(new Event('cp:content-mounted'));
  }

  function renderTechBadges() {
    document.querySelectorAll('[data-tech-badges]').forEach(el => {
      const names = (el.getAttribute('data-tech-badges') || '').split(',').map(s => s.trim()).filter(Boolean);
      el.innerHTML = names.map(name => {
        const t = TECH_STACK.find(x => x.name === name);
        return `<span class="badge accent"><svg viewBox="0 0 24 24" width="14" height="14" style="margin-right:2px;">${t ? t.icon : ''}</svg>${name}</span>`;
      }).join('');
    });
  }

  window.CP_TECH_STACK = TECH_STACK;

  document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initAccordion();
    initCopyButtons();
    initShareButtons();
    initPrintButton();
    initYear();
    initContactForm();
    renderTechMarquee();
    renderTechBadges();
  });
})();
