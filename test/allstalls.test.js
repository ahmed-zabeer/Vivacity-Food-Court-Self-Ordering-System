import test from 'node:test';
import assert from 'node:assert/strict';
import { stallsData, menuItemsData } from '../server/menuData.js';
import { db } from '../server/db.js';

test('All 6 Stalls exist with correct metadata and non-empty categories', () => {
  const stallIds = ['fusion-cafe', 'top-town', 'momo-buzz', 'waffle-city', 'live-station', 'burger-bar'];
  assert.equal(stallsData.length, 6);
  stallIds.forEach(id => {
    const stall = stallsData.find(s => s.id === id);
    assert.ok(stall, `Stall ${id} must exist`);
    assert.ok(stall.name, `Stall ${id} must have a name`);
    assert.ok(stall.categories.length > 0, `Stall ${id} must have categories`);
  });
});

test('Burger Bar menu items and prices match specification', () => {
  const burgerItems = menuItemsData.filter(i => i.stallId === 'burger-bar');
  assert.equal(burgerItems.length, 39, 'Burger bar must have exactly 39 items');

  const itemPriceMap = {
    'Chicken Burger (Reg)': 199,
    'Chicken Crispy Burger': 225,
    'Chicken Cheese Delight': 249,
    'Naga Chicken Burger': 220,
    'Beef Cheese Burger': 330,
    'Sub Sandwich (Regular)': 220,
    'BBQ Cheese Sub': 259,
    'Grilled Chicken Sandwich': 180,
    'Meat Box (Regular)': 260,
    'BBQ Cheese Meat Box': 290,
    'Naga Meat Box': 280,
    'Thai': 170,
    'Breast Piece': 170,
    'Chest Piece': 160,
    'Leg Piece': 170,
    'Whole Wings': 120,
    'Chicken Strips (6pcs)': 249,
    'Pops Chicken (8pcs)': 260,
    'Chicken Wrap': 200,
    'Chicken Shawarma': 220,
    'Beef Wrap': 320,
    'Beef Shawarma': 300,
    'French Fries Regular': 130,
    'Mayo French Fries': 150,
    'Masala French Fries': 150,
    'Bun': 35,
    'Patty': 99,
    'Cheese': 35,
    'Sauce': 8,
    'Coleslaw': 35,
    'Naga Sauce': 20,
    'Mayo': 35,
    'Burger Combo 1': 320,
    'Burger Combo 2': 500,
    'Crispy Chicken Combo 1': 460,
    'Crispy Chicken Combo Couple': 750,
    'Crispy Chicken Combo Family': 1750,
    'Kids Meal': 350
  };

  for (const [name, expectedPrice] of Object.entries(itemPriceMap)) {
    const it = burgerItems.find(i => i.name === name);
    assert.ok(it, `Burger Bar must contain "${name}"`);
    assert.equal(it.price, expectedPrice, `Price for "${name}" must be ${expectedPrice}`);
  }
});

test('Momo Buzz menu items match specification', () => {
  const momoItems = menuItemsData.filter(i => i.stallId === 'momo-buzz');
  assert.equal(momoItems.length, 22, 'Momo buzz must have exactly 22 items');

  const itemPriceMap = {
    'Chicken Momo': 150,
    'Mushroom Momo': 180,
    'Naga Momo': 180,
    'Cheese Momo': 200,
    'BBQ Momo': 200,
    'Sausage Momo': 200,
    "Cheese N' Corn Momo": 270,
    'Cheese Explode': 270,
    'BBQ Mushroom': 270,
    'Chicken Momocola': 210,
    'Naga Mushroom Momocola': 240,
    'Cheese Explode Momocola': 270,
    'BBQ Squash Momocola': 270,
    'Momo Buzz Combo': 500,
    'Momo in Chilli Oil': 200,
    'Regular Fuchka (12pcs)': 130,
    'Doi Fuchka (12pcs)': 150,
    'Naga Fuchka (12pcs)': 140,
    'Cocktail Fuchka (12pcs)': 180,
    'Regular Chotpoti': 120,
    'Naga Chotpoti': 130,
    'Fuchka Buzz Special': 160
  };

  for (const [name, expectedPrice] of Object.entries(itemPriceMap)) {
    const it = momoItems.find(i => i.name === name);
    assert.ok(it, `Momo Buzz must contain "${name}"`);
    assert.equal(it.price, expectedPrice, `Price for "${name}" must be ${expectedPrice}`);
  }
});

test('Waffle City menu items match specification', () => {
  const waffleItems = menuItemsData.filter(i => i.stallId === 'waffle-city');
  assert.equal(waffleItems.length, 19, 'Waffle City must have exactly 19 items');

  const itemPriceMap = {
    'Nutella': 160,
    'Banana Nuts With Chocolate': 170,
    'Red Velvet With Cream Chocolate': 170,
    'Chocolate With Nuts': 170,
    'Cream With Chocolate': 170,
    'Chocolate Blast': 180,
    'Truti Fruti Waffle': 180,
    'Cream With Strawberry': 200,
    'Cream With Blueberry': 200,
    'Nutella With Ice-Cream': 220,
    'Kitkat With Chocolate Chips': 220,
    'Creamy Oreo': 220,
    'Crazy Bliss': 280,
    'Ice Cream': 60,
    'Whipped Cream': 40,
    'Chocolate Chips': 30,
    'Extra Nuts': 20,
    'Cream Cheese': 40,
    'Extra Nutella': 50
  };

  for (const [name, expectedPrice] of Object.entries(itemPriceMap)) {
    const it = waffleItems.find(i => i.name === name);
    assert.ok(it, `Waffle City must contain "${name}"`);
    assert.equal(it.price, expectedPrice, `Price for "${name}" must be ${expectedPrice}`);
  }
});

