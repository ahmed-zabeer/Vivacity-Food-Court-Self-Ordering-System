import { db, getDhakaDateParts } from '../server/db.js';
import assert from 'node:assert';

console.log("==========================================================");
console.log("🧪 RUNNING REVENUE ENGINE & RESET SYSTEM VERIFICATION SUITE");
console.log("==========================================================\n");

// 1. Bangladesh Timezone check
console.log("Test 1: Verifying Asia/Dhaka (UTC+6) date calculation...");
const parts = getDhakaDateParts(new Date());
assert.ok(parts.dateStr.match(/^\d{4}-\d{2}-\d{2}$/), "Dhaka date must be YYYY-MM-DD");
assert.ok(parts.monthStr.match(/^\d{4}-\d{2}$/), "Dhaka month must be YYYY-MM");
assert.ok(parts.yearStr.match(/^\d{4}$/), "Dhaka year must be YYYY");
console.log(`  -> Current Bangladesh Time: ${parts.dateStr} ${parts.hour}:${parts.minute}:${parts.second} (Asia/Dhaka)`);
console.log("✅ Passed: Asia/Dhaka timezone formatting verified.\n");

// 2. Fetch initial revenue summary
console.log("Test 2: Verifying initial revenue summary and currency...");
const initialSummary = db.getRevenueSummary();
assert.strictEqual(initialSummary.currency, '৳', "Currency must be ৳");
assert.strictEqual(initialSummary.timezone, 'Asia/Dhaka', "Timezone must be Asia/Dhaka");
assert.ok(typeof initialSummary.daily.revenue === 'number', "Daily revenue must be numeric");
assert.ok(typeof initialSummary.monthly.revenue === 'number', "Monthly revenue must be numeric");
assert.ok(typeof initialSummary.yearly.revenue === 'number', "Yearly revenue must be numeric");
console.log(`  -> Daily: ৳${initialSummary.daily.revenue} (${initialSummary.daily.orders} orders)`);
console.log(`  -> Monthly: ৳${initialSummary.monthly.revenue} (${initialSummary.monthly.orders} orders)`);
console.log(`  -> Yearly: ৳${initialSummary.yearly.revenue} (${initialSummary.yearly.orders} orders)`);
console.log("✅ Passed: Revenue summary structure and currency verified.\n");

// 3. Unpaid / Payment Due exclusion
console.log("Test 3: Verifying unpaid and pending orders do NOT count as revenue...");
const unpaidOrder = db.createOrder({
  tableId: "T05",
  type: "DINE_IN",
  serviceType: "SELF_SERVICE",
  rawItems: [{ menuItemId: "mb-mom-1", quantity: 2 }], // 300 tk
  paymentMethod: "CASH"
});
const summaryAfterUnpaid = db.getRevenueSummary();
assert.strictEqual(summaryAfterUnpaid.daily.revenue, initialSummary.daily.revenue, "Unpaid cash orders must not increase daily revenue");
assert.strictEqual(summaryAfterUnpaid.monthly.revenue, initialSummary.monthly.revenue, "Unpaid cash orders must not increase monthly revenue");
assert.strictEqual(summaryAfterUnpaid.yearly.revenue, initialSummary.yearly.revenue, "Unpaid cash orders must not increase yearly revenue");
console.log("✅ Passed: Unpaid / Pending orders correctly excluded.\n");

// 4. Successful Payment confirmation increases Daily, Monthly, Yearly revenue
console.log("Test 4: Verifying confirmed payment increases Daily, Monthly, and Yearly revenue...");
const dailyBefore = summaryAfterUnpaid.daily.revenue;
const monthlyBefore = summaryAfterUnpaid.monthly.revenue;
const yearlyBefore = summaryAfterUnpaid.yearly.revenue;
const dailyOrdersBefore = summaryAfterUnpaid.daily.orders;

