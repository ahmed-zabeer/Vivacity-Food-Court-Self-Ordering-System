import assert from 'assert';
import http from 'http';

const BASE_URL = 'http://localhost:3000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

const ADMIN_HEADERS = {
  'x-user-role': 'SUPER ADMIN',
  'x-user-name': 'Chief Admin'
};

async function runTests() {
  console.log('==================================================================');
  console.log('🧪 TESTING: ACCOUNTING, INVENTORY, STALL PAUSE & REVIEW SUITE');
  console.log('==================================================================');

  // -------------------------------------------------------------------------
  // TEST 1: Inventory Portion Guard & Stock Limit Validation
  // -------------------------------------------------------------------------
  console.log('\nTest 1: Food Inventory Portion Guard (Stock setting & rejection)...');
  
  // Get menu items to pick one
  const menuRes = await request('GET', '/api/menu');
  assert.strictEqual(menuRes.status, 200);
  const testItem = menuRes.data[0];
  console.log(`  -> Selected item: "${testItem.name}" (ID: ${testItem.id}) from stall "${testItem.stallId}"`);

  // Set prepared stock to 8 portions
  const setStockRes = await request('PATCH', `/api/inventory/${testItem.id}/stock`, { preparedQty: 8 }, ADMIN_HEADERS);
  assert.strictEqual(setStockRes.status, 200, 'Setting stock should return 200');
  console.log(`  -> Stock set to 8 prepared portions. Available: ${setStockRes.data.inv.available}`);
  assert.strictEqual(setStockRes.data.inv.preparedQty, 8);

  // Attempt to order 9 portions -> Should be rejected with "Only X portions... are available"
  const overOrderRes = await request('POST', '/api/orders', {
    tableId: 'T01',
    type: 'DINE_IN',
    customerOrderType: 'DINE_IN',
    rawItems: [{ menuItemId: testItem.id, quantity: 9 }],
    customerName: 'Test Buyer',
    customerPhone: '01700000001',
    serviceType: 'SELF_SERVICE',
    paymentMethod: 'CASH'
  });

  assert.strictEqual(overOrderRes.status, 400, 'Exceeding stock should be rejected with 400');
  console.log(`  -> Exceeding stock order rejected with: "${overOrderRes.data.error}"`);
  assert(overOrderRes.data.error.includes('available'), 'Error message should explain remaining availability');

  // Place order for 5 portions -> Should succeed
  const validOrderRes = await request('POST', '/api/orders', {
    tableId: 'T01',
    type: 'DINE_IN',
    customerOrderType: 'DINE_IN',
    rawItems: [{ menuItemId: testItem.id, quantity: 5 }],
    customerName: 'Test Buyer',
    customerPhone: '01700000001',
    serviceType: 'SELF_SERVICE',
    paymentMethod: 'CASH'
  });
  assert.strictEqual(validOrderRes.status, 201, 'Valid stock order should succeed');
  const validOrder = validOrderRes.data;
  console.log(`  -> Order #${validOrder.token} placed for 5 portions.`);

  // Check inventory now: reserved should be 5, available should be 3
  const invResAfter = await request('GET', '/api/inventory');
  const updatedItemInv = invResAfter.data.find(i => i.id === testItem.id);
  console.log(`  -> Stock now: prepared=${updatedItemInv.inv.preparedQty}, reserved=${updatedItemInv.inv.reservedQty}, available=${updatedItemInv.inv.available}`);
  assert.strictEqual(updatedItemInv.inv.reservedQty, 5);
  assert.strictEqual(updatedItemInv.inv.available, 3);

  // Attempt to order 4 more portions -> Should fail because only 3 available
  const secondOverOrder = await request('POST', '/api/orders', {
    tableId: 'T01',
    type: 'DINE_IN',
    customerOrderType: 'DINE_IN',
    rawItems: [{ menuItemId: testItem.id, quantity: 4 }],
    customerName: 'Test Buyer 2',
    customerPhone: '01700000002',
    serviceType: 'SELF_SERVICE',
    paymentMethod: 'CASH'
  });
  assert.strictEqual(secondOverOrder.status, 400);
  console.log(`  -> Second exceeding order rejected: "${secondOverOrder.data.error}"`);

  // Release validOrder to kitchen: reserved converts to sold
  await request('POST', `/api/orders/${validOrder.id}/payment`, { paymentMethod: 'CASH', cashierName: 'Cashier' }, ADMIN_HEADERS);
  const invAfterPay = await request('GET', '/api/inventory');
  const itemAfterPay = invAfterPay.data.find(i => i.id === testItem.id);
  console.log(`  -> Paid & released: sold=${itemAfterPay.inv.soldQty}, reserved=${itemAfterPay.inv.reservedQty}, available=${itemAfterPay.inv.available}`);
  assert.strictEqual(itemAfterPay.inv.soldQty, 5);
  assert.strictEqual(itemAfterPay.inv.reservedQty, 0);

  // Reset stock back for clean state
  await request('PATCH', `/api/inventory/${testItem.id}/reset`, {}, ADMIN_HEADERS);
  console.log('✅ Passed: Inventory portion guard, atomic reservation, and limits verified.');

  // -------------------------------------------------------------------------
  // TEST 2: Temporarily Turn Off An Entire Stall
  // -------------------------------------------------------------------------
  console.log('\nTest 2: Temporarily Pause Entire Stall & Selective Ordering...');

  const stallsRes = await request('GET', '/api/stalls');
  assert.strictEqual(stallsRes.status, 200);
  const stallA = stallsRes.data[0];
  const stallB = stallsRes.data[1];
  console.log(`  -> Stall A to pause: "${stallA.name}" (ID: ${stallA.id})`);
  console.log(`  -> Stall B (open): "${stallB.name}" (ID: ${stallB.id})`);

  // Pause Stall A for 15 minutes
  const pauseRes = await request('POST', `/api/stalls/${stallA.id}/pause`, {
    reason: 'Deep cleaning kitchen and prep',
    durationMinutes: 15
  }, ADMIN_HEADERS);
  assert.strictEqual(pauseRes.status, 200);
  assert.strictEqual(pauseRes.data.isPaused, true);
  console.log(`  -> Stall "${stallA.name}" paused. Reason: "${pauseRes.data.pauseReason}"`);

  // Verify Stall Status
  const statusRes = await request('GET', `/api/stalls/${stallA.id}/status`);
  assert.strictEqual(statusRes.data.isPaused, true);

  // Attempt to place an order from paused Stall A -> MUST BE REJECTED
  const itemFromStallA = menuRes.data.find(m => m.stallId === stallA.id);
  const orderFromPaused = await request('POST', '/api/orders', {
    tableId: 'T02',
    type: 'DINE_IN',
    customerOrderType: 'DINE_IN',
    rawItems: [{ menuItemId: itemFromStallA.id, quantity: 1 }],
    customerName: 'Customer A',
    customerPhone: '01711111111',
    serviceType: 'SELF_SERVICE',
    paymentMethod: 'CASH'
  });
  assert.strictEqual(orderFromPaused.status, 400, 'Order from paused stall must be rejected with 400');
  console.log(`  -> Order from paused stall rejected with: "${orderFromPaused.data.error}"`);
  assert(orderFromPaused.data.error.includes('temporarily unavailable'), 'Must mention temporarily unavailable');

  // Attempt to place an order from open Stall B -> MUST SUCCEED
  const itemFromStallB = menuRes.data.find(m => m.stallId === stallB.id);
  const orderFromOpen = await request('POST', '/api/orders', {
    tableId: 'T02',
    type: 'DINE_IN',
    customerOrderType: 'DINE_IN',
    rawItems: [{ menuItemId: itemFromStallB.id, quantity: 1 }],
    customerName: 'Customer B',
    customerPhone: '01722222222',
    serviceType: 'SELF_SERVICE',
    paymentMethod: 'CASH'
  });
  assert.strictEqual(orderFromOpen.status, 201, 'Order from open stall must succeed');
  console.log(`  -> Order #${orderFromOpen.data.token} from open stall "${stallB.name}" succeeded!`);

  // Resume Stall A
  const resumeRes = await request('POST', `/api/stalls/${stallA.id}/resume`, {}, ADMIN_HEADERS);
  assert.strictEqual(resumeRes.status, 200);
  assert.strictEqual(resumeRes.data.isPaused, false);
  console.log(`  -> Stall "${stallA.name}" resumed successfully.`);

  // Now placing order from Stall A should succeed
  const orderAfterResume = await request('POST', '/api/orders', {
    tableId: 'T02',
    type: 'DINE_IN',
    customerOrderType: 'DINE_IN',
    rawItems: [{ menuItemId: itemFromStallA.id, quantity: 1 }],
    customerName: 'Customer A2',
    customerPhone: '01711111112',
    serviceType: 'SELF_SERVICE',
    paymentMethod: 'CASH'
  });
  assert.strictEqual(orderAfterResume.status, 201, 'Order from resumed stall must succeed');
  console.log(`  -> Order #${orderAfterResume.data.token} from resumed stall succeeded!`);
  console.log('✅ Passed: Stall pause / resume controls and selective order rejection verified.');

  // -------------------------------------------------------------------------
  // TEST 3: Customer Order Review (Rating & Feedback)
  // -------------------------------------------------------------------------
  console.log('\nTest 3: Customer Order Review Submission...');

  // Use orderAfterResume; progress it to DELIVERED
  const reviewOrder = orderAfterResume.data;
  await request('POST', `/api/orders/${reviewOrder.id}/payment`, { paymentMethod: 'CASH', cashierName: 'Cashier' }, ADMIN_HEADERS);
  
  // Attempt to submit review BEFORE order is delivered -> Should fail
  const earlyReview = await request('POST', `/api/orders/${reviewOrder.id}/review`, {
    rating: 5,
    feedback: 'Too early review'
  });
  assert.strictEqual(earlyReview.status, 400, 'Review before delivered status should fail');
  console.log(`  -> Review on non-delivered order rejected: "${earlyReview.data.error}"`);

  // Mark all stalls in order as DELIVERED
  for (const st of reviewOrder.stalls) {
    await request('PATCH', `/api/orders/${reviewOrder.id}/stalls/${st.stallId}/status`, { status: 'DELIVERED', staffName: 'Staff' }, ADMIN_HEADERS);
  }

  // Submit valid review (5 stars + feedback)
  const submitReviewRes = await request('POST', `/api/orders/${reviewOrder.id}/review`, {
    rating: 5,
    feedback: 'Amazing food quality and fast service!'
  });
  assert.strictEqual(submitReviewRes.status, 201, 'Review submission should succeed with 201');
  assert.strictEqual(submitReviewRes.data.rating, 5);
  console.log(`  -> Submitted 5-star review for Order #${reviewOrder.token}`);

  // Fetch the review
  const getReviewRes = await request('GET', `/api/orders/${reviewOrder.id}/review`);
  assert.strictEqual(getReviewRes.status, 200);
  assert.strictEqual(getReviewRes.data.rating, 5);
  assert.strictEqual(getReviewRes.data.feedback, 'Amazing food quality and fast service!');

  // Attempt duplicate review -> MUST FAIL (1 review per order)
  const duplicateReview = await request('POST', `/api/orders/${reviewOrder.id}/review`, {
    rating: 4,
    feedback: 'Duplicate attempt'
  });
  assert.strictEqual(duplicateReview.status, 400, 'Duplicate review must be rejected');
  console.log(`  -> Duplicate review rejected: "${duplicateReview.data.error}"`);
  console.log('✅ Passed: Customer order reviews, status check, and duplicate blocking verified.');

  // -------------------------------------------------------------------------
  // TEST 4: Accounting Page Endpoints & Financial Reports
  // -------------------------------------------------------------------------
  console.log('\nTest 4: Accounting Ledger, Purchases, Trial Balance & Balance Sheet...');

  // Add a supplier purchase
  const purchaseRes = await request('POST', '/api/purchases', {
    supplier: 'Fresh Farms Meat & Poultry',
    category: 'Food Cost',
    description: 'Bulk chicken breast & beef sirloin 20kg',
    amount: 5500,
    date: new Date().toISOString().slice(0, 10),
    status: 'UNPAID'
  }, ADMIN_HEADERS);
  assert.strictEqual(purchaseRes.status, 201);
  const purchase = purchaseRes.data;
  console.log(`  -> Added purchase invoice #${purchase.id.slice(0, 8)} for ৳${purchase.amount} (${purchase.status})`);

  // Verify purchases list
  const purchasesList = await request('GET', '/api/purchases', null, ADMIN_HEADERS);
  assert.strictEqual(purchasesList.status, 200);
  assert(purchasesList.data.some(p => p.id === purchase.id));

  // Verify Accounting Ledger
  const ledgerRes = await request('GET', '/api/accounting/ledger', null, ADMIN_HEADERS);
  assert.strictEqual(ledgerRes.status, 200);
  assert(Array.isArray(ledgerRes.data));
  console.log(`  -> Accounting Ledger returned ${ledgerRes.data.length} transactions with running balances.`);
  if (ledgerRes.data.length > 0) {
    const entry = ledgerRes.data[0];
    assert(entry.refNo);
    assert(typeof entry.debit === 'number');
    assert(typeof entry.credit === 'number');
    assert(typeof entry.balance === 'number');
  }

  // Verify Income Statement
  const incomeRes = await request('GET', '/api/accounting/income-statement', null, ADMIN_HEADERS);
  assert.strictEqual(incomeRes.status, 200);
  assert(typeof incomeRes.data.revenue === 'number');
  assert(typeof incomeRes.data.expensesTotal === 'number');
  assert(typeof incomeRes.data.purchasesTotal === 'number');
  assert(typeof incomeRes.data.netProfit === 'number');
  console.log(`  -> Income Statement: Revenue = ৳${incomeRes.data.revenue}, Costs = ৳${incomeRes.data.totalCosts}, Net Profit = ৳${incomeRes.data.netProfit}`);

  // Verify Trial Balance
  const trialRes = await request('GET', '/api/accounting/trial-balance', null, ADMIN_HEADERS);
  assert.strictEqual(trialRes.status, 200);
  assert(Array.isArray(trialRes.data.accounts));
  console.log(`  -> Trial Balance: Total Debits = ৳${trialRes.data.totalDebits}, Total Credits = ৳${trialRes.data.totalCredits}`);

  // Verify Balance Sheet
  const balanceSheetRes = await request('GET', '/api/accounting/balance-sheet', null, ADMIN_HEADERS);
  assert.strictEqual(balanceSheetRes.status, 200);
  assert(typeof balanceSheetRes.data.totalAssets === 'number');
  assert(typeof balanceSheetRes.data.totalLiabilities === 'number');
  assert(typeof balanceSheetRes.data.totalEquity === 'number');
  console.log(`  -> Balance Sheet: Assets = ৳${balanceSheetRes.data.totalAssets}, Liabilities = ৳${balanceSheetRes.data.totalLiabilities}, Equity = ৳${balanceSheetRes.data.totalEquity}`);

  // Clean up test purchase
  await request('DELETE', `/api/purchases/${purchase.id}`, null, ADMIN_HEADERS);

  console.log('✅ Passed: Accounting endpoints, ledger, purchases, and statements verified.');

  console.log('\n==================================================================');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY (100%)');
  console.log('==================================================================');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
