# The Home Palette — Product Tagging Manual

Source of truth for the tags that drive **Shop by Occasion**, **Shop by Style**
and **Shop by Colour** on the homepage.

| Source (edit this) | Shareable export |
|---|---|
| `tagging-manual.html` | `The-Home-Palette-Product-Tagging-Manual.pdf` — full tag reference for the team |
| `demo-runbook.html` | `The-Home-Palette-Client-Demo-Runbook.pdf` — scripted live demo for the client |
| `colour-recording-script.html` | `The-Home-Palette-Colour-Recording-Script.pdf` — 90-second Shop by Colour screen recording |
| `metafield-demo-script.html` | `The-Home-Palette-Metafield-Demo-Script.pdf` — client demo of the Color metafield flow |

## Regenerating the PDFs

```bash
for f in tagging-manual demo-runbook colour-recording-script metafield-demo-script; do
  case $f in
    tagging-manual) out="The-Home-Palette-Product-Tagging-Manual" ;;
    demo-runbook)   out="The-Home-Palette-Client-Demo-Runbook" ;;
    colour-recording-script) out="The-Home-Palette-Colour-Recording-Script" ;;
    metafield-demo-script)   out="The-Home-Palette-Metafield-Demo-Script" ;;
  esac
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$PWD/docs/tagging/$out.pdf" \
    "file://$PWD/docs/tagging/$f.html"
done
```

## Demo products (verified live 2026-08-30)

The runbook names specific products. If they change, re-verify before demoing:

| Act | Product | Handle | Tag added |
|---|---|---|---|
| 1 — Colour | Arabic Mandi Platter | `arabic-mandi-platter` | `copper` |
| 2 — Occasion | Golden Luxe Cutlery Set / Matte Gold Premium Cutlery Set / Arabic Mandi Platter | — | `occasion-eid` |
| 3 — Style | Burnt Maple Platter | `burnt-maple-platter` | `style-earthy` |

Act 1's product must have **no** Color/Colour/Shade/Glaze variant option, or the theme
ignores the colour tag.

## Where the tag lists come from

| Section | Tags defined in | Mechanism |
|---|---|---|
| Shop by Occasion | Shopify smart-collection rules | Theme card links to a collection; the collection's tag rule selects products |
| Shop by Style | Shopify smart-collection rules | Same as above |
| Shop by Colour | `templates/index.json` → `hp_shop_by_color` blocks, `tag` setting | Read directly by `sections/hp-shop-by-color.liquid` |

If a colour swatch is renamed or added in the theme editor, update the manual's
colour table to match the block's **Product tag** field.

## Store state, 2026-09-07

The team has tagged extensively since the manual was written. Re-verify before reusing any
of these documents:

- All six `occasion-*` tags are now in use, and the collections exist
  (`everyday-dining`, `hosting-guests`, `ramadan`, `eid`, `tea-time`).
- Style tags now include three the manual does not list: `style-extravagant`,
  `style-floral`, `style-traditional`.
- **No colour tag exists on any product yet** — colour matching on the live site is
  currently doing all its work via product titles and `Color` variant options.
- The live homepage's Shop by Colour loads one colour group at a time (the version in this
  repo renders all groups up front and hides them), and the first swatch is now labelled
  "Yellow" rather than "Whimsy Yellow". **The published theme is ahead of this repo** —
  check before relying on `sections/hp-shop-by-color.liquid` to describe live behaviour.

## Shop by Colour now also reads the "Color" category metafield

`sections/hp-shop-by-color.liquid` matches a product to a swatch in this order:

1. **Colour variant option** (an option named Color / Colour / Shade / Glaze) — decides
   exclusively, and shows that colour's own variant photo. Metafields and tags are ignored
   for these products, by design.
2. **Colour tag OR the `shopify.color-pattern` category metafield** — equal weight, either
   one is enough.
3. **Product title**, with the rival guard that keeps Aqua-grey out of Aqua.

### How the metafield is matched

`shopify.color-pattern` is a *list* of `shopify--color-pattern` metaobjects, so one product
can name several colours and will appear under every swatch that matches one of them.

For each entry the theme indexes **both** the metaobject handle and its display label,
because they diverge in this catalogue — the entry shown as "Ivory White" has the handle
`white-matte`. An entry matches a swatch when either value (handleized) equals the swatch's
**Product tag**, its **Title**, or any of its **Aliases**.

