import { stallsData, menuItemsData, usersData } from '../server/menuData.js';

console.log('=== STALLS CHECK ===');
console.log('Total stalls:', stallsData.length);
stallsData.forEach(s => {
  const items = menuItemsData.filter(i => i.stallId === s.id);
  console.log(`- ${s.name} (${s.id}): ${items.length} items, categories: [${s.categories.join(', ')}]`);
});

console.log('\n=== DRINKS & BEVERAGE ITEMS CHECK ===');
const dbStall = stallsData.find(s => s.id === 'drinks-beverage');
console.log('Drinks stall found:', !!dbStall);
const dbItems = menuItemsData.filter(i => i.stallId === 'drinks-beverage');
console.log('Drinks stall items count:', dbItems.length);
console.log('Categories represented in Drinks & Beverage items:');
const dbCats = {};
dbItems.forEach(i => dbCats[i.category] = (dbCats[i.category] || 0) + 1);
console.log(dbCats);

console.log('\n=== NEW 4 DRINKS CHECK ===');
const newDrinks = ['db-coke', 'db-sprite', 'db-fanta', 'db-water'];
newDrinks.forEach(id => {
  const item = dbItems.find(i => i.id === id);
  console.log(`- ${id}: name="${item?.name}", price=৳${item?.price}, category="${item?.category}", image="${item?.image}"`);
});

console.log('Drinks stall cover image:', dbStall?.coverImage);


console.log('\n=== FUSION CAFE CHECK ===');
const fcItems = menuItemsData.filter(i => i.stallId === 'fusion-cafe');
console.log('Fusion cafe items count:', fcItems.length);
const fcCats = {};
fcItems.forEach(i => fcCats[i.category] = (fcCats[i.category] || 0) + 1);
console.log(fcCats);

console.log('\n=== USERS CHECK ===');
const drinksUser = usersData.find(u => u.stallId === 'drinks-beverage');
console.log('Drinks user:', drinksUser);
