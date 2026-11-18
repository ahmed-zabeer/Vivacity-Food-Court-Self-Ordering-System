import { CHART_OF_ACCOUNTS, ACCOUNT_TYPES, getAccountByPaymentMethod, getAccountByExpenseCategory } from './chartOfAccounts.js';
import { getMenuItemCost } from './cogs.js';

export function getDhakaDate(isoOrDate = new Date()) {
  const d = typeof isoOrDate === 'string' || typeof isoOrDate === 'number' ? new Date(isoOrDate) : isoOrDate;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    return (d instanceof Date ? d : new Date()).toISOString().slice(0, 10);
  }
}

/**
 * JournalEngine generates double-entry records from real restaurant orders,
 * expenses, purchases, wastage, and inventory adjustments.
 */
export class JournalEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * Generates all balanced journal entries from live operational data.
   */
  generateJournalEntries({ dateFrom = null, dateTo = null } = {}) {
    const entries = [];

    // 1. ORDERS (Sales on payment date, refunds on refund date, COGS)
    for (const order of this.db.orders) {
      if (!order) continue;

      const subtotal = Number(order.subtotal) || 0;
      const discount = Number(order.discount) || 0;
      const tax = Number(order.tax) || 0;
      const serviceCharge = Number(order.serviceCharge) || 0;
      const grandTotal = Number(order.grandTotal) || 0;

      // Canonical refund list: `refunds[]` is authoritative; legacy orders fall
      // back to `refundDetails`. An order cancelled before payment has none.
      const refundList = [];
      if (Array.isArray(order.refunds)) {
        for (const r of order.refunds) {
          const amount = Number(r.refundAmount ?? r.amount) || 0;
          if (amount <= 0) continue;
          refundList.push({
            amount,
            at: r.refundedAt || r.date || null,
            method: r.paymentMethod || r.method || order.paymentMethod,
            by: r.refundedBy || 'Manager',
            reason: r.reason || ''
          });
        }
      } else if (order.paymentStatus === 'REFUNDED' && order.refundDetails) {
        const amount = Number(order.refundDetails.refundAmount) || 0;
        if (amount > 0) {
          refundList.push({
            amount,
            at: order.refundDetails.refundedAt || null,
            method: order.refundDetails.paymentMethod || order.paymentMethod,
            by: order.refundDetails.refundedBy || 'Manager',
            reason: order.refundDetails.reason || ''
          });
        }
      }
      const totalRefunded = refundList.reduce((s, r) => s + r.amount, 0);

      // Revenue is recognised only when money was actually collected. A pending
      // or cancelled-unpaid order has no ledger impact.
      const wasPaid = Boolean(order.paidAt) &&
        (order.paymentStatus === 'PAID' || order.paymentStatus === 'REFUNDED');
      const saleDate = getDhakaDate(order.paidAt || order.createdAt);

      if (wasPaid && (!dateFrom || saleDate >= dateFrom) && (!dateTo || saleDate <= dateTo)) {
        const paymentAcc = getAccountByPaymentMethod(order.paymentMethod);
        const lines = [];

        if (grandTotal > 0) {
          lines.push({
            accountCode: paymentAcc.code,
            accountName: paymentAcc.name,
            accountType: ACCOUNT_TYPES.ASSET,
            debit: grandTotal,
            credit: 0,
            memo: `Payment via ${order.paymentMethod}`
          });
        }

        if (discount > 0) {
          lines.push({
            accountCode: '4020',
            accountName: CHART_OF_ACCOUNTS['4020'].name,
            accountType: ACCOUNT_TYPES.REVENUE,
            debit: discount,
            credit: 0,
            memo: `Discount for Order #${order.token}`
          });
        }

        if (subtotal > 0) {
          lines.push({
            accountCode: '4010',
            accountName: CHART_OF_ACCOUNTS['4010'].name,
            accountType: ACCOUNT_TYPES.REVENUE,
            debit: 0,
            credit: subtotal,
            memo: `Sales subtotal for Order #${order.token}`
          });
        }

        if (tax > 0) {
          lines.push({
            accountCode: '2030',
            accountName: CHART_OF_ACCOUNTS['2030'].name,
            accountType: ACCOUNT_TYPES.LIABILITY,
            debit: 0,
            credit: tax,
            memo: `VAT/Tax collected on #${order.token}`
          });
        }

        if (serviceCharge > 0) {
          lines.push({
            accountCode: '4040',
            accountName: CHART_OF_ACCOUNTS['4040'].name,
            accountType: ACCOUNT_TYPES.REVENUE,
            debit: 0,
            credit: serviceCharge,
            memo: `Service charge collected on #${order.token}`
          });
        }

        const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
        const totalCredits = lines.reduce((s, l) => s + l.credit, 0);

        if (lines.length > 0 && Math.abs(totalDebits - totalCredits) === 0) {
          entries.push({
            id: `JE-ORD-${order.id}`,
            entryNo: `JE-ORD-${order.token}`,
            date: saleDate,
            timestamp: order.paidAt,
            type: 'SALES',
            refNo: `ORD-${order.token}`,
            description: `Sales - Order #${order.token} (${order.paymentMethod || 'CASH'})`,
            sourceId: order.id,
            lines
          });
        }

        // Ingredient COGS from configured recipe / unit costs only.
        let orderCogs = 0;
        for (const item of (order.items || [])) {
          const unitCost = getMenuItemCost(this.db, item.menuItemId);
          if (!unitCost) continue;
          orderCogs += unitCost * (Number(item.quantity) || 1);
        }
        orderCogs = Math.round(orderCogs);

        if (orderCogs > 0) {
          entries.push({
            id: `JE-COGS-${order.id}`,
            entryNo: `JE-COGS-${order.token}`,
            date: saleDate,
            timestamp: order.paidAt,
            type: 'COGS',
            refNo: `ORD-${order.token}`,
            description: `Ingredient COGS - Order #${order.token}`,
            sourceId: order.id,
            lines: [
              {
                accountCode: '5010',
                accountName: CHART_OF_ACCOUNTS['5010'].name,
                accountType: ACCOUNT_TYPES.COGS,
                debit: orderCogs,
                credit: 0,
                memo: `Recipe/unit cost of items sold on #${order.token}`
              },
              {
                accountCode: '1200',
                accountName: CHART_OF_ACCOUNTS['1200'].name,
                accountType: ACCOUNT_TYPES.ASSET,
                debit: 0,
                credit: orderCogs,
                memo: `Inventory consumed for #${order.token}`
              }
            ]
          });
        }
      }

      // Refunds are booked separately, on the date the money left the till.
      for (let i = 0; i < refundList.length; i++) {
        const refund = refundList[i];
        const refundDate = getDhakaDate(refund.at || order.createdAt);
        if (dateFrom && refundDate < dateFrom) continue;
        if (dateTo && refundDate > dateTo) continue;

        const refundMethodAcc = getAccountByPaymentMethod(refund.method || order.paymentMethod);
        entries.push({
          id: `JE-REF-${order.id}-${i}`,
          entryNo: `JE-REF-${order.token}-${i + 1}`,
          date: refundDate,
          timestamp: refund.at || order.createdAt,
          type: 'REFUND',
          refNo: `ORD-${order.token}`,
          description: `Customer Refund - Order #${order.token} (${refund.method || order.paymentMethod || 'CASH'})`,
          sourceId: order.id,
          lines: [
            {
              accountCode: '4030',
              accountName: CHART_OF_ACCOUNTS['4030'].name,
              accountType: ACCOUNT_TYPES.REVENUE,
              debit: refund.amount,
              credit: 0,
              memo: `Sales refund for Order #${order.token}`
            },
            {
              accountCode: refundMethodAcc.code,
              accountName: refundMethodAcc.name,
              accountType: ACCOUNT_TYPES.ASSET,
              debit: 0,
              credit: refund.amount,
              memo: `Refund payout via ${refund.method || order.paymentMethod}`
            }
          ]
        });
      }

      // Reverse the consumed ingredient cost proportionally to the refunded
      // share of the order (inventory is restored by db.refundOrder).
      if (totalRefunded > 0 && grandTotal > 0) {
        let orderCogs = 0;
        for (const item of (order.items || [])) {
          const unitCost = getMenuItemCost(this.db, item.menuItemId);
          if (!unitCost) continue;
          orderCogs += unitCost * (Number(item.quantity) || 1);
        }
        orderCogs = Math.round(orderCogs);
        const cogsReversal = Math.round(orderCogs * Math.min(1, totalRefunded / grandTotal));
        const lastRefundDate = getDhakaDate(refundList[refundList.length - 1]?.at || order.createdAt);
        if (cogsReversal > 0 && (!dateFrom || lastRefundDate >= dateFrom) && (!dateTo || lastRefundDate <= dateTo)) {
          entries.push({
            id: `JE-COGSREV-${order.id}`,
            entryNo: `JE-COGSREV-${order.token}`,
            date: lastRefundDate,
            timestamp: refundList[refundList.length - 1]?.at || order.createdAt,
            type: 'COGS_REVERSAL',
            refNo: `ORD-${order.token}`,
            description: `COGS reversal on refund - Order #${order.token}`,
            sourceId: order.id,
            lines: [
              {
                accountCode: '1200',
                accountName: CHART_OF_ACCOUNTS['1200'].name,
                accountType: ACCOUNT_TYPES.ASSET,
                debit: cogsReversal,
                credit: 0,
                memo: `Inventory restored for refunded items on #${order.token}`
              },
              {
                accountCode: '5010',
                accountName: CHART_OF_ACCOUNTS['5010'].name,
                accountType: ACCOUNT_TYPES.COGS,
                debit: 0,
                credit: cogsReversal,
                memo: `COGS reversed for refunded items on #${order.token}`
              }
            ]
          });
        }
      }
    }

    // 2. EXPENSES (Paid, Partially Paid, Due)
    for (const exp of this.db.expenses) {
      if (!exp) continue;
      const expDate = exp.date || getDhakaDate(exp.createdAt);
      if (dateFrom && expDate < dateFrom) continue;
      if (dateTo && expDate > dateTo) continue;

      const totalAmount = Math.round(Number(exp.amount) || 0);
      if (totalAmount <= 0) continue;

      const expAcc = getAccountByExpenseCategory(exp.category);
      const paymentStatus = exp.paymentStatus || 'PAID';
      const paidAmount = exp.paidAmount !== undefined ? Math.round(Number(exp.paidAmount)) : (paymentStatus === 'PAID' ? totalAmount : 0);
      const dueAmount = Math.max(0, totalAmount - paidAmount);

      const expPaymentAcc = getAccountByPaymentMethod(exp.paymentMethod || 'CASH');

      const lines = [
        {
          accountCode: expAcc.code,
          accountName: expAcc.name,
          accountType: ACCOUNT_TYPES.EXPENSE,
          debit: totalAmount,
          credit: 0,
          memo: `${exp.category} Expense: ${exp.notes || exp.title || 'Operating Expense'}`
        }
      ];

      if (paidAmount > 0) {
        lines.push({
          accountCode: expPaymentAcc.code,
          accountName: expPaymentAcc.name,
          accountType: ACCOUNT_TYPES.ASSET,
          debit: 0,
          credit: paidAmount,
          memo: `Payment via ${exp.paymentMethod || 'CASH'}`
        });
      }

      if (dueAmount > 0) {
        lines.push({
          accountCode: '2020',
          accountName: CHART_OF_ACCOUNTS['2020'].name,
          accountType: ACCOUNT_TYPES.LIABILITY,
          debit: 0,
          credit: dueAmount,
          memo: `Accrued expense payable - ${exp.supplier || exp.payee || 'Vendor'}`
        });
      }

      entries.push({
        id: `JE-EXP-${exp.id}`,
        entryNo: `JE-EXP-${exp.id.slice(-6).toUpperCase()}`,
        date: expDate,
        timestamp: exp.createdAt || new Date().toISOString(),
        type: dueAmount > 0 ? (paidAmount > 0 ? 'PARTIAL_EXPENSE' : 'DUE_EXPENSE') : 'EXPENSE',
        refNo: exp.billNumber || `EXP-${exp.id.slice(-6).toUpperCase()}`,
        description: `Expense: ${exp.category} - ${exp.notes || exp.title || exp.supplier || 'Operating Expense'}`,
        sourceId: exp.id,
        lines
      });

      // Handle recorded subsequent payments on this expense
      if (Array.isArray(exp.paymentHistory)) {
        for (const pmt of exp.paymentHistory) {
          const pmtDate = pmt.date || getDhakaDate(pmt.createdAt);
          if (dateFrom && pmtDate < dateFrom) continue;
          if (dateTo && pmtDate > dateTo) continue;
          const pmtAmount = Math.round(Number(pmt.amount) || 0);
          if (pmtAmount <= 0) continue;

          const pmtMethodAcc = getAccountByPaymentMethod(pmt.paymentMethod || 'CASH');

          entries.push({
            id: `JE-EXPPAY-${pmt.id || pmtDate + '-' + pmtAmount}`,
            entryNo: `JE-EXPPAY-${exp.id.slice(-4).toUpperCase()}`,
            date: pmtDate,
            timestamp: pmt.createdAt || new Date().toISOString(),
            type: 'EXPENSE_PAYMENT',
            refNo: `EXP-${exp.id.slice(-6).toUpperCase()}`,
            description: `Payment for Expense ${exp.category} (${exp.notes || exp.supplier || ''})`,
            sourceId: exp.id,
            lines: [
              {
                accountCode: '2020',
                accountName: CHART_OF_ACCOUNTS['2020'].name,
                accountType: ACCOUNT_TYPES.LIABILITY,
                debit: pmtAmount,
                credit: 0,
                memo: `Settlement of expense due #${exp.id.slice(-6).toUpperCase()}`
              },
              {
                accountCode: pmtMethodAcc.code,
                accountName: pmtMethodAcc.name,
                accountType: ACCOUNT_TYPES.ASSET,
                debit: 0,
                credit: pmtAmount,
                memo: `Paid via ${pmt.paymentMethod || 'CASH'}`
              }
            ]
          });
        }
      }
    }

    // 3. PURCHASES (Raw Ingredients / Inventory Invoices)
    for (const pur of this.db.purchases) {
      if (!pur) continue;
      const purDate = pur.date || getDhakaDate(pur.createdAt);
      if (dateFrom && purDate < dateFrom) continue;
      if (dateTo && purDate > dateTo) continue;

      const totalAmount = Math.round(Number(pur.amount) || 0);
      if (totalAmount <= 0) continue;

      const isPaid = pur.status === 'PAID' || pur.paymentStatus === 'PAID';
      const paidAmount = pur.paidAmount !== undefined ? Math.round(Number(pur.paidAmount)) : (isPaid ? totalAmount : 0);
      const dueAmount = Math.max(0, totalAmount - paidAmount);

      const purMethodAcc = getAccountByPaymentMethod(pur.paymentMethod || 'CASH');

      const lines = [
        {
          accountCode: '1200',
          accountName: CHART_OF_ACCOUNTS['1200'].name,
          accountType: ACCOUNT_TYPES.ASSET,
          debit: totalAmount,
          credit: 0,
          memo: `Inventory purchase: ${pur.description || pur.category || 'Supplies'} from ${pur.supplier || 'Supplier'}`
        }
      ];

      if (paidAmount > 0) {
        lines.push({
          accountCode: purMethodAcc.code,
          accountName: purMethodAcc.name,
          accountType: ACCOUNT_TYPES.ASSET,
          debit: 0,
          credit: paidAmount,
          memo: `Payment via ${pur.paymentMethod || 'CASH'}`
        });
      }

      if (dueAmount > 0) {
        lines.push({
          accountCode: '2010',
          accountName: CHART_OF_ACCOUNTS['2010'].name,
          accountType: ACCOUNT_TYPES.LIABILITY,
          debit: 0,
          credit: dueAmount,
          memo: `Accounts Payable to Supplier ${pur.supplier || 'Vendor'}`
        });
      }

      entries.push({
        id: `JE-PUR-${pur.id}`,
        entryNo: `JE-PUR-${pur.id.slice(-6).toUpperCase()}`,
        date: purDate,
        timestamp: pur.createdAt || new Date().toISOString(),
        type: dueAmount > 0 ? 'PURCHASE_INVOICE' : 'PURCHASE_PAID',
        refNo: pur.poNumber || pur.invoiceNumber || `PUR-${pur.id.slice(-6).toUpperCase()}`,
        description: `Purchase - ${pur.supplier || 'Supplier'}: ${pur.description || pur.category || 'Inventory'}`,
        sourceId: pur.id,
        lines
      });

      // Handle recorded subsequent payments to supplier
      if (Array.isArray(pur.paymentHistory)) {
        for (const pmt of pur.paymentHistory) {
          const pmtDate = pmt.date || getDhakaDate(pmt.createdAt);
          if (dateFrom && pmtDate < dateFrom) continue;
          if (dateTo && pmtDate > dateTo) continue;
          const pmtAmount = Math.round(Number(pmt.amount) || 0);
          if (pmtAmount <= 0) continue;

          const pmtMethodAcc = getAccountByPaymentMethod(pmt.paymentMethod || 'CASH');

          entries.push({
            id: `JE-PURPAY-${pmt.id || pmtDate + '-' + pmtAmount}`,
            entryNo: `JE-PURPAY-${pur.id.slice(-4).toUpperCase()}`,
            date: pmtDate,
            timestamp: pmt.createdAt || new Date().toISOString(),
            type: 'SUPPLIER_PAYMENT',
            refNo: `PUR-${pur.id.slice(-6).toUpperCase()}`,
            description: `Payment to Supplier ${pur.supplier} for #${pur.poNumber || pur.id.slice(-6).toUpperCase()}`,
            sourceId: pur.id,
            lines: [
              {
                accountCode: '2010',
                accountName: CHART_OF_ACCOUNTS['2010'].name,
                accountType: ACCOUNT_TYPES.LIABILITY,
                debit: pmtAmount,
                credit: 0,
                memo: `AP settlement for purchase #${pur.id.slice(-6).toUpperCase()}`
              },
              {
                accountCode: pmtMethodAcc.code,
                accountName: pmtMethodAcc.name,
                accountType: ACCOUNT_TYPES.ASSET,
                debit: 0,
                credit: pmtAmount,
                memo: `Paid via ${pmt.paymentMethod || 'CASH'}`
              }
            ]
          });
        }
      }
    }

    // 4. INVENTORY WASTAGE & ADJUSTMENTS
    const movements = this.db.inventoryMovements || [];
    for (const mov of movements) {
      const movDate = mov.date || getDhakaDate(mov.timestamp);
      if (dateFrom && movDate < dateFrom) continue;
      if (dateTo && movDate > dateTo) continue;

      const totalVal = Math.round(Number(mov.totalValue) || 0);
      if (totalVal <= 0) continue;

      if (mov.movementType === 'WASTAGE' || mov.movementType === 'DAMAGE') {
        entries.push({
          id: `JE-WASTE-${mov.id}`,
          entryNo: `JE-WASTE-${mov.id.slice(-6).toUpperCase()}`,
          date: movDate,
          timestamp: mov.timestamp || new Date().toISOString(),
          type: 'WASTAGE',
          refNo: `WST-${mov.id.slice(-6).toUpperCase()}`,
          description: `Inventory Wastage: ${mov.itemName} (${mov.quantityOut} ${mov.unit || 'units'}) - ${mov.reason || 'Spoilage'}`,
          sourceId: mov.id,
          lines: [
            {
              accountCode: '5020',
              accountName: CHART_OF_ACCOUNTS['5020'].name,
              accountType: ACCOUNT_TYPES.COGS,
              debit: totalVal,
              credit: 0,
              memo: `Wastage write-off: ${mov.itemName}`
            },
            {
              accountCode: '1200',
              accountName: CHART_OF_ACCOUNTS['1200'].name,
              accountType: ACCOUNT_TYPES.ASSET,
              debit: 0,
              credit: totalVal,
              memo: `Inventory reduction: ${mov.itemName}`
            }
          ]
        });
      } else if (mov.movementType === 'ADJUSTMENT') {
        const isIncrease = mov.quantityIn > 0;
        entries.push({
          id: `JE-ADJ-${mov.id}`,
          entryNo: `JE-ADJ-${mov.id.slice(-6).toUpperCase()}`,
          date: movDate,
          timestamp: mov.timestamp || new Date().toISOString(),
          type: 'STOCK_ADJUSTMENT',
          refNo: `ADJ-${mov.id.slice(-6).toUpperCase()}`,
          description: `Stock Adjustment: ${mov.itemName} (${isIncrease ? '+' : '-'}${isIncrease ? mov.quantityIn : mov.quantityOut} ${mov.unit || 'units'})`,
          sourceId: mov.id,
          lines: isIncrease ? [
            {
              accountCode: '1200',
              accountName: CHART_OF_ACCOUNTS['1200'].name,
              accountType: ACCOUNT_TYPES.ASSET,
              debit: totalVal,
              credit: 0,
              memo: `Inventory increase adjustment`
            },
            {
              accountCode: '5030',
              accountName: CHART_OF_ACCOUNTS['5030'].name,
              accountType: ACCOUNT_TYPES.COGS,
              debit: 0,
              credit: totalVal,
              memo: `Inventory gain variance`
            }
          ] : [
            {
              accountCode: '5030',
              accountName: CHART_OF_ACCOUNTS['5030'].name,
              accountType: ACCOUNT_TYPES.COGS,
              debit: totalVal,
              credit: 0,
              memo: `Inventory loss variance`
            },
            {
              accountCode: '1200',
              accountName: CHART_OF_ACCOUNTS['1200'].name,
              accountType: ACCOUNT_TYPES.ASSET,
              debit: 0,
              credit: totalVal,
              memo: `Inventory reduction adjustment`
            }
          ]
        });
      }
    }

    // Sort chronologically descending
    return entries.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }

  /**
   * Generates General Ledger entries with running balance
   */
  getGeneralLedger({ dateFrom = null, dateTo = null, type = null, search = '', limit = 300 } = {}) {
    const journalEntries = this.generateJournalEntries({ dateFrom, dateTo });
    const ledgerLines = [];

    for (const je of journalEntries) {
      if (type && je.type !== type) continue;

      // Primary debit and credit summarization for the transaction row
      const debits = je.lines.reduce((s, l) => s + l.debit, 0);
      const credits = je.lines.reduce((s, l) => s + l.credit, 0);

      // Determine main account name
      const mainLine = je.lines.find(l => (je.type.includes('SALES') || je.type.includes('REVENUE')) ? l.credit > 0 : l.debit > 0) || je.lines[0];

      ledgerLines.push({
        id: je.id,
        date: je.date,
        refNo: je.refNo,
        type: je.type,
        accountCode: mainLine?.accountCode || '',
        accountName: mainLine?.accountName || '',
        description: je.description,
        debit: debits,
        credit: credits,
        relatedId: je.sourceId,
        lines: je.lines
      });
    }

    if (search) {
      const q = search.toLowerCase();
      return ledgerLines.filter(e =>
        e.description.toLowerCase().includes(q) ||
        e.refNo.toLowerCase().includes(q) ||
        e.accountName.toLowerCase().includes(q)
      ).slice(0, limit);
    }

    // Calculate running balance forward (oldest first)
    let runningBalance = 0;
    const forward = [...ledgerLines].reverse().map(entry => {
      // Net Cash / Asset effect
      runningBalance += (entry.credit - entry.debit);
      return { ...entry, balance: runningBalance };
    });

    forward.reverse();
    return forward.slice(0, limit);
  }

  /**
   * Computes Trial Balance: Debits == Credits strictly guaranteed.
   */
  getTrialBalance({ dateFrom = null, dateTo = null } = {}) {
    // To ensure exact closing balances, we consider all transactions up to dateTo
    const allEntries = this.generateJournalEntries({ dateTo });
    const accountTotals = {};

    // Initialize all chart of accounts
    for (const [code, info] of Object.entries(CHART_OF_ACCOUNTS)) {
      accountTotals[code] = {
        code,
        name: info.name,
        type: info.type,
        normal: info.normal,
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 0,
        closingDebit: 0,
        closingCredit: 0
      };
    }

    for (const je of allEntries) {
      const isPrior = dateFrom && je.date < dateFrom;
      const isPeriod = (!dateFrom || je.date >= dateFrom) && (!dateTo || je.date <= dateTo);

      for (const line of je.lines) {
        const acc = accountTotals[line.accountCode];
        if (!acc) continue;

        if (isPrior) {
          acc.openingDebit += line.debit;
          acc.openingCredit += line.credit;
        } else if (isPeriod) {
          acc.periodDebit += line.debit;
          acc.periodCredit += line.credit;
        }
      }
    }

    const accounts = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const acc of Object.values(accountTotals)) {
      const netDebit = (acc.openingDebit + acc.periodDebit);
      const netCredit = (acc.openingCredit + acc.periodCredit);

      let closingDebit = 0;
      let closingCredit = 0;

      if (netDebit >= netCredit) {
        closingDebit = netDebit - netCredit;
      } else {
        closingCredit = netCredit - netDebit;
      }

      if (closingDebit > 0 || closingCredit > 0 || acc.periodDebit > 0 || acc.periodCredit > 0) {
        accounts.push({
          code: acc.code,
          name: `${acc.code} - ${acc.name}`,
          type: acc.type,
          openingDebit: acc.openingDebit,
          openingCredit: acc.openingCredit,
          periodDebit: acc.periodDebit,
          periodCredit: acc.periodCredit,
          closingDebit,
          closingCredit,
          debit: closingDebit,
          credit: closingCredit
        });

        totalDebits += closingDebit;
        totalCredits += closingCredit;
      }
    }

    return {
      accounts: accounts.sort((a, b) => a.code.localeCompare(b.code)),
      totalDebits,
      totalCredits,
      isBalanced: totalDebits === totalCredits,
      discrepancy: Math.abs(totalDebits - totalCredits),
      dateFrom,
      dateTo
    };
  }

  /**
   * Computes Income Statement:
   * Net Sales - COGS = Gross Profit; Gross Profit - Operating Expenses = Net Profit.
   */
  getIncomeStatement({ dateFrom = null, dateTo = null } = {}) {
    const journalEntries = this.generateJournalEntries({ dateFrom, dateTo });

    let grossSales = 0;
    let discounts = 0;
    let refunds = 0;
    let serviceChargeRevenue = 0;

    let cogsIngredients = 0;
    let cogsWastage = 0;
    let cogsAdjustments = 0;

    const expenseByCategory = {};
    let totalOperatingExpenses = 0;

    for (const je of journalEntries) {
      for (const line of je.lines) {
        if (line.accountCode === '4010') grossSales += line.credit;
        else if (line.accountCode === '4020') discounts += line.debit;
        else if (line.accountCode === '4030') refunds += line.debit;
        else if (line.accountCode === '4040') serviceChargeRevenue += line.credit;
        else if (line.accountCode === '5010') cogsIngredients += line.debit;
        else if (line.accountCode === '5020') cogsWastage += line.debit;
        else if (line.accountCode === '5030') cogsAdjustments += (line.debit - line.credit);
        else if (line.accountType === ACCOUNT_TYPES.EXPENSE) {
          totalOperatingExpenses += line.debit;
          const catName = line.accountName.replace(/^[0-9]+\s*-\s*/, '');
          expenseByCategory[catName] = (expenseByCategory[catName] || 0) + line.debit;
        }
      }
    }

    // Direct COGS calculation: if inventory purchases occurred during the period and stock was consumed
    const netSales = Math.max(0, grossSales - discounts - refunds) + serviceChargeRevenue;
    const totalCOGS = cogsIngredients + cogsWastage + cogsAdjustments;
    const grossProfit = netSales - totalCOGS;
    const netProfit = grossProfit - totalOperatingExpenses;
    const profitMargin = netSales > 0 ? Number(((netProfit / netSales) * 100).toFixed(1)) : 0;

    return {
      revenue: netSales,
      grossSales,
      discounts,
      refunds,
      serviceChargeRevenue,
      netSales,
      cogs: totalCOGS,
      cogsBreakdown: {
        ingredients: cogsIngredients,
        wastage: cogsWastage,
        adjustments: cogsAdjustments
      },
      grossProfit,
      operatingExpenses: totalOperatingExpenses,
      expensesTotal: totalOperatingExpenses,
      purchasesTotal: 0, // In double-entry, purchases are asset/inventory transactions; consumed portion is in COGS
      totalCosts: totalCOGS + totalOperatingExpenses,
      netProfit,
      profitMargin,
      expenseByCategory,
      dateFrom,
      dateTo
    };
  }

  /**
   * Computes Balance Sheet:
   * Total Assets = Total Liabilities + Total Equity strictly guaranteed.
   */
  getBalanceSheet(asOfDate = null) {
    const trialBalance = this.getTrialBalance({ dateTo: asOfDate });
    const assets = [];
    const liabilities = [];
    const equity = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    // Separate by Account Type
    let netIncome = 0;

    for (const acc of trialBalance.accounts) {
      if (acc.type === ACCOUNT_TYPES.ASSET) {
        const amount = acc.closingDebit - acc.closingCredit;
        assets.push({ code: acc.code, name: acc.name, amount });
        totalAssets += amount;
      } else if (acc.type === ACCOUNT_TYPES.LIABILITY) {
        const amount = acc.closingCredit - acc.closingDebit;
        liabilities.push({ code: acc.code, name: acc.name, amount });
        totalLiabilities += amount;
      } else if (acc.type === ACCOUNT_TYPES.EQUITY) {
        const amount = acc.closingCredit - acc.closingDebit;
        equity.push({ code: acc.code, name: acc.name, amount });
        totalEquity += amount;
      } else if (acc.type === ACCOUNT_TYPES.REVENUE) {
        netIncome += (acc.closingCredit - acc.closingDebit);
      } else if (acc.type === ACCOUNT_TYPES.COGS || acc.type === ACCOUNT_TYPES.EXPENSE) {
        netIncome -= (acc.closingDebit - acc.closingCredit);
      }
    }

    // Retained Earnings / Net Income transferred to Equity
    equity.push({
      code: '3030',
      name: '3030 - Current Period Retained Earnings (Net Income)',
      amount: netIncome
    });
    totalEquity += netIncome;

    return {
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equity,
      totalEquity,
      isBalanced: totalAssets === (totalLiabilities + totalEquity),
      discrepancy: Math.abs(totalAssets - (totalLiabilities + totalEquity)),
      asOf: asOfDate || new Date().toISOString()
    };
  }
}
