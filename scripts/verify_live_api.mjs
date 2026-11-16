const res = await fetch('http://localhost:3000/api/stalls');
const stalls = await res.json();
console.log('Total stalls returned:', stalls.length);
stalls.forEach(s => {
  console.log(`[${s.id}] ${s.name}`);
  console.log(`   Badge: ${s.badge}`);
  console.log(`   Description: ${s.description}`);
  console.log(`   Logo: ${s.logo}`);
  console.log(`   Cover: ${s.coverImage}`);
});

const drinksRes = await fetch('http://localhost:3000/api/stalls/drinks-beverage');
const drinksStall = await drinksRes.json();
console.log('\nDrinks & Beverage stall status:', drinksRes.status, drinksStall.name);

const menuRes = await fetch('http://localhost:3000/api/menu?stallId=drinks-beverage');
const menu = await menuRes.json();
console.log('Drinks & Beverage items count:', menu.length);
const targetDrinks = ['db-coke', 'db-sprite', 'db-fanta', 'db-water'];
menu.filter(m => targetDrinks.includes(m.id)).forEach(d => {
  console.log(`- ${d.name} (${d.id}): price = ${d.price}, image = ${d.image}`);
});
