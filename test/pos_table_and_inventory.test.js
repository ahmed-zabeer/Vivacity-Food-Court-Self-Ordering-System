import { db } from '../server/db.js';
import assert from 'node:assert';

console.log("==================================================================");
console.log("🧪 TESTING: POS TABLE SELECTION & INVENTORY STOCK VALIDATION");
console.log("==================================================================\n");

// 1. Ensure inventory item has initial setup
if (db.inventory && db.inventory['mb-mom-1']) {
  db.inventory['mb-mom-1'].preparedQty = 15;
  db.inventory['mb-mom-1'].soldQty = 5;
  db.inventory['mb-mom-1'].reservedQty = 0;
  db.inventory['mb-mom-1'].manuallyDisabled = false;
}

// TEST 1: Dine-in order with specific Table (T12)
console.log("Test 1: Verifying Dine-in order links table correctly...");
const dineInOrder = db.createOrder({
  tableId: "T12",
  type: "DINE_IN",
  customerOrderType: "DINE_IN",
  serviceType: "SELF_SERVICE",
  rawItems: [{ menuItemId: "mb-mom-1", quantity: 2 }],
  customerName: "Table Guest",
  paymentMethod: "CASH",
  orderSource: "MANUAL_COUNTER",
  cashierName: "Central Cashier",
  cashReceived: 500,
  autoConfirmPayment: true
});

assert.strictEqual(dineInOrder.tableId, "T12", "Dine-in order must have tableId T12");
assert.strictEqual(dineInOrder.customerOrderType, "DINE_IN");
assert.ok(dineInOrder.sessionId, "Active table session must be established for Dine-in");
console.log("✅ Passed: Dine-in order correctly linked to Table T12.\n");

// TEST 2: Takeaway order without Table (tableId is null)
console.log("Test 2: Verifying Takeaway order does not require or set a table...");
const takeawayOrder = db.createOrder({
  tableId: null,
  type: "PARCEL",
  customerOrderType: "TAKEAWAY",
  serviceType: "SELF_SERVICE",
  rawItems: [{ menuItemId: "db-fanta", quantity: 1 }],
  customerName: "Takeaway Guest",
  paymentMethod: "CASH",
  orderSource: "MANUAL_COUNTER",
  cashierName: "Central Cashier",
  cashReceived: 100,
  autoConfirmPayment: true
});

assert.strictEqual(takeawayOrder.tableId, null, "Takeaway order must have null tableId");
assert.strictEqual(takeawayOrder.customerOrderType, "TAKEAWAY");
assert.ok(takeawayOrder.parcelToken, "Takeaway order must have parcel token");
console.log("✅ Passed: Takeaway order proceeds cleanly without table.\n");

// TEST 3: Verify item with stock configuration returns actual available stock
console.log("Test 3: Checking actual stock calculation for configured item...");
const itemWithStock = db.getMenuItem("mb-mom-1");
assert.ok(itemWithStock.inv, "Item must have inv object");
assert.strictEqual(itemWithStock.inv.preparedQty, 15);
assert.strictEqual(itemWithStock.inv.soldQty, 7); // 5 initial + 2 from Test 1
const expectedAvailable = 15 - 7; // 8
assert.strictEqual(itemWithStock.inv.available, expectedAvailable, "Available stock must match prepared - sold");
assert.strictEqual(itemWithStock.available, expectedAvailable);
console.log(`✅ Passed: Actual available stock is correctly computed (${expectedAvailable} portions).\n`);

// TEST 4: Verify unconfigured item does not have fake stock
console.log("Test 4: Checking item without stock configuration has no fake stock...");
const itemWithoutStock = db.getMenuItem("db-fanta");
assert.strictEqual(itemWithoutStock.available, null, "Unconfigured item must have null available (unlimited, no fake numbers)");
console.log("✅ Passed: Item without stock configuration has null stock (never fake/hardcoded).\n");

// TEST 5: Verify ordering more than available stock is strictly rejected
console.log("Test 5: Verifying attempt to order more than available stock is rejected...");
let stockErrorThrown = false;
try {
  db.createOrder({
    tableId: "T15",
    type: "DINE_IN",
    customerOrderType: "DINE_IN",
    serviceType: "SELF_SERVICE",
    rawItems: [{ menuItemId: "mb-mom-1", quantity: 20 }], // Exceeds available stock (8)
    customerName: "Excess Guest",
    paymentMethod: "CASH",
    orderSource: "MANUAL_COUNTER",
    cashReceived: 999999,
    autoConfirmPayment: true
  });
} catch (err) {
  stockErrorThrown = true;
  assert.ok(err.message.includes("available") || err.message.includes("portion"), "Error message should mention available stock");
}
assert.ok(stockErrorThrown, "Excess order must be rejected by inventory rules");
console.log("✅ Passed: Insufficient stock order rejected with exact error.\n");

console.log("==================================================================");
console.log("🎉 ALL TABLE SELECTION & INVENTORY VALIDATION TESTS PASSED (100%)");
console.log("==================================================================");
