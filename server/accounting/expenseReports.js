import { getDhakaDateParts } from '../db.js';

export class ExpenseReportsEngine {
  constructor(db) {
    this.db = db;
  }

  _filterExpenses({ dateFrom = null, dateTo = null, category = null, supplier = null, status = null, search = '' } = {}) {
    return (this.db.expenses || []).filter(e => {
      if (!e) return false;
      const expDate = e.date || getDhakaDateParts(new Date(e.createdAt)).dateStr;

      if (dateFrom && expDate < dateFrom) return false;
      if (dateTo && expDate > dateTo) return false;
      if (category && category !== 'ALL' && e.category !== category) return false;
      if (supplier && supplier !== 'ALL' && (e.supplier || e.payee) !== supplier) return false;

      const total = Number(e.amount) || 0;
      const paid = e.paidAmount !== undefined ? Number(e.paidAmount) : (e.paymentStatus === 'UNPAID' ? 0 : total);
      const isDue = paid < total;

      if (status === 'PAID' && isDue) return false;
      if (status === 'DUE' && !isDue) return false;
      if (status === 'PARTIALLY_PAID' && (paid <= 0 || paid >= total)) return false;

      if (search) {
        const q = search.toLowerCase();
        const matchesCategory = (e.category || '').toLowerCase().includes(q);
        const matchesNotes = (e.notes || '').toLowerCase().includes(q);
        const matchesSupplier = (e.supplier || e.payee || '').toLowerCase().includes(q);
        const matchesBill = (e.billNumber || '').toLowerCase().includes(q);
        if (!matchesCategory && !matchesNotes && !matchesSupplier && !matchesBill) return false;
      }

      return true;
    });
  }

