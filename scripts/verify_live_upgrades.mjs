const base = 'http://localhost:3000';

// 1. Check custom config API
const cfgRes = await fetch(`${base}/api/customizations/config`);
console.log('Customizations config status:', cfgRes.status);
const cfg = await cfgRes.json();
console.log('Boba pearls in config:', cfg.boba_pearls?.length);
console.log('Pizza toppings in config:', cfg.pizza_toppings?.length);
console.log('Burger patties in config:', cfg.burger_patties?.length);
console.log('Burger addons in config:', cfg.burger_addons?.length);
console.log('Waffle toppings in config:', cfg.waffle_toppings?.length);

// 2. Check 3 new image URLs HTTP status
const imgUrls = [
  `${base}/assets/menu/cheese-momo.jpeg`,
  `${base}/assets/menu/naga-momo.jpeg`,
  `${base}/assets/menu/doi-fuchka.jpeg`,
  `${base}/assets/Drinks/Cocacola.jpg`,
  `${base}/assets/Drinks/Sprite.jpg`,
  `${base}/assets/Drinks/Fanta.jpg`,
  `${base}/assets/Drinks/Kinley.jpg`
];

for (const u of imgUrls) {
  const r = await fetch(u);
  console.log(`${r.status} ${r.headers.get('content-type')} | ${u.replace(base, '')}`);
}
