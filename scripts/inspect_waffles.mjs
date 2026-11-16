import { menuItemsData } from '../server/menuData.js';

const waffles = menuItemsData.filter(i => i.stallId === 'waffle-city' && i.category === 'WAFFLE');
console.log('Waffle items count:', waffles.length);
waffles.forEach(w => console.log(w.id, w.name, w.price));
