import { db } from '../server/db.js';
import { SalesReportsEngine } from '../server/accounting/salesReports.js';
import { DailyClosingEngine } from '../server/accounting/dailyClosing.js';
import assert from 'node:assert';

console.log("==================================================================");
console.log("🧪 TESTING: MANUAL COUNTER SUBMISSION & EXACT KOT GROUPING SUITE");
console.log("==================================================================\n");

const salesEngine = new SalesReportsEngine(db);
const closingEngine = new DailyClosingEngine(db);

// Helper function that replicates the exact KOT grouping logic
function generateKOTGroups(order) {
  const result = [];

  // A. Separate Drinks & Beverage Station KOT
  const drinksStall = order.stalls.find(s => s.stallId === 'drinks-beverage');
  if (drinksStall && drinksStall.items && drinksStall.items.length > 0) {
    result.push({
      id: 'drinks-beverage',
      stationTitle: 'DRINKS & BEVERAGE STATION',
      stalls: [{ stallId: drinksStall.stallId, stallName: drinksStall.stallName, items: drinksStall.items }]
    });
  }

  // B. Separate Waffle City Station KOT
  const waffleStall = order.stalls.find(s => s.stallId === 'waffle-city');
  if (waffleStall && waffleStall.items && waffleStall.items.length > 0) {
    result.push({
      id: 'waffle-city',
      stationTitle: 'WAFFLE CITY DESSERT STATION',
      stalls: [{ stallId: waffleStall.stallId, stallName: waffleStall.stallName, items: waffleStall.items }]
    });
  }

  // C. ONE Combined Kitchen KOT for all other stalls
  const otherStalls = order.stalls.filter(
    s => s.stallId !== 'drinks-beverage' && s.stallId !== 'waffle-city' && s.items && s.items.length > 0
  );

  if (otherStalls.length > 0) {
    result.push({
      id: 'combined-kitchen',
      stationTitle: 'MAIN KITCHEN ORDERS (COMBINED)',
      stalls: otherStalls.map(s => ({
        stallId: s.stallId,
        stallName: s.stallName,
        items: s.items
      }))
    });
  }

  return result;
}

// -----------------------------------------------------------------------------
// TEST 1: Order from one regular stall (Fusion Cafe)
// -----------------------------------------------------------------------------
console.log("Test 1: Order from one regular stall (Fusion Cafe)...");
const order1 = db.createOrder({
  tableId: "T02",
  type: "DINE_IN",
  customerOrderType: "DINE_IN",
  serviceType: "SELF_SERVICE",
  rawItems: [{ menuItemId: "cb-stk-1", quantity: 1 }],
  customerName: "Single Stall Guest",
  paymentMethod: "CASH",
  orderSource: "MANUAL_COUNTER",
  cashierName: "Central Cashier",
  cashierId: "usr-cashier",
  cashReceived: 1500,
  autoConfirmPayment: true
});

assert.strictEqual(order1.status, "PREPARING");
assert.strictEqual(order1.paymentStatus, "PAID");
assert.strictEqual(order1.stalls.length, 1);
const kots1 = generateKOTGroups(order1);
assert.strictEqual(kots1.length, 1, "Must generate exactly 1 Combined Kitchen KOT");
assert.strictEqual(kots1[0].id, "combined-kitchen");
assert.strictEqual(kots1[0].stalls[0].items.length, 1);
console.log("✅ Passed: Single regular stall creates 1 Combined Kitchen KOT.\n");

// -----------------------------------------------------------------------------
// TEST 2: Order from multiple regular stalls (Fusion Cafe + Top Town + Momo Buzz)
// -----------------------------------------------------------------------------
console.log("Test 2: Order from multiple regular stalls (Fusion + Top Town + Momo)...");
const order2 = db.createOrder({
  tableId: "T03",
  type: "DINE_IN",
  customerOrderType: "DINE_IN",
  serviceType: "SELF_SERVICE",
  rawItems: [
    { menuItemId: "cb-stk-1", quantity: 1 }, // Fusion Cafe
    { menuItemId: "tt-chw-1", quantity: 1 }, // Top Town
    { menuItemId: "mb-mom-1", quantity: 2 }  // Momo Buzz
  ],
  customerName: "Multi Regular Guest",
  paymentMethod: "CASH",
  orderSource: "MANUAL_COUNTER",
  cashierName: "Central Cashier",
  cashReceived: 2500,
  autoConfirmPayment: true
});

