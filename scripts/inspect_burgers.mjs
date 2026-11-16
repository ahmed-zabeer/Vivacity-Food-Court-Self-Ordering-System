import { menuItemsData } from '../server/menuData.js';

const burgers = menuItemsData.filter(i => i.stallId === 'burger-bar' && i.category === 'BURGER');
console.log('Burger items count:', burgers.length);
burgers.forEach(b => console.log(b.id, b.name, b.price));