test('Live Station BBQ & Platters match specification', () => {
  const liveItems = menuItemsData.filter(i => i.stallId === 'live-station');
  assert.equal(liveItems.length, 24, 'Live Station must have exactly 24 items');

  const itemPriceMap = {
    'Chicken Tandoori Kabab': 220,
    'Chicken BBQ': 230,
    'Tandoori Chicken': 220,
    'Chicken Chap Masala': 230,
    'Chicken Boti Kabab': 220,
    'Naga Chicken Kabab': 230,
    'Chicken Achari Kabab': 220,
    'Chicken Reshmi Kabab': 240,
    'Chicken Malai Kabab': 250,
    'Chicken Hariyali Kabab': 220,
    'Afghani Chicken Kabab': 250,
    'Chicken Drumstick / Naga': 299,
    'Chicken Lollipop (Badshahi)': 299,
    'Chicken Tikka (Sonali)': 290,
    'Beef Seek Kabab': 280,
    'Beef Boti Kabab': 280,
    'Whole Koral Fish': 199,
    'Luchi': 30,
    'Platter 1 (1:2)': 915,
    'Platter 2 (1:2)': 745,
    'Platter 3 (1:4)': 1290,
    'Platter 4 (1:4)': 970,
    'Premium (1:4)': 2250,
    'Luxury (1:4)': 2350
  };

  for (const [name, expectedPrice] of Object.entries(itemPriceMap)) {
    const it = liveItems.find(i => i.name === name);
    assert.ok(it, `Live Station must contain "${name}"`);
    assert.equal(it.price, expectedPrice, `Price for "${name}" must be ${expectedPrice}`);
  }
});

test('Multi-stall order food preparation lifecycle with counter confirmation and sound events', () => {
  // Create an order spanning 2 stalls
  const order = db.createOrder({
    tableId: 'T17',
    type: 'DINE_IN',
    serviceType: 'SELF_SERVICE',
    rawItems: [
      { menuItemId: 'bb-bgr-1', quantity: 2 },
      { menuItemId: 'wc-waf-1', quantity: 1 }
    ],
    paymentMethod: 'CASH'
  });

  assert.equal(order.stalls.length, 2);
  const bbSub = order.stalls.find(s => s.stallId === 'burger-bar');
  const wcSub = order.stalls.find(s => s.stallId === 'waffle-city');

  assert.equal(bbSub.status, 'NEW');
  assert.equal(wcSub.status, 'NEW');

  // Chef starts Burger Bar
  const orderPrep = db.startPreparingStall(order.id, 'burger-bar', 'Chef John');
  const bbSubPrep = orderPrep.stalls.find(s => s.stallId === 'burger-bar');
  assert.equal(bbSubPrep.status, 'PREPARING');
  assert.ok(bbSubPrep.prepStartedAt);

  // Chef marks Burger Bar ready
  const orderReady = db.markStallReady(order.id, 'burger-bar', 'Chef John');
  const bbSubReady = orderReady.stalls.find(s => s.stallId === 'burger-bar');
  assert.equal(bbSubReady.status, 'READY');
  assert.ok(bbSubReady.readyAt);

  // Awaiting confirmations list includes Burger Bar
  const awaiting = db.getAwaitingCounterConfirmations();
  const bbAwaiting = awaiting.find(a => a.orderId === order.id && a.stallId === 'burger-bar');
  assert.ok(bbAwaiting, 'Burger Bar must appear in awaiting counter confirmations');
  assert.equal(bbAwaiting.status, 'READY');

  // Counter manager confirms and notifies customer
  const confirmResult = db.confirmAndNotifyCustomer(order.id, 'burger-bar', 'Counter Lead');
  assert.equal(confirmResult.success, true);
  assert.equal(confirmResult.stall.status, 'NOTIFIED');
  assert.ok(confirmResult.notificationEvent);
  assert.ok(confirmResult.notificationEvent.notificationEventId);
  assert.equal(confirmResult.notificationEvent.token, order.token);

  // Calling confirm again is idempotent
  const secondConfirm = db.confirmAndNotifyCustomer(order.id, 'burger-bar', 'Counter Lead');
  assert.equal(secondConfirm.alreadyNotified, true);

  // Mark collected
  const collectResult = db.markStallCollected(order.id, 'burger-bar', 'Counter Lead');
  assert.equal(collectResult.success, true);
  assert.equal(collectResult.stall.status, 'COLLECTED');
  assert.ok(collectResult.stall.collectedAt);
});