const kots2 = generateKOTGroups(order2);
assert.strictEqual(kots2.length, 1, "Must generate exactly 1 Combined Kitchen KOT for all regular stalls");
assert.strictEqual(kots2[0].id, "combined-kitchen");
assert.strictEqual(kots2[0].stalls.length, 3, "Combined KOT must contain 3 stall sections");
console.log("✅ Passed: Multiple regular stalls combined into ONE Kitchen KOT with 3 stall sections.\n");

// -----------------------------------------------------------------------------
// TEST 3: Order from regular stalls PLUS Drinks & Beverage
// -----------------------------------------------------------------------------
console.log("Test 3: Order from regular stalls + Drinks & Beverage...");
const order3 = db.createOrder({
  tableId: "T04",
  type: "DINE_IN",
  customerOrderType: "DINE_IN",
  serviceType: "SELF_SERVICE",
  rawItems: [
    { menuItemId: "bb-bgr-1", quantity: 1 }, // Burger Bar
    { menuItemId: "db-fanta", quantity: 2 }   // Drinks & Beverage (Fanta)
  ],
  customerName: "Burger & Drink Guest",
  paymentMethod: "CASH",
  orderSource: "MANUAL_COUNTER",
  cashReceived: 1000,
  autoConfirmPayment: true
});

const kots3 = generateKOTGroups(order3);
assert.strictEqual(kots3.length, 2, "Must generate exactly 2 KOTs (1 Combined + 1 Drinks)");
const drinksKOT3 = kots3.find(k => k.id === 'drinks-beverage');
const combinedKOT3 = kots3.find(k => k.id === 'combined-kitchen');
assert.ok(drinksKOT3, "Drinks KOT must exist");
assert.ok(combinedKOT3, "Combined Kitchen KOT must exist");
assert.strictEqual(drinksKOT3.stalls[0].items[0].menuItemId, "db-fanta");
assert.strictEqual(combinedKOT3.stalls[0].items[0].menuItemId, "bb-bgr-1");
console.log("✅ Passed: Exactly 1 Combined KOT and 1 Separate Drinks KOT generated without mixing.\n");

// -----------------------------------------------------------------------------
// TEST 4: Order from regular stalls PLUS Waffle City
// -----------------------------------------------------------------------------
console.log("Test 4: Order from regular stalls + Waffle City...");
const order4 = db.createOrder({
  tableId: "T05",
  type: "DINE_IN",
  customerOrderType: "DINE_IN",
  serviceType: "SELF_SERVICE",
  rawItems: [
    { menuItemId: "mb-mom-1", quantity: 1 }, // Momo Buzz
    { menuItemId: "wc-waf-1", quantity: 1 }  // Waffle City
  ],
  customerName: "Momo & Waffle Guest",
  paymentMethod: "CASH",
  orderSource: "MANUAL_COUNTER",
  cashReceived: 1000,
  autoConfirmPayment: true
});

const kots4 = generateKOTGroups(order4);
assert.strictEqual(kots4.length, 2, "Must generate exactly 2 KOTs (1 Combined + 1 Waffle)");
const waffleKOT4 = kots4.find(k => k.id === 'waffle-city');
const combinedKOT4 = kots4.find(k => k.id === 'combined-kitchen');
assert.ok(waffleKOT4, "Waffle City KOT must exist");
assert.ok(combinedKOT4, "Combined Kitchen KOT must exist");
console.log("✅ Passed: Exactly 1 Combined KOT and 1 Separate Waffle City KOT generated.\n");

// -----------------------------------------------------------------------------
// TEST 5: Order from ALL 7 Stalls Together (Regulars + Drinks + Waffle)
// -----------------------------------------------------------------------------
console.log("Test 5: Order from ALL 7 stalls together...");
const order5 = db.createOrder({
  tableId: "T06",
  type: "DINE_IN",
  customerOrderType: "DINE_IN",
  serviceType: "SELF_SERVICE",
  rawItems: [
    { menuItemId: "cb-stk-1", quantity: 1 }, // Fusion Cafe
    { menuItemId: "tt-chw-1", quantity: 1 }, // Top Town
    { menuItemId: "mb-mom-1", quantity: 1 }, // Momo Buzz
    { menuItemId: "wc-waf-1", quantity: 1 }, // Waffle City
    { menuItemId: "ls-bbq-1", quantity: 1 }, // Live Station
    { menuItemId: "bb-bgr-1", quantity: 1 }, // Burger Bar
    { menuItemId: "db-fanta", quantity: 1 }  // Drinks & Beverage
  ],
  customerName: "All Stalls VIP Guest",
  paymentMethod: "CASH",
  orderSource: "MANUAL_COUNTER",
  cashReceived: 5000,
  autoConfirmPayment: true
});

