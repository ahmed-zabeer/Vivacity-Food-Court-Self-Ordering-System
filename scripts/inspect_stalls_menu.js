import fs from 'fs';
import { menuItemsData } from '../server/menuData.js';

function inspectStall(stallId) {
  const items = menuItemsData.filter(m => m.stallId === stallId);
  let out = `\n=================== STALL: ${stallId} (${items.length} items) ===================\n`;
  const cats = {};
  items.forEach(it => {
    if (!cats[it.category]) cats[it.category] = [];
    cats[it.category].push({
      id: it.id,
      name: it.name,
      subCategory: it.subCategory,
      price: it.price
    });
  });
  for (const [c, its] of Object.entries(cats)) {
    out += `\n--- Category: ${c} (${its.length} items) ---\n`;
    its.forEach((it, idx) => {
      out += `  [${idx + 1}] id: ${it.id} | name: "${it.name}" | sub: "${it.subCategory || ''}" | ৳${it.price}\n`;
    });
  }
  return out;
}

let fullOut = '';
fullOut += inspectStall('fusion-cafe');
fullOut += inspectStall('top-town');
fullOut += inspectStall('burger-bar');
fullOut += inspectStall('momo-buzz');
fullOut += inspectStall('waffle-city');
fullOut += inspectStall('live-station');

fs.writeFileSync('scripts/all_stalls_menu_formatted.txt', fullOut, 'utf-8');
console.log('Saved all stalls formatted menu, length:', fullOut.length);
