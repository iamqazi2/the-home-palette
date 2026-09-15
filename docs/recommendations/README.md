# Curated product pairings

What each product suggests alongside it — "Match it with..", "Completes the
set", the cart page band and the cart drawer's "Goes well with" — is managed
in Shopify admin, not in this repo.

**Content → Metaobjects → Product pairing**
([open the list](https://admin.shopify.com/store/2v7tma-zm/content/metaobjects/entries/product_pairing))

Each entry is one product and the products to suggest with it:

| Field              | What to put in it                                               |
| ------------------ | --------------------------------------------------------------- |
| Name               | The product's name, so the entry is easy to find in the list    |
| Product            | The product the suggestions are for                             |
| Suggested products | Up to 12 products, in the order they should appear              |

## Adding a new product

1. Add the product as usual.
2. Open the Product pairing list → **Add entry**.
3. Name it after the product, pick the product, pick its suggested products,
   save. It shows on the storefront straight away.

To change or stop suggestions for a product, edit or delete its entry.

## How the storefront uses it

- `snippets/hp-pairing.liquid` finds the entry for a product and renders its
  cards server-side. Suggested products that are drafts, unavailable to the
  online store, or sold out are skipped, and the band keeps its limit.
- **Match it with..** (`sections/related-products.liquid`, on the product page
  and on `?view=matches`): a product with no entry falls back to Shopify's
  automatic related products, so the band still fills.
- **Completes the set** and the **cart page** band
  (`snippets/hp-recommendations.liquid`): no entry, no band.
- **Cart drawer** (`snippets/cart-drawer.liquid`): no entry falls back to
  automatic related products for the item added last.

Entries seeded from the old pairing data use the product's handle as their own
handle, so they are found by direct lookup. An entry added in admin takes its
handle from its Name, which may differ from the product handle; those are
found by walking the list and matching the product, which covers the first 250
entries. The catalogue is well under that today.

## History

Until 2026-09-16 the pairings lived in `complementary-pairings.json` and were
pushed by `push-complementary.mjs` into the Search & Discovery metafield
`shopify--discovery--product_recommendation.complementary_products`, which the
theme read through the recommendations API's `complementary` intent. On that
date the live metafield values (77 products, including pairings added in admin
after the JSON was last updated) were copied into Product pairing entries and
the theme stopped asking for `complementary`.

The JSON and the script are kept for reference only. **Do not run the script
or edit the JSON** — the storefront no longer reads that metafield, so changes
there do nothing. The Search & Discovery app's "Product recommendations"
screen edits the same unused metafield.
