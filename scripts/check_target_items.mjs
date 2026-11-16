import { menuItemsData } from '../server/menuData.js';

const found = menuItemsData.filter(i => /naga momo|cheese momo|doi fuchka/i.test(i.name));
console.log(found.map(i => ({ id: i.id, stallId: i.stallId, name: i.name, image: i.image })));
