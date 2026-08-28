#!/usr/bin/env node
/**
 * Push the curated pairings in complementary-pairings.json into Shopify's
 * Search & Discovery complementary-products metafield.
 *
 * The theme already reads that metafield: snippets/hp-recommendations.liquid
 * requests intent=complementary, so setting it here is all that's needed —
 * no theme change, no key in the theme, no third-party API at runtime.
 *
 * Usage:
 *   SHOP=the-home-palette.myshopify.com \
 *   TOKEN=shpat_xxx \
 *   node docs/recommendations/push-complementary.mjs [--dry-run]
 *
 * TOKEN: an Admin API access token from a custom app in
 * Settings → Apps and sales channels → Develop apps, with scopes
 * `read_products` and `write_products`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHOP = process.env.SHOP;
const TOKEN = process.env.TOKEN;
const DRY = process.argv.includes('--dry-run');
const API = '2025-07';

if (!SHOP || !TOKEN) {
  console.error('Set SHOP and TOKEN. See the header of this file.');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, 'complementary-pairings.json'), 'utf8'));

const pairs = [];
for (const [group, anchors] of Object.entries(data)) {
  if (group.startsWith('_')) continue;
  for (const [anchor, recs] of Object.entries(anchors)) pairs.push({ group, anchor, recs });
}

const handles = [...new Set(pairs.flatMap((p) => [p.anchor, ...p.recs]))];

async function gql(query, variables) {
  const res = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors, null, 2));
  return body.data;
}

const alias = (h) => 'p_' + h.replace(/[^a-zA-Z0-9]/g, '_');

// 1. Resolve every handle to a product id, in chunks of 45 aliases per request.
const ids = new Map();
for (let i = 0; i < handles.length; i += 45) {
  const chunk = handles.slice(i, i + 45);
  const query =
    'query {\n' +
    chunk
      .map((h) => `  ${alias(h)}: productByIdentifier(identifier: {handle: ${JSON.stringify(h)}}) { id handle status }`)
      .join('\n') +
    '\n}';
  const data = await gql(query, {});
  for (const h of chunk) {
    const node = data[alias(h)];
    if (node) ids.set(h, { id: node.id, status: node.status });
  }
}

const missing = handles.filter((h) => !ids.has(h));
const inactive = [...ids].filter(([, v]) => v.status !== 'ACTIVE').map(([h]) => h);
if (missing.length) console.warn(`Not found in the store (skipped): ${missing.join(', ')}`);
if (inactive.length) console.warn(`Not active (still written): ${inactive.join(', ')}`);

// 2. Build one metafield per anchor, dropping any handle that did not resolve,
//    any self-reference, and any duplicate — order from the doc is preserved.
const metafields = [];
for (const { anchor, recs } of pairs) {
  if (!ids.has(anchor)) continue;
  const refs = [];
  for (const r of recs) {
    if (!ids.has(r) || r === anchor) continue;
    const gid = ids.get(r).id;
    if (!refs.includes(gid)) refs.push(gid);
  }
  if (!refs.length) continue;
  metafields.push({
    ownerId: ids.get(anchor).id,
    namespace: 'shopify--discovery--product_recommendation',
    key: 'complementary_products',
    type: 'list.product_reference',
    value: JSON.stringify(refs),
  });
}

console.log(`${pairs.length} anchors in the doc → ${metafields.length} metafields to write.`);
if (DRY) {
  console.log('--dry-run: nothing written.');
  process.exit(0);
}

// 3. Write, 25 at a time (the metafieldsSet limit).
const MUTATION = `mutation Set($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { key }
    userErrors { field message code }
  }
}`;

let written = 0;
for (let i = 0; i < metafields.length; i += 25) {
  const batch = metafields.slice(i, i + 25);
  const data = await gql(MUTATION, { metafields: batch });
  const errs = data.metafieldsSet.userErrors;
  if (errs.length) {
    console.error(`Batch ${i / 25 + 1} errors:`, JSON.stringify(errs, null, 2));
    process.exit(1);
  }
  written += data.metafieldsSet.metafields.length;
  console.log(`Batch ${i / 25 + 1}: ${data.metafieldsSet.metafields.length} written.`);
}
console.log(`Done. ${written} products now carry curated complementary products.`);
