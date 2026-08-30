# The Home Palette — Product Tagging Manual

Source of truth for the tags that drive **Shop by Occasion**, **Shop by Style**
and **Shop by Colour** on the homepage.

| Source (edit this) | Shareable export |
|---|---|
| `tagging-manual.html` | `The-Home-Palette-Product-Tagging-Manual.pdf` — full tag reference for the team |
| `demo-runbook.html` | `The-Home-Palette-Client-Demo-Runbook.pdf` — scripted live demo for the client |

## Regenerating the PDFs

```bash
for f in tagging-manual demo-runbook; do
  case $f in
    tagging-manual) out="The-Home-Palette-Product-Tagging-Manual" ;;
    demo-runbook)   out="The-Home-Palette-Client-Demo-Runbook" ;;
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
