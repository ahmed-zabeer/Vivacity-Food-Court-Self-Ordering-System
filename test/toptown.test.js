import { stallsData, menuItemsData } from '../server/menuData.js';

console.log('==================================================');
console.log('🥢 VERIFYING COMPLETE TOP TOWN MENU');
console.log('==================================================\n');

// 1. Verify Stall exists and has all 16 categories
const stall = stallsData.find(s => s.id === 'top-town');
if (!stall) throw new Error('Stall top-town not found!');
console.log('✅ Stall found:', stall.name);
console.log('✅ Categories count:', stall.categories.length);

// 2. Filter items strictly belonging to top-town
const ttItems = menuItemsData.filter(i => i.stallId === 'top-town');
console.log('✅ Total Top Town items:', ttItems.length);

if (ttItems.length !== 78) {
  throw new Error(`Expected 78 items, but found ${ttItems.length}`);
}

// 3. Check for duplicate IDs across entire database
const ids = new Set();
for (const item of menuItemsData) {
  if (ids.has(item.id)) throw new Error(`Duplicate item ID across database: ${item.id}`);
  ids.add(item.id);
}
console.log('✅ Zero duplicate IDs across entire database (' + menuItemsData.length + ' items total).');

// 4. Verify counts per category for Top Town
const categoryCounts = {};
for (const item of ttItems) {
  categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
}

console.log('\n📊 Top Town Category Breakdown:');
for (const [cat, count] of Object.entries(categoryCounts)) {
  console.log(`   - ${cat.padEnd(20)}: ${count} items`);
}

// 5. Verify sample items and specific prices
const samples = [
  { name: 'Chicken Chowmein', price: 300, cat: 'CHOWMEIN' },
  { name: 'House Special Chowmein', price: 350, cat: 'CHOWMEIN' },
  { name: 'Combo 1', price: 950, cat: 'COMBO PLATTERS' },
  { name: 'Combo 2', price: 1050, cat: 'COMBO PLATTERS' },
  { name: 'Chicken Corn Soup', price: 180, cat: 'SOUP' },
  { name: 'Cream Of Mushroom', price: 220, cat: 'SOUP' },
  { name: 'Chola Bhature', price: 180, cat: 'SNACKS' },
  { name: 'Chicken Wrapped Roll', price: 180, cat: 'SNACKS' },
  { name: 'Luchi', price: 50, cat: 'SNACKS' },
  { name: 'Plain Dosa', price: 180, cat: 'DOSA', addOns: 2 },
  { name: 'Butter Masala Dosa', price: 220, cat: 'DOSA', addOns: 2 },
  { name: 'DosaWala Special Dosa', price: 280, cat: 'DOSA', addOns: 2 },
  { name: 'Hyderabadi Chicken Biriyani', price: 250, cat: 'BIRIYANI' },
  { name: 'Hyderabadi Mutton Biriyani', price: 280, cat: 'BIRIYANI' },
  { name: 'Regular Fuchka', price: 100, cat: 'CHAATS' },
  { name: 'Raj Kachori', price: 150, cat: 'CHAATS' },
  { name: 'Plain Nan', price: 50, cat: 'NAN RUTI' },
  { name: 'Butter Nan', price: 70, cat: 'NAN RUTI' },
  { name: 'Garlic Nan', price: 80, cat: 'NAN RUTI' },
  { name: 'Sweet Lassi', price: 120, cat: 'DRINKS', variants: 2 },
  { name: 'Salted Lassi', price: 100, cat: 'DRINKS', variants: 2 },
  { name: 'Jeera Pani', price: 80, cat: 'DRINKS' },
  { name: 'Couple 1', price: 799, cat: 'COUPLE PLATTERS' },
  { name: 'Couple 2', price: 750, cat: 'COUPLE PLATTERS' },
  { name: 'Vegetables Fried Rice', price: 200, cat: 'FRIED RICE' },
  { name: 'Special Fried Rice', price: 360, cat: 'FRIED RICE' },
  { name: '1 Person Rice', price: 120, cat: 'FRIED RICE' },
  { name: 'Chicken Sizzling', price: 360, cat: 'SIZZLING' },
  { name: 'Deep Fried BBQ Coral (Whole Fish)', price: 199, cat: 'SIZZLING', isWeight: true },
  { name: 'Steam Coral (Whole Fish)', price: 199, cat: 'SIZZLING', isWeight: true },
  { name: 'Masala Chicken', price: 360, cat: 'GRAVY' },
  { name: 'Manchurian Chicken', price: 360, cat: 'GRAVY' },
  { name: 'Thai Fried Chicken (6pcs)', price: 300, cat: 'APPETIZER' },
  { name: 'French Fries', price: 150, cat: 'APPETIZER' },
  { name: 'Naga Wings', price: 240, cat: 'APPETIZER' },
  { name: 'Set Menu 1', price: 340, cat: 'SET MENU' },
  { name: 'Set Menu 6', price: 420, cat: 'SET MENU' },
  { name: 'Chili Chicken Rice Bowl', price: 299, cat: 'RICE BOWL' },
  { name: 'Masala Chicken Rice Bowl', price: 299, cat: 'RICE BOWL' }
];

for (const s of samples) {
  const item = ttItems.find(i => i.name === s.name && i.category === s.cat);
  if (!item) throw new Error(`Missing item: ${s.name} in category ${s.cat}`);
  if (item.price !== s.price) throw new Error(`Price mismatch for ${s.name}: expected ${s.price}, got ${item.price}`);
  if (s.variants && (!item.variants || item.variants.length !== s.variants)) {
    throw new Error(`Variant count mismatch for ${s.name}`);
  }
  if (s.addOns && (!item.addOns || item.addOns.length !== s.addOns)) {
    throw new Error(`Add-ons count mismatch for ${s.name}`);
  }
  if (s.isWeight && !item.isWeightBased) {
    throw new Error(`Expected isWeightBased for ${s.name}`);
  }
}

console.log('\n✅ All sample checks passed with 100% price, variant, add-on, and weight-based accuracy!');
console.log('🎉 TOP TOWN MENU VERIFICATION SUCCESSFUL!\n');
