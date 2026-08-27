/* THE HOME PALETTE — v3 motion engine + interactive modules.
   Engine: GSAP + ScrollTrigger + Lenis (self-hosted, loaded before this file).
   Falls back to IntersectionObserver reveals if the libs are missing, and to
   static content under prefers-reduced-motion. Editor-safe: Lenis is skipped
   in the theme customizer and everything re-inits on section reload.

   Reveal vocabulary (add as attributes, or let autoTag() apply them):
     data-hp-split    headings — split into words, each rises out of a mask
     data-hp-fluid    copy/media — blur + rise fade
     data-hp-clip     images — clip-path wipe up with a slow scale settle
     data-hp-reveal   generic fade + rise
     data-hp-stagger  parent whose children reveal in a batch
     data-hp-parallax background layer, scrub-linked
*/
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
  window.hpLenis = function () { return lenis; };

  /* ---- Overlay scroll lock ---------------------------------------------
     Lenis drives the page with its own virtual scroll, so `overflow: hidden`
     on <body> does not stop it — a wheel over an open drawer or modal would
     keep scrolling the page behind. Dawn adds `.overflow-hidden` to <body>
     whenever it opens the cart drawer, menu drawer or a modal, so we mirror
     that: pause Lenis while any overlay is open, resume when it closes.
     Nested scrollers are additionally marked `data-lenis-prevent`, which tells
     Lenis to leave wheel/touch events inside them alone.
  ---------------------------------------------------------------------- */
  function initOverlayScrollLock() {
    if (!lenis) return;
    var body = document.body;
    var locked = false;

    var sync = function () {
      var open = body.classList.contains('overflow-hidden') ||
        body.classList.contains('overflow-hidden-mobile') ||
        body.classList.contains('overflow-hidden-tablet');
      if (open === locked) return;
      locked = open;
      if (open) { lenis.stop(); } else { lenis.start(); }
    };

    new MutationObserver(sync).observe(body, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  /* Mark every in-app scroll container so Lenis never steals its wheel. */
  function markScrollContainers(root) {
    (root || document).querySelectorAll(
      '.hp-drawer-scroll, .cart-drawer .drawer__inner, .menu-drawer__inner, ' +
      '.quick-add-modal__content, .product-popup-modal__content, .hp-lightbox'
    ).forEach(function (el) {
      if (!el.hasAttribute('data-lenis-prevent')) el.setAttribute('data-lenis-prevent', '');
    });
  }

  /* ---- Word splitter ---------------------------------------------------
     Walks text nodes only, so inline markup (<em>, <a>, <br>) survives.
     Each word becomes <span class="hp-w"><span class="hp-w__i">word</span></span>
  ---------------------------------------------------------------------- */
  function splitWords(el) {
    if (!el || el.dataset.hpSplitDone) return [];
    el.dataset.hpSplitDone = '1';

    var inners = [];
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var textNodes = [];
    var n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue && n.nodeValue.trim()) textNodes.push(n);
    }
    // bail on very long copy — masking hundreds of words is wasteful
    var totalWords = textNodes.reduce(function (a, t) {
      return a + t.nodeValue.trim().split(/\s+/).length;
    }, 0);
    if (totalWords === 0 || totalWords > 60) return [];

    textNodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      var parts = node.nodeValue.split(/(\s+)/);
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          return;
        }
        var mask = document.createElement('span');
        mask.className = 'hp-w';
        var inner = document.createElement('span');
        inner.className = 'hp-w__i';
        inner.textContent = part;
        mask.appendChild(inner);
        frag.appendChild(mask);
        inners.push(inner);
      });
      node.parentNode.replaceChild(frag, node);
    });

    if (inners.length) el.classList.add('hp-split-ready');
    return inners;
  }

  /* ---- Auto-tagging ----------------------------------------------------
     Gives the whole site the same fluid entrance without editing every
     template. Skips chrome (header/footer/nav), the hero (it runs its own
     timeline), and anything already tagged.
  ---------------------------------------------------------------------- */
  var SKIP = [
    '.hp-hero', 'header', 'footer', 'nav', '.header-wrapper', '.footer',
    '.hp-announce', '.hp-marquee', '.cart-drawer', '.quick-add-modal',
    '.search-modal', '.menu-drawer', '.hp-vrev',
    // cards already animate as part of their stagger batch — splitting their
    // titles too would hide the text behind a second, competing animation
    '[data-hp-stagger]', '.card', '.card-wrapper', '.hp-drec',
    '[data-hp-no-anim]'
  ].join(', ');

  function autoTag(root) {
    root = root || document;
    if (!root.querySelectorAll) return;

    // headings → word-split reveal
    root.querySelectorAll('h1, h2, h3, .hp-section-head__title').forEach(function (el) {
      if (el.closest(SKIP)) return;
      if (el.dataset.hpSplit !== undefined || el.dataset.hpSplitDone) return;
      if (el.hasAttribute('data-hp-reveal')) el.removeAttribute('data-hp-reveal');
      el.dataset.hpSplit = '';
    });

    // supporting copy → blur emerge
    root.querySelectorAll('.hp-section-head__text, .rte > p, .hp-story__text, .hp-cta__text, .hp-eyebrow')
      .forEach(function (el) {
        if (el.closest(SKIP)) return;
        if (el.dataset.hpFluid !== undefined || el.dataset.hpReveal !== undefined) return;
        el.dataset.hpFluid = '';
      });

    // every remaining section on every page gets a directional reveal, so the
    // whole site scrolls with the same language — not just the custom sections
    var scope = root.querySelectorAll ? root : document;
    (scope.querySelectorAll('main .shopify-section') || []).forEach(function (sec, i) {
      if (sec.closest(SKIP)) return;
      if (sec.dataset.hpSection !== undefined || sec.dataset.hpDone) return;
      // never hide the first section — it is above the fold and would flash
      if (i === 0 || !sec.previousElementSibling) return;
      // the hero runs its own timeline; tagging its wrapper would fight it
      if (sec.querySelector('.hp-hero, [data-hp-no-anim]')) return;
      // skip sections that already animate their own contents
      if (sec.querySelector('[data-hp-reveal], [data-hp-stagger], [data-hp-split], [data-hp-fluid]')) return;
      sec.dataset.hpSection = '';
    });
  }

  /* ---- Direction helper -------------------------------------------------
     Sections reveal *from* the side they sit on: a left-hand column slides in
     from the left, a right-hand one from the right, full-width bands rise.
  ---------------------------------------------------------------------- */
  function autoDirection(el) {
    var explicit = el.getAttribute('data-hp-dir');
    if (explicit) return explicit;

    var host = el.closest('.shopify-section, section') || document.body;
    var hostBox = host.getBoundingClientRect();
    var box = el.getBoundingClientRect();
    if (!hostBox.width || !box.width) return 'up';

    // full-width-ish content just rises
    if (box.width > hostBox.width * 0.72) return 'up';

    var centre = (box.left + box.width / 2 - hostBox.left) / hostBox.width;
    if (centre < 0.4) return 'left';
    if (centre > 0.6) return 'right';
    return 'up';
  }

  function fromVars(dir, dist) {
    dist = dist || 56;
    switch (dir) {
      case 'left':  return { x: -dist, y: 0 };
      case 'right': return { x: dist, y: 0 };
      case 'down':  return { x: 0, y: -dist };   // enters from above
      default:      return { x: 0, y: dist };    // 'up' — enters from below
    }
  }

  /* ---- Typewriter --------------------------------------------------------
     Reveals characters in sequence behind a blinking caret. Used sparingly —
     opt in with data-hp-type.
  ---------------------------------------------------------------------- */
  function typewriter(el) {
    if (el.dataset.hpTypeDone) return;
    el.dataset.hpTypeDone = '1';
    var full = el.textContent;
    if (!full.trim() || full.length > 90) return;

    el.textContent = '';
    el.classList.add('hp-typing');
    var i = 0;
    var speed = parseInt(el.getAttribute('data-hp-type'), 10) || 38;
    (function tick() {
      el.textContent = full.slice(0, i);
      if (i++ <= full.length) {
        window.setTimeout(tick, speed);
      } else {
        el.classList.remove('hp-typing');
      }
    })();
  }

  /* ---- Reveals + stacking cards + parallax ----------------------------- */
  function initMotion(root) {
    root = root || document;
    autoTag(root);

    if (hasGsap) {
      var gsap = window.gsap;
      var ST = window.ScrollTrigger;

      // 1. word-split headings — CASCADE DROP + BLUR EMERGE
      root.querySelectorAll('[data-hp-split]').forEach(function (el) {
        if (el.dataset.hpDone) return;
        el.dataset.hpDone = '1';
        var words = splitWords(el);
        if (!words.length) {
          var f = fromVars(autoDirection(el), 40);
          gsap.fromTo(el, { x: f.x, y: f.y, opacity: 0, filter: 'blur(10px)' }, {
            x: 0, y: 0, opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'power3.out',
            clearProps: 'filter,transform',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true }
          });
          return;
        }
        // words fall from above, each blurring into focus — the cascade
        gsap.fromTo(words,
          { yPercent: -110, opacity: 0, filter: 'blur(12px)' },
          {
            yPercent: 0, opacity: 1, filter: 'blur(0px)',
            duration: 1.05, ease: 'power4.out', stagger: 0.055,
            clearProps: 'filter',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true }
          });
      });

      // 2. typewriter (opt-in)
      root.querySelectorAll('[data-hp-type]').forEach(function (el) {
        if (el.dataset.hpDone) return;
        el.dataset.hpDone = '1';
        ST.create({
          trigger: el, start: 'top 88%', once: true,
          onEnter: function () { typewriter(el); }
        });
      });

      // 3. fluid copy/media — BLUR EMERGE, direction-aware
      root.querySelectorAll('[data-hp-fluid]').forEach(function (el) {
        if (el.dataset.hpDone) return;
        el.dataset.hpDone = '1';
        var f = fromVars(autoDirection(el), 34);
        gsap.fromTo(el,
          { x: f.x, y: f.y, opacity: 0, filter: 'blur(12px)' },
          {
            x: 0, y: 0, opacity: 1, filter: 'blur(0px)',
            duration: 1.05, ease: 'power3.out', clearProps: 'filter,transform',
            scrollTrigger: { trigger: el, start: 'top 90%', once: true }
          });
      });

      // 4. clip-path image wipes
      root.querySelectorAll('[data-hp-clip]').forEach(function (el) {
        if (el.dataset.hpDone) return;
        el.dataset.hpDone = '1';
        var img = el.querySelector('img') || el;
        var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        tl.fromTo(el, { clipPath: 'inset(0 0 100% 0)' },
          { clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'power4.out', clearProps: 'clipPath' });
        if (img !== el) {
          tl.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.6, ease: 'power3.out', clearProps: 'transform' }, 0);
        }
      });

      // 5. stagger groups — cards cascade in, blurring into place
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
              { y: 64, opacity: 0, scale: 0.95, filter: 'blur(10px)' },
              { y: 0, opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.95, ease: 'power3.out',
                stagger: 0.075, overwrite: true, clearProps: 'transform,filter' });
          }
        });
      }

      // 6. generic reveals — direction-aware
      root.querySelectorAll('[data-hp-reveal]').forEach(function (el) {
        if (el.dataset.hpDone) return;
        el.dataset.hpDone = '1';
        var f = fromVars(autoDirection(el));
        gsap.fromTo(el,
          { x: f.x, y: f.y, opacity: 0, filter: 'blur(8px)' },
          { x: 0, y: 0, opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'power3.out',
            clearProps: 'transform,filter',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      });

      // 7. whole-section reveal for anything not otherwise animated
      root.querySelectorAll('[data-hp-section]').forEach(function (el) {
        if (el.dataset.hpDone) return;
        el.dataset.hpDone = '1';
        var f = fromVars(autoDirection(el), 48);
        gsap.fromTo(el,
          { x: f.x, y: f.y, opacity: 0 },
          { x: 0, y: 0, opacity: 1, duration: 1.05, ease: 'power3.out', clearProps: 'transform',
            scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
      });

      // 8. background parallax
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
    var sel = '[data-hp-reveal]:not(.hp-inview), [data-hp-fluid]:not(.hp-inview), ' +
              '[data-hp-split]:not(.hp-inview), [data-hp-section]:not(.hp-inview)';
    var nodes = root.querySelectorAll(sel);
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

  /* ---- Sticky header: shadow + announcement offset --------------------- */
  function initStickyChrome() {
    var wrapper = document.querySelector('.header-wrapper');
    var announce = document.querySelector('.hp-announce');

    function measure() {
      var h = announce ? announce.offsetHeight : 0;
      doc.style.setProperty('--hp-announce-h', h + 'px');
      var header = wrapper ? wrapper.offsetHeight : 0;
      doc.style.setProperty('--hp-header-h', (h + header) + 'px');
      // Dawn uses --header-height for the menu drawer and sticky offsets; with
      // its own sticky-header disabled we own this value now.
      if (header) doc.style.setProperty('--header-height', header + 'px');
    }
    measure();
    window.addEventListener('resize', measure, { passive: true });
    if (window.ResizeObserver && announce) new ResizeObserver(measure).observe(announce);

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

  /* ---- Full-height hero slider ----------------------------------------- */
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

      var vid = el.querySelector('.hp-hero__video video');
      if (vid) {
        vid.muted = true;
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

  /* ---- <hp-colour-shop> — Shop by Colour ---------------------------------
     Every colour's products are rendered into the page up front and this just
     swaps which group is visible.

     It used to fetch each colour through the Section Rendering API. That could
     never work: the API resolves ?section_id= against the template of the URL
     being requested, and this section only lives in index.json — so requesting
     it at a /collections or /search URL always came back without the section
     and the grid stayed empty. Toggling locally is also instant, needs no
     network, and cannot half-fail.
  ---------------------------------------------------------------------- */
  var HpColourShop = (function () {
    function HpColourShop() { return Reflect.construct(HTMLElement, [], HpColourShop); }
    HpColourShop.prototype = Object.create(HTMLElement.prototype, { constructor: { value: HpColourShop } });
    Object.setPrototypeOf(HpColourShop, HTMLElement);

    HpColourShop.prototype.connectedCallback = function () {
      var el = this;
      el.swatches = Array.prototype.slice.call(el.querySelectorAll('[data-hp-colour]'));
      el.groups = Array.prototype.slice.call(el.querySelectorAll('[data-hp-colour-group]'));
      el.titleEl = el.querySelector('[data-hp-colour-title]');
      el.linkEl = el.querySelector('[data-hp-colour-link]');
      if (!el.swatches.length || !el.groups.length) return;

      el.swatches.forEach(function (btn) {
        btn.addEventListener('click', function () { el.select(btn); });
      });

      /* Start on whichever swatch the template marked active, so the visible
         group and the highlighted swatch agree on first paint. */
      var initial = el.swatches.filter(function (b) {
        return b.classList.contains('is-active');
      })[0] || el.swatches[0];
      el.select(initial, true);
    };

    HpColourShop.prototype.select = function (btn, initial) {
      var el = this;
      var key = btn.getAttribute('data-hp-colour-key');

      el.swatches.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      var shownGroup = null;
      el.groups.forEach(function (g) {
        var on = g.getAttribute('data-hp-colour-group') === key;
        g.hidden = !on;
        if (on) shownGroup = g;
      });

      if (el.titleEl) el.titleEl.textContent = btn.getAttribute('data-hp-label') || '';
      var url = btn.getAttribute('data-hp-url');
      if (el.linkEl && url) {
        el.linkEl.href = url;
        el.linkEl.hidden = false;
      }

      if (!shownGroup || initial) return;

      /* Reveal-on-scroll already ran for these cards while they were hidden, so
         re-running initMotion would do nothing. Animate the swap directly. */
      if (hasGsap && !reducedMotion) {
        window.gsap.fromTo(shownGroup.children,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.04, clearProps: 'transform,opacity' });
      }
    };

    return HpColourShop;
  })();
  if (!customElements.get('hp-colour-shop')) customElements.define('hp-colour-shop', HpColourShop);

  /* ---- <hp-recommendations> --------------------------------------------
     Shopify's native Product Recommendations API. It is powered by real
     order/behaviour data for this shop, so the results are genuinely
     relevant to the product in context — and it needs no API key, no
     third-party call, and no secret in the theme.
       intent=related        "you may also like"
       intent=complementary  "goes well with" (curated in Search & Discovery)
  ---------------------------------------------------------------------- */
  var HpRecs = (function () {
    function HpRecs() { return Reflect.construct(HTMLElement, [], HpRecs); }
    HpRecs.prototype = Object.create(HTMLElement.prototype, { constructor: { value: HpRecs } });
    Object.setPrototypeOf(HpRecs, HTMLElement);

    HpRecs.prototype.connectedCallback = function () {
      var el = this;
      if (el.dataset.hpLoaded) return;
      var url = el.getAttribute('data-url');
      var target = el.querySelector('[data-hp-recs-grid]');
      if (!url || !target) return;

      var run = function () {
        el.dataset.hpLoaded = '1';
        fetch(url)
          .then(function (r) { return r.text(); })
          .then(function (html) {
            var parsed = new DOMParser().parseFromString(html, 'text/html');
            var grid = parsed.querySelector('[data-hp-recs-source]');
            if (!grid || !grid.children.length) { el.remove(); return; }
            target.innerHTML = grid.innerHTML;
            el.hidden = false;
            el.classList.add('is-loaded');
            initMotion(el);
            if (hasGsap) window.ScrollTrigger.refresh();
          })
          .catch(function () { el.remove(); });
      };

      // only fetch when it is about to matter
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) { io.disconnect(); run(); }
        }, { rootMargin: '600px' });
        io.observe(el);
      } else { run(); }
    };
    return HpRecs;
  })();
  if (!customElements.get('hp-recommendations')) customElements.define('hp-recommendations', HpRecs);

  /* ---- <hp-drawer-recs> -------------------------------------------------
     The cart drawer opens on every page, where no recommendations *section*
     is guaranteed to exist — so it uses the JSON recommendations endpoint and
     renders compact cards itself. Re-runs whenever the cart changes so the
     suggestions follow whatever was added last.
  ---------------------------------------------------------------------- */
  var HpDrawerRecs = (function () {
    function HpDrawerRecs() { return Reflect.construct(HTMLElement, [], HpDrawerRecs); }
    HpDrawerRecs.prototype = Object.create(HTMLElement.prototype, { constructor: { value: HpDrawerRecs } });
    Object.setPrototypeOf(HpDrawerRecs, HTMLElement);

    function money(cents) {
      var fmt = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'PKR';
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency', currency: fmt, maximumFractionDigits: 0
        }).format(cents / 100);
      } catch (e) { return (cents / 100).toFixed(0); }
    }

    HpDrawerRecs.prototype.connectedCallback = function () { this.load(); };

    HpDrawerRecs.prototype.load = function () {
      var el = this;
      var pid = el.getAttribute('data-product-id');
      var limit = el.getAttribute('data-limit') || 4;
      var grid = el.querySelector('[data-hp-recs-grid]');
      if (!pid || !grid) { el.hidden = true; return; }
      if (el.dataset.hpFor === pid) return;   // already showing this product's set
      el.dataset.hpFor = pid;

      fetch('/recommendations/products.json?product_id=' + pid + '&limit=' + limit + '&intent=related')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var items = (data && data.products) || [];
          if (!items.length) { el.hidden = true; return; }
          grid.innerHTML = items.map(function (p) {
            var img = p.featured_image || (p.images && p.images[0]) || '';
            var src = img ? img.replace(/(\.[a-z]+)(\?.*)?$/i, '_300x$1') : '';
            var price = p.price_min != null ? p.price_min : p.price;
            return '<a class="hp-drec" href="' + p.url + '">' +
              '<span class="hp-drec__media">' +
                (src ? '<img src="' + src + '" alt="" loading="lazy" width="150" height="188">' : '') +
              '</span>' +
              '<span class="hp-drec__title">' + p.title + '</span>' +
              '<span class="hp-drec__price">' + money(price) + '</span>' +
            '</a>';
          }).join('');
          el.hidden = false;
        })
        .catch(function () { el.hidden = true; });
    };

    return HpDrawerRecs;
  })();
  if (!customElements.get('hp-drawer-recs')) customElements.define('hp-drawer-recs', HpDrawerRecs);

  /* ---- Reviews: brand styling + pagination -------------------------------
     The review app may render either into the page (light DOM) or inside a
     Shadow DOM, depending on which widget version the shop is on. Theme CSS
     cannot cross a shadow boundary, so we walk any open shadow roots, inject
     the brand styles there, and run pagination inside whichever root actually
     holds the reviews. Everything is defensive — if the app renders nothing we
     recognise, we leave it completely alone.
  ---------------------------------------------------------------------- */
  function hpReviewCss(starColor) {
    var gold = starColor || '#e0a422';
    return [
      /* Floating "Reviews" tab — removed site-wide. Repeated here as well as in
         hp-theme.css because this stylesheet is also injected into any shadow
         roots Judge.me renders into, and a stylesheet in <head> cannot reach
         inside a shadow root. */
      '.jdgm-rev-tab,#jdgm-rev-tab,.jdgm-all-reviews-tab,#judgeme_all_reviews_tab,',
      '.jdgm-floating-tab,#judgeme_floating_tab,[class*="jdgm"][class*="-tab"]{',
      'display:none!important;visibility:hidden!important;pointer-events:none!important}',
      /* the block already supplies a heading */
      '.jdgm-rev-widg__title{display:none!important}',
      /* type */
      '.jdgm-rev-widg,.jdgm-rev__body,.jdgm-rev__body p,.jdgm-rev__author,.jdgm-rev__timestamp{',
      'font-family:var(--hp-font-ui)!important;color:#252525}',
      '.jdgm-rev__body,.jdgm-rev__body p{font-size:15px!important;line-height:1.8!important}',
      '.jdgm-rev__title{font-family:var(--hp-font-display)!important;font-weight:600!important;',
      'font-size:20px!important;color:#252525!important;display:block;margin-bottom:4px}',
      /* stars */
      '.jdgm-star{color:' + gold + '!important}',
      '.jdgm-star.jdgm--on,.jdgm-star.jdgm--half{color:' + gold + '!important}',
      '.jdgm-star.jdgm--off{color:' + gold + '4d!important}',
      /* summary */
      '.jdgm-rev-widg__header{border:1px solid rgba(37,37,37,.09);border-radius:16px;',
      'background:#fff9df;padding:16px 18px;margin-bottom:16px}',
      '.jdgm-rev-widg__summary-average{font-family:var(--hp-font-display)!important;',
      'font-size:26px!important;color:#257575!important}',
      /* cards */
      '.jdgm-rev{border:1px solid rgba(37,37,37,.09)!important;border-radius:16px;background:#fff;',
      'padding:18px!important;margin-bottom:12px!important}',
      /* avatar */
      '.jdgm-rev__icon{background:#257575!important;color:#fff9df!important;',
      'font-family:var(--hp-font-display)!important;font-weight:600;font-size:16px!important;',
      'width:36px!important;height:36px!important;line-height:36px!important;border-radius:50%!important;text-align:center}',
      /* author + verified badge */
      '.jdgm-rev__author{font-weight:600!important;font-size:14px!important;color:#252525!important}',
      '.jdgm-rev__buyer-badge{display:inline-flex!important;align-items:center;gap:3px;',
      'background:rgba(37,117,117,.1)!important;color:#257575!important;',
      'border:1px solid rgba(37,117,117,.3)!important;border-radius:40px!important;',
      'padding:2px 9px!important;font-size:10px!important;font-weight:600!important;',
      'letter-spacing:.06em;text-transform:uppercase;opacity:1!important}',
      '.jdgm-rev__timestamp{color:#716a56!important;font-size:11px!important}',
      '.jdgm-rev__prod-link,.jdgm-rev__prod-info-wrapper{background:#fffdf4!important;',
      'border:1px solid rgba(37,37,37,.09);border-radius:12px;padding:8px!important;font-size:11px!important}',
      '.jdgm-rev__prod-link a,.jdgm-rev__replier{color:#257575!important}',
      '.jdgm-rev__pics img,.jdgm-rev-widg__pics img{border-radius:10px!important}',
      /* write a review + controls */
      '.jdgm-write-rev-link{background:#257575!important;color:#fff9df!important;',
      'border:1.5px solid #257575!important;border-radius:40px!important;',
      'font-family:var(--hp-font-ui)!important;font-size:11px!important;font-weight:600!important;',
      'letter-spacing:.12em;text-transform:uppercase;padding:10px 18px!important}',
      '.jdgm-write-rev-link:hover{background:#1c5b5b!important;border-color:#1c5b5b!important}',
      '.jdgm-rev-widg__sort-wrapper select,.jdgm-sort-dropdown{border-radius:40px!important;',
      'border:1px solid rgba(37,37,37,.3)!important;color:#252525!important}',
      /* our pager */
      '.hp-revpager{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:18px}',
      '.hp-revpager__btn{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;',
      'border-radius:50%;border:1.5px solid #257575;background:transparent;color:#257575;cursor:pointer}',
      '.hp-revpager__btn:hover:not(:disabled){background:#257575;color:#fff9df}',
      '.hp-revpager__btn:disabled{opacity:.3;cursor:default}',
      '.hp-revpager__label{font-family:var(--hp-font-ui);font-size:11px;',
      'letter-spacing:.1em;text-transform:uppercase;color:#716a56}'
    ].join('');
  }

  // collect a node plus every open shadow root beneath it
  function collectRoots(node, out, depth) {
    out = out || [];
    depth = depth || 0;
    if (!node || depth > 6) return out;
    out.push(node);
    var all = node.querySelectorAll ? node.querySelectorAll('*') : [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].shadowRoot) collectRoots(all[i].shadowRoot, out, depth + 1);
    }
    return out;
  }

  function initReviewPager(root) {
    (root || document).querySelectorAll('[data-hp-reviews-pager]').forEach(function (box) {
      if (box.dataset.hpPagerWired) return;

      var perPage = parseInt(box.getAttribute('data-hp-reviews-pager'), 10) || 2;
      var star = box.getAttribute('data-hp-star') || '#e0a422';
      var tries = 0;

      (function wait() {
        // look in the block and in any shadow roots it contains
        var roots = collectRoots(box, []);
        var host = null;
        var items = [];
        for (var i = 0; i < roots.length; i++) {
          var found = roots[i].querySelectorAll('.jdgm-rev, [data-review-id]');
          if (found.length) { host = roots[i]; items = Array.prototype.slice.call(found); break; }
        }

        // style every root we can reach, even before reviews resolve
        roots.forEach(function (r) {
          if (r.__hpStyled) return;
          r.__hpStyled = true;
          // document-level styles already come from the section stylesheet
          if (r === document || r.nodeType === 1) return;
          try {
            var st = document.createElement('style');
            st.textContent = hpReviewCss(star);
            r.appendChild(st);
          } catch (e) {}
        });

        if (!items.length) {
          if (tries++ < 40) return window.setTimeout(wait, 250);
          return;   // app rendered something we do not recognise — leave it alone
        }
        box.dataset.hpPagerWired = '1';
        if (items.length <= perPage) return;

        // silence the app's own paginator
        (host.querySelectorAll ? host.querySelectorAll('.jdgm-paginate, .jdgm-rev-widg__paginate') : [])
          .forEach(function (n) { n.style.display = 'none'; });

        var pages = Math.ceil(items.length / perPage);
        var page = 0;

        var nav = document.createElement('div');
        nav.className = 'hp-revpager';
        nav.innerHTML =
          '<button type="button" class="hp-revpager__btn" data-prev aria-label="Previous reviews">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
          '<span class="hp-revpager__label" data-label></span>' +
          '<button type="button" class="hp-revpager__btn" data-next aria-label="More reviews">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>';

        var list = items[0].parentNode;
        if (list && list.parentNode) list.parentNode.insertBefore(nav, list.nextSibling);
        else box.appendChild(nav);

        var prev = nav.querySelector('[data-prev]');
        var next = nav.querySelector('[data-next]');
        var label = nav.querySelector('[data-label]');

        function render(scroll) {
          items.forEach(function (el, i) {
            el.style.display = (i >= page * perPage && i < (page + 1) * perPage) ? '' : 'none';
          });
          label.textContent = 'Page ' + (page + 1) + ' of ' + pages;
          prev.disabled = page === 0;
          next.disabled = page === pages - 1;
          if (scroll) {
            var top = box.getBoundingClientRect().top + window.scrollY - 120;
            window.scrollTo({ top: top, behavior: reducedMotion ? 'auto' : 'smooth' });
          }
          if (hasGsap) window.ScrollTrigger.refresh();
        }

        prev.addEventListener('click', function () { if (page > 0) { page--; render(true); } });
        next.addEventListener('click', function () { if (page < pages - 1) { page++; render(true); } });
        render(false);
      })();
    });
  }

  /* ---- Background video (About hero) ------------------------------------
     The poster image is the real content; the video only fades in once it can
     actually play, so a blocked autoplay or a slow connection leaves the still
     photograph in place instead of a black rectangle.
  ---------------------------------------------------------------------- */
  function initBgVideo(root) {
    (root || document).querySelectorAll('[data-hp-bg-video]').forEach(function (v) {
      if (v.dataset.hpVidDone) return;
      v.dataset.hpVidDone = '1';
      if (reducedMotion) return;   // leave the still image

      /* Pick the clip for this screen before touching the network, so a phone
         never downloads the desktop cut (or the other way round). Either
         attribute may be empty, in which case the other one covers both. */
      var phone = window.matchMedia('(max-width: 749px)').matches;
      var desktopSrc = v.getAttribute('data-src-desktop') || '';
      var mobileSrc = v.getAttribute('data-src-mobile') || '';
      var src = phone ? (mobileSrc || desktopSrc) : (desktopSrc || mobileSrc);
      if (!src && !v.getAttribute('src')) return;
      // Only touch the element when the file actually differs — the homepage
      // hero ships its desktop clip on the src attribute so it plays without
      // JS, and reloading the same file would restart it for no reason.
      if (src && v.getAttribute('src') !== src) {
        v.setAttribute('src', src);
        v.preload = 'metadata';
        v.load();
      }

      var show = function () { v.classList.add('is-playing'); };
      if (v.readyState >= 3) show();
      v.addEventListener('canplay', show, { once: true });
      var p = v.play();
      if (p && p.catch) p.catch(function () { v.classList.remove('is-playing'); });
    });
  }

  /* ---- Count-up numbers --------------------------------------------------
     Reads the number out of whatever the merchant typed — "1,000+", "100%",
     "Rs. 8,000" — animates only the digits and keeps the prefix, suffix,
     decimals and thousands separators exactly as written. Anything without a
     number in it is left alone, so no setting can break the display.
  ---------------------------------------------------------------------- */
  function initCounters(root) {
    var nodes = (root || document).querySelectorAll('[data-hp-count]');
    if (!nodes.length) return;

    var run = function (el) {
      var raw = el.getAttribute('data-hp-count') || el.textContent;
      var match = raw.match(/\d[\d,]*(\.\d+)?/);
      if (!match) return;
      var numText = match[0];
      var prefix = raw.slice(0, match.index);
      var suffix = raw.slice(match.index + numText.length);
      var grouped = numText.indexOf(',') !== -1;
      var decimals = (numText.split('.')[1] || '').length;
      var target = parseFloat(numText.replace(/,/g, ''));
      if (isNaN(target)) return;

      var format = function (n) {
        var s = n.toFixed(decimals);
        if (grouped) {
          var parts = s.split('.');
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          s = parts.join('.');
        }
        return prefix + s + suffix;
      };

      if (reducedMotion) { el.textContent = format(target); return; }

      var dur = 1400;
      var t0 = null;
      var step = function (t) {
        if (t0 === null) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        // easeOutExpo — fast start, long settle, so the final digits land softly
        var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = format(target * eased);
        if (p < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    };

    var start = function (el) {
      if (el.dataset.hpCountDone) return;
      el.dataset.hpCountDone = '1';
      run(el);
    };

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(start);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        start(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.4 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ---- <hp-process> — sticky factory walk -------------------------------
     Whichever step the reader is actually looking at becomes active: its
     photograph cross-fades into the sticky frame, its caption and number
     update, and the progress bar advances.

     This measures against a "reading line" — the middle of the space beside
     the sticky frame — on every scroll frame, rather than watching an
     IntersectionObserver band. The observer version fell a step behind:
     entries only fire as an element crosses the band edge, so with steps
     taller than the band two of them could be inside it at once and the
     lowest index won, leaving the photograph showing the step above the one
     being read.
  ---------------------------------------------------------------------- */
  var HpProcess = (function () {
    function HpProcess() { return Reflect.construct(HTMLElement, [], HpProcess); }
    HpProcess.prototype = Object.create(HTMLElement.prototype, { constructor: { value: HpProcess } });
    Object.setPrototypeOf(HpProcess, HTMLElement);

    HpProcess.prototype.connectedCallback = function () {
      var el = this;
      el.steps = Array.prototype.slice.call(el.querySelectorAll('[data-hp-proc-step]'));
      el.layers = Array.prototype.slice.call(el.querySelectorAll('[data-hp-proc-layer]'));
      el.numEl = el.querySelector('[data-hp-proc-num]');
      el.capEl = el.querySelector('[data-hp-proc-caption]');
      el.fillEl = el.querySelector('[data-hp-proc-fill]');
      el.frame = el.querySelector('.hp-abt-proc__stack');
      if (!el.steps.length) return;

      el.active = -1;
      el.setActive(0);

      var ticking = false;
      el.onScroll = function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          ticking = false;
          el.sync();
        });
      };
      window.addEventListener('scroll', el.onScroll, { passive: true });
      window.addEventListener('resize', el.onScroll);
      // images settle after layout and shift every step's position
      window.addEventListener('load', el.onScroll);
      el.sync();
    };

    HpProcess.prototype.disconnectedCallback = function () {
      if (!this.onScroll) return;
      window.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('resize', this.onScroll);
      window.removeEventListener('load', this.onScroll);
    };

    /* The line to measure against: where the middle of the sticky frame sits
       once pinned — taken from the sticky offset rather than the frame's
       current box, because before it pins the frame sits low in the viewport
       and would make the second step active on arrival at the section. */
    HpProcess.prototype.readingLine = function () {
      var vh = window.innerHeight;
      var media = this.frame && this.frame.parentElement;
      if (this.frame && this.frame.offsetParent && media) {
        var top = parseFloat(window.getComputedStyle(media).top);
        var h = this.frame.getBoundingClientRect().height;
        if (!isNaN(top) && h) {
          return Math.max(vh * 0.15, Math.min(top + h / 2, vh * 0.85));
        }
      }
      return vh / 2;
    };

    HpProcess.prototype.sync = function () {
      var el = this;
      var line = el.readingLine();
      var best = 0;
      var bestGap = Infinity;

      for (var i = 0; i < el.steps.length; i++) {
        var r = el.steps[i].getBoundingClientRect();
        if (line >= r.top && line <= r.bottom) { best = i; bestGap = 0; break; }
        // in the gap between two steps (or past the ends): take the nearest
        var gap = line < r.top ? r.top - line : line - r.bottom;
        if (gap < bestGap) { bestGap = gap; best = i; }
      }
      el.setActive(best);
    };

    HpProcess.prototype.setActive = function (i) {
      var el = this;
      if (el.active === i) return;
      el.active = i;

      el.steps.forEach(function (s, n) { s.classList.toggle('is-active', n === i); });
      el.layers.forEach(function (l, n) { l.classList.toggle('is-active', n === i); });

      var pad = i + 1 < 10 ? '0' + (i + 1) : String(i + 1);
      if (el.numEl) el.numEl.textContent = pad;

      var step = el.steps[i];
      if (el.capEl && step) {
        var cap = step.getAttribute('data-hp-proc-cap');
        if (!cap) {
          var t = step.querySelector('.hp-abt-proc__step-title');
          cap = t ? t.textContent.trim() : '';
        }
        el.capEl.textContent = cap;
      }
      if (el.fillEl) el.fillEl.style.width = ((i + 1) / el.steps.length * 100) + '%';
    };

    return HpProcess;
  })();
  if (!customElements.get('hp-process')) customElements.define('hp-process', HpProcess);

  /* ---- <hp-journal-filter> — topic chips on the Journal index ------------
     Filters the posts already on the page rather than fetching anything: the
     whole index is a handful of blocks, so hiding and showing is instant and
     cannot half-fail. The chips are real buttons, so keyboard and screen
     readers get the same behaviour, and with JS off the bar is hidden by CSS
     and every post stays visible.
  ---------------------------------------------------------------------- */
  var HpJournalFilter = (function () {
    function HpJournalFilter() { return Reflect.construct(HTMLElement, [], HpJournalFilter); }
    HpJournalFilter.prototype = Object.create(HTMLElement.prototype, { constructor: { value: HpJournalFilter } });
    Object.setPrototypeOf(HpJournalFilter, HTMLElement);

    HpJournalFilter.prototype.connectedCallback = function () {
      var el = this;
      el.chips = Array.prototype.slice.call(el.querySelectorAll('[data-hp-topic]'));
      var scope = el.closest('.hp-jrnl') || document;
      el.posts = Array.prototype.slice.call(scope.querySelectorAll('[data-hp-post]'));
      if (!el.chips.length || !el.posts.length) return;

      el.chips.forEach(function (chip) {
        chip.addEventListener('click', function () { el.select(chip); });
      });
    };

    HpJournalFilter.prototype.select = function (chip) {
      var el = this;
      var topic = chip.getAttribute('data-hp-topic') || '';

      el.chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      var shown = [];
      el.posts.forEach(function (post) {
        var match = !topic || post.getAttribute('data-hp-tag') === topic;
        post.hidden = !match;
        if (match) shown.push(post);
      });

      /* The reveal animations already ran for these posts, so re-running the
         motion engine would do nothing — animate the newly shown set here. */
      if (hasGsap && !reducedMotion && shown.length) {
        window.gsap.fromTo(shown,
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.05, clearProps: 'transform,opacity' });
        window.ScrollTrigger.refresh();
      }
    };

    return HpJournalFilter;
  })();
  if (!customElements.get('hp-journal-filter')) customElements.define('hp-journal-filter', HpJournalFilter);

  /* ---- Timeline rail ----------------------------------------------------
     The rail fills in step with the scroll (scrubbed, so it tracks the finger
     rather than playing a canned animation) and each milestone lights its dot
     as it reaches reading height. Without GSAP the CSS already shows the rail
     filled, so only the dots need wiring.
  ---------------------------------------------------------------------- */
  function initTimeline(root) {
    (root || document).querySelectorAll('[data-hp-timeline]').forEach(function (wrap) {
      if (wrap.dataset.hpTimeDone) return;
      wrap.dataset.hpTimeDone = '1';

      var fill = wrap.querySelector('[data-hp-timeline-fill]');
      var items = Array.prototype.slice.call(wrap.querySelectorAll('[data-hp-timeline-item]'));

      if (fill && hasGsap) {
        window.gsap.fromTo(fill, { height: '0%' }, {
          height: '100%', ease: 'none',
          scrollTrigger: { trigger: wrap, start: 'top 72%', end: 'bottom 72%', scrub: true }
        });
      } else if (fill) {
        fill.style.height = '100%';
      }

      if (!items.length) return;
      if (reducedMotion || !('IntersectionObserver' in window)) {
        items.forEach(function (it) { it.classList.add('is-active'); });
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-active');
          io.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -28% 0px', threshold: 0.1 });
      items.forEach(function (it) { io.observe(it); });
    });
  }

  /* ---- Jump links — phone menu shortcuts to a section -------------------
     The href is a real URL (home page + anchor), so this only takes over when
     the target is on the page already: it closes the menu drawer first, then
     scrolls with the sticky header's height subtracted, which a plain anchor
     jump cannot do — the browser would leave the section's heading tucked
     underneath the header.
  ---------------------------------------------------------------------- */
  function headerOffset() {
    var raw = getComputedStyle(doc).getPropertyValue('--hp-header-h');
    var h = parseFloat(raw);
    if (!isNaN(h) && h > 0) return h + 12;
    var wrapper = document.querySelector('.header-wrapper');
    return (wrapper ? wrapper.offsetHeight : 0) + 12;
  }

  function scrollToEl(el) {
    var top = el.getBoundingClientRect().top + window.scrollY - headerOffset();
    if (top < 0) top = 0;
    if (lenis) { lenis.scrollTo(top, { duration: 1.1 }); return; }
    window.scrollTo({ top: top, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  function closeMenuDrawer() {
    var drawer = document.querySelector('header-drawer');
    if (drawer && typeof drawer.closeMenuDrawer === 'function') {
      // Dawn's own close: restores focus, unlocks the body scroll and clears
      // the classes the overlay lock watches.
      try { drawer.closeMenuDrawer(); return; } catch (e) {}
    }
    var details = document.querySelector('header-drawer details[open]');
    if (details) details.removeAttribute('open');
    document.body.classList.remove('overflow-hidden-mobile', 'overflow-hidden-tablet');
  }

  function initJumpLinks(root) {
    (root || document).querySelectorAll('[data-hp-jump]').forEach(function (a) {
      if (a.dataset.hpJumpDone) return;
      a.dataset.hpJumpDone = '1';
      a.addEventListener('click', function (e) {
        var target = document.getElementById(a.getAttribute('data-hp-jump'));
        if (!target) return;          // another page — let the href do the work
        e.preventDefault();
        closeMenuDrawer();
        // let the drawer's own closing transition start before scrolling
        window.setTimeout(function () { scrollToEl(target); }, 60);
      });
    });
  }

  /* Arriving from another page as /#hp-colours: the browser lands the section
     under the sticky header, so nudge it into place once things have settled. */
  function honourHashOffset() {
    if (!window.location.hash) return;
    var el = document.getElementById(window.location.hash.slice(1));
    if (!el) return;
    window.setTimeout(function () { scrollToEl(el); }, 250);
  }

  /* ---- <hp-journal-reader> — open a post in place ------------------------
     A post can only have a URL of its own if a Shopify Page exists for it, and
     the theme cannot create pages, so every /pages/journal-… link 404'd. The
     posts are rendered into this page instead and shown at ?post=<handle>,
     which is a URL that genuinely resolves, survives a refresh and can be
     shared. History is pushed so Back returns to the index rather than leaving
     the site.
  ---------------------------------------------------------------------- */
  function initJournalReader(root) {
    var scope = root && root.querySelector ? root : document;
    var reader = scope.querySelector('[data-hp-journal-reader]');
    var index = scope.querySelector('[data-hp-journal-index]');
    if (!reader || !index || reader.dataset.hpReaderDone) return;
    reader.dataset.hpReaderDone = '1';

    var views = Array.prototype.slice.call(reader.querySelectorAll('[data-hp-post-view]'));
    var baseTitle = document.title;

    function slugFromUrl() {
      var m = window.location.search.match(/[?&]post=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : '';
    }

    function show(slug, scrollTop) {
      var found = null;
      views.forEach(function (v) {
        var on = v.getAttribute('data-hp-post-view') === slug;
        v.hidden = !on;
        if (on) found = v;
      });
      reader.classList.toggle('is-open', !!found);
      index.hidden = !!found;

      if (found) {
        var h = found.querySelector('.hp-jrnl__post-title');
        document.title = (h ? h.textContent.trim() + ' — ' : '') + baseTitle;
      } else {
        document.title = baseTitle;
      }
      if (scrollTop) {
        if (lenis) { lenis.scrollTo(0, { immediate: true }); } else { window.scrollTo(0, 0); }
      }
      if (hasGsap) window.ScrollTrigger.refresh();
      return !!found;
    }

    scope.querySelectorAll('[data-hp-post-link]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        // let modified clicks open a new tab as usual
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        var slug = a.getAttribute('data-hp-post-link');
        if (!slug) return;
        e.preventDefault();
        if (show(slug, true)) {
          window.history.pushState({ hpPost: slug }, '', a.getAttribute('href'));
        }
      });
    });

    scope.querySelectorAll('[data-hp-post-back]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        show('', true);
        // Drop the parameter from the URL we are actually on rather than
        // trusting the href — that keeps Back correct even if the link is
        // rendered without a path.
        var url = new URL(window.location.href);
        url.searchParams.delete('post');
        window.history.pushState({ hpPost: '' }, '', url.pathname + url.search + url.hash);
      });
    });

    window.addEventListener('popstate', function () { show(slugFromUrl(), false); });

    // first paint: a shared or refreshed ?post= link opens straight into the post
    show(slugFromUrl(), false);
  }

  /* ---- boot ------------------------------------------------------------- */
  function boot() {
    initOverlayScrollLock();
    markScrollContainers(document);
    initStickyChrome();
    initMotion(document);
    initVideoTriggers(document);
    initReviewPager(document);
    initBgVideo(document);
    initCounters(document);
    initTimeline(document);
    initJumpLinks(document);
    initJournalReader(document);
    honourHashOffset();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('shopify:section:load', function (e) {
    initMotion(e.target);
    initVideoTriggers(e.target);
    initReviewPager(e.target);
    initBgVideo(e.target);
    initCounters(e.target);
    initTimeline(e.target);
    initJumpLinks(e.target);
    initJournalReader(e.target);
    markScrollContainers(e.target);
    initStickyChrome();
    if (hasGsap) window.ScrollTrigger.refresh();
  });
  // cart drawer / quick-add inject markup without a section:load event
  document.addEventListener('shopify:afterCartUpdate', function () { initMotion(document); });
})();
