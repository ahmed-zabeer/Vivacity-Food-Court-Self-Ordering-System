import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('1. Three new food images are mapped and exist in public/assets/menu', () => {
  const nagaMomo = db.getMenuItem('mb-mom-3');
  assert.ok(nagaMomo, 'Naga Momo item must exist');
  assert.equal(nagaMomo.name, 'Naga Momo');
  assert.equal(nagaMomo.image, '/assets/menu/naga-momo.jpeg');
  assert.ok(
    fs.existsSync(path.join(ROOT_DIR, 'public', nagaMomo.image.replace(/^\//, ''))),
    `File must exist at public${nagaMomo.image}`
  );

  const cheeseMomo = db.getMenuItem('mb-mom-4');
  assert.ok(cheeseMomo, 'Cheese Momo item must exist');
  assert.equal(cheeseMomo.name, 'Cheese Momo');
  assert.equal(cheeseMomo.image, '/assets/menu/cheese-momo.jpeg');
  assert.ok(
    fs.existsSync(path.join(ROOT_DIR, 'public', cheeseMomo.image.replace(/^\//, ''))),
    `File must exist at public${cheeseMomo.image}`
  );

  const doiFuchka = db.getMenuItem('mb-fuc-2');
  assert.ok(doiFuchka, 'Doi Fuchka item must exist');
  assert.equal(doiFuchka.name, 'Doi Fuchka (12pcs)');
  assert.equal(doiFuchka.image, '/assets/menu/doi-fuchka.jpeg');
  assert.ok(
    fs.existsSync(path.join(ROOT_DIR, 'public', doiFuchka.image.replace(/^\//, ''))),
    `File must exist at public${doiFuchka.image}`
  );
});

test('2. Coke, Sprite, Fanta and Water bottle images exist in public/assets/Drinks', () => {
  const drinks = [
    { id: 'db-coke', name: 'Fountain Coke (250ml Glass)', file: '/assets/Drinks/Cocacola.jpg' },
    { id: 'db-sprite', name: 'Sprite (250ml Glass)', file: '/assets/Drinks/Sprite.jpg' },
    { id: 'db-fanta', name: 'Fanta (250ml Glass)', file: '/assets/Drinks/Fanta.jpg' },
    { id: 'db-water', name: 'Water (500ml Bottle)', file: '/assets/Drinks/Kinley.jpg' }
  ];

  for (const d of drinks) {
    const item = db.getMenuItem(d.id);
    assert.ok(item, `${d.name} item must exist`);
    assert.equal(item.image, d.file);
    assert.ok(
      fs.existsSync(path.join(ROOT_DIR, 'public', d.file.replace(/^\//, ''))),
      `File must exist on disk: ${d.file}`
    );
  }
});

test('3. Boba drinks have pearl customizations with correct pricing', () => {
  const bobaItems = db.getAllMenuItems('drinks-beverage', 'BOBA MILK TEA').filter(i => !i.isAddOn);
  assert.ok(bobaItems.length > 0, 'Must have Boba items');

  for (const boba of bobaItems) {
    assert.ok(boba.addOns && boba.addOns.length >= 4, `Boba item ${boba.name} must have pearl addOns`);
    const names = boba.addOns.map(a => a.name);
    assert.ok(names.includes('No Extra Pearls'), 'Must include No Extra Pearls');
    assert.ok(names.includes('Regular Pearls'), 'Must include Regular Pearls');
    assert.ok(names.includes('Extra Pearls'), 'Must include Extra Pearls');
    assert.ok(names.includes('More Pearls'), 'Must include More Pearls');

    const extra = boba.addOns.find(a => a.name === 'Extra Pearls');
    assert.equal(extra.price, 50, 'Extra Pearls must be ৳50 from existing menu');
  }
});

test('4. Pizza items have all 11 custom toppings', () => {
  const pizzas = db.getAllMenuItems('fusion-cafe', 'PIZZA');
  assert.ok(pizzas.length > 0, 'Must have Pizza items');

  const expectedToppings = [
    'Extra Cheese', 'Chicken', 'Sausage', 'Beef',
    'Capsicum', 'Onion', 'Mushroom', 'Black Olives',
    'Sweet Corn', 'Jalapeño', 'Tomato'
  ];

  for (const pizza of pizzas) {
    assert.ok(pizza.addOns, `Pizza ${pizza.name} must have addOns`);
    const names = pizza.addOns.map(a => a.name);
    for (const top of expectedToppings) {
      assert.ok(names.includes(top), `Pizza ${pizza.name} must include topping "${top}"`);
    }
  }
});

test('5. Burger items add directly to cart without a customization popup', () => {
  for (const id of ['bb-bgr-1', 'bb-bgr-5']) {
    const burger = db.getMenuItem(id);
    assert.ok(burger, `Burger ${id} must exist`);
    assert.ok(!burger.burgerPatties, 'Burgers must not expose patty options');
    assert.ok(!burger.burgerAddons, 'Burgers must not expose burger extras');
    assert.ok(!burger.addOns || burger.addOns.length === 0, 'Burgers must not expose add-ons');
  }
});

test('6. Waffle items have all 17 custom toppings with correct prices', () => {
  const waffles = db.getAllMenuItems('waffle-city', 'WAFFLE');
  assert.ok(waffles.length > 0, 'Must have waffle items');

  const expectedToppings = [
    'Vanilla Ice Cream', 'Chocolate Ice Cream', 'Strawberry Ice Cream',
    'Nutella', 'Chocolate Syrup', 'Caramel Syrup', 'Honey',
    'Whipped Cream', 'Oreo Crumbs', 'Brownie Pieces', 'Strawberry',
    'Banana', 'Mixed Fruits', 'Chopped Nuts', 'Chocolate Chips',
    'Colour Sprinkles', 'Extra Waffle Portion'
  ];

  for (const waffle of waffles) {
    assert.ok(waffle.addOns, `Waffle ${waffle.name} must have addOns`);
    const names = waffle.addOns.map(a => a.name);
    for (const exp of expectedToppings) {
      assert.ok(names.includes(exp), `Waffle ${waffle.name} must include topping "${exp}"`);
    }

    const iceCream = waffle.addOns.find(a => a.name === 'Vanilla Ice Cream');
    assert.equal(iceCream.price, 60, 'Ice Cream must be ৳60 from existing menu');
    const nutella = waffle.addOns.find(a => a.name === 'Nutella');
    assert.equal(nutella.price, 50, 'Nutella must be ৳50 from existing menu');
  }
});

test('7. Order creation with customizations updates subtotal and saves customizations in order & KOT', () => {
  db.resetItemStock('cb-piz-1');
  db.resetItemStock('cb-bob-2');
  db.resetItemStock('bb-bgr-1');
  db.resetItemStock('wc-waf-1');

  // Place order with multi-customizations
  const order = db.createOrder({
    tableId: 'T17',
    serviceType: 'SELF_SERVICE',
    paymentMethod: 'CASH',
    rawItems: [
      {
        menuItemId: 'cb-piz-1', // Tandoori Pizza base price 580
        quantity: 1,
        selectedAddOns: ['piz-top-cheese', 'piz-top-mushroom'] // 60 + 40 = 100
      },
      {
        menuItemId: 'cb-bob-2', // Boba Pearl Milk Tea base price 190
        quantity: 2,
        selectedAddOns: ['extra-pearl'] // 50 each -> (190 + 50) * 2 = 480
      }
    ]
  });

  assert.ok(order, 'Order must be created');
  assert.equal(order.items.length, 2);

  // Check pizza item
  const pizzaItem = order.items.find(i => i.menuItemId === 'cb-piz-1');
  assert.equal(pizzaItem.price, 680, 'Pizza line item unit price must be 580 + 100 = 680');
  assert.ok(pizzaItem.customizations.length === 2);
  assert.equal(pizzaItem.customizations[0].name, 'Extra Cheese');
  assert.equal(pizzaItem.customizations[1].name, 'Mushroom');
  assert.ok(pizzaItem.addOnNames.some(n => n.includes('Extra Cheese (+৳60)')));

  // Check boba item
  const bobaItem = order.items.find(i => i.menuItemId === 'cb-bob-2');
  assert.equal(bobaItem.price, 240, 'Boba unit price must be 190 + 50 = 240');

  // Total check: 680 + (240 * 2) = 1160
  assert.equal(order.subtotal, 1160);
  assert.equal(order.grandTotal, 1160);

  // Verify KOT/stall sub-orders receive customizations
  const fusionStall = order.stalls.find(s => s.stallId === 'fusion-cafe');
  assert.ok(fusionStall, 'Fusion Cafe sub-order must exist');
  const stallPizza = fusionStall.items.find(i => i.menuItemId === 'cb-piz-1');
  assert.ok(stallPizza.customizations, 'Stall item must have customizations');
  assert.equal(stallPizza.customizations.length, 2);
});

test('8. Admin customization pricing updates live and reflects in getCustomizationConfig', () => {
  const configBefore = db.getCustomizationConfig();
  assert.ok(configBefore.boba_pearls, 'Must have boba_pearls in config');

  // Update More Pearls price to 95
  const updated = db.updateCustomizationPrice('boba_pearls', 'boba-more-pearl', 95);
  assert.equal(updated.price, 95);

  const boba = db.getMenuItem('cb-bob-2');
  const morePearl = boba.addOns.find(a => a.id === 'boba-more-pearl');
  assert.equal(morePearl.price, 95, 'Updated price must immediately reflect in menu item');

  // Reset back to 80
  db.updateCustomizationPrice('boba_pearls', 'boba-more-pearl', 80);
  const resetMore = db.getMenuItem('cb-bob-2').addOns.find(a => a.id === 'boba-more-pearl');
  assert.equal(resetMore.price, 80);
});
