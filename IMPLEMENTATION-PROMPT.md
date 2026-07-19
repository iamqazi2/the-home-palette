# The Home Palette — Homepage Revamp: Developer Handoff

**Current direction (v2):** *Modern Vintage Classic, teal & cream* — a warm, realistic, premium storefront. Brand teal green over cream, rounded soft cards (16–24px radius), pill buttons, star ratings, chaptered storytelling, refined tasteful motion, fully responsive. Serif display + clean sans.

**Live mockup:** `The Home Palette — Revamp v3.dc.html` (latest — pro motion, video hero, video reviews). `v2` = same look without the advanced motion; `v1` = earlier espresso/editorial direction. All kept for reference.

**What's new in v3:**
- **Video hero** — full-bleed muted autoplay loop `<video>` behind the rotating headline (swap the placeholder for the brand tablescape reel). Keep the cream/outline CTAs + slide dots.
- **Video-review marquee** — dark teal band (`#123536`), two rows auto-scrolling opposite directions (pause on hover), mixing portrait **video cards** (customer clip + centered play button + name/role overlay) and dark **text testimonial cards** — modelled on the client's reference. Wire video cards to a lightbox/modal player.
- **Pro motion (GSAP + ScrollTrigger + Lenis):** Lenis smooth scroll; scroll-reveal on every section; **stacking card reveals** (rise + scale + stagger, batched per row); background **parallax** on hero/story/CTA; hero intro timeline. All gated behind `prefers-reduced-motion`.
- **Larger cards** — product & collection images are now 4:5 portrait so full pieces show; wider grid gaps.

Build the live site to match section-for-section. The redesign **keeps the existing section order and all existing Shopify content/images**; only the layout, type, spacing, color and motion change.

---

## 1. Design tokens

**Primary palette (per client):**

| Token | Hex | Use |
|---|---|---|
| **green** | `#257575` | brand primary — announcement bar, footer, story & marquee bands, buttons, accents, eyebrows |
| green-deep | `#1c5b5b` | hero base, button hover |
| green-tint | `#eaf1f0` | soft icon chips |
| **cream** | `#fff9df` | trust/occasion bg, text on green |
| cream-soft | `#fffdf4` | page background |
| paper | `#ffffff` | cards |
| ink | `#252525` | body text |
| taupe | `#716a56` | captions / secondary text |
| gold | `#e0a422` | rating stars |
| linen | `#efecec` | image/placeholder base |

**Type:** Display = **Cormorant Garamond** (600). Body/UI = **Archivo** (400–600) — matches the theme's Archivo Narrow. Headings: `line-height:1.05`. Labels/nav/eyebrows: uppercase, `letter-spacing:.12–.24em`, 11–13px.

**Primitives:** buttons = **pill** (radius 40px), 1.5px border, filled teal / cream / outline variants, lift + shadow on hover; cards = white, 16px radius, 1px hairline, lift + image-zoom on hover; eyebrow = short teal rule + uppercase teal label; logo = circular `thp` monogram emblem + serif wordmark (stand-in for `FullLogo_1_ratio_1-01.png`).

---

## 2. Section-by-section spec (top → bottom, unchanged order)

1. **Announcement bar** (`ref: hero.png`) — espresso bg, cream text, **left-to-right marquee** of the 4 promos separated by `✦`.
2. **Header** — sticky, translucent cream-soft + blur, 1px bottom hairline. 3-col grid: `Search` (left) · centered serif wordmark **THE HOME PALETTE** with `HANDCRAFTED · PAKISTAN` micro-label under it · `Account / Cart(n)` (right). Second row: centered nav with underline-draw hover.
3. **Hero slideshow** (`hero.png`) — full-bleed (`88vh`), 5 slides, auto-rotate 6s. Each slide: **Ken-Burns slow zoom** on the photo, left-weighted dark gradient, eyebrow + huge serif heading + subcopy + cream outline button. Bottom-left: thin progress-dash indicators; bottom-right: prev/`01 / 05`/next circular controls.
4. **Trust strip** (`collections-collage.png`, top) — cream bg, 4 columns divided by hairlines, each = uppercase serif title + taupe caption (no icons).
5. **Collections collage** (`collections-collage.png`) — "*Chapter One — The Collections / Every Table Tells a Story*". **Asymmetric CSS-grid mosaic** of the 10 collections (tile 1 spans 2×2; tiles 4, 6, 10 span wider — see mockup). Each tile: photo + bottom gradient + serif name + piece count; slow zoom-in on hover.
6. **Featured — Dinner Sets** (`product-grid.png`) — hairline top rule, serif section title + "VIEW ALL". 4-up product cards: hairline frame, 4:5 image, sale badge top-left, uppercase name, serif taupe price (with struck-through compare-at), full-width squared "ADD TO CART". Slow image zoom on hover.
7. **Story band** (`story.png`) — "*Chapter Two — The Craft*". Split 50/50: **sepia** photo left, moss-green panel right with heading, paragraph, 3 stats (100% / 10+ / 3–5 days) between hairline rules, cream outline button.
8. **Featured — Tea & Coffee** — same card system, "CHOOSE OPTIONS" button.
9. **Occasion** (`occasion.png`) — "*Chapter Three — The Table*", espresso bg, centered head, 6-cell bordered row; each cell = rotating diamond mark + serif title + caption.
10. **Featured — Serving in Style** — same card system.
11. **Style rail** (`style-rail.png`) — "*Textures & Glazes / Shop by Style*", 5 tall (3:4) tiles edge-to-edge, dark gradient, centered uppercase serif label; hover zoom.
12. **CTA band** (`cta-weave.png`) — full-bleed **duotone/sepia** weave photo, dark left gradient, eyebrow + serif heading + copy + cream outline button.
13. **Featured — The Wooden Line** — same card system.
14. **Word marquee** — cream band, large serif phrases scrolling, `✦` separators, pause on hover.
15. **Reviews** — "Customers Are Saying", 3 quote cards (Judge.me keeps populating this).
16. **Newsletter + Footer** (`footer.png`) — espresso. Centered "*Join the Table*" with underline email field; then 4-col link grid (brand blurb + Shop/Help/Follow); bottom bar with copyright + shipping note.

