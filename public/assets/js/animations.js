/* ============================================================
   animations.js
   IntersectionObserver-driven scroll reveals, animated counters,
   marquee track duplication, and the hero terminal typing effect.
   ============================================================ */

(function () {
  'use strict';

  /* ---- Scroll reveal ---- */
  let revealObserver = null;
  function initReveal() {
    const targets = document.querySelectorAll('.reveal:not([data-reveal-bound]), .reveal-scale:not([data-reveal-bound]), .reveal-left:not([data-reveal-bound]), .reveal-right:not([data-reveal-bound])');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      // No observer support: leave elements in their default visible state.
      targets.forEach(t => t.setAttribute('data-reveal-bound', 'true'));
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
    }

    targets.forEach((t, i) => {
      t.style.setProperty('--i', i % 8);
      t.setAttribute('data-reveal-bound', 'true');
      // Only now — once we know an observer will actually reveal it — opt this
      // element into the hidden pre-animation state.
      t.classList.add('pre');
      // Defer the actual observe() to the next frame. Elements injected
      // dynamically (project/blog cards rendered after page load) need layout
      // to settle before IntersectionObserver's initial check is reliable —
      // observing them synchronously, mid-DOM-mutation, can silently miss
      // that first check and leave them stuck hidden.
      requestAnimationFrame(() => {
        revealObserver.observe(t);
        // Safety net: if this element is already in the viewport but the
        // observer's first callback is delayed, force it visible shortly
        // after so nothing is ever left permanently blank.
        const rect = t.getBoundingClientRect();
        const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (alreadyVisible) {
          setTimeout(() => t.classList.add('in-view'), 550);
        }
      });
    });
  }

  /* ---- Animated counters ---- */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]:not([data-count-bound])');
    counters.forEach(c => c.setAttribute('data-count-bound', 'true'));
    if (!counters.length) return;

    const animate = (el) => {
      const target = parseFloat(el.getAttribute('data-count'));
      const suffix = el.getAttribute('data-suffix') || '';
      const decimals = el.getAttribute('data-decimals') ? parseInt(el.getAttribute('data-decimals'), 10) : 0;
      const duration = 1400;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        el.textContent = value.toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target.toFixed(decimals) + suffix;
      }
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animate);
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(el => io.observe(el));
  }

  /* ---- Skill / progress bars ---- */
  function initProgressBars() {
    const bars = document.querySelectorAll('.progress-fill[data-value]:not([data-bar-bound])');
    bars.forEach(b => b.setAttribute('data-bar-bound', 'true'));
    if (!bars.length || !('IntersectionObserver' in window)) {
      bars.forEach(b => { b.style.width = (b.getAttribute('data-value') || 0) + '%'; });
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.width = (entry.target.getAttribute('data-value') || 0) + '%';
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    bars.forEach(b => io.observe(b));
  }

  /* ---- Marquee: duplicate track for seamless loop ---- */
  function initMarquee() {
    document.querySelectorAll('.marquee-track').forEach(track => {
      if (track.dataset.doubled) return;
      track.innerHTML += track.innerHTML;
      track.dataset.doubled = 'true';
    });
  }

  /* ---- Hero terminal typing effect ---- */
  function initTerminal() {
    const body = document.getElementById('heroTerminal');
    if (!body) return;

    const lines = [
      { prompt: true, text: 'terraform apply -auto-approve', cmd: true },
      { text: 'Plan: 12 to add, 0 to change, 0 to destroy.' },
      { text: 'module.eks.aws_eks_cluster.this: Creating...' },
      { text: 'module.eks.aws_eks_cluster.this: Creation complete', cls: 'ok' },
      { prompt: true, text: 'kubectl rollout status deploy/api', cmd: true },
      { text: 'deployment "api" successfully rolled out', cls: 'ok' },
      { prompt: true, text: 'argocd app sync payments-service', cmd: true },
      { text: 'Sync OK \u2014 revision a91cf3d \u2192 production', cls: 'ok' }
    ];

    let li = 0, ci = 0;
    const typeSpeed = 22;
    const linePause = 420;

    function renderStatic() {
      body.innerHTML = lines.map(l => {
        if (l.cmd) return `<div class="terminal-line"><span class="prompt">$</span> <span class="path">~/infra</span> ${l.text}</div>`;
        return `<div class="terminal-line ${l.cls || ''}">${l.text}</div>`;
      }).join('') + '<span class="terminal-cursor"></span>';
    }

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      renderStatic();
      return;
    }

    function typeNext() {
      if (li >= lines.length) {
        setTimeout(() => { body.innerHTML = ''; li = 0; ci = 0; typeNext(); }, 2200);
        return;
      }
      const line = lines[li];
      const full = line.text;

      if (ci === 0) {
        const div = document.createElement('div');
        div.className = 'terminal-line' + (line.cls ? ' ' + line.cls : '');
        if (line.cmd) div.innerHTML = '<span class="prompt">$</span> <span class="path">~/infra</span> <span class="typed"></span>';
        div.id = 'cp-active-line';
        body.appendChild(div);
      }

      const activeLine = document.getElementById('cp-active-line');
      const typedTarget = line.cmd ? activeLine.querySelector('.typed') : activeLine;

      if (ci <= full.length) {
        typedTarget.textContent = full.slice(0, ci);
        ci++;
        setTimeout(typeNext, line.cmd ? typeSpeed : 4);
      } else {
        activeLine.removeAttribute('id');
        li++; ci = 0;
        setTimeout(typeNext, linePause);
        body.scrollTop = body.scrollHeight;
      }
    }

    typeNext();
  }

  /* ---- Route loader fade-out ---- */
  function hideLoader() {
    const loader = document.getElementById('routeLoader');
    if (loader) setTimeout(() => loader.classList.add('hidden'), 220);
  }

  function forceRevealStragglers() {
    document.querySelectorAll('.pre:not(.in-view)').forEach(el => el.classList.add('in-view'));
  }

  function refreshAll() {
    initReveal();
    initCounters();
    initProgressBars();
    initMarquee();
  }

  window.CPAnimations = { refreshReveal: refreshAll };
  document.addEventListener('cp:content-mounted', refreshAll);
  document.addEventListener('cp:reveal-refresh', refreshAll);

  document.addEventListener('DOMContentLoaded', () => {
    refreshAll();
    initTerminal();
    hideLoader();
    // Belt-and-suspenders: whatever the cause, no section should be able to
    // stay invisible forever. Anything still hidden after 2.5s gets shown.
    setTimeout(forceRevealStragglers, 2500);
  });
})();
