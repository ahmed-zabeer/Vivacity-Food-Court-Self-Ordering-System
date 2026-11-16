import { getDhakaDateParts } from '../db.js';

export class DailyClosingEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * Retrieves or computes the daily closing financial report for a specific date in Asia/Dhaka
   */
  getDailyClosingReport(targetDate = null) {
    const dateStr = targetDate || getDhakaDateParts(new Date()).dateStr;

    // Filter today's orders
    const dayOrders = this.db.orders.filter(o => {
      const oDate = getDhakaDateParts(new Date(o.paidAt || o.createdAt)).dateStr;
      return oDate === dateStr;
    });

    // Sales Metrics
    let totalOrders = dayOrders.length;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let totalFoodQty = 0;
    let grossSales = 0;
    let totalDiscounts = 0;
    let totalRefunds = 0;
    let netSales = 0;

    const salesByStall = {};
    const salesByPaymentMethod = {
      CASH: 0,
      bKash: 0,
      Nagad: 0,
      'Online Card': 0,
      'NFC / Contactless': 0
    };

    let cashSalesReceived = 0;
    let cashRefunds = 0;

    for (const order of dayOrders) {
      if (order.status === 'COMPLETED') completedOrders++;
      if (order.status === 'CANCELLED') cancelledOrders++;

      const isPaid = order.paymentStatus === 'PAID' && order.status !== 'CANCELLED';
      const isRefunded = order.paymentStatus === 'REFUNDED';

      if (isRefunded) {
        const amt = Number(order.grandTotal) || 0;
        totalRefunds += amt;
        if (order.paymentMethod === 'CASH') cashRefunds += amt;
        continue;
      }

      if (isPaid) {
        grossSales += (Number(order.subtotal) || 0);
        totalDiscounts += (Number(order.discount) || 0);
        const grand = Number(order.grandTotal) || 0;
        netSales += grand;

        const m = order.paymentMethod || 'CASH';
        if (salesByPaymentMethod[m] !== undefined) {
          salesByPaymentMethod[m] += grand;
        } else {
          salesByPaymentMethod.CASH += grand;
        }

        if (m === 'CASH') cashSalesReceived += grand;

        for (const item of (order.items || [])) {
          totalFoodQty += (Number(item.quantity) || 1);
          const sid = item.stallId;
          const stall = this.db.stalls.find(s => s.id === sid);
          const sName = stall?.name || sid;
          salesByStall[sName] = (salesByStall[sName] || 0) + (Number(item.price) || 0) * (Number(item.quantity) || 1);
        }
      }
    }

    // Expense Metrics
    const dayExpenses = (this.db.expenses || []).filter(e => {
      const eDate = e.date || getDhakaDateParts(new Date(e.createdAt)).dateStr;
      return eDate === dateStr;
    });

    let cashExpenses = 0;
    let bankMobileExpenses = 0;
    let dueExpenses = 0;
    let totalExpenses = 0;

    for (const exp of dayExpenses) {
      const amt = Number(exp.amount) || 0;
      totalExpenses += amt;
      const paid = exp.paidAmount !== undefined ? Number(exp.paidAmount) : (exp.paymentStatus === 'UNPAID' ? 0 : amt);
      const due = Math.max(0, amt - paid);
      dueExpenses += due;

      if (paid > 0) {
        if ((exp.paymentMethod || 'CASH') === 'CASH') {
          cashExpenses += paid;
        } else {
          bankMobileExpenses += paid;
        }
      }
    }

    // Purchase Metrics
    const dayPurchases = (this.db.purchases || []).filter(p => {
      const pDate = p.date || getDhakaDateParts(new Date(p.createdAt)).dateStr;
      return pDate === dateStr;
    });

    let totalPurchases = 0;
    let goodsReceived = 0;
    let supplierPayments = 0;
    let supplierOutstanding = 0;
    let cashPurchasesPaid = 0;

    for (const p of dayPurchases) {
      const amt = Number(p.amount) || 0;
      totalPurchases += amt;
      const isPaid = p.status === 'PAID' || p.paymentStatus === 'PAID';
      const paid = p.paidAmount !== undefined ? Number(p.paidAmount) : (isPaid ? amt : 0);
      const due = Math.max(0, amt - paid);

      supplierPayments += paid;
      supplierOutstanding += due;

      if (p.orderStatus === 'RECEIVED' || isPaid) goodsReceived += amt;
      if (paid > 0 && (p.paymentMethod || 'CASH') === 'CASH') cashPurchasesPaid += paid;
    }

    // Inventory Metrics
    const valuation = this.db.inventoryReports ? this.db.inventoryReports.getInventoryValuation() : { totalValuation: 0 };
    const dayMovements = (this.db.inventoryMovements || []).filter(m => {
      const mDate = m.date || m.timestamp?.slice(0, 10);
      return mDate === dateStr;
    });

    let dayWastageValue = 0;
    for (const mov of dayMovements) {
      if (mov.movementType === 'WASTAGE' || mov.movementType === 'DAMAGE') {
        dayWastageValue += (Number(mov.totalValue) || 0);
      }
    }

    const cogs = Math.round(netSales * 0.40) + dayWastageValue; // 40% standard benchmark or direct
    const grossProfit = netSales - cogs;
    const netProfit = grossProfit - totalExpenses;

    // Cash Management & Drawer Count
    const reconciliation = (this.db.cashReconciliations || []).find(r => r.date === dateStr) || {
      date: dateStr,
      openingCash: 5000, // Standard ৳5,000 float in drawer
      cashDeposits: 0,
      cashWithdrawals: 0,
      adjustments: 0,
      countedCash: null,
      discrepancy: null,
      notes: '',
      isClosed: false,
      closedBy: null,
      closedAt: null
    };

    const openingCash = Number(reconciliation.openingCash) || 5000;
    const cashDeposits = Number(reconciliation.cashDeposits) || 0;
    const cashWithdrawals = Number(reconciliation.cashWithdrawals) || 0;
    const adjustments = Number(reconciliation.adjustments) || 0;

    // Expected Cash Formula: Opening + Cash Sales - Refunds - Cash Expenses - Cash Purchases + Deposits - Withdrawals +/- Adjustments
    const expectedClosingCash = openingCash + cashSalesReceived - cashRefunds - cashExpenses - cashPurchasesPaid + cashDeposits - cashWithdrawals + adjustments;
    const countedCash = reconciliation.countedCash !== null ? Number(reconciliation.countedCash) : null;
    const cashDiscrepancy = countedCash !== null ? (countedCash - expectedClosingCash) : null;

    return {
      date: dateStr,
      isClosed: !!reconciliation.isClosed,
      closedBy: reconciliation.closedBy,
      closedAt: reconciliation.closedAt,

      // Sales
      sales: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        totalFoodQty,
        grossSales,
        discounts: totalDiscounts,
        refunds: totalRefunds,
        netSales,
        salesByStall,
        salesByPaymentMethod
      },

      // Expenses
      expenses: {
        cashExpenses,
        bankMobileExpenses,
        dueExpenses,
        totalExpenses
      },

      // Purchases
      purchases: {
        totalPurchases,
        goodsReceived,
        supplierPayments,
        supplierOutstanding,
        cashPurchasesPaid
      },

      // Inventory
      inventory: {
        currentStockValue: valuation.totalValuation,
        purchasesReceived: goodsReceived,
        wastageLoss: dayWastageValue
      },

      // Profitability
      profitability: {
        netSales,
        cogs,
        grossProfit,
        operatingExpenses: totalExpenses,
        netProfit,
        profitMargin: netSales > 0 ? Number(((netProfit / netSales) * 100).toFixed(1)) : 0
      },

      // Cash Management
      cashManagement: {
        openingCash,
        cashSalesReceived,
        cashRefunds,
        cashExpenses,
        cashPurchasesPaid,
        cashDeposits,
        cashWithdrawals,
        adjustments,
        expectedClosingCash,
        countedCash,
        cashDiscrepancy,
        isReconciled: cashDiscrepancy === 0,
        notes: reconciliation.notes || ''
      },

      // Non-Cash Collections (Kept strictly separate from physical till)
      nonCashCollections: {
        bKash: salesByPaymentMethod.bKash,
        Nagad: salesByPaymentMethod.Nagad,
        onlineCard: salesByPaymentMethod['Online Card'],
        nfcContactless: salesByPaymentMethod['NFC / Contactless'],
        totalNonCash: (salesByPaymentMethod.bKash + salesByPaymentMethod.Nagad + salesByPaymentMethod['Online Card'] + salesByPaymentMethod['NFC / Contactless'])
      }
    };
  }

  /**
   * Records physical cash count and daily closing reconciliation
   */
  recordCashReconciliation({ date, openingCash = 5000, countedCash, cashDeposits = 0, cashWithdrawals = 0, adjustments = 0, notes = '', closedBy = 'Manager' }) {
    if (countedCash === undefined || countedCash === null || isNaN(Number(countedCash))) {
      throw new Error('Please enter a valid numeric physical cash count.');
    }

    const dateStr = date || getDhakaDateParts(new Date()).dateStr;
    if (!this.db.cashReconciliations) {
      this.db.cashReconciliations = [];
    }

    const report = this.getDailyClosingReport(dateStr);
    const expected = report.cashManagement.openingCash +
      report.cashManagement.cashSalesReceived -
      report.cashManagement.cashRefunds -
      report.cashManagement.cashExpenses -
      report.cashManagement.cashPurchasesPaid +
      Number(cashDeposits) -
      Number(cashWithdrawals) +
      Number(adjustments);

    const numericCounted = Number(countedCash);
    const discrepancy = numericCounted - expected;

    const record = {
      date: dateStr,
      openingCash: Number(openingCash),
      countedCash: numericCounted,
      expectedCash: expected,
      discrepancy,
      cashDeposits: Number(cashDeposits),
      cashWithdrawals: Number(cashWithdrawals),
      adjustments: Number(adjustments),
      notes: notes.trim(),
      isClosed: true,
      closedBy,
      closedAt: new Date().toISOString()
    };

    const existingIndex = this.db.cashReconciliations.findIndex(r => r.date === dateStr);
    if (existingIndex >= 0) {
      this.db.cashReconciliations[existingIndex] = record;
    } else {
      this.db.cashReconciliations.push(record);
    }

    if (this.db._saveCashReconciliations) {
      this.db._saveCashReconciliations();
    }

    this.db.logAudit('DAILY_CASH_CLOSING', `Daily closing recorded for ${dateStr} by ${closedBy}. Counted: ৳${numericCounted}, Discrepancy: ৳${discrepancy}`, { record }, closedBy);

    return this.getDailyClosingReport(dateStr);
  }
}
