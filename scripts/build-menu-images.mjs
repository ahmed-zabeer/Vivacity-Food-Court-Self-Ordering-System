import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { menuItemsData } from '../server/menuData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assetRoot = path.join(root, 'public', 'assets');
const tmpSources = path.join(root, 'tmp-menu-sources');
const menuOut = path.join(root, 'public', 'assets', 'menu');

fs.mkdirSync(tmpSources, { recursive: true });
fs.mkdirSync(menuOut, { recursive: true });

const A = (rel) => path.join(assetRoot, rel);

// Reusable image sources. Each key becomes /assets/menu/<key>.jpg
const sources = {
  // ---------------- Coffee Buzz Fusion Cafe ----------------
  'fusion-steak-tbone': { type: 'asset', source: A('fusion Cafe/Steaks/Asset 31@4x.png') },
  'fusion-steak-tenderloin': { type: 'asset', source: A('fusion Cafe/Steaks/Asset 32@4x.png') },
  'fusion-steak-sirloin': { type: 'asset', source: A('fusion Cafe/Steaks/Asset 33@4x.png') },
  'fusion-steak-texas-meat': { type: 'asset', source: A('fusion Cafe/Steaks/Asset 30@4x.png') },
  'fusion-steak-texas-prime': { type: 'asset', source: A('fusion Cafe/Steaks/Asset 28@4x.png') },
  'fusion-steak-mix-meat': { type: 'asset', source: A('fusion Cafe/Steaks/Asset 29@4x.png') },

  'fusion-combo-1': { type: 'asset', source: A('fusion Cafe/Combo/Asset 34@4x.png') },
  'fusion-combo-2': { type: 'asset', source: A('fusion Cafe/Combo/Asset 35@4x.png') },
  'fusion-combo-3': { type: 'asset', source: A('fusion Cafe/Combo/Asset 36@4x.png') },
  'fusion-combo-4': { type: 'asset', source: A('fusion Cafe/Combo/Asset 37@4x.png') },
  'fusion-combo-5': { type: 'asset', source: A('fusion Cafe/Combo/Asset 38@4x.png') },
  'fusion-combo-6': { type: 'asset', source: A('fusion Cafe/Combo/Asset 39@4x.png') },

  'fusion-platter-couple': { type: 'asset', source: A('fusion Cafe/Premium Mix Platter/Asset 40@4x.png') },
  'fusion-platter-fish-meat': { type: 'asset', source: A('fusion Cafe/Premium Mix Platter/Asset 41@4x.png') },
  'fusion-platter-chicken-carnival': { type: 'asset', source: A('fusion Cafe/Premium Mix Platter/Asset 42@4x.png') },

  'fusion-seafood-grilled-dori': { type: 'asset', source: A('fusion Cafe/Seafood Platter and Premium/Asset 24@4x.png') },
  'fusion-seafood-cream-dori': { type: 'asset', source: A('fusion Cafe/Seafood Platter and Premium/Asset 25@4x.png') },
  'fusion-seafood-lobster': { type: 'asset', source: A('fusion Cafe/Seafood Platter and Premium/Asset 22@4x.png') },
  'fusion-seafood-crab': { type: 'asset', source: A('fusion Cafe/Seafood Platter and Premium/Asset 26@4x.png') },
  'fusion-seafood-rupchada': { type: 'asset', source: A('fusion Cafe/Seafood Platter and Premium/Asset 23@4x.png') },
  'fusion-seafood-red-snapper': { type: 'asset', source: A('fusion Cafe/Seafood Platter and Premium/Asset 27@4x.png') },
  'fusion-seafood-fish-fillet': { type: 'asset', source: A('fusion Cafe/Seafood Platter and Premium/Asset 20@4x.png') },
  'fusion-seafood-fish-chips': { type: 'asset', source: A('fusion Cafe/Seafood Platter and Premium/Asset 21@4x.png') },
  'fusion-seafood-all-fried': { type: 'asset', source: A('fusion Cafe/Seafood Platter and Premium/Asset 17@4x.png') },
  'fusion-seafood-all-grilled': { type: 'asset', source: A('fusion Cafe/Seafood Platter and Premium/Asset 18@4x.png') },
  'fusion-seafood-fried-grilled-mix': { type: 'asset', source: A('fusion Cafe/Seafood Platter and Premium/Asset 19@4x.png') },
  'fusion-seafood-surf-turf': { type: 'asset', source: A('fusion Cafe/Seafood Platter and Premium/Asset 16@4x.png') },

  'fusion-chef-fish-fantasy': { type: 'asset', source: A('fusion Cafe/Chef Special/Asset 43@4x.png') },
  'fusion-chef-grilled-lovers': { type: 'asset', source: A('fusion Cafe/Chef Special/Asset 44@4x.png') },
  'fusion-chef-steak-lovers': { type: 'asset', source: A('fusion Cafe/Chef Special/Asset 45@4x.png') },
  'fusion-chef-fried-lovers': { type: 'asset', source: A('fusion Cafe/Chef Special/Asset 46@4x.png') },
  'fusion-chef-4-ways-chicken': { type: 'asset', source: A('fusion Cafe/Chef Special/Asset 47@4x.png') },
  'fusion-chef-6-ways-chicken': { type: 'asset', source: A('fusion Cafe/Chef Special/Asset 48@4x.png') },

  'fusion-starter-nachos': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 31@4x.png') },
  'fusion-starter-naga-nachos': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 31@4x.png') },
  'fusion-starter-tacos-2': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 23@4x.png') },
  'fusion-starter-tacos-3': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 30@4x.png') },
  'fusion-starter-wings': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 19@4x.png') },
  'fusion-starter-fish-chips': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 29@4x.png') },
  'fusion-starter-fried-calamari': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 27@4x.png') },
  'fusion-starter-grilled-calamari': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 26@4x.png') },
  'fusion-starter-fries': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 25@4x.png') },
  'fusion-starter-prawn-tempura': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 28@4x.png') },
  'fusion-starter-cheese-balls': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 22@4x.png') },
  'fusion-starter-wonton': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 24@4x.png') },
  'fusion-starter-toast': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 32@4x.png') },
  'fusion-starter-wedges-chicken': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 18@4x.png') },
  'fusion-starter-thai-fried-chicken': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 20@4x.png') },
  'fusion-starter-nuggets': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 21@4x.png') },
  'fusion-starter-garlic-mushroom': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 17@4x.png') },
  'fusion-starter-fish-finger': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 16@4x.png') },
  'fusion-starter-naga-drumsticks': { type: 'asset', source: A('fusion Cafe/Fusion Starters/Asset 33@4x.png') },

  'fusion-pasta-chicken-spicy': { type: 'asset', source: A('fusion Cafe/Fusion Pasta Noodles/Asset 75@4x.png') },
  'fusion-pasta-sweet-cream-pan': { type: 'asset', source: A('fusion Cafe/Fusion Pasta Noodles/Asset 76@4x.png') },
  'fusion-pasta-oven-red': { type: 'asset', source: A('fusion Cafe/Fusion Pasta Noodles/Asset 77@4x.png') },
  'fusion-pasta-oven-hot-spicy': { type: 'asset', source: A('fusion Cafe/Fusion Pasta Noodles/Asset 78@4x.png') },
  'fusion-pasta-seafood-hakka': { type: 'asset', source: A('fusion Cafe/Fusion Pasta Noodles/Asset 79@4x.png') },
  'fusion-pasta-prawn-chowmein': { type: 'asset', source: A('fusion Cafe/Fusion Pasta Noodles/Asset 80@4x.png') },
  'fusion-pasta-seafood': { type: 'asset', source: A('fusion Cafe/Fusion Pasta Noodles/Asset 81@4x.png') },
  'fusion-pasta-mixed-chowmein': { type: 'asset', source: A('fusion Cafe/Fusion Pasta Noodles/Asset 82@4x.png') },
  'fusion-pasta-sweet-cream-oven': { type: 'asset', source: A('fusion Cafe/Fusion Pasta Noodles/Asset 83@4x.png') },

  'fusion-salad-grilled-chicken': { type: 'asset', source: A('fusion Cafe/Fusion Salad/Asset 90@4x.png') },
  'fusion-salad-seafood': { type: 'asset', source: A('fusion Cafe/Fusion Salad/Asset 91@4x.png') },
  'fusion-salad-cashew': { type: 'asset', source: A('fusion Cafe/Fusion Salad/Asset 92@4x.png') },
  'fusion-salad-peanut-corn': { type: 'asset', source: A('fusion Cafe/Fusion Salad/Asset 94@4x.png') },

  'fusion-improved-bbq-chicken': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 1@4x.png') },
  'fusion-improved-mexican-chicken': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 2@4x.png') },
  'fusion-improved-peri-peri': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 3@4x.png') },
  'fusion-improved-tandoori': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 4@4x.png') },
  'fusion-improved-masala': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 5@4x.png') },
  'fusion-improved-garlic': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 6@4x.png') },
  'fusion-improved-thousands': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 7@4x.png') },
  'fusion-improved-chicken-steak': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 8@4x.png') },
  'fusion-improved-king-prawn': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 9@4x.png') },
  'fusion-improved-kids-meal': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 10@4x.png') },
  'fusion-improved-smart-meal': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 11@4x.png') },
  'fusion-improved-roasted-garlic': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 12@4x.png') },
  'fusion-improved-mongolian-beef': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 13@4x.png') },
  'fusion-improved-beef-oyster': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 14@4x.png') },
  'fusion-improved-cheese-chicken': { type: 'asset', source: A('fusion Cafe/Fusion Platter Improved/Asset 15@4x.png') },

  'boba-milk-tea': { type: 'url', source: 'https://images.unsplash.com/photo-1525803377221-4f6ccdaa5133?w=800&q=80' },

  // ---------------- Top Town ----------------
  'toptown-appetizer-thai-fried-chicken': { type: 'asset', source: A('Top Town/Apatizer/Asset 57@4x.png') },
  'toptown-appetizer-basket-fries': { type: 'asset', source: A('Top Town/Apatizer/Asset 58@4x.png') },
  'toptown-appetizer-wonton': { type: 'asset', source: A('Top Town/Apatizer/Asset 70@4x.png') },
  'toptown-appetizer-fries': { type: 'asset', source: A('Top Town/Apatizer/Asset 59@4x.png') },
  'toptown-appetizer-garlic-mushroom': { type: 'asset', source: A('Top Town/Apatizer/Asset 60@4x.png') },
  'toptown-appetizer-masala-wedges': { type: 'asset', source: A('Top Town/Apatizer/Asset 61@4x.png') },
  'toptown-appetizer-bbq-drumsticks': { type: 'asset', source: A('Top Town/Apatizer/Asset 62@4x.png') },
  'toptown-appetizer-naga-wings': { type: 'asset', source: A('Top Town/Apatizer/Asset 69@4x.png') },
  'toptown-appetizer-prawn-fry': { type: 'asset', source: A('Top Town/Apatizer/Asset 63@4x.png') },
  'toptown-appetizer-lollipop': { type: 'asset', source: A('Top Town/Apatizer/Asset 64@4x.png') },
  'toptown-appetizer-fish-finger': { type: 'asset', source: A('Top Town/Apatizer/Asset 67@4x.png') },
  'toptown-appetizer-naga-drums': { type: 'asset', source: A('Top Town/Apatizer/Asset 66@4x.png') },
  'toptown-appetizer-crispy-fried-chicken': { type: 'asset', source: A('Top Town/Apatizer/Asset 68@4x.png') },
  'toptown-appetizer-chicken-popos': { type: 'asset', source: A('Top Town/Apatizer/Asset 65@4x.png') },

  'toptown-soup-chicken-corn': { type: 'asset', source: A('Top Town/Soup/Asset 71@4x.png') },
  'toptown-soup-thai': { type: 'asset', source: A('Top Town/Soup/Asset 72@4x.png') },
  'toptown-soup-cream-mushroom': { type: 'asset', source: A('Top Town/Soup/Asset 73@4x.png') },
  'toptown-soup-hot-sour': { type: 'asset', source: A('Top Town/Soup/Asset 74@4x.png') },

  'toptown-set-menu-1': { type: 'asset', source: A('Top Town/Set Menu/Asset 75@4x.png') },
  'toptown-set-menu-2': { type: 'asset', source: A('Top Town/Set Menu/Asset 76@4x.png') },
  'toptown-set-menu-3': { type: 'asset', source: A('Top Town/Set Menu/Asset 77@4x.png') },
  'toptown-set-menu-4': { type: 'asset', source: A('Top Town/Set Menu/Asset 78@4x.png') },
  'toptown-set-menu-5': { type: 'asset', source: A('Top Town/Set Menu/Asset 79@4x.png') },
  'toptown-set-menu-6': { type: 'asset', source: A('Top Town/Set Menu/Asset 80@4x.png') },
  'toptown-set-menu-7': { type: 'asset', source: A('Top Town/Set Menu/Asset 81@4x.png') },

  'toptown-rice-bowl': { type: 'asset', source: A('Top Town/Rice Bowl/Asset 82@4x.png') },

  'toptown-biryani': { type: 'url', source: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&q=80' },
  'toptown-chicken-roll': { type: 'asset', source: A('Barger Bar/Asset 52@4x.png') },
  'toptown-luchi': { type: 'url', source: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&q=80' },

  // ---------------- Momo Buzz ----------------
  'momo-assorted': { type: 'url', source: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&q=80' },
  'momo-steamed-basket': { type: 'url', source: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80' },
  'momo-bowl': { type: 'url', source: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&q=80' },
  'momo-plate': { type: 'url', source: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&q=80' },
  'momo-fuchka': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'panipuri-1.jpg') },
  'momo-fuchka-special': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'panipuri-3.jpg') },
  'momo-chotpoti': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'chotpoti-2.jpg') },

  // ---------------- Waffle City ----------------
  'waffle-plain': { type: 'url', source: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=80' },
  'waffle-strawberry': { type: 'url', source: 'https://images.unsplash.com/photo-1568051243851-f9b136146e97?w=800&q=80' },
  'waffle-chocolate': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'chocwaffle-1.jpg') },
  'waffle-chocolate-loaded': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'chocwaffle-3.jpg') },
  'waffle-banana': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'oreowaffle-1.jpg') },
  'waffle-dark': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'oreowaffle-2.jpg') },
  'waffle-icecream': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'oreowaffle-3.jpg') },
  'addon-ice-cream': { type: 'url', source: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800&q=80' },
  'addon-whipped-cream': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'cream-3.jpg') },
  'addon-choc-chips': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'chocchips-3.jpg') },
  'addon-nuts': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'nuts-3.jpg') },
  'addon-cream-cheese': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'creamcheese-3.jpg') },
  'addon-nutella': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'nutella-2.jpg') },
  'milkshake': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'milkshake-4.jpg') },
  'live-luchi': { type: 'asset', source: path.join(root, 'tmp-candidates', 'wiki', 'luchi-1.jpg') },

  // ---------------- Live Station ----------------
  'live-mixed-grill': { type: 'url', source: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80' },
  'live-ribs': { type: 'url', source: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80' },
  'live-kebab-skewers': { type: 'url', source: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800&q=80' },
  'live-steak-board': { type: 'url', source: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80' },
  'live-steak-fries': { type: 'url', source: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80' },
  'live-grilled-chicken': { type: 'url', source: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&q=80' },
  'live-grilled-chicken-veg': { type: 'url', source: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&q=80' },
  'live-fried-chicken': { type: 'url', source: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80' },
  'live-wings': { type: 'url', source: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&q=80' },
  'live-naan': { type: 'url', source: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&q=80' },

  // ---------------- Burger Bar ----------------
  'burger-bar-burger-double': { type: 'asset', source: A('Barger Bar/Asset 49@4x.png') },
  'burger-bar-sub': { type: 'asset', source: A('Barger Bar/Asset 50@4x.png') },
  'burger-bar-fries': { type: 'asset', source: A('Barger Bar/Asset 51@4x.png') },
  'burger-bar-wrap': { type: 'asset', source: A('Barger Bar/Asset 52@4x.png') },
  'burger-bar-crispy-chicken': { type: 'asset', source: A('Barger Bar/Asset 53@4x.png') },
  'burger-bar-meat-box': { type: 'asset', source: A('Barger Bar/Asset 54@4x.png') },
  'burger-bar-club-sandwich': { type: 'asset', source: A('Barger Bar/Asset 55@4x.png') },
  'burger-bar-burger-single': { type: 'asset', source: A('Barger Bar/Asset 56@4x.png') },
};

// Exact item -> image key assignments.
const itemKeys = {
  // Fusion Cafe - steak
  'cb-stk-1': 'fusion-steak-tbone',
  'cb-stk-2': 'fusion-steak-tenderloin',
  'cb-stk-3': 'fusion-steak-sirloin',
  'cb-stk-4': 'fusion-steak-texas-meat',
  'cb-stk-5': 'fusion-steak-texas-prime',
  'cb-stk-6': 'fusion-steak-mix-meat',
  'cb-stk-c1': 'fusion-combo-1',
  'cb-stk-c2': 'fusion-combo-2',
  'cb-stk-c3': 'fusion-combo-3',
  'cb-stk-c4': 'fusion-combo-4',
  'cb-stk-c5': 'fusion-combo-5',
  'cb-stk-c6': 'fusion-combo-6',
  'cb-platter-couple': 'fusion-platter-couple',
  'cb-platter-fm': 'fusion-platter-fish-meat',
  'cb-platter-cc': 'fusion-platter-chicken-carnival',

  // Fusion Cafe - seafood
  'cb-sea-1': 'fusion-seafood-grilled-dori',
  'cb-sea-2': 'fusion-seafood-cream-dori',
  'cb-sea-3': 'fusion-seafood-lobster',
  'cb-sea-4': 'fusion-seafood-crab',
  'cb-sea-5': 'fusion-seafood-rupchada',
  'cb-sea-6': 'fusion-seafood-red-snapper',
  'cb-sea-7': 'fusion-seafood-fish-fillet',
  'cb-sea-8': 'fusion-seafood-fish-chips',
  'cb-sea-9': 'fusion-seafood-all-fried',
  'cb-sea-10': 'fusion-seafood-all-grilled',
  'cb-sea-11': 'fusion-seafood-fried-grilled-mix',
  'cb-sea-12': 'fusion-seafood-surf-turf',

  // Fusion Cafe - combo meals
  'cb-cmb-1': 'fusion-combo-1',
  'cb-cmb-2': 'fusion-combo-2',
  'cb-cmb-3': 'fusion-combo-3',
  'cb-cmb-4': 'fusion-combo-4',

  // Fusion Cafe - chef special
  'cb-chef-1': 'fusion-chef-fish-fantasy',
  'cb-chef-2': 'fusion-chef-grilled-lovers',
  'cb-chef-3': 'fusion-chef-steak-lovers',
  'cb-chef-4': 'fusion-chef-fried-lovers',
  'cb-chef-5': 'fusion-chef-4-ways-chicken',
  'cb-chef-6': 'fusion-chef-6-ways-chicken',

  // Fusion Cafe - starters
  'cb-reg-st-1': 'fusion-starter-nachos',
  'cb-reg-st-2': 'fusion-starter-naga-nachos',
  'cb-reg-st-3': 'fusion-starter-tacos-2',
  'cb-reg-st-4': 'fusion-starter-tacos-3',
  'cb-reg-st-5': 'fusion-starter-wings',
  'cb-reg-st-6': 'fusion-starter-fish-chips',
  'cb-reg-st-7': 'fusion-starter-fried-calamari',
  'cb-reg-st-8': 'fusion-starter-grilled-calamari',
  'cb-reg-st-9': 'fusion-starter-fries',
  'cb-reg-st-10': 'fusion-starter-prawn-tempura',
  'cb-reg-st-11': 'fusion-starter-cheese-balls',
  'cb-reg-st-12': 'fusion-starter-wonton',
  'cb-reg-st-13': 'fusion-starter-toast',
  'cb-reg-st-14': 'fusion-starter-wedges-chicken',
  'cb-reg-st-15': 'fusion-starter-thai-fried-chicken',
  'cb-reg-st-16': 'fusion-starter-nuggets',
  'cb-reg-st-17': 'fusion-starter-garlic-mushroom',
  'cb-reg-st-18': 'fusion-starter-fish-finger',
  'cb-reg-st-19': 'fusion-starter-naga-drumsticks',

  // Fusion Cafe - pasta
  'cb-pas-1': 'fusion-pasta-chicken-spicy',
  'cb-pas-2': 'fusion-pasta-sweet-cream-pan',
  'cb-pas-3': 'fusion-pasta-oven-red',
  'cb-pas-4': 'fusion-pasta-oven-hot-spicy',
  'cb-pas-5': 'fusion-pasta-seafood-hakka',
  'cb-pas-6': 'fusion-pasta-prawn-chowmein',
  'cb-pas-7': 'fusion-pasta-seafood',
  'cb-pas-8': 'fusion-pasta-mixed-chowmein',
  'cb-pas-9': 'fusion-pasta-sweet-cream-oven',

  // Fusion Cafe - salad
  'cb-sal-1': 'fusion-salad-grilled-chicken',
  'cb-sal-2': 'fusion-salad-seafood',
  'cb-sal-3': 'fusion-salad-cashew',
  'cb-sal-4': 'fusion-salad-peanut-corn',

  // Fusion Cafe - improved platter
  'cb-imp-1': 'fusion-improved-bbq-chicken',
  'cb-imp-2': 'fusion-improved-mexican-chicken',
  'cb-imp-3': 'fusion-improved-peri-peri',
  'cb-imp-4': 'fusion-improved-tandoori',
  'cb-imp-5': 'fusion-improved-masala',
  'cb-imp-6': 'fusion-improved-garlic',
  'cb-imp-7': 'fusion-improved-thousands',
  'cb-imp-8': 'fusion-improved-chicken-steak',
  'cb-imp-9': 'fusion-improved-king-prawn',
  'cb-imp-10': 'fusion-improved-kids-meal',
  'cb-imp-11': 'fusion-improved-smart-meal',
  'cb-imp-12': 'fusion-improved-roasted-garlic',
  'cb-imp-13': 'fusion-improved-mongolian-beef',
  'cb-imp-14': 'fusion-improved-beef-oyster',
  'cb-imp-15': 'fusion-improved-cheese-chicken',

  // Fusion Cafe - broken boba images
  'cb-bob-1': 'boba-milk-tea',
  'cb-bob-2': 'boba-milk-tea',
  'cb-bob-3': 'boba-milk-tea',
  'cb-bob-8': 'boba-milk-tea',
  'cb-bob-15': 'boba-milk-tea',
  'cb-bob-17': 'boba-milk-tea',

  // Top Town - appetizer
  'tt-app-1': 'toptown-appetizer-thai-fried-chicken',
  'tt-app-2': 'toptown-appetizer-basket-fries',
  'tt-app-3': 'toptown-appetizer-wonton',
  'tt-app-4': 'toptown-appetizer-fries',
  'tt-app-5': 'toptown-appetizer-garlic-mushroom',
  'tt-app-6': 'toptown-appetizer-masala-wedges',
  'tt-app-7': 'toptown-appetizer-bbq-drumsticks',
  'tt-app-8': 'toptown-appetizer-naga-wings',
  'tt-app-9': 'toptown-appetizer-prawn-fry',
  'tt-app-10': 'toptown-appetizer-lollipop',
  'tt-app-11': 'toptown-appetizer-fish-finger',
  'tt-app-12': 'toptown-appetizer-naga-drums',
  'tt-app-13': 'toptown-appetizer-crispy-fried-chicken',
  'tt-app-14': 'toptown-appetizer-chicken-popos',

  // Top Town - soup
  'tt-sop-1': 'toptown-soup-chicken-corn',
  'tt-sop-2': 'toptown-soup-thai',
  'tt-sop-3': 'toptown-soup-cream-mushroom',
  'tt-sop-4': 'toptown-soup-hot-sour',

  // Top Town - set menu
  'tt-set-1': 'toptown-set-menu-1',
  'tt-set-2': 'toptown-set-menu-2',
  'tt-set-3': 'toptown-set-menu-3',
  'tt-set-4': 'toptown-set-menu-4',
  'tt-set-5': 'toptown-set-menu-5',
  'tt-set-6': 'toptown-set-menu-6',
  'tt-set-7': 'toptown-set-menu-7',

  // Top Town - rice bowl, biryani, snacks
  'tt-rb-1': 'toptown-rice-bowl',
  'tt-rb-2': 'toptown-rice-bowl',
  'tt-rb-3': 'toptown-rice-bowl',
  'tt-rb-4': 'toptown-rice-bowl',
  'tt-rb-5': 'toptown-rice-bowl',
  'tt-bir-1': 'toptown-biryani',
  'tt-bir-2': 'toptown-biryani',
  'tt-snk-3': 'toptown-chicken-roll',
  'tt-snk-4': 'toptown-luchi',

  // Momo Buzz
  'mb-mom-1': 'momo-steamed-basket',
  'mb-mom-2': 'momo-plate',
  'mb-mom-3': 'momo-bowl',
  'mb-mom-4': 'momo-assorted',
  'mb-mom-5': 'momo-bowl',
  'mb-mom-6': 'momo-plate',
  'mb-mom-7': 'momo-assorted',
  'mb-mom-8': 'momo-bowl',
  'mb-mom-9': 'momo-plate',
  'mb-mcl-1': 'momo-bowl',
  'mb-mcl-2': 'momo-bowl',
  'mb-mcl-3': 'momo-bowl',
  'mb-mcl-4': 'momo-bowl',
  'mb-cmb-1': 'momo-assorted',
  'mb-oth-2': 'momo-bowl',
  'mb-fuc-1': 'momo-fuchka',
  'mb-fuc-2': 'momo-fuchka',
  'mb-fuc-3': 'momo-fuchka',
  'mb-fuc-4': 'momo-fuchka',
  'mb-fuc-5': 'momo-chotpoti',
  'mb-fuc-6': 'momo-chotpoti',
  'mb-fuc-7': 'momo-fuchka-special',

  // Waffle City
  'wc-waf-1': 'waffle-chocolate-loaded',
  'wc-waf-2': 'waffle-banana',
  'wc-waf-3': 'waffle-dark',
  'wc-waf-4': 'waffle-chocolate-loaded',
  'wc-waf-5': 'waffle-chocolate-loaded',
  'wc-waf-6': 'waffle-chocolate-loaded',
  'wc-waf-7': 'waffle-strawberry',
  'wc-waf-8': 'waffle-strawberry',
  'wc-waf-9': 'waffle-strawberry',
  'wc-waf-10': 'waffle-icecream',
  'wc-waf-11': 'waffle-chocolate',
  'wc-waf-12': 'waffle-dark',
  'wc-waf-13': 'waffle-icecream',
  'wc-ado-1': 'addon-ice-cream',
  'wc-ado-2': 'addon-whipped-cream',
  'wc-ado-3': 'addon-choc-chips',
  'wc-ado-4': 'addon-nuts',
  'wc-ado-5': 'addon-cream-cheese',
  'wc-ado-6': 'addon-nutella',

  // Live Station
  'ls-bbq-1': 'live-kebab-skewers',
  'ls-bbq-2': 'live-grilled-chicken',
  'ls-bbq-3': 'live-grilled-chicken-veg',
  'ls-bbq-4': 'live-grilled-chicken-veg',
  'ls-bbq-5': 'live-kebab-skewers',
  'ls-bbq-6': 'live-kebab-skewers',
  'ls-bbq-7': 'live-kebab-skewers',
  'ls-bbq-8': 'live-kebab-skewers',
  'ls-bbq-9': 'live-kebab-skewers',
  'ls-bbq-10': 'live-kebab-skewers',
  'ls-bbq-11': 'live-kebab-skewers',
  'ls-bbq-12': 'live-wings',
  'ls-bbq-13': 'live-wings',
  'ls-bbq-14': 'live-grilled-chicken',
  'ls-bbq-15': 'live-kebab-skewers',
  'ls-bbq-16': 'live-ribs',
  'ls-bbq-17': 'fusion-seafood-red-snapper',
  'ls-bbq-18': 'live-luchi',

  // Burger Bar
  'bb-bgr-1': 'burger-bar-burger-single',
  'bb-bgr-2': 'burger-bar-burger-double',
  'bb-bgr-3': 'burger-bar-burger-single',
  'bb-bgr-4': 'burger-bar-burger-double',
  'bb-bgr-5': 'burger-bar-burger-single',
  'bb-sdw-1': 'burger-bar-sub',
  'bb-sdw-2': 'burger-bar-sub',
  'bb-sdw-3': 'burger-bar-club-sandwich',
  'bb-sdw-4': 'burger-bar-club-sandwich',
  'bb-mbx-1': 'burger-bar-meat-box',
  'bb-mbx-2': 'burger-bar-meat-box',
  'bb-mbx-3': 'burger-bar-meat-box',
  'bb-chk-1': 'burger-bar-crispy-chicken',
  'bb-chk-2': 'burger-bar-crispy-chicken',
  'bb-chk-3': 'burger-bar-crispy-chicken',
  'bb-chk-4': 'burger-bar-crispy-chicken',
  'bb-chk-5': 'burger-bar-crispy-chicken',
  'bb-chk-6': 'burger-bar-crispy-chicken',
  'bb-chk-7': 'burger-bar-crispy-chicken',
  'bb-wrp-1': 'burger-bar-wrap',
  'bb-wrp-2': 'burger-bar-wrap',
  'bb-wrp-3': 'burger-bar-wrap',
  'bb-wrp-4': 'burger-bar-wrap',
  'bb-ff-1': 'burger-bar-fries',
  'bb-ff-2': 'burger-bar-fries',
  'bb-ff-3': 'burger-bar-fries',
  'bb-ado-1': 'burger-bar-burger-single',
  'bb-ado-2': 'burger-bar-burger-double',
  'bb-ado-3': 'burger-bar-burger-single',
  'bb-ado-4': 'burger-bar-fries',
  'bb-ado-5': 'burger-bar-club-sandwich',
  'bb-ado-6': 'burger-bar-fries',
  'bb-ado-7': 'burger-bar-fries',
  'bb-cmb-1': 'burger-bar-burger-double',
  'bb-cmb-2': 'burger-bar-burger-double',
  'bb-cmb-3': 'burger-bar-crispy-chicken',
  'bb-cmb-4': 'burger-bar-crispy-chicken',
  'bb-cmb-5': 'burger-bar-crispy-chicken',
  'bb-cmb-6': 'burger-bar-crispy-chicken',
};

const allIds = new Set(menuItemsData.map(i => i.id));
for (const id of Object.keys(itemKeys)) {
  if (!allIds.has(id)) {
    throw new Error(`Unknown menu item id in itemKeys: ${id}`);
  }
}
for (const key of Object.values(itemKeys)) {
  if (!sources[key]) {
    throw new Error(`Missing source definition for key: ${key}`);
  }
}

const usedKeys = [...new Set(Object.values(itemKeys))];
const manifest = [];
for (const key of usedKeys) {
  const def = sources[key];
  let source = def.source;
  if (def.type === 'url') {
    const url = def.source;
    const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 12);
    const ext = '.jpg';
    const downloadPath = path.join(tmpSources, `${key}-${hash}${ext}`);
    if (!fs.existsSync(downloadPath)) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(downloadPath, buf);
    }
    source = downloadPath;
  } else {
    if (!fs.existsSync(source)) throw new Error(`Missing local image: ${source}`);
  }
  manifest.push({ key, source });
}

fs.writeFileSync(
  path.join(root, 'tmp-menu-manifest.json'),
  JSON.stringify({ manifest, itemKeys, itemPaths: Object.fromEntries(Object.entries(itemKeys).map(([id, key]) => [id, `/assets/menu/${key}.jpg`])) }, null, 2)
);

console.log(`Prepared ${manifest.length} unique images for ${Object.keys(itemKeys).length} menu items.`);

// Report any items that still have no image after applying the map.
const missing = menuItemsData.filter(i => !itemKeys[i.id] && !i.image);
if (missing.length) {
  console.error('Items still missing an image:');
  for (const m of missing) console.error(` - ${m.id} :: ${m.name}`);
  process.exitCode = 1;
}
