import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { menuItemsData } from '../server/menuData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assetRoot = path.join(root, 'public', 'assets');
const menuDir = path.join(assetRoot, 'menu');
const fixDir = path.join(root, 'tmp-candidates', 'fix');

const A = (rel) => path.join(assetRoot, rel);

// Only sources that still need to be rendered. Existing menu thumbnails are reused.
const sources = {
  'soup-thai': A('Top Town/Soup/Asset 72@4x.png'),
  'soup-cream-mushroom': A('Top Town/Soup/Asset 73@4x.png'),
  'soup-hot-sour': A('Top Town/Soup/Asset 74@4x.png'),
  'soup-chicken-noodle': A('Top Town/Soup/Asset 71@4x.png'),

  'drink-strawberry-shake': path.join(fixDir, 'strawberryshake-2.jpg'),
  'drink-mango': path.join(fixDir, 'mango-1.jpg'),
  'drink-papaya': path.join(fixDir, 'papaya-2.jpg'),
  'drink-watermelon': path.join(fixDir, 'watermelon-1.jpg'),
  'drink-dragon': path.join(fixDir, 'dragon-1.jpg'),
  'drink-blue-lagoon': path.join(fixDir, 'bluelagoon-2.jpg'),
  'drink-espresso': path.join(fixDir, 'espresso-2.jpg'),

  'toptown-chowmein-chicken': A('fusion Cafe/Fusion Pasta Noodles/Asset 80@4x.png'),
  'toptown-chowmein-special': A('fusion Cafe/Fusion Pasta Noodles/Asset 82@4x.png'),
  'toptown-combo-1': A('Top Town/Set Menu/Asset 77@4x.png'),
  'toptown-combo-2': A('Top Town/Set Menu/Asset 78@4x.png'),
  'toptown-couple-1': A('Top Town/Set Menu/Asset 79@4x.png'),
  'toptown-couple-2': A('Top Town/Set Menu/Asset 80@4x.png'),
  'toptown-fried-rice': A('Top Town/Fried Rice Sizling/Asset 83@4x.png'),
  'toptown-sizzling': A('Top Town/Fried Rice Sizling/Asset 84@4x.png'),
  'toptown-gravy': A('Top Town/Fried Rice Sizling/Asset 85@4x.png'),
};

