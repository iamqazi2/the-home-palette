/* THE HOME PALETTE — v3 motion engine + interactive elements.
   Engine: GSAP + ScrollTrigger + Lenis (self-hosted, loaded before this file).
   Falls back to IntersectionObserver reveals if the libs are missing, and to
   static content under prefers-reduced-motion. Editor-safe: Lenis is skipped
   in the theme customizer and everything re-inits on section reload. */
(function () {
  'use strict';

  var doc = document.documentElement;
  doc.classList.add('hp-js');

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var designMode = window.Shopify && window.Shopify.designMode;
  var hasGsap = !reducedMotion && window.gsap && window.ScrollTrigger;

  /* ---- GSAP / Lenis boot ---------------------------------------------- */
  var lenis = null;
  if (hasGsap) {
    doc.classList.add('hp-gsap');
    window.gsap.registerPlugin(window.ScrollTrigger);

    if (window.Lenis && !designMode) {
      try {
        lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
        doc.classList.add('hp-lenis');
        lenis.on('scroll', window.ScrollTrigger.update);
        window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        window.gsap.ticker.lagSmoothing(0);
      } catch (e) { lenis = null; }
    }
  }

  /* ---- Reveals + stacking cards + parallax ----------------------------- */
  function initMotion(root) {
    root = root || document;

    if (hasGsap) {
      var gsap = window.gsap;
      var ST = window.ScrollTrigger;

      // stagger groups: children rise + scale in a batch
      var staggerChildren = [];
      root.querySelectorAll('[data-hp-stagger]').forEach(function (parent) {
        Array.prototype.forEach.call(parent.children, function (child) {
          if (child.hasAttribute('data-hp-reveal') && !child.dataset.hpDone) {
            child.dataset.hpDone = '1';
            staggerChildren.push(child);
          }
        });
      });
      if (staggerChildren.length) {
        ST.batch(staggerChildren, {
          start: 'top 90%',
          once: true,
          onEnter: function (batch) {
            gsap.fromTo(batch,
              { y: 60, opacity: 0, scale: 0.95 },
              { y: 0, opacity: 1, scale: 1, duration: 0.85, ease: 'power3.out', stagger: 0.09, overwrite: true, clearProps: 'transform' });
          }
        });
      }

      // single reveals (not inside a stagger group)
      root.querySelectorAll('[data-hp-reveal]').forEach(function (el) {
        if (el.dataset.hpDone) return;
        el.dataset.hpDone = '1';
        gsap.fromTo(el,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', clearProps: 'transform',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      });

      // background parallax (hero video, story image, CTA image)
      root.querySelectorAll('[data-hp-parallax]').forEach(function (el) {
        if (el.dataset.hpParDone) return;
        el.dataset.hpParDone = '1';
        var holder = el.closest('section, .shopify-section') || el.parentElement;
        gsap.fromTo(el, { yPercent: -6 }, {
          yPercent: 6, ease: 'none',
          scrollTrigger: { trigger: holder, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });

      ST.refresh();
      return;
    }

    // ---- vanilla fallback (no GSAP) ----
    root.querySelectorAll('[data-hp-stagger]').forEach(function (parent) {
      Array.prototype.forEach.call(parent.children, function (child, i) {
        child.style.setProperty('--hp-i', i);
      });
    });
    var nodes = root.querySelectorAll('[data-hp-reveal]:not(.hp-inview)');
    if (!nodes.length) return;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('hp-inview'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('hp-inview');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ---- Sticky header shadow after 20px --------------------------------- */
  function initHeaderShadow() {
    var wrapper = document.querySelector('.header-wrapper');
    if (!wrapper) return;
    var update = function () {
      wrapper.classList.toggle('hp-scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---- Video lightbox --------------------------------------------------- */
  var lightbox = null;
  function getLightbox() {
    if (lightbox) return lightbox;
    var el = document.createElement('div');
    el.className = 'hp-lightbox';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Video player');
    el.innerHTML =
      '<div class="hp-lightbox__inner">' +
      '<button type="button" class="hp-lightbox__close" aria-label="Close video">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '</button>' +
      '<video controls playsinline preload="metadata"></video>' +
      '</div>';
    document.body.appendChild(el);

    var video = el.querySelector('video');
    var opener = null;
    function close() {
      el.classList.remove('is-open');
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (lenis) lenis.start();
      if (opener && opener.focus) opener.focus();
      opener = null;
    }
    el.addEventListener('click', function (e) { if (e.target === el) close(); });
    el.querySelector('.hp-lightbox__close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.classList.contains('is-open')) close();
    });

    lightbox = {
      open: function (src, wide, from) {
        opener = from || null;
        el.querySelector('.hp-lightbox__inner').classList.toggle('hp-lightbox__inner--wide', !!wide);
        video.src = src;
        el.classList.add('is-open');
        if (lenis) lenis.stop();
        var play = video.play();
        if (play && play.catch) play.catch(function () {});
        el.querySelector('.hp-lightbox__close').focus();
      }
    };
    return lightbox;
  }

  function initVideoTriggers(root) {
    (root || document).querySelectorAll('[data-hp-video-src]').forEach(function (btn) {
      if (btn.dataset.hpVideoWired) return;
      btn.dataset.hpVideoWired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        getLightbox().open(btn.getAttribute('data-hp-video-src'), btn.hasAttribute('data-hp-video-wide'), btn);
      });
    });
  }

  /* ---- Full-height hero slider (copy rotation + dots/arrows) ------------ */
  var HpHero = (function () {
    function HpHero() { return Reflect.construct(HTMLElement, [], HpHero); }
    HpHero.prototype = Object.create(HTMLElement.prototype, { constructor: { value: HpHero } });
    Object.setPrototypeOf(HpHero, HTMLElement);

    HpHero.prototype.connectedCallback = function () {
      var el = this;
      el.slides = Array.prototype.slice.call(el.querySelectorAll('.hp-hero__slide'));
      if (el.slides.length === 0) return;
      el.dots = Array.prototype.slice.call(el.querySelectorAll('.hp-hero__dot'));
      el.counter = el.querySelector('.hp-hero__counter-current');
      el.index = 0;
      el.timer = null;
      el.autoplay = el.dataset.autoplay === 'true' && !reducedMotion;
      el.speed = (parseInt(el.dataset.speed, 10) || 6) * 1000;

      var prev = el.querySelector('.hp-hero__arrow--prev');
      var next = el.querySelector('.hp-hero__arrow--next');
      if (prev) prev.addEventListener('click', function () { el.go(el.index - 1, true); });
      if (next) next.addEventListener('click', function () { el.go(el.index + 1, true); });
      el.dots.forEach(function (dot, i) {
        dot.addEventListener('click', function () { el.go(i, true); });
      });

      var startX = null;
      el.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend', function (e) {
        if (startX === null) return;
        var dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 48) el.go(el.index + (dx < 0 ? 1 : -1), true);
        startX = null;
      }, { passive: true });

      el.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') el.go(el.index - 1, true);
        if (e.key === 'ArrowRight') el.go(el.index + 1, true);
      });

      document.addEventListener('visibilitychange', function () {
        document.hidden ? el.stop() : el.play();
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries[0].isIntersecting ? el.play() : el.stop();
        }, { threshold: 0.15 }).observe(el);
      }

      // hero background video: keep autoplay honest (it can be blocked)
      var vid = el.querySelector('.hp-hero__video video');
      if (vid) {
        var p = vid.play();
        if (p && p.catch) p.catch(function () { el.classList.add('hp-hero--video-blocked'); });
      }

      el.render();
      el.play();
    };

    HpHero.prototype.go = function (i, user) {
      var n = this.slides.length;
      this.index = ((i % n) + n) % n;
      this.render();
      if (user) { this.stop(); this.play(); }
    };

    HpHero.prototype.render = function () {
      var idx = this.index;
      this.slides.forEach(function (slide, i) {
        slide.classList.toggle('is-active', i === idx);
        slide.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
      });
      this.dots.forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === idx);
        dot.setAttribute('aria-current', i === idx ? 'true' : 'false');
      });
      if (this.counter) {
        this.counter.textContent = (idx + 1 < 10 ? '0' : '') + (idx + 1);
      }
    };

    HpHero.prototype.play = function () {
      var el = this;
      if (!el.autoplay || el.timer || el.slides.length < 2) return;
      el.timer = setInterval(function () { el.go(el.index + 1); }, el.speed);
    };

    HpHero.prototype.stop = function () {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    };

    return HpHero;
  })();
  if (!customElements.get('hp-hero')) customElements.define('hp-hero', HpHero);

  /* ---- Horizontal rail with arrows -------------------------------------- */
  var HpRail = (function () {
    function HpRail() { return Reflect.construct(HTMLElement, [], HpRail); }
    HpRail.prototype = Object.create(HTMLElement.prototype, { constructor: { value: HpRail } });
    Object.setPrototypeOf(HpRail, HTMLElement);

    HpRail.prototype.connectedCallback = function () {
      var el = this;
      var track = el.querySelector('.hp-rail__track');
      if (!track) return;
      var prev = el.querySelector('.hp-rail__arrow--prev');
      var next = el.querySelector('.hp-rail__arrow--next');
      function step() { return Math.max(track.clientWidth * 0.7, 240); }
      function update() {
        var max = track.scrollWidth - track.clientWidth - 2;
        if (prev) prev.disabled = track.scrollLeft <= 2;
        if (next) next.disabled = track.scrollLeft >= max;
      }
      if (prev) prev.addEventListener('click', function () {
        track.scrollBy({ left: -step(), behavior: reducedMotion ? 'auto' : 'smooth' });
      });
      if (next) next.addEventListener('click', function () {
        track.scrollBy({ left: step(), behavior: reducedMotion ? 'auto' : 'smooth' });
      });
      track.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    };
    return HpRail;
  })();
  if (!customElements.get('hp-rail')) customElements.define('hp-rail', HpRail);

  /* ---- boot ------------------------------------------------------------- */
  function boot() {
    initMotion(document);
    initHeaderShadow();
    initVideoTriggers(document);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('shopify:section:load', function (e) {
    initMotion(e.target);
    initVideoTriggers(e.target);
    if (hasGsap) window.ScrollTrigger.refresh();
  });
})();