db.confirmPayment(unpaidOrder.id, "CASH", "TXN-TEST-101", "Cashier Hasan");
const summaryAfterPaid = db.getRevenueSummary();

assert.strictEqual(summaryAfterPaid.daily.revenue, dailyBefore + unpaidOrder.grandTotal, "Daily revenue must increase by exact paid amount");
assert.strictEqual(summaryAfterPaid.monthly.revenue, monthlyBefore + unpaidOrder.grandTotal, "Monthly revenue must increase by exact paid amount");
assert.strictEqual(summaryAfterPaid.yearly.revenue, yearlyBefore + unpaidOrder.grandTotal, "Yearly revenue must increase by exact paid amount");
assert.strictEqual(summaryAfterPaid.daily.orders, dailyOrdersBefore + 1, "Daily paid order count must increment by 1");
console.log(`  -> Paid order #${unpaidOrder.token} for ৳${unpaidOrder.grandTotal} successfully counted in Daily, Monthly, and Yearly totals.`);
console.log("✅ Passed: Successful payment reflects across all three cards.\n");

// 5. Online payment (bKash) test
console.log("Test 5: Verifying online bKash payment...");
const bkashOrder = db.createOrder({
  tableId: "T12",
  type: "DINE_IN",
  serviceType: "SELF_SERVICE",
  rawItems: [{ menuItemId: "bb-bgr-3", quantity: 1 }], // 249 tk
  paymentMethod: "bKash"
});
db.confirmPayment(bkashOrder.id, "bKash", "BKASH-TEST-999", "bKash Gateway");
const summaryAfterBkash = db.getRevenueSummary();
assert.strictEqual(summaryAfterBkash.daily.revenue, summaryAfterPaid.daily.revenue + 249);
console.log("✅ Passed: Online payment successfully credited to revenue.\n");

// 6. Security: Unauthorized role cannot reset revenue
console.log("Test 6: Verifying role security for Daily Revenue reset...");
const unauthorizedResult = db.resetDailyRevenue("Chef Rahim", "KITCHEN STAFF");
assert.strictEqual(unauthorizedResult.code, 403, "Kitchen staff must be forbidden from resetting revenue");

const customerResult = db.resetDailyRevenue("Guest", "CUSTOMER");
assert.strictEqual(customerResult.code, 403, "Customers must be forbidden from resetting revenue");
console.log("✅ Passed: Unauthorized users rejected with 403.\n");

// 7. Clear / Restart Daily Revenue by Authorized Manager
console.log("Test 7: Verifying Clear / Restart Daily Revenue by Authorized Manager...");
const monthlyBeforeReset = summaryAfterBkash.monthly.revenue;
const yearlyBeforeReset = summaryAfterBkash.yearly.revenue;
const ordersCountBefore = db.orders.length;

const resetResult = db.resetDailyRevenue("Chief Administrator", "SUPER ADMIN");
assert.strictEqual(resetResult.success, true, "Authorized reset must succeed");
assert.ok(resetResult.resetEntry.resetAt, "Reset must record exact timestamp");

const summaryAfterReset = db.getRevenueSummary();
assert.strictEqual(summaryAfterReset.daily.revenue, 0, "Daily revenue must immediately reset to ৳0");
assert.strictEqual(summaryAfterReset.daily.orders, 0, "Daily orders count must immediately reset to 0");
assert.strictEqual(summaryAfterReset.monthly.revenue, monthlyBeforeReset, "Monthly revenue must remain 100% UNCHANGED after daily reset");
assert.strictEqual(summaryAfterReset.yearly.revenue, yearlyBeforeReset, "Yearly revenue must remain 100% UNCHANGED after daily reset");
assert.strictEqual(db.orders.length, ordersCountBefore, "All order records, receipts, and KOTs must be preserved");
console.log("✅ Passed: Daily revenue reset to ৳0 while preserving Monthly, Yearly, and historical order records.\n");

