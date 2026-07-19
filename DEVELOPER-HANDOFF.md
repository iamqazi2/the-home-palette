# The Home Palette — Homepage Revamp: Shopify Developer Handoff (v3)

This is the complete brief to rebuild the homepage to the approved v3 mockup.
Nothing here changes your products, collections or images — it is a **visual +
motion revamp of the theme**, built on your existing custom sections.

- **Design source of truth:** `The Home Palette — Revamp v3.dc.html` (open in a browser to see layout, motion, hover states, responsiveness). Child component: `ReviewCard.dc.html`.
- **Static section references:** `/references/` (`v2-*` show the layout cleanly; v3 adds motion + the video sections).
- **Photo/asset map:** section 5 below.

---

## PART A — THE IMPLEMENTATION PROMPT

> Paste this to your developer (or an AI coding assistant working in the theme).

> **Task:** Revamp the The Home Palette Shopify homepage to match the v3 mockup
> (`The Home Palette — Revamp v3.dc.html`). This is a re-skin + motion pass of the
> existing custom sections — **keep the existing section order, all Shopify
> content, products, collections and images.** Do not change data or URLs.
>
> **Brand & tokens**
> - Colors: teal green `#257575` (primary — announcement, footer, story & marquee bands, buttons, accents, eyebrows), `#1c5b5b` (hover / hero base), `#123536` (dark video-review band), `#173f40` (dark testimonial card), `#eaf1f0` (soft icon chip), cream `#fff9df`, page `#fffdf4`, card `#ffffff`, ink `#252525`, taupe `#716a56` (captions), gold `#e0a422` (rating stars), linen `#efecec` (image base).
> - Type: **Cormorant Garamond** (600) for all display headings; **Archivo** (400–700) for UI/body (matches the theme's Archivo Narrow). Load both via `theme.liquid` `<link>` or the theme font picker.
> - Primitives: **pill buttons** (radius 40px, 1.5px border) in filled-teal / cream / outline variants with lift + shadow on hover; **white rounded cards** (18px radius, 1px hairline) with lift + slow image-zoom on hover; teal eyebrow = short rule + uppercase letter-spaced label; logo = circular `thp` monogram + serif wordmark (use the real `FullLogo_1_ratio_1-01.png`).
>
> **Sections (top → bottom, keep this order)**
> 1. Announcement bar — teal, cream text, left→right marquee of the 4 promos.
> 2. Sticky header — translucent cream + blur; left nav (Home / Dinner Sets / Categories▾), centered logo emblem + wordmark, right icons (search / account / cart badge); second centered nav row. Gains a soft shadow after 20px scroll. Collapses to a hamburger < 900px.
> 3. **Hero — full-bleed background `<video>`** (muted, autoplay, loop, `playsinline`, poster fallback) with a left-weighted teal gradient; rotating eyebrow + serif headline + subcopy every 6s; cream CTA + outline "Watch Story"; slide-dots bottom-left. Ken-Burns + parallax on the video.
> 4. Trust strip — cream band, 4 columns (icon chip + title + caption).
> 5. Collections — "Chapter One". Grid of the 10 collections as **4:5 rounded tiles** (image + bottom gradient + serif name + piece count), zoom on hover.
> 6. Featured — Dinner Sets — 4-up product cards: 4:5 image, sale badge, star rating + count, name, teal serif price (+ struck compare-at), pill "Add to Cart".
> 7. Story band — "Chapter Two", teal, split image-left / copy-right with 3 stats (100% / 10+ / 3–5 days) and cream CTA. Parallax on image. Stacks < 900px.
> 8. Featured — Tea & Coffee — same card system, "Choose Options".
> 9. Occasion — "Chapter Three", cream, 6 rounded white cards (icon + title + caption).
> 10. Featured — Serving in Style — same card system.
> 11. Style rail — "Shop by Style", 5 tall 3:4 tiles, centered serif label.
> 12. CTA band — rounded full-bleed weave image, teal gradient, eyebrow + heading + CTA.
> 13. **Video-review section** — dark teal (`#123536`) band; heading; **two horizontal rows auto-scrolling in opposite directions, pause on hover**, masking the edges. Cards mix: **portrait video cards** (customer clip thumbnail + centered play button that opens a lightbox/modal player + name/role overlay) and dark **text testimonial cards** (name, role, 5 stars, quote). Feed from Judge.me where possible; video cards from a metafield/collection of uploaded reels.
> 14. Word marquee — teal band, large serif phrases scrolling.
> 15. Newsletter + footer — teal; centered "Join the Table" with rounded email field; 4-col link grid + Instagram/Facebook (real profile links); bottom legal bar.
>
> **Motion (pro-grade, tasteful):** use **GSAP + ScrollTrigger** and **Lenis** smooth scroll.
> - Lenis smooth scrolling site-wide.
> - Scroll-reveal (fade + ~40px rise) on every section on enter.
> - **Stacking card reveals:** product/collection/occasion/style cards animate in with rise + scale + per-row stagger (ScrollTrigger.batch).
> - Background **parallax** on hero video, story image, CTA image.
> - Hero intro timeline (staggered eyebrow → heading → copy → CTA).
> - Announcement + word bands + both review rows are CSS marquees.
> - Everything transform/opacity for 60fps; **respect `prefers-reduced-motion`** (disable Lenis + reveals, show final state).
>
> **Responsive:** collections 5→(1024)3→(560)2 · products 4→(1024)3→(900)2 · occasions 6→(1024)3→(560)2 · style rail 5→(1024)3→(560)2 · story split stacks at 900 · nav → hamburger at 900 · footer 4→2→1. Fluid type via `clamp()`.
>
> **Images/video:** reuse existing Shopify media per the asset map; apply any tint via CSS filters only (do not re-edit files). Serve hero + review videos as compressed MP4/WebM with poster images and lazy-load below-the-fold media.
>
> **Acceptance:** matches the mockup section-for-section on desktop, tablet and mobile; Lighthouse performance ≥ 80 mobile; no CLS on hero; keyboard-accessible nav, buttons and video modal; motion off when reduced-motion is set.

---

## PART B — DELIVERABLES YOU NEED TO GIVE / GATHER

### 1. Already provided (in this project)
- [x] v3 design mockup + `ReviewCard` component (interactive HTML).
- [x] Section reference screenshots (`/references/`).
- [x] This handoff document (tokens, section spec, motion spec, asset map).

### 2. Media to collect and hand over (the biggest gap)
- [ ] **Hero video** — 8–15s, landscape 16:9, ~1920×1080, muted, ≤ 5 MB, MP4 (H.264) **+** WebM, plus a JPG **poster** frame. Should look good under a dark left gradient with text on top.
- [ ] **Customer review videos** — 6–10 vertical clips (9:16), each with a **poster thumbnail** and the reviewer's **name + role/city**. Get written consent to publish.
- [ ] **Text testimonials** — 6–10 quotes with name + role (or confirm these pull from Judge.me).
- [ ] **Collection images** — confirm each of the 10 collections has a strong featured image (these fill the collection tiles).
- [ ] **Product images** — square-ish or 4:5 works best now that cards are portrait; a consistent secondary "hover" image per product is a nice-to-have.
- [ ] **Logo files** — the existing `FullLogo_1_ratio_1-01.png` (and an SVG version if you have one) + favicon.

### 3. Decisions to confirm for the developer
- [ ] Where video reviews live: a **Shopify metaobject/metafield** set, a dedicated collection, or a hard-coded section block? (Recommend metaobjects so you can add clips without code.)
- [ ] Lightbox for review videos: native modal vs an app.
- [ ] Keep Judge.me for the text testimonials, or manage all reviews in the new section.
- [ ] Menu/nav final labels & links (the mockup uses your current menu).
- [ ] Fonts: confirm Cormorant Garamond + Archivo are acceptable (both free Google Fonts).

### 4. Access the developer will need
- [ ] Shopify **theme access** (Staff account with Themes permission, or a collaborator invite) — ask them to **duplicate the live theme** and build on the copy.
- [ ] The theme is Dawn-based with custom `hp-*` sections already in the repo — point them at `sections/hp-*.liquid` and `assets/hp-theme.css` / `assets/hp-theme.js` as the files to restyle.
- [ ] A staging password or preview link for review before publish.

### 5. Suggested build order
1. Tokens + type + button/card/eyebrow primitives in `hp-theme.css`.
2. Header + announcement + footer (global chrome).
3. Section-by-section restyle top → bottom.
4. Add GSAP + ScrollTrigger + Lenis; wire reveals, stacking, parallax.
5. Build the video hero + video-review section + lightbox.
6. Responsive pass + reduced-motion + performance/lazy-load.
7. QA against the mockup on desktop / tablet / mobile, then publish.

---

*Everything visual is demonstrated in `The Home Palette — Revamp v3.dc.html`. When in
doubt, the mockup is the spec.*