// item id -> image key for the 110 items that were still pointing at raw assets
// or at the previous session's less accurate drink photos.
const itemKeys = {
  'cb-piz-1': 'fusion-pizza-tandoori',
  'cb-piz-2': 'fusion-pizza-mexican-hot',
  'cb-piz-3': 'fusion-pizza-barcelona',
  'cb-piz-4': 'fusion-pizza-chick-bbq',
  'cb-piz-5': 'fusion-pizza-sausage-carnival',
  'cb-piz-6': 'fusion-pizza-beef-lovers',
  'cb-piz-7': 'fusion-pizza-margherita',
  'cb-piz-8': 'fusion-pizza-four-season',
  'cb-piz-9': 'fusion-pizza-pepperoni',
  'cb-piz-10': 'fusion-pizza-seafood',
  'cb-piz-11': 'fusion-pizza-special',

  'cb-sop-1': 'soup-thai',
  'cb-sop-2': 'soup-cream-mushroom',
  'cb-sop-3': 'soup-thai',
  'cb-sop-4': 'soup-hot-sour',
  'cb-sop-5': 'soup-thai',
  'cb-sop-6': 'soup-chicken-noodle',

  'cb-bob-4': 'drinks-shake-chocolate',
  'cb-bob-5': 'drinks-shake-chocolate',
  'cb-bob-6': 'drink-strawberry-shake',
  'cb-bob-7': 'drink-mango',
  'cb-bob-9': 'drink-mango',
  'cb-bob-10': 'drinks-shake-chocolate',
  'cb-bob-11': 'drink-strawberry-shake',
  'cb-bob-12': 'drinks-shake-vanilla',
  'cb-bob-13': 'drink-mango',
  'cb-bob-14': 'drinks-shake-vanilla',
  'cb-bob-16': 'drinks-shake-oreo',

  'cb-drk-1': 'drinks-lemonade',
  'cb-drk-2': 'drinks-lemonade',
  'cb-drk-3': 'drinks-lemonade',
  'cb-drk-4': 'drinks-lemon-mint',
  'cb-drk-5': 'drinks-lemon-mint',
  'cb-drk-6': 'drinks-orange-cooler',
  'cb-drk-7': 'drinks-lemonade',
  'cb-drk-8': 'drinks-lemon-mint',

  'cb-hlt-1': 'drink-dragon',
  'cb-hlt-2': 'drinks-lemonade',
  'cb-hlt-3': 'drinks-orange-cooler',
  'cb-hlt-4': 'drink-watermelon',
  'cb-hlt-5': 'drinks-orange-cooler',
  'cb-hlt-6': 'drink-papaya',

  'cb-shk-1': 'drinks-shake-chocolate',
  'cb-shk-2': 'drink-strawberry-shake',
  'cb-shk-3': 'drinks-shake-vanilla',
  'cb-shk-4': 'drink-mango',
  'cb-shk-5': 'drinks-shake-vanilla',
  'cb-shk-6': 'drink-papaya',
  'cb-shk-8': 'drinks-shake-oreo',

  'cb-spc-1': 'drinks-shake-vanilla',
  'cb-spc-2': 'drink-blue-lagoon',
  'cb-spc-3': 'drinks-mojito',
  'cb-spc-4': 'drinks-lemon-mint',

  'cb-cff-1': 'drinks-cold-coffee',
  'cb-cff-2': 'drinks-cold-coffee',
  'cb-cff-3': 'drinks-cold-coffee',
  'cb-cff-4': 'drinks-special-coffee',
  'cb-cff-5': 'drinks-special-coffee',
  'cb-cff-6': 'drink-espresso',

  'tt-chw-1': 'toptown-chowmein-chicken',
  'tt-chw-2': 'toptown-chowmein-special',
  'tt-cmb-1': 'toptown-combo-1',
  'tt-cmb-2': 'toptown-combo-2',
  'tt-snk-1': 'toptown-chola-bhatora',
  'tt-snk-2': 'toptown-chola-bhatora',
  'tt-dos-1': 'toptown-dosa',
  'tt-dos-2': 'toptown-dosa',
  'tt-dos-3': 'toptown-dosa',
  'tt-dos-4': 'toptown-dosa',
  'tt-dos-5': 'toptown-dosa',
  'tt-dos-6': 'toptown-dosa',
  'tt-cht-1': 'momo-fuchka',
  'tt-cht-2': 'momo-doi-fuchka',
  'tt-cht-3': 'momo-fuchka-special',
  'tt-cht-4': 'momo-fuchka-special',
  'tt-nan-1': 'live-naan',
  'tt-nan-2': 'live-naan',
  'tt-nan-3': 'live-naan',
  'tt-drk-1': 'drinks-lassi',
  'tt-drk-2': 'drinks-lassi',
  'tt-drk-3': 'drinks-lemonade',
  'tt-cpl-1': 'toptown-couple-1',
  'tt-cpl-2': 'toptown-couple-2',
  'tt-frc-1': 'toptown-fried-rice',
  'tt-frc-2': 'toptown-fried-rice',
  'tt-frc-3': 'toptown-fried-rice',
  'tt-frc-4': 'toptown-fried-rice',
  'tt-frc-5': 'toptown-fried-rice',
  'tt-siz-1': 'toptown-sizzling',
  'tt-siz-2': 'toptown-sizzling',
  'tt-siz-3': 'toptown-sizzling',
  'tt-siz-4': 'toptown-sizzling',
  'tt-siz-5': 'toptown-sizzling',
  'tt-siz-6': 'toptown-sizzling',
  'tt-siz-7': 'fusion-seafood-red-snapper',
  'tt-siz-8': 'fusion-seafood-red-snapper',
  'tt-grv-1': 'toptown-gravy',
  'tt-grv-2': 'toptown-gravy',
  'tt-grv-3': 'toptown-gravy',
  'tt-grv-4': 'toptown-gravy',
  'tt-grv-5': 'toptown-gravy',
  'tt-grv-6': 'toptown-gravy',
  'tt-grv-7': 'toptown-gravy',

  'ls-plt-1': 'live-mixed-grill',
  'ls-plt-2': 'live-mixed-grill',
  'ls-plt-3': 'live-mixed-grill',
  'ls-plt-4': 'live-mixed-grill',
  'ls-plt-5': 'live-steak-board',
  'ls-plt-6': 'live-steak-board',
};

const allIds = new Set(menuItemsData.map(i => i.id));
for (const id of Object.keys(itemKeys)) {
  if (!allIds.has(id)) throw new Error(`Unknown menu item id: ${id}`);
}

// Split keys into ones that need rendering (new source) and ones that already exist.
const needed = [];
const missingExisting = [];
for (const key of new Set(Object.values(itemKeys))) {
  if (sources[key]) {
    if (!fs.existsSync(sources[key])) throw new Error(`Missing source for ${key}: ${sources[key]}`);
    needed.push({ key, source: sources[key] });
  } else {
    const existing = path.join(menuDir, `${key}.jpg`);
    if (!fs.existsSync(existing)) missingExisting.push(key);
  }
}
if (missingExisting.length) {
  throw new Error(`Keys with no source and no existing thumbnail: ${missingExisting.join(', ')}`);
}

const itemPaths = Object.fromEntries(
  Object.entries(itemKeys).map(([id, key]) => [id, `/assets/menu/${key}.jpg`])
);

fs.writeFileSync(
  path.join(root, 'tmp-extra-manifest.json'),
  JSON.stringify({ manifest: needed, itemPaths }, null, 2)
);

console.log(`Extra map: ${Object.keys(itemPaths).length} items, ${needed.length} new thumbnails to render.`);
