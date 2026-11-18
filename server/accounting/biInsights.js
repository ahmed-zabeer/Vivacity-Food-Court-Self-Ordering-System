import { getDhakaDateParts } from '../db.js';
import { computeCogs } from './cogs.js';

export class BusinessIntelligenceEngine {
  constructor(db) {
    this.db = db;
  }

  getHealthOverview() {
    const today = getDhakaDateParts(new Date()).dateStr;
    const yesterday = getDhakaDateParts(new Date(Date.now() - 86400000)).dateStr;

    // Today's Orders
    const todayOrders = this.db.orders.filter(o => {
      const d = getDhakaDateParts(new Date(o.paidAt || o.createdAt)).dateStr;
      return d === today && o.paymentStatus === 'PAID' && o.status !== 'CANCELLED';
    });

    const yesterdayOrders = this.db.orders.filter(o => {
      const d = getDhakaDateParts(new Date(o.paidAt || o.createdAt)).dateStr;
      return d === yesterday && o.paymentStatus === 'PAID' && o.status !== 'CANCELLED';
    });

    const todaySales = todayOrders.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);
    const yesterdaySales = yesterdayOrders.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);
    const salesChange = yesterdaySales > 0 ? Number((((todaySales - yesterdaySales) / yesterdaySales) * 100).toFixed(1)) : null;

    // Today's Expenses
    const todayExpenses = (this.db.expenses || []).filter(e => {
      const d = e.date || getDhakaDateParts(new Date(e.createdAt)).dateStr;
      return d === today;
    }).reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const todayCOGSInfo = computeCogs(this.db, todayOrders, { dateFrom: today, dateTo: today });
    const todayCOGS = todayCOGSInfo.cogs;
    const todayGrossProfit = todaySales - todayCOGS;
    const todayNetProfit = todayGrossProfit - todayExpenses;

    // Customer Receivables (Unpaid Orders)
    const customerReceivables = this.db.orders
      .filter(o => o.status !== 'CANCELLED' && (o.paymentStatus === 'UNPAID' || o.paymentStatus === 'PAYMENT DUE'))
      .reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);

    // Supplier Payables (Unpaid Purchases)
    const supplierPayables = (this.db.purchases || []).reduce((s, p) => {
      const amt = Number(p.amount) || 0;
      const isPaid = p.status === 'PAID' || p.paymentStatus === 'PAID';
      const paid = p.paidAmount !== undefined ? Number(p.paidAmount) : (isPaid ? amt : 0);
      return s + Math.max(0, amt - paid);
    }, 0);

    // Overdue Expenses
    const overdueExpenses = (this.db.expenses || []).reduce((s, e) => {
      const amt = Number(e.amount) || 0;
      const paid = e.paidAmount !== undefined ? Number(e.paidAmount) : (e.paymentStatus === 'UNPAID' ? 0 : amt);
      const isOverdue = (e.dueDate || e.date) < today && paid < amt;
      return isOverdue ? s + (amt - paid) : s;
    }, 0);

    // Inventory Valuation & Low Stock
    const invReport = this.db.inventoryReports ? this.db.inventoryReports.getInventoryValuation() : { totalValuation: 0 };
    const lowStockReport = this.db.inventoryReports ? this.db.inventoryReports.getLowStockReport() : { totalLowStockCount: 0 };

    // Today Wastage
    const todayMovements = (this.db.inventoryMovements || []).filter(m => {
      const d = m.date || m.timestamp?.slice(0, 10);
      return d === today && (m.movementType === 'WASTAGE' || m.movementType === 'DAMAGE');
    });
    const todayWastage = todayMovements.reduce((s, m) => s + (Number(m.totalValue) || 0), 0);

    // Smart Insights Generation
    const insights = [];

    // 1. Highest Revenue Stall
    const stallSales = {};
    for (const order of todayOrders) {
      for (const item of (order.items || [])) {
        const sid = item.stallId;
        const stall = this.db.stalls.find(s => s.id === sid);
        const name = stall?.name || sid;
        stallSales[name] = (stallSales[name] || 0) + (Number(item.price) || 0) * (Number(item.quantity) || 1);
      }
    }
    const topStallEntry = Object.entries(stallSales).sort((a, b) => b[1] - a[1])[0];
    if (topStallEntry) {
      insights.push({
        id: 'top-stall',
        type: 'POSITIVE',
        title: 'Top Generating Stall Today',
        message: `${topStallEntry[0]} leads revenue today with ৳${topStallEntry[1]} in confirmed orders.`,
        metric: `৳${topStallEntry[1]}`
      });
    }

    // 2. Low Stock Alerts
    if (lowStockReport.totalLowStockCount > 0) {
      insights.push({
        id: 'low-stock',
        type: 'WARNING',
        title: 'Inventory Reorder Alert',
        message: `${lowStockReport.totalLowStockCount} items have reached or breached their configured reorder thresholds.`,
        metric: `${lowStockReport.totalLowStockCount} items`
      });
    }

    // 3. Outstanding Supplier Dues
    if (supplierPayables > 0) {
      insights.push({
        id: 'supplier-due',
        type: 'ALERT',
        title: 'Supplier Accounts Payable',
        message: `Outstanding payables to ingredient suppliers currently stand at ৳${supplierPayables}.`,
        metric: `৳${supplierPayables}`
      });
    }

    // Alerts list
    const alerts = [];
    if (lowStockReport.totalLowStockCount > 0) {
      alerts.push({
        id: 'alt-stock',
        severity: 'high',
        title: 'Low Stock Alert',
        description: `${lowStockReport.totalLowStockCount} inventory items need immediate restocking.`,
        link: '/admin/accounting'
      });
    }
    if (overdueExpenses > 0) {
      alerts.push({
        id: 'alt-exp',
        severity: 'medium',
        title: 'Overdue Operating Expenses',
        description: `৳${overdueExpenses} in utility/vendor expenses are past due.`,
        link: '/admin/accounting'
      });
    }
    if (supplierPayables > 0) {
      alerts.push({
        id: 'alt-pur',
        severity: 'medium',
        title: 'Unpaid Supplier Invoices',
        description: `৳${supplierPayables} due across outstanding vendor invoices.`,
        link: '/admin/accounting'
      });
    }

    return {
      today: {
        date: today,
        sales: todaySales,
        ordersCount: todayOrders.length,
        salesChange,
        expenses: todayExpenses,
        grossProfit: todayGrossProfit,
        netProfit: todayNetProfit,
        wastage: todayWastage
      },
      receivables: {
        customerReceivables
      },
      payables: {
        supplierPayables,
        overdueExpenses
      },
      inventory: {
        valuation: invReport.totalValuation,
        lowStockCount: lowStockReport.totalLowStockCount
      },
      insights,
      alerts
    };
  }
}