---

## 3. Motion spec (refined & tasteful)

- **Scroll reveal:** fade + ~26px rise on entry via `IntersectionObserver`, light stagger on grid children. Respect `prefers-reduced-motion`.
- **Hero:** cross-fade slides (1.1s) + Ken-Burns zoom, autoplay 6s, dot controls.
- **Cards/tiles:** lift + soft shadow + slow image-zoom (1.06) on hover.
- **Nav:** underline-draw links; **sticky header** gains a soft shadow after 20px scroll.
- **Buttons:** pill lift + shadow, arrow nudge.
- **Marquees:** teal announcement bar + word band, CSS `translateX(-50%)` loop.
- Everything transform/opacity for 60fps. (No custom cursor — removed from v1.)

## 3b. Responsive

Collections 5→(1024)3→(560)2 · products 4→(900)2 · occasions 6→(1024)3→(560)2 · style rail 5→(1024)3→(560)2 · story split stacks at 900 · top nav → hamburger at 900 · footer 4→2→1. Fluid type via `clamp()`.

---

## 4. Photo map (reuse existing Shopify images — no new photography)

| Slot | Existing image handle |
|---|---|
| Hero slide 1 — Exquisite Dining | `WhatsApp_Image_2026-04-19_at_7.42.31_PM.webp` |
| Hero slide 2 — Serving Redefined | `WhatsApp_Image_2026-04-19_at_7.42.31_PM_1.webp` |
| Hero slide 3 — Traditional Kitchenware | `WhatsApp_Image_2026-04-19_at_9.13.36_PM.jpg` |
| Hero slide 4 — Woven Placemats | `Jute-Weave-Placemats-Set-of-2-...42948126834987.webp` |
| Hero slide 5 — Authentic Craftsmanship | `Aura-Tea-Set-Reactive-Cloud-Grey-...43124399767851.webp` |
| Collections collage tiles | each tile pulls its **collection's featured image** (dinner-breakfast-sets, tea-coffee-essentials, platters, thp-weave-collection, aesthetic-bowls, plates, serveware, thp-cutlery-glassware, thp-woodworks, new-arrivals) |
| Featured product cards | each product's own images (primary + secondary-on-hover) |
| Story band (sepia) | `WhatsApp_Image_2026-04-19_at_9.13.36_PM.jpg` |
| Style rail | Minimalist→`...7.42.31_PM.webp`, Earthy→`Jute-Weave-Placemats...`, Reactive→`Aura-Tea-Set...`, Contemporary→`...7.42.31_PM_1.webp`, Hotel→`...9.13.36_PM.jpg` |
| CTA band (duotone) | `Jute-Weave-Placemats-Set-of-2-...42948126834987.webp` |

Apply sepia/duotone via CSS `filter: sepia(.25–.35) contrast(1.05)` — **not** re-edited files.

---

## 5. Copy paste-in prompt (for your Shopify/Liquid developer)

> Rebuild the The Home Palette homepage to match the v2 mockup (`The Home Palette — Revamp v2.dc.html`) and the `/references/v2-*.png` screenshots. Keep the existing section order and all existing Shopify sections/content (`hp-hero`, `hp-trust-strip`, `hp-category-tiles`, featured-collections, `hp-story`, `hp-occasion`, `hp-style-rail`, `hp-cta-band`, `hp-marquee`, reviews, footer) — this is a visual + motion revamp, not a content change. Direction: warm, premium, realistic storefront in **teal green `#257575` + cream `#fff9df`**. Type: Cormorant Garamond serif headings + Archivo sans UI. Primitives: pill buttons (radius 40) in filled-teal / cream / outline variants; white rounded cards (16px) with 1px hairline, lift + slow image-zoom on hover; star ratings on product cards; teal eyebrows (short rule + uppercase label); circular `thp` monogram logo emblem + serif wordmark. Bands: teal announcement marquee, teal story band (image left / copy + 3 stats right), teal marquee, teal footer with rounded newsletter field and Instagram/Facebook links. Motion (tasteful, not gimmicky): IntersectionObserver scroll reveals with light stagger, Ken-Burns hero with cross-fade + dot controls, hover card-lift + image-zoom, underline-draw nav links, CSS marquees, sticky-header shadow on scroll; respect `prefers-reduced-motion`, transform/opacity only. **Fully responsive:** collections 5→(1024)3→(560)2; products 4→(900)2; occasions 6→(1024)3→(560)2; style rail 5→(1024)3→(560)2; story split stacks at 900; nav collapses to a hamburger at 900; footer 4→2→1. Reuse existing images per the photo map in section 4; apply any tint via CSS filters only.

---

*Live interactive mockup: `The Home Palette — Revamp v2.dc.html` (open to see motion + responsiveness). Static references: `/references/v2-*.png`.*
