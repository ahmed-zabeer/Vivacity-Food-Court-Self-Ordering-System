import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../server/db.js';
import { FOOD_COURT_INFO, orderTypeLabel } from '../src/config/receipt.ts';

test('1. Stationery & Receipt Configuration', () => {
  assert.equal(FOOD_COURT_INFO.bin, '0026781320601', 'BIN must be 0026781320601');
  assert.equal(
    FOOD_COURT_INFO.facebook,
    'https://www.facebook.com/photo/?fbid=122120336648537222&set=pcb.122120338040537222',
    'Official Facebook URL must be preserved'
  );

  const dineInOrder = { customerOrderType: 'DINE_IN', type: 'DINE_IN' };
  const takeawayOrder = { customerOrderType: 'TAKEAWAY', type: 'PARCEL' };

  assert.equal(orderTypeLabel(dineInOrder), 'Dine-in', 'Dine-in label must not contain Hall / Table / Dining');
  assert.equal(orderTypeLabel(takeawayOrder), 'Takeaway', 'Takeaway label must not contain Carryout parcel box');
});

test('2. Kitchen Wastage Recording & Removal Audit Workflow', () => {
  const allItems = db.menuItems || [];
  assert.ok(allItems.length > 0, 'Menu items must exist');
  const targetItem = allItems[0];
  const initialSold = (db.inventory[targetItem.id]?.soldQty || 0);

  // Record a wastage entry
  const wastage = db.recordInventoryWastage({
    itemId: targetItem.id,
    quantity: 2,
    reason: 'Test Spoilage during automated testing',
    user: 'Test Chef',
    role: 'MANAGER'
  });

  assert.ok(wastage.id, 'Wastage movement record must have an ID');
  const soldAfterWastage = (db.inventory[targetItem.id]?.soldQty || 0);
  assert.equal(soldAfterWastage, initialSold + 2, 'Sold/consumed stock must increase by wasted quantity');

  // Remove the wastage record
  const removalResult = db.removeInventoryWastage(wastage.id, {
    user: 'Test Manager',
    role: 'MANAGER',
    reason: 'Incorrect entry entered by mistake'
  });

  assert.equal(removalResult.success, true, 'Removal must succeed');
  assert.equal(removalResult.reversedQuantity, 2, 'Reversed quantity must be 2');

  // Verify stock was restored
  const soldAfterRemoval = (db.inventory[targetItem.id]?.soldQty || 0);
  assert.equal(soldAfterRemoval, initialSold, 'Inventory soldQty must be restored to original balance');

  // Verify removed_wastage audit log exists in db
  assert.ok(db.removedWastage.some(rw => rw.originalMovement?.id === wastage.id), 'Audit trail must record the removed wastage');
});

test('3. Void Summary Report Calculation from Real Data', () => {
  const voidReport = db.getVoidSummaryReport({});
  assert.ok(typeof voidReport.totalRequests === 'number', 'totalRequests must be a number');
  assert.ok(typeof voidReport.pendingRequests === 'number', 'pendingRequests must be a number');
  assert.ok(typeof voidReport.approvedVoids === 'number', 'approvedVoids must be a number');
  assert.ok(typeof voidReport.rejectedRequests === 'number', 'rejectedRequests must be a number');
  assert.ok(typeof voidReport.totalVoidedSales === 'number', 'totalVoidedSales must be a number');
  assert.ok(typeof voidReport.totalRefundsIssued === 'number', 'totalRefundsIssued must be a number');
  assert.ok(Array.isArray(voidReport.requests), 'requests must be an array');
});

test('4. Reset History & Order Archival', () => {
  const initialHistory = db.getResetHistoryReport({});
  assert.ok(typeof initialHistory.totalResets === 'number', 'totalResets must be a number');
  assert.ok(Array.isArray(initialHistory.history), 'history must be an array');

  // Cashier attempt to reset must throw
  assert.throws(
    () => {
      db.clearAllOrdersAndReset({ user: 'Hasan', role: 'CASHIER', reason: 'Attempted cashier reset' });
    },
    /Unauthorized/i,
    'Cashier must be blocked from resetting orders and revenue'
  );

  // Manager reset with reason must succeed
  const managerResult = db.clearAllOrdersAndReset({
    user: 'Sajib Manager',
    role: 'MANAGER',
    reason: 'Automated test business shift archival'
  });

  assert.ok(managerResult.success, 'Manager reset must succeed');
  assert.equal(managerResult.summary.daily.revenue, 0, 'Daily revenue must be 0 after reset');

  // Check reset history report updated
  const updatedHistory = db.getResetHistoryReport({});
  assert.equal(updatedHistory.totalResets, initialHistory.totalResets + 1, 'Reset count must increment');
  const latestEntry = updatedHistory.history[0];
  const name = typeof latestEntry.performedBy === 'object' ? latestEntry.performedBy.name : latestEntry.performedBy;
  assert.equal(name, 'Sajib Manager');
  assert.equal(latestEntry.reason, 'Automated test business shift archival');
});
