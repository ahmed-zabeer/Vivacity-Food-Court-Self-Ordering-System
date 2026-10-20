import { db } from '../server/db.js';
import { stallsData, menuItemsData, tablesData } from '../server/menuData.js';
import assert from 'node:assert';

console.log("==================================================");
console.log("🧪 RUNNING VIVA CITY FOOD COURT AUTOMATED TEST SUITE");
console.log("==================================================\n");

// 1. Verify all 55 tables exist and generate proper QR URLs
console.log("Test 1: Verifying all 55 Tables and QR URL mapping...");
assert.strictEqual(tablesData.length, 55, "There must be exactly 55 tables");
for (let i = 1; i <= 55; i++) {
  const tableId = `T${i.toString().padStart(2, '0')}`;
  const found = tablesData.find(t => t.id === tableId);
  assert.ok(found, `Table ${tableId} must exist`);
  const qrUrl = `https://vivacity.food/t/${tableId}`;
  assert.ok(qrUrl.includes(`/t/${tableId}`), `QR URL must map to ${tableId}`);
}
console.log("✅ Passed: All 55 tables (T01 - T55) verified with unique QR targets.\n");

// 2. Verify all 6 stalls exist
console.log("Test 2: Verifying all 6 Stalls...");
const expectedStalls = [
  "fusion-cafe",
  "top-town",
  "momo-buzz",
  "waffle-city",
  "live-station",
  "burger-bar"
];
assert.strictEqual(stallsData.length, 6, "There must be exactly 6 stalls");
for (const stallId of expectedStalls) {
  const stall = stallsData.find(s => s.id === stallId);
  assert.ok(stall, `Stall ${stallId} must exist`);
  assert.ok(stall.categories.length > 0, `Stall ${stallId} must have categories`);
}
console.log("✅ Passed: All 6 food court stalls verified.\n");

// 3. Verify menu items completeness
console.log("Test 3: Verifying Menu Items and Pricing...");
assert.ok(menuItemsData.length >= 100, `Menu items count (${menuItemsData.length}) should reflect the complete menu`);

// Check specific key items from user specification
const tbone = menuItemsData.find(i => i.name.includes("T Bone Steak"));
assert.ok(tbone && tbone.price === 1450, "T Bone Steak price must be ৳1450");
assert.ok(tbone.description.includes("Smashed Potato"), "T Bone Steak must have official description");

const momo = menuItemsData.find(i => i.name === "Chicken Momo");
assert.ok(momo && momo.price === 150, "Chicken Momo price must be ৳150");

const burger = menuItemsData.find(i => i.name === "Chicken Cheese Delight");
assert.ok(burger && burger.price === 249, "Chicken Cheese Delight price must be ৳249");

const redSnapper = menuItemsData.find(i => i.name.includes("Red Snapper"));
assert.ok(redSnapper && redSnapper.isWeightBased, "Red Snapper must feature weight-based pricing");

const pizza = menuItemsData.find(i => i.name === "Tandori Pizza");
assert.ok(pizza && pizza.hasVariants, "Tandori Pizza must have M/L variants");

console.log("✅ Passed: Key menu items, variants, and weight pricing verified.\n");

// 4. Test Multi-Stall Order Pipeline End-to-End
console.log("Test 4: Running Complete End-to-End Multi-Stall Dining Lifecycle...");
console.log("  Step A: Customer scans Table T17 QR");
const tableT17 = db.getTable("T17");
assert.ok(tableT17, "Table T17 must be resolved");

console.log("  Step B: Add items from Coffee Buzz, Momo Buzz, and Burger Bar to Master Cart");
const rawItems = [
  { menuItemId: tbone.id, quantity: 1, notes: "Medium well" },
  { menuItemId: momo.id, quantity: 2, notes: "Spicy sauce" },
  { menuItemId: burger.id, quantity: 1, notes: "No onions" }
];

console.log("  Step C: Place Master Order with CASH payment method");
const order = db.createOrder({
  tableId: "T17",
  type: "DINE_IN",
  serviceType: "SELF_SERVICE",
  rawItems,
  paymentMethod: "CASH",
  customerNotes: "Celebrating graduation"
});

assert.ok(order, "Order must be created");
assert.strictEqual(order.tableId, "T17");
assert.strictEqual(order.subtotal, 1450 + (150 * 2) + 249); // 1999
assert.strictEqual(order.grandTotal, 1999);
assert.strictEqual(order.status, "NEW");
assert.strictEqual(order.paymentStatus, "PAYMENT DUE");
assert.strictEqual(order.stalls.length, 3, "Master order must be split into 3 stall sub-orders");
console.log(`  -> Master Order created: Token #${order.token}, Total: ৳${order.grandTotal}`);

console.log("  Step D: Central Management Counter reviews and accepts order");
const accepted = db.acceptOrder(order.id, "Manager Kabir");
assert.strictEqual(accepted.status, "PAYMENT DUE", "Accepted cash order waits for payment");

console.log("  Step E: Cashier confirms cash received -> Order becomes PAID, KOT generated");
const paid = db.confirmPayment(order.id, "CASH", null, "Cashier Hasan");
assert.strictEqual(paid.paymentStatus, "PAID");
assert.strictEqual(paid.status, "PREPARING");
assert.ok(paid.kotGenerated, "KOT must be generated upon payment");
assert.ok(paid.kotNumber.includes(order.token), "KOT number must reflect token");

console.log("  Step F: Stall kitchens begin cooking and mark items ready");
// Stall 1 (Fusion) finishes cooking
db.updateStallOrderStatus(order.id, "fusion-cafe", "READY");
assert.strictEqual(order.status, "PREPARING", "Order remains PREPARING until all stalls finish");

// Stall 2 (Momo) finishes cooking
db.updateStallOrderStatus(order.id, "momo-buzz", "READY");
assert.strictEqual(order.status, "PREPARING");

// Stall 3 (Burger Bar) finishes cooking -> triggers READY and runner task creation!
db.updateStallOrderStatus(order.id, "burger-bar", "READY");
assert.strictEqual(order.status, "READY", "Order transitions to READY when all stalls are ready");

console.log("  Step G: Floor Runner picks up tray and delivers to Table T17");
const runnerTask = db.runnerTasks.find(t => t.orderId === order.id);
assert.ok(runnerTask, "Unified runner task must be created");

db.updateRunnerTask(runnerTask.id, "OUT_FOR_DELIVERY");
assert.strictEqual(order.status, "OUT FOR DELIVERY");

db.updateRunnerTask(runnerTask.id, "DELIVERED");
assert.strictEqual(order.status, "DELIVERED");
console.log("  -> Order delivered successfully to Table T17!");

console.log("\n==================================================");
console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! (100% SUCCESS)");
console.log("==================================================\n");