  /**
   * Expense By Category Report
   */
  getExpenseByCategory({ dateFrom = null, dateTo = null } = {}) {
    const expenses = this._filterExpenses({ dateFrom, dateTo });
    const catMap = new Map();
    let grandTotal = 0;

    for (const exp of expenses) {
      const cat = exp.category || 'Miscellaneous';
      const amount = Number(exp.amount) || 0;
      const paid = exp.paidAmount !== undefined ? Number(exp.paidAmount) : (exp.paymentStatus === 'UNPAID' ? 0 : amount);
      const due = Math.max(0, amount - paid);

      if (!catMap.has(cat)) {
        catMap.set(cat, {
          category: cat,
          expenseCount: 0,
          totalExpense: 0,
          paidAmount: 0,
          dueAmount: 0,
          expenses: []
        });
      }

      const entry = catMap.get(cat);
      entry.expenseCount += 1;
      entry.totalExpense += amount;
      entry.paidAmount += paid;
      entry.dueAmount += due;
      entry.expenses.push(exp);

      grandTotal += amount;
    }

    return Array.from(catMap.values()).map(c => ({
      ...c,
      percentage: grandTotal > 0 ? Number(((c.totalExpense / grandTotal) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.totalExpense - a.totalExpense);
  }

  /**
   * Expense By Supplier / Payee Report
   */
  getExpenseBySupplier({ dateFrom = null, dateTo = null } = {}) {
    const expenses = this._filterExpenses({ dateFrom, dateTo });
    const supMap = new Map();

    for (const exp of expenses) {
      const sup = exp.supplier || exp.payee || 'General Payee / Direct';
      const amount = Number(exp.amount) || 0;
      const paid = exp.paidAmount !== undefined ? Number(exp.paidAmount) : (exp.paymentStatus === 'UNPAID' ? 0 : amount);
      const due = Math.max(0, amount - paid);

      if (!supMap.has(sup)) {
        supMap.set(sup, {
          supplierName: sup,
          expenseCount: 0,
          totalAmount: 0,
          paidAmount: 0,
          dueAmount: 0,
          lastPaymentDate: exp.date || null
        });
      }

      const entry = supMap.get(sup);
      entry.expenseCount += 1;
      entry.totalAmount += amount;
      entry.paidAmount += paid;
      entry.dueAmount += due;
      if (exp.date && (!entry.lastPaymentDate || exp.date > entry.lastPaymentDate)) {
        entry.lastPaymentDate = exp.date;
      }
    }

    return Array.from(supMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Due Expenses Report (Unpaid & Partially Paid)
   */
  getDueExpenses() {
    const today = getDhakaDateParts(new Date()).dateStr;
    const allExpenses = this.db.expenses || [];
    const dueList = [];

    let totalDueOverall = 0;
    let overdueTotal = 0;
    let dueTodayTotal = 0;
    let upcomingTotal = 0;

    for (const exp of allExpenses) {
      const total = Number(exp.amount) || 0;
      const paid = exp.paidAmount !== undefined ? Number(exp.paidAmount) : (exp.paymentStatus === 'UNPAID' ? 0 : total);
      const remainingDue = Math.max(0, total - paid);

      if (remainingDue <= 0) continue;

      const dueDate = exp.dueDate || exp.date;
      let urgency = 'UPCOMING';
      if (dueDate < today) {
        urgency = 'OVERDUE';
        overdueTotal += remainingDue;
      } else if (dueDate === today) {
        urgency = 'DUE_TODAY';
        dueTodayTotal += remainingDue;
      } else {
        upcomingTotal += remainingDue;
      }

      totalDueOverall += remainingDue;

      dueList.push({
        id: exp.id,
        title: exp.notes || `${exp.category} Expense`,
        category: exp.category,
        supplier: exp.supplier || exp.payee || 'Direct Vendor',
        billNumber: exp.billNumber || `EXP-${exp.id.slice(-6).toUpperCase()}`,
        expenseDate: exp.date,
        dueDate,
        urgency,
        totalAmount: total,
        paidAmount: paid,
        remainingDue,
        paymentStatus: paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
        paymentHistory: exp.paymentHistory || []
      });
    }

    return {
      dueExpenses: dueList.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
      totalDueOverall,
      overdueTotal,
      dueTodayTotal,
      upcomingTotal
    };
  }

  /**
   * Complete Expense Register / List
   */
  getExpenseList({ dateFrom = null, dateTo = null, category = null, search = '', page = 1, limit = 50 } = {}) {
    const expenses = this._filterExpenses({ dateFrom, dateTo, category, search });
    const formatted = expenses.map(e => {
      const total = Number(e.amount) || 0;
      const paid = e.paidAmount !== undefined ? Number(e.paidAmount) : (e.paymentStatus === 'UNPAID' ? 0 : total);
      const due = Math.max(0, total - paid);

      return {
        id: e.id,
        date: e.date,
        category: e.category,
        description: e.notes || '',
        supplier: e.supplier || e.payee || 'Direct Expense',
        billNumber: e.billNumber || `EXP-${e.id.slice(-6).toUpperCase()}`,
        paymentMethod: e.paymentMethod || 'CASH',
        totalAmount: total,
        paidAmount: paid,
        dueAmount: due,
        paymentStatus: due === 0 ? 'PAID' : (paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'),
        createdBy: e.createdBy || 'Manager',
        createdAt: e.createdAt,
        history: e.history || []
      };
    }).sort((a, b) => b.date.localeCompare(a.date));

    const totalCount = formatted.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = formatted.slice(startIndex, startIndex + Number(limit));

    return {
      expenses: paginated,
      totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / Number(limit)),
      grandTotalAmount: formatted.reduce((s, e) => s + e.totalAmount, 0),
      grandTotalPaid: formatted.reduce((s, e) => s + e.paidAmount, 0),
      grandTotalDue: formatted.reduce((s, e) => s + e.dueAmount, 0)
    };
  }

  /**
   * Expense Summary & Daily/Monthly Trends
   */
  getExpenseSummary({ dateFrom = null, dateTo = null } = {}) {
    const expenses = this._filterExpenses({ dateFrom, dateTo });

    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalPaid = expenses.reduce((s, e) => {
      const amt = Number(e.amount) || 0;
      return s + (e.paidAmount !== undefined ? Number(e.paidAmount) : (e.paymentStatus === 'UNPAID' ? 0 : amt));
    }, 0);
    const totalDue = Math.max(0, totalExpenses - totalPaid);

    // Group by Date for Daily Expense Trend
    const dailyMap = {};
    for (const exp of expenses) {
      dailyMap[exp.date] = (dailyMap[exp.date] || 0) + (Number(exp.amount) || 0);
    }
    const dailyTrend = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalExpenses,
      totalPaid,
      totalDue,
      expenseCount: expenses.length,
      averageExpense: expenses.length > 0 ? Math.round(totalExpenses / expenses.length) : 0,
      dailyTrend,
      dateFrom,
      dateTo
    };
  }
}
