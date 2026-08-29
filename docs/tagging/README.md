# The Home Palette — Product Tagging Manual

Source of truth for the tags that drive **Shop by Occasion**, **Shop by Style**
and **Shop by Colour** on the homepage.

- `tagging-manual.html` — the formatted manual (edit this one).
- `The-Home-Palette-Product-Tagging-Manual.pdf` — the shareable export.

## Regenerating the PDF

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="docs/tagging/The-Home-Palette-Product-Tagging-Manual.pdf" \
  "file://$PWD/docs/tagging/tagging-manual.html"
```

## Where the tag lists come from

| Section | Tags defined in | Mechanism |
|---|---|---|
| Shop by Occasion | Shopify smart-collection rules | Theme card links to a collection; the collection's tag rule selects products |
| Shop by Style | Shopify smart-collection rules | Same as above |
| Shop by Colour | `templates/index.json` → `hp_shop_by_color` blocks, `tag` setting | Read directly by `sections/hp-shop-by-color.liquid` |

If a colour swatch is renamed or added in the theme editor, update the manual's
colour table to match the block's **Product tag** field.
