/* THE HOME PALETTE — shared motion + interactive elements.
   Reduced-motion safe: reveals and Ken Burns are disabled when the user
   prefers reduced motion; sliders fall back to instant cuts. */
(function () {
  'use strict';

  document.documentElement.classList.add('hp-js');

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Scroll reveal ------------------------------------------------- */
  function initReveals(root) {
    var nodes = (root || document).querySelectorAll('[data-hp-reveal]:not(.hp-inview)');
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
    nodes.forEach(function (n) {
      // stagger children of grids: parent sets data-hp-stagger, children get --hp-i
      io.observe(n);
    });
  }

  function applyStagger(root) {
    (root || document).querySelectorAll('[data-hp-stagger]').forEach(function (parent) {
      Array.prototype.forEach.call(parent.children, function (child, i) {
        child.style.setProperty('--hp-i', i);
      });
    });
  }

  /* ---- Full-height hero slider ---------------------------------------- */
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

      // touch swipe
      var startX = null;
      el.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend', function (e) {
        if (startX === null) return;
        var dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 48) el.go(el.index + (dx < 0 ? 1 : -1), true);
        startX = null;
      }, { passive: true });

      // keyboard
      el.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') el.go(el.index - 1, true);
        if (e.key === 'ArrowRight') el.go(el.index + 1, true);
      });

      // pause when off-screen or tab hidden
      document.addEventListener('visibilitychange', function () {
        document.hidden ? el.stop() : el.play();
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries[0].isIntersecting ? el.play() : el.stop();
        }, { threshold: 0.15 }).observe(el);
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

  /* ---- Horizontal rail with arrows ------------------------------------ */
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

  /* ---- boot ----------------------------------------------------------- */
  function boot() {
    applyStagger(document);
    initReveals(document);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  // re-init inside the theme editor when sections re-render
  document.addEventListener('shopify:section:load', function (e) {
    applyStagger(e.target);
    initReveals(e.target);
  });
})();