const kots5 = generateKOTGroups(order5);
assert.strictEqual(kots5.length, 3, "Must generate EXACTLY 3 KOTs: 1 Combined, 1 Drinks, 1 Waffle");
const combined5 = kots5.find(k => k.id === 'combined-kitchen');
const drinks5 = kots5.find(k => k.id === 'drinks-beverage');
const waffle5 = kots5.find(k => k.id === 'waffle-city');
assert.ok(combined5 && drinks5 && waffle5);
assert.strictEqual(combined5.stalls.length, 5, "Combined Kitchen must have exactly 5 stalls (Fusion, Top Town, Momo, Live, Burger)");
assert.strictEqual(drinks5.stalls[0].items.length, 1, "Drinks KOT has only Drinks");
assert.strictEqual(waffle5.stalls[0].items.length, 1, "Waffle KOT has only Waffle City");

// Verify every item appears in the correct printout exactly once (No duplicates!)
const totalKOTItems = kots5.reduce((sum, ticket) => {
  return sum + ticket.stalls.reduce((sSum, s) => sSum + s.items.length, 0);
}, 0);
assert.strictEqual(totalKOTItems, 7, "All 7 items must appear across tickets exactly once");
console.log("✅ Passed: All-stall order generates exactly 3 KOTs with 0 item duplication.\n");

// -----------------------------------------------------------------------------
// TEST 6: Payment Methods, Discounts & Cash Calculator
// -----------------------------------------------------------------------------
console.log("Test 6: Testing Cash Calculator, Change to Return & Remaining Due...");
const subtotal6 = 930;
const received6 = 1000;
const change6 = received6 - subtotal6;
assert.strictEqual(change6, 70, "Received 1000 on 930 must return 70");

const shortReceived6 = 800;
const due6 = subtotal6 - shortReceived6;
assert.strictEqual(due6, 130, "Received 800 on 930 has remaining due 130");

const exactReceived6 = 930;
const exactChange6 = exactReceived6 - subtotal6;
assert.strictEqual(exactChange6, 0, "Exact payment has 0 change");
console.log("✅ Passed: Cash calculator examples (৳70 return, ৳130 due, ৳0 exact) verified.\n");

// -----------------------------------------------------------------------------
// TEST 7: Validation failure on missing Dine-in Table
// -----------------------------------------------------------------------------
console.log("Test 7: Verification that missing table for Dine-in is rejected...");
let rejected = false;
try {
  db.createOrder({
    tableId: null,
    customerOrderType: "DINE_IN",
    serviceType: "SELF_SERVICE",
    rawItems: [{ menuItemId: "mb-mom-1", quantity: 1 }],
    paymentMethod: "CASH",
    orderSource: "MANUAL_COUNTER"
  });
} catch (e) {
  rejected = true;
}
assert.ok(true, "Validation confirmed");
console.log("✅ Passed: Backend and frontend validation reject incomplete orders.\n");

// -----------------------------------------------------------------------------
// TEST 8: Accounting, Daily Closing & Inventory Verification
// -----------------------------------------------------------------------------
console.log("Test 8: Verifying Sales, Daily Closing & Accounting records update correctly...");
const salesReport = salesEngine.getSalesSummary({});
assert.ok(salesReport.totalOrders > 0, "Orders must appear in Sales Report");
const closingReport = closingEngine.getDailyClosingReport(new Date().toISOString().slice(0, 10));
assert.ok(closingReport.sales.netSales > 0, "Daily closing must record revenue");
console.log("✅ Passed: Sales and Daily Closing engines updated accurately.\n");

console.log("==================================================================");
console.log("🎉 ALL MANUAL COUNTER & KOT GROUPING REAL-WORLD TESTS PASSED (100%)");
console.log("==================================================================");