So there is nothing to rename on either side: to make a metaobject match a swatch whose
name differs, add the metaobject's label to that swatch's **Aliases** field in the theme
editor.

### Adding colours later

Product page → **Category metafields** → **Color** → pick or create an entry. Custom
entries already exist in this store (`burnt-maple`, `lunar-ash`, `reactive-cloud-grey`,
`santorini-blue`, `riviera-blue`, `blush-peach`, `honey-mustard`, `earthen-rose`,
`mist-green`), so brand colours can be added the same way.

### Known consequence

The metafield often lists **accent colours and patterns**, not just the main colour, so
products can land under more swatches than before. Verified examples in the current
catalogue:

| Product | Lands under | Correct? |
|---|---|---|
| Mughal Serving Platter | Copper | yes — no colour in its name, previously under no swatch |
| Royal Mandi Platter | Copper | yes — same |
| Ivory White Platter | Black | no — black is an accent on it |
| 3D Teal Matte Spiral Plate | Sage Green | no — green is a secondary listed colour |

If that trade is not wanted, the fix is to read only the **first** entry in the metafield
(the primary colour) instead of all of them — a few lines in the same block.

## Deploying

`templates/index.json` was behind the live theme's settings until the Shopify sync commits
were merged on 2026-09-08; it is now current (first swatch "Yellow", tag `yellow`). Theme
settings reach this repo through the automatic "Update from Shopify for theme
the-home-palette/main" commits, so **pull before pushing a theme** — if those commits have
landed since your last pull, a push from a stale checkout would revert theme-editor changes.

Deploy to an unpublished theme first:

```bash
shopify theme push --unpublished --theme "Colour metafield preview"
```

## Shop by Colour, Occasion and Style lists live in metaobjects

The homepage sections and the three "Shop by …" pages each render one shared list, kept in
Shopify admin → **Content → Metaobjects**:

| Section | Metaobject | Fields |
|---|---|---|
| Shop by Colour | **Colour swatch** (`colour_swatch`) | Title, Swatch colour, Position, Product tag, Aliases, View all link |
| Shop by Occasion | **Shop by Occasion card** (`shop_occasion`) | Title, Position, Caption, Collection, Icon, Photo, Custom link |
| Shop by Style | **Shop by Style tile** (`shop_style`) | Title, Position, Image, Collection, Custom link |

Add, edit or delete an entry there and both the homepage and the page update — no code, no
theme push. **Position** sets the order: lower first, blank last.

Headings, intro text, layout, columns, counts and colours of the section itself are still set
per page in the theme editor. Only the list is shared.

### Why not section blocks

Blocks are stored per template, so the homepage and each page carried separate copies and
drifted — Occasion cards in a different order, Style tiles with different links, and "Yellow"
on one colour list but "Whimsy Yellow" on the other. The palette then spent a few days hardcoded
in the section file, which synced it but meant the team could no longer add a colour. The
metaobject list is the only option that is both shared and editable.

### Limits and one-offs

- Liquid reads the first 50 entries of a metaobject type.
- The definitions have storefront access set to public read. Changing that hides the lists.
- The old blocks still sitting in `templates/*.json` are inert; the theme editor drops them the
  next time each template is saved.
- If a list is empty the section renders nothing on the storefront, and shows a pointer to the
  metaobject in the theme editor only.

## "View all" on a colour swatch

The swatch's "View all" opens the Shop by Colour page deep-linked to that colour
(`/pages/shop-by-colour?colour=sage-green#hp-colours`). The destination re-runs the same
matching, so it shows exactly the set the swatch showed.

It used to fall back to `/search?q=Sage+Green` whenever the section's "View all goes to"
setting was empty — and store search matches product **descriptions**, so picking Sage Green
returned Aqua, Teal and Black pieces too. That fallback is gone. The chain is now:

1. the colour's own "View all URL", if the row sets one;
2. nothing, if this instance is the grid layout — it is already showing every product, so the
   link would point at itself;
3. the "View all goes to" page setting;
4. otherwise the page with the handle `shop-by-colour`, looked up automatically;
5. otherwise no link at all.

A link that shows the wrong products is worse than no link, so there is no longer any branch
that guesses.
