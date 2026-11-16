import { menuItemsData } from '../server/menuData.js';

const boba = menuItemsData.filter(i => i.category === 'BOBA DRINK');
console.log('Boba items count:', boba.length);
boba.forEach(b => console.log(b.id, b.name, b.addOns));
