/**
 * Stage 1 menu updates — idempotent.
 * - Reorders Fusion Cafe / Drinks & Beverage category navigation.
 * - Flags the Fusion Cafe "Our Popular Items" without duplicating products.
 * - Splits the old BOBA DRINK category into BOBA MILK TEA / SMOOTHIE / QQ JELLY.
 * - Removes the accidental duplicate "Oreo Shake" record (keeps cb-shk-8).
 * - Fixes the Top Town spelling to "Chola Bhature".
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'server', 'menuData.js');
let src = fs.readFileSync(file, 'utf8');

const stallReplacements = [
  {
    from: `    categories: [
      "STEAK",
      "SEAFOOD",
      "PIZZA",
      "COMBO MEAL",
      "CHEF SPECIAL",
      "STARTERS",
      "PASTA & NOODLES",
      "SOUP",
      "SALAD",
      "IMPROVED PLATTER"
    ]`,
    to: `    categories: [
      "STARTERS",
      "PASTA & NOODLES",
      "SOUP",
      "SALAD",
      "IMPROVED PLATTER",
      "STEAK",
      "SEAFOOD",
      "PIZZA",
      "COMBO MEAL",
      "CHEF SPECIAL"
    ]`
  },
  {
    from: `    categories: [
      "SOFT DRINKS & WATER",
      "BOBA DRINK",
      "ICE CRUSHED",
      "HEALTHY DRINKS",
      "SHAKE",
      "SPECIAL DRINKS",
      "COFFEE"
    ]`,
    to: `    categories: [
      "SOFT DRINKS & WATER",
      "COFFEE",
      "SHAKE",
      "SPECIAL DRINKS",
      "ICE CRUSHED",
      "HEALTHY DRINKS",
      "BOBA MILK TEA",
      "SMOOTHIE",
      "QQ JELLY"
    ]`
  }
];

for (const { from, to } of stallReplacements) {
  if (!src.includes(from)) {
    if (src.includes(to)) {
      console.log('Category order already applied; skipping.');
      continue;
    }
    throw new Error('Expected category block not found in menuData.js');
  }
  src = src.replace(from, to);
}

// ---- menuItemsData block ----
const startMarker = 'export const menuItemsData = [';
const endMarker = 'export const tablesData';
const start = src.indexOf(startMarker);
const end = src.indexOf(endMarker);
if (start < 0 || end < 0) throw new Error('menuItemsData block not found');

const prefixLen = startMarker.length - 1; // keep the opening "["
const rawBlock = src.slice(start + prefixLen, end);
const closeIdx = rawBlock.lastIndexOf(']');
if (closeIdx < 0) throw new Error('menuItemsData closing bracket not found');
const items = JSON.parse(rawBlock.slice(0, closeIdx + 1));

const byId = new Map(items.map(i => [i.id, i]));
const byName = (name) => items.find(i => i.name === name);

// Fusion Cafe popular items — reference existing records only.
const popularNames = [
  'Special Nachos',
  'Wings Hot / Buffalo (6 pcs)',
  'Fish & Chips (1:1)',
  'BBQ Chicken',
  'Mexican Chicken',
  'Masala Chicken',
  'Surf & Turf',
  'Grilled Lovers',
  '4 Ways Chicken (1:2)',
  'Thai Soup (Thick)',
  'Seafood Clear Soup',
  'Chicken Spicy Pasta',
  'Oven Baked Pasta (Red)',
  'Seafood Hakka Noodles',
  'T Bone Steak (300+6M)',
  'All Fried Seafood',
  'Sausage Carnival',
  'Pizza Barcelona',
  'Fusion Special Comilla Pizza'
];

for (const item of items) {
  delete item.isPopular;
}
for (const name of popularNames) {
  const item = items.find(i => i.stallId === 'fusion-cafe' && i.name === name);
  if (!item) throw new Error(`Popular item not found: ${name}`);
  item.isPopular = true;
}

// Per-stall "Our Special Items" — reference existing records only.
// Chicken Sharma is the existing Chicken Shawarma (bb-wrp-2, ৳220); it is
// featured rather than duplicated. Cold Coffee is the existing Fusion Regular
// Cold Coffee, and Nutella with Ice Cream is the existing Nutella With
// Ice-Cream record.
const specialIds = [
  // Burger Bar
  'bb-bgr-3', // Chicken Cheese Delight — ৳249
  'bb-bgr-5', // Beef Cheese Burger — ৳330
  'bb-sdw-2', // BBQ Cheese Sub — ৳259
  'bb-mbx-2', // BBQ Cheese Meat Box — ৳290
  'bb-wrp-2', // Chicken Shawarma (Chicken Sharma) — ৳220
  // Top Town
  'tt-dos-2', // Masala Dosa
  'tt-snk-1', // Chola Bhature
  // Drinks & Beverage
  'cb-cff-1', // Fusion Regular Cold Coffee
  'cb-drk-4', // Mint Lemonade
  'cb-shk-8', // Oreo Shake
  'cb-spc-2', // Blue Lagoon
  'cb-bob-3', // Boba Pearl Chocolate Fantasy
  'cb-bob-10', // Chocolate Pearl Shake
  // Momo Buzz
  'mb-mom-6', // Sausage Momo — ৳200
  'mb-mom-3', // Naga Momo — ৳180
  'mb-mom-5', // BBQ Momo — ৳200
  // Waffle City
  'wc-waf-6', // Chocolate Blast
  'wc-waf-10', // Nutella with Ice Cream
  'wc-waf-12' // Creamy Oreo
];

for (const item of items) {
  delete item.isSpecial;
}
for (const id of specialIds) {
  const item = byId.get(id);
  if (!item) throw new Error(`Special item not found: ${id}`);
  item.isSpecial = true;
}

// Top Town spelling requested by the menu spec.
const chola = byId.get('tt-snk-1');
if (chola && chola.name === 'Chola Bhatora') chola.name = 'Chola Bhature';

// Normalise the two existing records whose names differ only in punctuation.
const nutellaIceCream = byId.get('wc-waf-10');
if (nutellaIceCream) nutellaIceCream.name = 'Nutella with Ice Cream';
const blueLagoon = byId.get('cb-spc-2');
if (blueLagoon) blueLagoon.name = 'Blue Lagoon';

// Drinks: remove the accidental duplicate Oreo Shake (keep cb-shk-8 in SHAKE).
const duplicateOreo = byId.get('cb-bob-16');
const keptOreo = byId.get('cb-shk-8');
if (duplicateOreo && keptOreo && duplicateOreo.name === 'Oreo Shake' && keptOreo.name === 'Oreo Shake') {
  const idx = items.indexOf(duplicateOreo);
  items.splice(idx, 1);
}

// Drinks: split BOBA DRINK into the requested categories.
const drinkCategoryMap = {
  'cb-bob-1': 'BOBA MILK TEA',
  'cb-bob-2': 'BOBA MILK TEA',
  'cb-bob-3': 'BOBA MILK TEA',
  'cb-bob-17': 'BOBA MILK TEA',
  'cb-bob-4': 'SMOOTHIE',
  'cb-bob-5': 'SMOOTHIE',
  'cb-bob-6': 'SMOOTHIE',
  'cb-bob-7': 'SMOOTHIE',
  'cb-bob-8': 'QQ JELLY',
  'cb-bob-9': 'QQ JELLY',
  'cb-bob-10': 'SHAKE',
  'cb-bob-11': 'SHAKE',
  'cb-bob-12': 'SHAKE',
  'cb-bob-13': 'SHAKE',
  'cb-bob-14': 'SHAKE',
  'cb-bob-15': 'SHAKE'
};
for (const [id, category] of Object.entries(drinkCategoryMap)) {
  const item = byId.get(id);
  if (!item) throw new Error(`Drink item not found: ${id}`);
  item.category = category;
  item.parentCategory = category;
}
// Any remaining BOBA DRINK items (none expected) stay visible under Boba Milk Tea.
for (const item of items) {
  if (item.stallId === 'drinks-beverage' && item.category === 'BOBA DRINK') {
    item.category = 'BOBA MILK TEA';
    item.parentCategory = 'BOBA MILK TEA';
  }
}

// ---- integrity checks ----
const ids = new Set();
for (const item of items) {
  if (ids.has(item.id)) throw new Error(`Duplicate item id: ${item.id}`);
  ids.add(item.id);
}
const drinkNames = items.filter(i => i.stallId === 'drinks-beverage').map(i => i.name.toLowerCase());
for (const required of ['cold coffee', 'mint lemonade', 'oreo shake', 'blue lagoon', 'boba pearl chocolate fantasy', 'chocolate pearl shake']) {
  if (!drinkNames.some(n => n.includes(required))) throw new Error(`Required drink missing: ${required}`);
}
const popularCount = items.filter(i => i.isPopular).length;
if (popularCount !== popularNames.length) throw new Error('Popular item count mismatch');
const specialCount = items.filter(i => i.isSpecial).length;
if (specialCount !== specialIds.length) throw new Error('Special item count mismatch');
const specialStalls = new Set(items.filter(i => i.isSpecial).map(i => i.stallId));
for (const stallId of ['burger-bar', 'top-town', 'drinks-beverage', 'momo-buzz', 'waffle-city']) {
  if (!specialStalls.has(stallId)) throw new Error(`No special items for ${stallId}`);
}

const newBlock = JSON.stringify(items, null, 2);
src = src.slice(0, start + prefixLen) + newBlock + src.slice(start + prefixLen + closeIdx + 1);

fs.writeFileSync(file, src, 'utf8');
console.log(`Updated menuData.js — ${items.length} items, ${popularCount} popular, ${specialCount} special, ${items.filter(i => i.stallId === 'drinks-beverage').length} drinks.`);
