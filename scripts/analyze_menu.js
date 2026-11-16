import fs from 'fs';
import { menuItemsData, stallsData } from '../server/menuData.js';

console.log(`Total Stalls: ${stallsData.length}`);
console.log(`Total Menu Items: ${menuItemsData.length}`);

const itemsByStall = {};
stallsData.forEach(s => {
  itemsByStall[s.id] = menuItemsData.filter(m => m.stallId === s.id);
  console.log(`Stall: ${s.name} (${s.id}) -> ${itemsByStall[s.id].length} items`);
});

const summary = stallsData.map(s => {
  const items = itemsByStall[s.id];
  const categories = {};
  items.forEach(it => {
    const cat = it.category || 'UNCATEGORIZED';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  return {
    stallId: s.id,
    stallName: s.name,
    totalItems: items.length,
    categories
  };
});

fs.writeFileSync('scripts/menu_summary.json', JSON.stringify(summary, null, 2));
fs.writeFileSync('scripts/all_menu_items.json', JSON.stringify(menuItemsData.map(m => ({
  id: m.id,
  stallId: m.stallId,
  category: m.category,
  subCategory: m.subCategory,
  name: m.name,
  price: m.price,
  image: m.image
})), null, 2));
console.log('Saved summary and all items to scripts/');
