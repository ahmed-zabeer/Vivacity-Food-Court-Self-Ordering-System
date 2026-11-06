import assert from 'assert';
import http from 'http';
import express from 'express';
import apiRouter from '../server/routes.js';
import { db, getDhakaDateParts } from '../server/db.js';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

console.log('==================================================================');
console.log('🧪 TESTING: CHECKOUT ORDER TYPE & DAILY PROFIT DASHBOARD SUITE');
console.log('==================================================================\n');

async function runTests() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    const today = getDhakaDateParts(new Date()).dateStr;

    // -------------------------------------------------------------
    // FEATURE 1 TESTS: Dine-in / Takeaway Order Type Selection
    // -------------------------------------------------------------
    console.log('Test 1: Verifying mandatory explicit Order Type (Dine-in / Takeaway)...');
    
    // Attempt order without customerOrderType
    const resNoOrderType = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'T12',
        serviceType: 'SELF_SERVICE',
        paymentMethod: 'CASH',
        customerName: 'Rahim Khan',
        customerPhone: '01712345678',
        rawItems: [{ menuItemId: 'mb-mom-1', quantity: 1 }]
      })
    });

    const bodyNoOrderType = await resNoOrderType.json();
    assert.strictEqual(resNoOrderType.status, 400, 'Should reject order without customerOrderType');
    assert.strictEqual(
      bodyNoOrderType.error,
      'Please select Dine-in or Takeaway to continue.',
      'Validation message must match exact specification'
    );
    console.log('  -> Rejected missing order type with exact required validation message.');

    // Attempt order with invalid customerOrderType
    const resInvalidOrderType = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'T12',
        customerOrderType: 'INVALID_TYPE',
        serviceType: 'SELF_SERVICE',
        paymentMethod: 'CASH',
        customerName: 'Rahim Khan',
        customerPhone: '01712345678',
        rawItems: [{ menuItemId: 'mb-mom-1', quantity: 1 }]
      })
    });

    const bodyInvalidOrderType = await resInvalidOrderType.json();
    assert.strictEqual(resInvalidOrderType.status, 400);
    assert.strictEqual(bodyInvalidOrderType.error, 'Please select Dine-in or Takeaway to continue.');
    console.log('  -> Rejected invalid order type.');

    console.log('\nTest 2: Verifying Independent Validation of Order Type and Service Type...');
    // Attempt with customerOrderType but missing serviceType
    const resNoServiceType = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'T12',
        customerOrderType: 'DINE_IN',
        paymentMethod: 'CASH',
        customerName: 'Rahim Khan',
        customerPhone: '01712345678',
        rawItems: [{ menuItemId: 'mb-mom-1', quantity: 1 }]
      })
    });

    const bodyNoServiceType = await resNoServiceType.json();
    assert.strictEqual(resNoServiceType.status, 400);
    assert.strictEqual(
      bodyNoServiceType.error,
      'Please select Self-Service or Table Service to continue.'
    );
    console.log('  -> Both selections are independently validated.');

    console.log('\nTest 3: Creating and Persisting Dine-in and Takeaway Orders...');
    // Create valid Dine-in order with Self-Service
    const resDineIn = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'T12',
        customerOrderType: 'DINE_IN',
        serviceType: 'SELF_SERVICE',
        paymentMethod: 'CASH',
        customerName: 'Karim Ahmed',
        customerPhone: '01812345678',
        rawItems: [{ menuItemId: 'mb-mom-1', quantity: 2 }]
      })
    });

    const bodyDineIn = await resDineIn.json();
    assert.strictEqual(resDineIn.status, 201);
    assert.strictEqual(bodyDineIn.customerOrderType, 'DINE_IN');
    assert.strictEqual(bodyDineIn.serviceCharge, 0, 'Self-service fee must be ৳0');
    console.log(`  -> Created Dine-in order Token #${bodyDineIn.token} successfully.`);

    // Create valid Takeaway order with Table Service (5% fee)
    const resTakeaway = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'T12',
        customerOrderType: 'TAKEAWAY',
        serviceType: 'TABLE_SERVICE',
        paymentMethod: 'bKash',
        customerName: 'Nusrat Jahan',
        customerPhone: '01912345678',
        rawItems: [{ menuItemId: 'mb-mom-1', quantity: 2 }] // ৳300 subtotal
      })
    });

    const bodyTakeaway = await resTakeaway.json();
    assert.strictEqual(resTakeaway.status, 201);
    assert.strictEqual(bodyTakeaway.customerOrderType, 'TAKEAWAY');
    assert.strictEqual(bodyTakeaway.serviceCharge, 15, 'Table service 5% waiter fee (৳15) preserved');
    console.log(`  -> Created Takeaway order Token #${bodyTakeaway.token} successfully.`);

    // -------------------------------------------------------------
    // FEATURE 2 TESTS: Financial Overview, Expenses & Daily Profit
    // -------------------------------------------------------------
    console.log('\nTest 4: Verifying Backend Role Enforcement for Expenses...');
    // Unauthorized user role
    const resExpUnauth = await fetch(`${baseUrl}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'CUSTOMER'
      },
      body: JSON.stringify({
        amount: 2500,
        date: today,
        category: 'Food Cost',
        notes: 'Unauthorized attempt'
      })
    });
    assert.strictEqual(resExpUnauth.status, 403, 'Should reject unauthorized customer role');
    console.log('  -> Customer role blocked with 403 Forbidden.');

    // Authorized user roles: MANAGER
    const resExpAuth = await fetch(`${baseUrl}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'MANAGER',
        'x-user-name': 'Operations Manager'
      },
      body: JSON.stringify({
        amount: 4500,
        date: today,
        category: 'Food Cost',
        notes: 'Wholesale chicken & spices delivery'
      })
    });

    const bodyExpAuth = await resExpAuth.json();
    assert.strictEqual(resExpAuth.status, 201);
    assert.strictEqual(bodyExpAuth.amount, 4500);
    assert.strictEqual(bodyExpAuth.category, 'Food Cost');
    assert.strictEqual(bodyExpAuth.createdBy, 'Operations Manager');
    assert.strictEqual(Array.isArray(bodyExpAuth.history), true);
    assert.strictEqual(bodyExpAuth.history.length, 1);
    console.log(`  -> Authorized manager added expense of ৳${bodyExpAuth.amount} with initial history record.`);

    const expenseId = bodyExpAuth.id;

    console.log('\nTest 5: Verifying Expense Correction Without Losing History...');
    const resExpCorrect = await fetch(`${baseUrl}/expenses/${expenseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'SUPER ADMIN',
        'x-user-name': 'Chief Administrator'
      },
      body: JSON.stringify({
        amount: 4200,
        notes: 'Corrected invoice after discount'
      })
    });

    const bodyExpCorrect = await resExpCorrect.json();
    assert.strictEqual(resExpCorrect.status, 200);
    assert.strictEqual(bodyExpCorrect.amount, 4200);
    assert.strictEqual(bodyExpCorrect.history.length, 2, 'History array must preserve previous revision');
    assert.strictEqual(bodyExpCorrect.history[0].amount, 4500, 'Original amount preserved in revision 0');
    assert.strictEqual(bodyExpCorrect.history[1].amount, 4200, 'New amount recorded in correction revision 1');
    assert.strictEqual(bodyExpCorrect.history[1].modifiedBy, 'Chief Administrator');
    console.log('  -> Expense corrected successfully while completely preserving revision history.');

    console.log('\nTest 6: Verifying Accurate Daily Revenue & Daily Profit Calculation...');
    // Initial summary
    const resInitSummary = await fetch(`${baseUrl}/financial/daily-summary?date=${today}`);
    assert.strictEqual(resInitSummary.status, 200);
    const initialSummary = await resInitSummary.json();
    const revBefore = initialSummary.revenue;
    const expBefore = initialSummary.expenses;
    const profitBefore = initialSummary.profit;

    assert.strictEqual(profitBefore, revBefore - expBefore, 'Formula Daily Profit = Daily Revenue - Daily Expenses strictly holds');
    console.log(`  -> Initial: Revenue = ৳${revBefore}, Expenses = ৳${expBefore}, Profit = ৳${profitBefore}`);

    // Create an order in PAYMENT DUE (unpaid) - should NOT increase revenue
    const resUnpaid = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'T15',
        customerOrderType: 'DINE_IN',
        serviceType: 'SELF_SERVICE',
        paymentMethod: 'CASH',
        customerName: 'Test Unpaid',
        customerPhone: '01711111111',
        rawItems: [{ menuItemId: 'mb-mom-1', quantity: 2 }] // ৳300
      })
    });
    const bodyUnpaid = await resUnpaid.json();

    const resSummaryAfterUnpaid = await fetch(`${baseUrl}/financial/daily-summary?date=${today}`);
    const summaryAfterUnpaid = await resSummaryAfterUnpaid.json();
    assert.strictEqual(summaryAfterUnpaid.revenue, revBefore, 'Unpaid orders must NOT be counted as received revenue');
    console.log('  -> Verified: Unpaid / PAYMENT DUE order was NOT counted in received revenue.');

    // Confirm payment for this order
    const resPaid = await fetch(`${baseUrl}/orders/${bodyUnpaid.id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: 'CASH',
        transactionId: 'TXN-TEST-1234',
        cashierName: 'Central Cashier'
      })
    });
    const bodyPaid = await resPaid.json();
    assert.strictEqual(bodyPaid.paymentStatus, 'PAID');

    const resSummaryAfterPaid = await fetch(`${baseUrl}/financial/daily-summary?date=${today}`);
    const summaryAfterPaid = await resSummaryAfterPaid.json();
    const expectedNewRevenue = revBefore + bodyPaid.grandTotal;
    assert.strictEqual(summaryAfterPaid.revenue, expectedNewRevenue, 'Paid order successfully added to daily revenue');
    assert.strictEqual(
      summaryAfterPaid.profit,
      summaryAfterPaid.revenue - summaryAfterPaid.expenses,
      'Daily profit accurately recalculated after payment'
    );
    console.log(`  -> Verified: Payment confirmation updated Daily Revenue to ৳${summaryAfterPaid.revenue} and Profit to ৳${summaryAfterPaid.profit}.`);

    console.log('\nTest 7: Verifying Financial Graph (7-Day Comparative Data)...');
    const resGraph = await fetch(`${baseUrl}/financial/graph?days=7`);
    assert.strictEqual(resGraph.status, 200);
    const bodyGraph = await resGraph.json();
    assert.strictEqual(Array.isArray(bodyGraph), true);
    assert.strictEqual(bodyGraph.length, 7);
    const todayGraphItem = bodyGraph.find(g => g.date === today);
    assert.ok(todayGraphItem, 'Today data point exists in graph');
    assert.strictEqual(todayGraphItem.profit, todayGraphItem.revenue - todayGraphItem.expenses);
    console.log('  -> 7-Day financial comparison graph points verified.');

    console.log('\nTest 8: Verifying Expense Deletion and Persistence...');
    const resDel = await fetch(`${baseUrl}/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: {
        'x-user-role': 'MANAGER',
        'x-user-name': 'Operations Manager'
      }
    });
    assert.strictEqual(resDel.status, 200);
    const bodyDel = await resDel.json();
    assert.strictEqual(bodyDel.success, true);

    const resSummaryAfterDelete = await fetch(`${baseUrl}/financial/daily-summary?date=${today}`);
    const summaryAfterDelete = await resSummaryAfterDelete.json();
    assert.strictEqual(summaryAfterDelete.expenses, expBefore - 4200);
    console.log(`  -> Expense deleted; daily expenses accurately adjusted to ৳${summaryAfterDelete.expenses}.`);

    console.log('\n==================================================================');
    console.log('🎉 ALL 8 CHECKOUT ORDER TYPE & DAILY PROFIT TESTS PASSED (100%)!');
    console.log('==================================================================\n');
  } finally {
    server.close();
  }
}

runTests();
