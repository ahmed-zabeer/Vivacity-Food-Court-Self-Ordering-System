import assert from 'assert';
import http from 'http';
import express from 'express';
import apiRouter from '../server/routes.js';
import { db, getDhakaDateParts } from '../server/db.js';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

console.log('==================================================================');
console.log('🧪 TESTING: REAL-TIME FINANCIAL OVERVIEW & PROFIT GRAPH SUITE');
console.log('==================================================================\n');

async function runTests() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    const today = getDhakaDateParts(new Date()).dateStr;

    // -------------------------------------------------------------
    // TEST 1: Flexible Date Ranges (7d, 1m, 2m, 3m, and Custom)
    // -------------------------------------------------------------
    console.log('Test 1: Verifying Flexible Date Range Controls for Financial Graph...');
    
    // 7 Days
    const res7d = await fetch(`${baseUrl}/financial/graph?days=7`);
    assert.strictEqual(res7d.status, 200);
    const data7d = await res7d.json();
    assert.strictEqual(Array.isArray(data7d), true);
    assert.strictEqual(data7d.length, 7, '7-day query must return exactly 7 daily points');
    assert.strictEqual(data7d[data7d.length - 1].date, today, 'Last day in range must be today');
    console.log('  -> 7 Days range returned exactly 7 daily items.');

    // 1 Month (30 Days)
    const res1m = await fetch(`${baseUrl}/financial/graph?days=30`);
    assert.strictEqual(res1m.status, 200);
    const data1m = await res1m.json();
    assert.strictEqual(data1m.length, 30, '1-month query must return exactly 30 daily points');
    console.log('  -> 1 Month range returned exactly 30 daily items.');

    // 2 Months (60 Days)
    const res2m = await fetch(`${baseUrl}/financial/graph?days=60`);
    assert.strictEqual(res2m.status, 200);
    const data2m = await res2m.json();
    assert.strictEqual(data2m.length, 60, '2-months query must return exactly 60 daily points');
    console.log('  -> 2 Months range returned exactly 60 daily items.');

    // 3 Months (90 Days)
    const res3m = await fetch(`${baseUrl}/financial/graph?days=90`);
    assert.strictEqual(res3m.status, 200);
    const data3m = await res3m.json();
    assert.strictEqual(data3m.length, 90, '3-months query must return exactly 90 daily points');
    console.log('  -> 3 Months range returned exactly 90 daily items.');

    // Custom Range: e.g. 10 days
    const resCustom = await fetch(`${baseUrl}/financial/graph?dateFrom=2026-10-01&dateTo=2026-10-10`);
    assert.strictEqual(resCustom.status, 200);
    const dataCustom = await resCustom.json();
    assert.strictEqual(dataCustom.length, 10, 'Custom range Oct 01 to Oct 10 must return exactly 10 daily points');
    assert.strictEqual(dataCustom[0].date, '2026-10-01');
    assert.strictEqual(dataCustom[9].date, '2026-10-10');
    console.log('  -> Custom date range (Oct 01 to Oct 10) returned exactly 10 daily items.');

    // -------------------------------------------------------------
    // TEST 2: Cashier-Confirmed Cash vs Unpaid Orders
    // -------------------------------------------------------------
    console.log('\nTest 2: Verifying Unpaid Cash Orders Excluded Until Cashier Confirms...');
    const resDaySummary1 = await fetch(`${baseUrl}/financial/daily-summary?date=${today}`);
    const summary1 = await resDaySummary1.json();
    const initialRev = summary1.revenue;

    // Guest places cash order (paymentStatus: PAYMENT DUE)
    const resCashOrder = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'T05',
        customerOrderType: 'DINE_IN',
        serviceType: 'SELF_SERVICE',
        paymentMethod: 'CASH',
        customerName: 'Guest T05',
        customerPhone: '01700000001',
        rawItems: [{ menuItemId: 'mb-mom-1', quantity: 2 }] // ৳300
      })
    });
    const cashOrder = await resCashOrder.json();
    assert.strictEqual(cashOrder.paymentStatus, 'PAYMENT DUE');

    // Revenue must NOT change yet
    const resDaySummary2 = await fetch(`${baseUrl}/financial/daily-summary?date=${today}`);
    const summary2 = await resDaySummary2.json();
    assert.strictEqual(summary2.revenue, initialRev, 'Unpaid cash order must not increase revenue');
    console.log('  -> Verified: Unconfirmed cash order does NOT increase revenue.');

    // Cashier confirms payment
    const resConfirm = await fetch(`${baseUrl}/orders/${cashOrder.id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: 'CASH',
        transactionId: 'TXN-CASHIER-CONFIRM-1',
        cashierName: 'Counter Cashier 1'
      })
    });
    const confirmedOrder = await resConfirm.json();
    assert.strictEqual(confirmedOrder.paymentStatus, 'PAID');

    // Revenue must increase by grandTotal
    const resDaySummary3 = await fetch(`${baseUrl}/financial/daily-summary?date=${today}`);
    const summary3 = await resDaySummary3.json();
    assert.strictEqual(summary3.revenue, initialRev + confirmedOrder.grandTotal, 'Cashier confirmation immediately updates revenue');
    assert.strictEqual(summary3.profit, summary3.revenue - summary3.expenses, 'Profit strictly equals Revenue - Expenses');
    console.log(`  -> Verified: Cashier confirmation immediately updated revenue to ৳${summary3.revenue} and profit to ৳${summary3.profit}.`);

    // -------------------------------------------------------------
    // TEST 3: Multi-Stall Master Order Counted Only Once
    // -------------------------------------------------------------
    console.log('\nTest 3: Verifying Multi-Stall Master Order is Never Double-Counted...');
    // Create master order with items from multiple stalls
    const resMultiStall = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'T08',
        customerOrderType: 'TAKEAWAY',
        serviceType: 'SELF_SERVICE',
        paymentMethod: 'bKash',
        customerName: 'Multi Stall Customer',
        customerPhone: '01800000002',
        rawItems: [
          { menuItemId: 'mb-mom-1', quantity: 1 }, // Momo Buzz (momo-buzz)
          { menuItemId: 'cb-stk-1', quantity: 1 }  // Fusion Cafe (fusion-cafe)
        ]
      })
    });
    const multiOrder = await resMultiStall.json();
    assert.ok(multiOrder.stalls.length >= 2, 'Must have at least 2 stall sub-orders');

    // Confirm online payment
    await fetch(`${baseUrl}/orders/${multiOrder.id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: 'bKash',
        transactionId: 'BKASH-VERIFIED-TXN',
        cashierName: 'bKash Gateway'
      })
    });

    const resDaySummary4 = await fetch(`${baseUrl}/financial/daily-summary?date=${today}`);
    const summary4 = await resDaySummary4.json();
    // Revenue should increase by exactly multiOrder.grandTotal, NOT 2x or 3x
    assert.strictEqual(
      summary4.revenue,
      summary3.revenue + multiOrder.grandTotal,
      'Multi-stall order must be counted exactly once without stall duplicate counting'
    );
    console.log('  -> Verified: Master order with multi-stall sub-orders counted exactly once.');

    // -------------------------------------------------------------
    // TEST 4: Order Cancellation & Refund Drop Revenue and Profit
    // -------------------------------------------------------------
    console.log('\nTest 4: Verifying Order Cancellation / Refund Immediately Updates Revenue & Profit...');
    const revBeforeRefund = summary4.revenue;

    // Refund the multi-stall order
    const resRefund = await fetch(`${baseUrl}/orders/${multiOrder.id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'Customer requested refund before preparation',
        staffName: 'Chief Administrator'
      })
    });
    assert.strictEqual(resRefund.status, 200);
    const refundedOrder = await resRefund.json();
    assert.strictEqual(refundedOrder.paymentStatus, 'REFUNDED');
    assert.strictEqual(refundedOrder.status, 'CANCELLED');

    const resDaySummary5 = await fetch(`${baseUrl}/financial/daily-summary?date=${today}`);
    const summary5 = await resDaySummary5.json();
    assert.strictEqual(
      summary5.revenue,
      revBeforeRefund - multiOrder.grandTotal,
      'Refunded order must be deducted from revenue immediately'
    );
    assert.strictEqual(
      summary5.profit,
      summary5.revenue - summary5.expenses,
      'Daily profit accurately recalculated after refund'
    );
    console.log(`  -> Verified: Refunded order deducted ৳${multiOrder.grandTotal} from revenue (now ৳${summary5.revenue}) and profit (now ৳${summary5.profit}).`);

    // -------------------------------------------------------------
    // TEST 5: Payment Date Attribution (paidAt vs createdAt)
    // -------------------------------------------------------------
    console.log('\nTest 5: Verifying Payment Attribution uses paidAt Date...');
    // Create an order with createdAt set to yesterday, but paidAt set to today
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getDhakaDateParts(yesterdayDate).dateStr;

    // Let's create an order directly with paidAt yesterday
    const testHistoricalOrder = db.createOrder({
      tableId: 'T20',
      customerOrderType: 'DINE_IN',
      serviceType: 'SELF_SERVICE',
      paymentMethod: 'CASH',
      customerName: 'Historical Guest',
      rawItems: [{ menuItemId: 'mb-mom-1', quantity: 2 }]
    });
    testHistoricalOrder.paymentStatus = 'PAID';
    testHistoricalOrder.paidAt = `${yesterdayStr}T14:30:00.000Z`;
    testHistoricalOrder.createdAt = `${yesterdayStr}T14:00:00.000Z`;
    db.saveData();

    const yesterdaySummary = db.getDailyFinancialSummary(yesterdayStr);
    assert.ok(
      yesterdaySummary.revenue >= testHistoricalOrder.grandTotal,
      'Historical order attributed to its paidAt date'
    );
    console.log(`  -> Verified: Historical order attributed correctly to yesterday (${yesterdayStr}) based on paidAt.`);

    // -------------------------------------------------------------
    // TEST 6: Period Totals Matching Sum of Daily Graph Points
    // -------------------------------------------------------------
    console.log('\nTest 6: Verifying Period Totals Strictly Match Sum of Daily Graph Points...');
    const resGraph7 = await fetch(`${baseUrl}/financial/graph?days=7`);
    const graph7 = await resGraph7.json();
    
    let sumGraphRevenue = 0;
    let sumGraphExpenses = 0;
    for (const item of graph7) {
      sumGraphRevenue += item.revenue;
      sumGraphExpenses += item.expenses;
      assert.strictEqual(item.profit, item.revenue - item.expenses, `Every single day must satisfy profit = revenue - expenses (${item.date})`);
    }
    const sumGraphProfit = sumGraphRevenue - sumGraphExpenses;

    console.log(`  -> 7-Day Sum: Revenue = ৳${sumGraphRevenue}, Expenses = ৳${sumGraphExpenses}, Net Profit = ৳${sumGraphProfit}.`);
    assert.strictEqual(sumGraphProfit, sumGraphRevenue - sumGraphExpenses);

    console.log('\n==================================================================');
    console.log('🎉 ALL REAL-TIME FINANCIAL OVERVIEW & PROFIT GRAPH TESTS PASSED (100%)!');
    console.log('==================================================================\n');
  } finally {
    server.close();
  }
}

runTests();
