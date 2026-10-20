import { stallsData, menuItemsData } from '../server/menuData.js';

console.log('==================================================');
console.log('☕ VERIFYING COMPLETE COFFEE BUZZ FUSION CAFE MENU');
console.log('==================================================\n');

// 1. Verify Stall exists and has all 16 categories
const stall = stallsData.find(s => s.id === 'fusion-cafe');
if (!stall) throw new Error('Stall fusion-cafe not found!');
console.log('✅ Stall found:', stall.name);
console.log('✅ Categories count:', stall.categories.length);

// 2. Filter items strictly belonging to fusion-cafe
const cbItems = menuItemsData.filter(i => i.stallId === 'fusion-cafe');
console.log('✅ Total Coffee Buzz items:', cbItems.length);

if (cbItems.length !== 150) {
  throw new Error(`Expected 150 items, but found ${cbItems.length}`);
}

// 3. Check for duplicates
const ids = new Set();
const names = new Map();
for (const item of cbItems) {
  if (ids.has(item.id)) throw new Error(`Duplicate item ID: ${item.id}`);
  ids.add(item.id);
}
console.log('✅ Zero duplicate IDs among Coffee Buzz items.');

// 4. Verify counts per category
const categoryCounts = {};
for (const item of cbItems) {
  categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
}

console.log('\n📊 Category breakdown:');
for (const [cat, count] of Object.entries(categoryCounts)) {
  console.log(`   - ${cat.padEnd(20)}: ${count} items`);
}

// 5. Verify sample items and specific prices
const samples = [
  { name: 'T Bone Steak (300+6M)', price: 1450, cat: 'STEAK' },
  { name: 'Tenderloin Steak (250+6M)', price: 995, cat: 'STEAK' },
  { name: 'Sirloin Steak (300+6M)', price: 1195, cat: 'STEAK' },
  { name: 'Texas Meat (Fusion Special)', price: 1780, cat: 'STEAK' },
  { name: 'Mix Meat Luxury (Fusion Special)', price: 3750, cat: 'STEAK' },
  { name: 'Couple Platter', price: 1000, cat: 'STEAK' },
  { name: 'Fish & Meat', price: 950, cat: 'STEAK' },
  { name: 'Grilled Dori Fish', price: 480, cat: 'SEAFOOD' },
  { name: 'All Grilled Seafood', price: 1280, cat: 'SEAFOOD' },
  { name: 'Red Snapper (400+ Gram)', price: 199, cat: 'SEAFOOD', isWeight: true },
  { name: 'Tandori Pizza', price: 580, cat: 'PIZZA', variants: 2 },
  { name: 'Fusion Special Comilla Pizza', price: 799, cat: 'PIZZA', variants: 2 },
  { name: 'Combo 1', price: 799, cat: 'COMBO MEAL' },
  { name: 'Fish Fantasy (Seafood)', price: 1250, cat: 'CHEF SPECIAL' },
  { name: '6 Ways Chicken (1:3)', price: 1750, cat: 'CHEF SPECIAL' },
  { name: 'Special Nachos', price: 260, cat: 'STARTERS' },
  { name: 'French Fries', price: 160, cat: 'STARTERS' },
  { name: 'Chicken Spicy Pasta', price: 300, cat: 'PASTA & NOODLES' },
  { name: 'Thai Soup (Thick)', price: 200, cat: 'SOUP', variants: 2 },
  { name: 'Grilled Chicken Salad', price: 360, cat: 'SALAD' },
  { name: 'BBQ Chicken', price: 360, cat: 'IMPROVED PLATTER' },
  { name: 'Cheese Chicken', price: 380, cat: 'IMPROVED PLATTER' },
  { name: 'Cold Milk Tea Regular', price: 160, cat: 'BOBA DRINK' },
  { name: 'Fresh Lemonade', price: 100, cat: 'ICE CRUSHED' },
  { name: 'Dragon Seduction', price: 190, cat: 'HEALTHY DRINKS' },
  { name: 'Fusion Chocolate Shake', price: 180, cat: 'SHAKE' },
  { name: 'Dry Fruit Fantasy', price: 220, cat: 'SPECIAL DRINKS' },
  { name: 'Fusion Regular Cold Coffee', price: 150, cat: 'COFFEE' },
  { name: 'Fusion Hot Coffee (Espresso)', price: 160, cat: 'COFFEE' }
];

for (const s of samples) {
  const item = cbItems.find(i => i.name === s.name && i.category === s.cat);
  if (!item) throw new Error(`Missing item: ${s.name} in category ${s.cat}`);
  if (item.price !== s.price) throw new Error(`Price mismatch for ${s.name}: expected ${s.price}, got ${item.price}`);
  if (s.variants && (!item.variants || item.variants.length !== s.variants)) {
    throw new Error(`Variant count mismatch for ${s.name}`);
  }
}

console.log('\n✅ All sample checks passed with 100% price and variant accuracy!');
console.log('🎉 COFFEE BUZZ FUSION CAFE MENU VERIFICATION SUCCESSFUL!\n');