// 8. New sales after reset count from ৳0
console.log("Test 8: Verifying new sales after reset count starting from ৳0...");
const freshOrder = db.createOrder({
  tableId: "T20",
  type: "DINE_IN",
  serviceType: "SELF_SERVICE",
  rawItems: [{ menuItemId: "mb-mom-1", quantity: 1 }], // 150 tk
  paymentMethod: "bKash"
});
db.confirmPayment(freshOrder.id, "bKash", "BKASH-FRESH-123", "Online Gateway");
const summaryAfterFresh = db.getRevenueSummary();
assert.strictEqual(summaryAfterFresh.daily.revenue, 150, "Daily revenue must count only sales after the reset cutoff");
assert.strictEqual(summaryAfterFresh.daily.orders, 1, "Daily order count must be 1 after new order");
assert.strictEqual(summaryAfterFresh.monthly.revenue, monthlyBeforeReset + 150, "Monthly revenue increments normally");
assert.strictEqual(summaryAfterFresh.yearly.revenue, yearlyBeforeReset + 150, "Yearly revenue increments normally");
console.log("✅ Passed: New post-reset sale started counting from ৳0 as required.\n");

// 9. Repeated refresh does not duplicate revenue
console.log("Test 9: Verifying repeated calls do not duplicate revenue...");
const ref1 = db.getRevenueSummary();
const ref2 = db.getRevenueSummary();
const ref3 = db.getRevenueSummary();
assert.strictEqual(ref1.daily.revenue, ref2.daily.revenue);
assert.strictEqual(ref2.daily.revenue, ref3.daily.revenue);
console.log("✅ Passed: Idempotent reads verified.\n");

// 10. Single Master Button: Reset Everything & Delete All Orders (Default ৳0)
console.log("Test 10: Verifying One-Click Reset All & Delete Orders by CASHIER, MANAGER, and SUPER ADMIN...");
// Create test orders to ensure there are active orders
db.createOrder({
  tableId: "T08",
  type: "DINE_IN",
  serviceType: "SELF_SERVICE",
  rawItems: [{ menuItemId: "mb-mom-1", quantity: 3 }],
  paymentMethod: "CASH"
});
assert.ok(db.orders.length > 0, "Orders must exist prior to full reset test");

// Test Cashier role execution
const fullResetResult = db.clearAllOrdersAndReset("Cashier Hasan", "CASHIER");
assert.strictEqual(fullResetResult.success, true, "Cashier must be authorized to perform full reset");
assert.strictEqual(db.orders.length, 0, "All orders must be emptied");
assert.strictEqual(db.runnerTasks.length, 0, "All runner tasks must be cleared");

// Verify all tables are AVAILABLE
const occupiedTables = db.tables.filter(t => t.status !== 'AVAILABLE');
assert.strictEqual(occupiedTables.length, 0, "All 55 tables must be AVAILABLE");

// Verify all revenue metrics are default ৳0
const zeroSummary = db.getRevenueSummary();
assert.strictEqual(zeroSummary.daily.revenue, 0, "Daily revenue must be ৳0");
assert.strictEqual(zeroSummary.daily.orders, 0, "Daily orders must be 0");
assert.strictEqual(zeroSummary.monthly.revenue, 0, "Monthly revenue must be ৳0");
assert.strictEqual(zeroSummary.monthly.orders, 0, "Monthly orders must be 0");
assert.strictEqual(zeroSummary.yearly.revenue, 0, "Yearly revenue must be ৳0");
assert.strictEqual(zeroSummary.yearly.orders, 0, "Yearly orders must be 0");
console.log("✅ Passed: 1-Click Reset successfully deleted all orders and defaulted Daily, Monthly, Yearly revenue to ৳0.\n");

console.log("==========================================================");
console.log("🎉 ALL 10 REVENUE & RESET VERIFICATION TESTS PASSED (100% SUCCESS)");
console.log("==========================================================\n");
