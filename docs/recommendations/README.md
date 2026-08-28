# Curated complementary recommendations

`complementary-pairings.json` is the client's pairing sheet
([Google Doc](https://docs.google.com/document/d/1RgabhQH4apqq9w30e4OKRed-UPKWAmjoIo7VxDVWI_Y))
turned into data: 73 anchor products, 214 pairings, across tea sets, dinner
sets, weaved, platters, metalware and serveware.

## How it reaches the storefront

The theme needs no change. `snippets/hp-recommendations.liquid` already asks
Shopify for `intent=complementary`, and Shopify serves that from the
Search & Discovery metafield
`shopify--discovery--product_recommendation.complementary_products`.
Writing this dataset into that metafield is the whole integration — the
pairings then show up in "Completes the set" on the PDP and in the cart and
cart-drawer bands, server-side, with no API key in the theme.

Note that `complementary` has no fallback: a product with no pairing set
returns zero recommendations and the band hides itself. That is why the PDP
"Completes the set" and cart-page bands are empty today. The cart drawer asks
for `related` instead, so it fills regardless.

## Pushing it

    SHOP=the-home-palette.myshopify.com TOKEN=shpat_… \
      node docs/recommendations/push-complementary.mjs --dry-run

Drop `--dry-run` to write. The token comes from a custom app
(Settings → Apps and sales channels → Develop apps) with `read_products` and
`write_products`. The script resolves every handle first and reports anything
it cannot find, skips self-references and duplicates, preserves the doc's
order, and writes in batches of 25.

Re-running is safe: it overwrites the same metafield with the same values.

## Editing the pairings

Edit `complementary-pairings.json` and re-run the script. Keys and values are
product *handles* (the last path segment of a product URL). Variant-specific
links in the source doc are collapsed to the parent product, because Shopify's
complementary recommendations are product-level.

## Verifying

    https://www.thehomepalette.com.pk/recommendations/products.json?product_id=<id>&intent=complementary

Or open any anchor product page and look at the "Completes the set" band.
