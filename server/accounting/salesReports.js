import { getDhakaDateParts } from '../db.js';
import { getOrderRefunds, getRefundDateStr } from './refunds.js';
import { computeCogs, getMenuItemCost } from './cogs.js';

export class SalesReportsEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * All refunds paid out inside a date window, regardless of when the original
   * order was paid. This is what keeps refunds from being double-subtracted:
   * a sale is recognised on its payment date, a refund on its refund date.
   */
  _refundsInRange({ dateFrom = null, dateTo = null } = {}) {
    const rows = [];
    let total = 0;
    for (const order of this.db.orders) {
      for (const refund of getOrderRefunds(order)) {
        const dateStr = getRefundDateStr(refund, order);
        if (!dateStr) continue;
        if (dateFrom && dateStr < dateFrom) continue;
        if (dateTo && dateStr > dateTo) continue;
        total += refund.amount;
        rows.push({
          orderId: order.id,
          token: order.token,
          invoiceNo: order.invoiceNo,
          date: dateStr,
          amount: refund.amount,
          method: refund.method,
          reason: refund.reason,
          refundedBy: refund.by,
          transactionId: refund.transactionId
        });
      }
    }
    return { total, rows };
  }

  _filterOrders({ dateFrom = null, dateTo = null, stallId = null, orderStatus = null, paymentStatus = null, paymentMethod = null, search = '' } = {}) {
    return this.db.orders.filter(order => {
      if (!order) return false;
      const dateParts = getDhakaDateParts(new Date(order.paidAt || order.createdAt));
      const orderDate = dateParts.dateStr;

      if (dateFrom && orderDate < dateFrom) return false;
      if (dateTo && orderDate > dateTo) return false;
      if (orderStatus && order.status !== orderStatus) return false;
      if (paymentStatus && order.paymentStatus !== paymentStatus) return false;
      if (paymentMethod && order.paymentMethod !== paymentMethod) return false;

      if (stallId && stallId !== 'ALL') {
        const hasStall = order.items?.some(i => i.stallId === stallId) || order.stalls?.some(s => s.stallId === stallId);
        if (!hasStall) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        const matchesToken = String(order.token || '').toLowerCase().includes(q);
        const matchesInvoice = String(order.invoiceNo || '').toLowerCase().includes(q);
        const matchesCustomer = String(order.customerName || '').toLowerCase().includes(q) || String(order.customerPhone || '').includes(q);
        const matchesItem = order.items?.some(i => (i.name || '').toLowerCase().includes(q));
        if (!matchesToken && !matchesInvoice && !matchesCustomer && !matchesItem) return false;
      }

      return true;
    });
  }

  /**
   * Top-Selling Items Report
   */
  getTopSellingItems({ dateFrom = null, dateTo = null, stallId = null, category = null, limit = 50, sortBy = 'quantity', search = '' } = {}) {
    const orders = this._filterOrders({ dateFrom, dateTo, stallId });
    // Sales are recognised on payment. Refunds are subtracted on their own date.
    const validOrders = orders.filter(o => Boolean(o.paidAt) && !['FAILED', 'UNPAID', 'PAYMENT DUE', 'CANCELLED'].includes(o.paymentStatus));

    const refundsInRange = this._refundsInRange({ dateFrom, dateTo });
    const refundByOrder = new Map();
    for (const r of refundsInRange.rows) {
      refundByOrder.set(r.orderId, (refundByOrder.get(r.orderId) || 0) + r.amount);
    }

    const itemMap = new Map();
    let totalSalesOverall = 0;

    for (const order of validOrders) {
      const orderDiscountRate = order.subtotal > 0 ? (order.discount || 0) / order.subtotal : 0;

      const includedItems = (order.items || []).filter(item => {
        if (stallId && stallId !== 'ALL' && item.stallId !== stallId) return false;
        const dbItem = this.db.getMenuItem ? this.db.getMenuItem(item.menuItemId) : null;
        const itemCategory = dbItem?.category || 'General';
        if (category && category !== 'ALL' && itemCategory !== category) return false;
        if (search && !(item.name || '').toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });

      const orderRefund = refundByOrder.get(order.id) || 0;
      const includedNet = includedItems.reduce((s, item) => {
        const gross = (Number(item.price) || 0) * (Number(item.quantity) || 1);
        return s + (gross - Math.round(gross * orderDiscountRate));
      }, 0);

      for (const item of includedItems) {
        const dbItem = this.db.getMenuItem ? this.db.getMenuItem(item.menuItemId) : null;
        const itemCategory = dbItem?.category || 'General';

        const itemId = item.menuItemId || item.id;
        if (!itemMap.has(itemId)) {
          const stall = this.db.stalls.find(s => s.id === item.stallId);
          itemMap.set(itemId, {
            itemId,
            name: item.name,
            stallId: item.stallId,
            stallName: stall?.name || item.stallId,
            category: itemCategory,
            unit: dbItem?.unit || 'portion',
            quantitySold: 0,
            orderCount: 0,
            grossSales: 0,
            discounts: 0,
            refunds: 0,
            netSales: 0,
            recipeCostPerUnit: null,
            totalRecipeCost: null,
            hasRecipe: false
          });
        }

        const entry = itemMap.get(itemId);
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const itemGross = price * qty;
        const itemDiscount = Math.round(itemGross * orderDiscountRate);
        const itemNet = itemGross - itemDiscount;
        const itemRefund = (orderRefund > 0 && includedNet > 0)
          ? Math.round(orderRefund * (itemNet / includedNet))
          : 0;

        entry.quantitySold += qty;
        entry.orderCount += 1;
        entry.grossSales += itemGross;
        entry.discounts += itemDiscount;
        entry.refunds += itemRefund;
        entry.netSales += (itemNet - itemRefund);

        totalSalesOverall += (itemNet - itemRefund);
      }
    }

    // Process recipe costs & profit margins if recipe exists
    const results = Array.from(itemMap.values()).map(entry => {
      const recipe = this.db.getRecipe ? this.db.getRecipe(entry.itemId) : null;
      let recipeCostPerUnit = null;
      let totalCost = null;
      let hasRecipe = false;

      if (recipe && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
        hasRecipe = true;
        recipeCostPerUnit = recipe.ingredients.reduce((s, ing) => s + (Number(ing.cost) || 0), 0);
        totalCost = Math.round(recipeCostPerUnit * entry.quantitySold);
      }

      const grossProfit = hasRecipe ? entry.netSales - totalCost : null;
      const profitMargin = hasRecipe && entry.netSales > 0 ? Number(((grossProfit / entry.netSales) * 100).toFixed(1)) : null;
      const contributionPercent = totalSalesOverall > 0 ? Number(((entry.netSales / totalSalesOverall) * 100).toFixed(1)) : 0;
      const avgSellingPrice = entry.quantitySold > 0 ? Math.round(entry.netSales / entry.quantitySold) : 0;

      return {
        ...entry,
        avgSellingPrice,
        recipeCostPerUnit,
        totalCost,
        grossProfit,
        profitMargin,
        contributionPercent,
        hasRecipe
      };
    });

    // Sorting
    results.sort((a, b) => {
      if (sortBy === 'quantity') return b.quantitySold - a.quantitySold;
      if (sortBy === 'revenue') return b.netSales - a.netSales;
      if (sortBy === 'profit') return (b.grossProfit || 0) - (a.grossProfit || 0);
      if (sortBy === 'margin') return (b.profitMargin || 0) - (a.profitMargin || 0);
      return b.quantitySold - a.quantitySold;
    });

    const parsedLimit = limit === 'ALL' || !limit ? results.length : Number(limit);
    return {
      items: results.slice(0, parsedLimit),
      totalSalesOverall,
      totalCount: results.length,
      dateFrom,
      dateTo
    };
  }

  /**
   * Sales Summary Report with Previous Period Comparison
   */
  getSalesSummary({ dateFrom = null, dateTo = null, stallId = null } = {}) {
    const orders = this._filterOrders({ dateFrom, dateTo, stallId });

    let totalOrders = orders.length;
    let completedOrders = 0;
    let pendingOrders = 0;
    let cancelledOrders = 0;
    let refundedOrders = 0;

    let totalQuantitySold = 0;
    let grossItemSales = 0;
    let totalDiscounts = 0;
    let totalRefunds = 0;
    let netSales = 0;

    const stallFilter = (stallId && stallId !== 'ALL') ? stallId : null;
    // A sale is recognised on the date it was PAID. A later cancellation or
    // refund does not erase the sale - the refund is booked separately on the
    // date the money actually left the till.
    const salesOrders = [];

    let vatTaxCollected = 0;
    let serviceChargesCollected = 0;
    let totalCollections = 0;
    let outstandingReceivables = 0;

    const paymentMethods = {
      CASH: 0,
      bKash: 0,
      Nagad: 0,
      'Online Card': 0,
      'Card / Physical POS Terminal': 0,
      'NFC / Contactless': 0
    };

    for (const order of orders) {
      if (order.status === 'COMPLETED') completedOrders++;
      if (order.status === 'CANCELLED') cancelledOrders++;
      if (['NEW', 'UNDER REVIEW', 'ACCEPTED', 'PAYMENT DUE', 'PREPARING', 'READY', 'OUT FOR DELIVERY'].includes(order.status)) pendingOrders++;

      const isSale = Boolean(order.paidAt) && order.paymentStatus !== 'FAILED';
      if (!isSale) {
        if (order.paymentStatus === 'UNPAID' || order.paymentStatus === 'PAYMENT DUE') {
          outstandingReceivables += (Number(order.grandTotal) || 0);
        }
        continue;
      }

      salesOrders.push(order);

      const items = stallFilter ? (order.items || []).filter(i => i.stallId === stallFilter) : (order.items || []);
      const orderSubtotal = stallFilter
        ? items.reduce((s, i) => s + ((Number(i.price) || 0) * (Number(i.quantity) || 1)), 0)
        : (Number(order.subtotal) || 0);
      const ratio = (!stallFilter || !order.subtotal) ? 1 : Math.min(1, orderSubtotal / (Number(order.subtotal) || 1));
      const orderDiscount = (Number(order.discount) || 0) * ratio;
      const orderVat = (Number(order.tax) || 0) * ratio;
      const orderService = (Number(order.serviceCharge) || 0) * ratio;
      const orderGrand = (Number(order.grandTotal) || 0) * ratio;

      grossItemSales += orderSubtotal;
      totalDiscounts += orderDiscount;
      vatTaxCollected += orderVat;
      serviceChargesCollected += orderService;
      totalCollections += orderGrand;

      const method = order.paymentMethod || 'CASH';
      if (paymentMethods[method] !== undefined) {
        paymentMethods[method] += orderGrand;
      } else {
        paymentMethods.CASH += orderGrand;
      }

      totalQuantitySold += items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
    }

    // Refunds actually paid out inside this window (any original sale date).
    const refundsInRange = this._refundsInRange({ dateFrom, dateTo });
    totalRefunds = refundsInRange.total;
    refundedOrders = refundsInRange.rows.length;
    for (const r of refundsInRange.rows) {
      const m = r.method || 'CASH';
      if (paymentMethods[m] !== undefined) paymentMethods[m] -= r.amount;
      else paymentMethods.CASH -= r.amount;
    }

    // Net Sales = eligible item sales - discounts - refunds (+ waiter service revenue).
    // VAT collected is a liability, not revenue, so it is excluded.
    netSales = (grossItemSales - totalDiscounts - totalRefunds) + serviceChargesCollected;
    const averageOrderValue = salesOrders.length > 0
      ? Math.round(totalCollections / salesOrders.length)
      : 0;

    // Operating expenses in same period
    const expenses = (this.db.expenses || []).filter(e => {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    }).reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // COGS from real recipe/unit costs only (never a benchmark ratio).
    const cogsInfo = computeCogs(this.db, salesOrders, { dateFrom, dateTo });
    const cogs = cogsInfo.cogs;
    const grossProfit = netSales - cogs;
    const netProfit = grossProfit - expenses;

    // Previous Equivalent Period Calculation
    let comparison = null;
    if (dateFrom && dateTo) {
      const diffMs = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
      const prevDateTo = new Date(new Date(dateFrom).getTime() - 86400000).toISOString().slice(0, 10);
      const prevDateFrom = new Date(new Date(dateFrom).getTime() - 86400000 - diffMs).toISOString().slice(0, 10);

      const prevOrders = this._filterOrders({ dateFrom: prevDateFrom, dateTo: prevDateTo, stallId })
        .filter(o => Boolean(o.paidAt) && o.paymentStatus !== 'FAILED');
      const prevGross = prevOrders.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);
      const prevRefunds = this._refundsInRange({ dateFrom: prevDateFrom, dateTo: prevDateTo }).total;
      const prevRevenue = prevGross - prevRefunds;
      const prevOrdersCount = prevOrders.length;

      const revenueChange = prevRevenue > 0 ? Number((((totalCollections - prevRevenue) / prevRevenue) * 100).toFixed(1)) : null;
      const ordersChange = prevOrdersCount > 0 ? Number((((totalOrders - prevOrdersCount) / prevOrdersCount) * 100).toFixed(1)) : null;

      comparison = {
        prevDateFrom,
        prevDateTo,
        prevRevenue,
        prevOrdersCount,
        revenueChange,
        ordersChange
      };
    }

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      refundedOrders,
      totalQuantitySold,
      grossItemSales,
      totalDiscounts,
      totalRefunds,
      netSales,
      vatTaxCollected,
      serviceChargesCollected,
      totalCollections,
      outstandingReceivables,
      paymentMethods,
      averageOrderValue,
      cogs,
      cogsBreakdown: {
        ingredients: cogsInfo.ingredientCogs,
        wastage: cogsInfo.wastage,
        adjustments: cogsInfo.adjustments
      },
      cogsCoveragePercent: cogsInfo.coveragePercent,
      grossProfit,
      operatingExpenses: expenses,
      netProfit,
      refunds: refundsInRange.rows,
      comparison,
      dateFrom,
      dateTo
    };
  }

  /**
   * Complete Sales Details (Transaction Rows)
   */
  getSalesDetails({ dateFrom = null, dateTo = null, stallId = null, paymentMethod = null, search = '', page = 1, limit = 50 } = {}) {
    const orders = this._filterOrders({ dateFrom, dateTo, stallId, paymentMethod, search });
    const rows = [];

    for (const order of orders) {
      const dateParts = getDhakaDateParts(new Date(order.paidAt || order.createdAt));
      const timeStr = `${String(dateParts.hour).padStart(2, '0')}:${String(dateParts.minute).padStart(2, '0')}`;

      for (const item of (order.items || [])) {
        if (stallId && stallId !== 'ALL' && item.stallId !== stallId) continue;
        const stall = this.db.stalls.find(s => s.id === item.stallId);

        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const itemTotal = price * qty;

        rows.push({
          orderId: order.id,
          invoiceNo: order.invoiceNo || String(88000 + Number(order.token)),
          token: order.token,
          date: dateParts.dateStr,
          time: timeStr,
          guestName: order.customerName || 'Walk-in Guest',
          customerPhone: order.customerPhone || 'N/A',
          tableNumber: order.tableId || (order.type === 'PARCEL' ? 'Takeaway' : 'N/A'),
          orderType: order.type === 'PARCEL' || order.customerOrderType === 'TAKEAWAY' ? 'Takeaway' : 'Dine-in',
          serviceType: order.serviceType === 'TABLE_SERVICE' ? 'Table Service' : 'Self-Service',
          stallId: item.stallId,
          stallName: stall?.name || item.stallId,
          itemId: item.menuItemId || item.id,
          itemName: item.name,
          quantity: qty,
          unitPrice: price,
          discount: order.discount || 0,
          tax: order.tax || 0,
          totalAmount: itemTotal,
          paymentMethod: order.paymentMethod || 'CASH',
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          cashier: order.confirmedBy || (order.history?.find(h => h.status === 'PAID')?.note?.match(/by (.*)\./)?.[1]) || 'Counter Cashier'
        });
      }
    }

    const totalCount = rows.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginatedRows = rows.slice(startIndex, startIndex + Number(limit));

    return {
      transactions: paginatedRows,
      totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / Number(limit))
    };
  }

  /**
   * Sales By User / Cashier
   */
  getSalesByUser({ dateFrom = null, dateTo = null } = {}) {
    const orders = this._filterOrders({ dateFrom, dateTo });
    const userMap = new Map();

    for (const order of orders) {
      // Find staff who handled the order
      const paidHistory = order.history?.find(h => h.status === 'PAID');
      const staffName = order.confirmedBy || (paidHistory?.note?.match(/by (.*)\./)?.[1]) || 'Central Counter';

      if (!userMap.has(staffName)) {
        userMap.set(staffName, {
          userName: staffName,
          role: staffName.includes('Admin') ? 'SUPER ADMIN' : (staffName.includes('Manager') ? 'MANAGER' : 'CASHIER'),
          ordersHandled: 0,
          salesProcessed: 0,
          paymentsConfirmed: 0,
          discountsAuthorized: 0,
          refundsProcessed: 0,
          cancelledOrders: 0,
          totalValue: 0
        });
      }

      const entry = userMap.get(staffName);
      entry.ordersHandled += 1;

      if (order.paymentStatus === 'PAID' && order.status !== 'CANCELLED') {
        entry.salesProcessed += (Number(order.grandTotal) || 0);
        entry.paymentsConfirmed += 1;
        entry.discountsAuthorized += (Number(order.discount) || 0);
        entry.totalValue += (Number(order.grandTotal) || 0);
      } else if (order.paymentStatus === 'REFUNDED') {
        entry.refundsProcessed += 1;
      } else if (order.status === 'CANCELLED') {
        entry.cancelledOrders += 1;
      }
    }

    const users = Array.from(userMap.values()).map(u => ({
      ...u,
      averageTransactionValue: u.paymentsConfirmed > 0 ? Math.round(u.salesProcessed / u.paymentsConfirmed) : 0
    }));

    return users.sort((a, b) => b.salesProcessed - a.salesProcessed);
  }

  /**
   * Order Type Summary (Dine-in vs Takeaway, Self-service vs Table-service)
   */
  getOrderTypeSummary({ dateFrom = null, dateTo = null } = {}) {
    const orders = this._filterOrders({ dateFrom, dateTo });
    const types = {
      DINE_IN: { name: 'Dine-in (Hall)', count: 0, quantity: 0, gross: 0, discount: 0, refund: 0, net: 0, payments: { CASH: 0, bKash: 0, Nagad: 0, Card: 0, NFC: 0 } },
      TAKEAWAY: { name: 'Takeaway (Parcel)', count: 0, quantity: 0, gross: 0, discount: 0, refund: 0, net: 0, payments: { CASH: 0, bKash: 0, Nagad: 0, Card: 0, NFC: 0 } },
      SELF_SERVICE: { name: 'Self-Service Counter', count: 0, quantity: 0, gross: 0, discount: 0, refund: 0, net: 0, payments: { CASH: 0, bKash: 0, Nagad: 0, Card: 0, NFC: 0 } },
      TABLE_SERVICE: { name: 'Table-Service Waiter', count: 0, quantity: 0, gross: 0, discount: 0, refund: 0, net: 0, payments: { CASH: 0, bKash: 0, Nagad: 0, Card: 0, NFC: 0 } }
    };

    for (const order of orders) {
      const isTakeaway = order.type === 'PARCEL' || order.customerOrderType === 'TAKEAWAY';
      const isTable = order.serviceType === 'TABLE_SERVICE';

      const typeKey = isTakeaway ? 'TAKEAWAY' : 'DINE_IN';
      const serviceKey = isTable ? 'TABLE_SERVICE' : 'SELF_SERVICE';

      const isPaid = order.paymentStatus === 'PAID' && order.status !== 'CANCELLED';
      const isRefunded = order.paymentStatus === 'REFUNDED';

      const gross = Number(order.subtotal) || 0;
      const disc = Number(order.discount) || 0;
      const ref = isRefunded ? Number(order.grandTotal) || 0 : 0;
      const net = isPaid ? Number(order.grandTotal) || 0 : 0;
      const qty = (order.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0);
      const method = order.paymentMethod || 'CASH';

      for (const key of [typeKey, serviceKey]) {
        types[key].count += 1;
        types[key].quantity += qty;
        types[key].gross += gross;
        types[key].discount += disc;
        types[key].refund += ref;
        types[key].net += net;

        if (isPaid) {
          if (method === 'CASH') types[key].payments.CASH += net;
          else if (method === 'bKash') types[key].payments.bKash += net;
          else if (method === 'Nagad') types[key].payments.Nagad += net;
          else if (method === 'Online Card') types[key].payments.Card += net;
          else if (method === 'NFC / Contactless') types[key].payments.NFC += net;
        }
      }
    }

    return Object.entries(types).map(([key, val]) => ({
      key,
      ...val,
      averageOrderValue: val.count > 0 ? Math.round(val.net / val.count) : 0
    }));
  }

  /**
   * Stall-Wise Sales (All 7 Stalls)
   */
  getStallWiseSales({ dateFrom = null, dateTo = null } = {}) {
    const orders = this._filterOrders({ dateFrom, dateTo });
    // Sales are any order that was actually paid (later refunds are booked separately).
    const validOrders = orders.filter(o => Boolean(o.paidAt) && o.paymentStatus !== 'FAILED');

    const stallStats = {};
    for (const s of this.db.stalls) {
      stallStats[s.id] = {
        stallId: s.id,
        stallName: s.name,
        badge: s.badge || '',
        orderCount: 0,
        quantitySold: 0,
        grossSales: 0,
        discounts: 0,
        refunds: 0,
        netSales: 0,
        cogs: 0,
        grossProfit: 0,
        profitMargin: 0,
        paymentBreakdown: { CASH: 0, bKash: 0, Nagad: 0, 'Online Card': 0, 'NFC / Contactless': 0 },
        itemCounts: {}
      };
    }

    // Refunds paid inside this window, grouped by original order.
    const refundsInRange = this._refundsInRange({ dateFrom, dateTo });
    const refundByOrder = new Map();
    for (const r of refundsInRange.rows) {
      refundByOrder.set(r.orderId, (refundByOrder.get(r.orderId) || 0) + r.amount);
    }

    for (const order of validOrders) {
      const orderDiscountRate = order.subtotal > 0 ? (order.discount || 0) / order.subtotal : 0;
      const seenStallsInOrder = new Set();

      for (const item of (order.items || [])) {
        const sid = item.stallId;
        if (!stallStats[sid]) continue;

        seenStallsInOrder.add(sid);
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const itemGross = price * qty;
        const itemDisc = Math.round(itemGross * orderDiscountRate);
        const itemNet = itemGross - itemDisc;

        stallStats[sid].quantitySold += qty;
        stallStats[sid].grossSales += itemGross;
        stallStats[sid].discounts += itemDisc;
        stallStats[sid].netSales += itemNet;

        // Real configured recipe/unit cost only.
        const unitCost = getMenuItemCost(this.db, item.menuItemId);
        if (unitCost !== null) stallStats[sid].cogs += unitCost * qty;

        // Best seller tracking
        stallStats[sid].itemCounts[item.name] = (stallStats[sid].itemCounts[item.name] || 0) + qty;

        const method = order.paymentMethod || 'CASH';
        if (stallStats[sid].paymentBreakdown[method] !== undefined) {
          stallStats[sid].paymentBreakdown[method] += itemNet;
        } else {
          stallStats[sid].paymentBreakdown.CASH += itemNet;
        }
      }

      // Allocate this order's refunds (paid in this window) across its stalls.
      const orderRefund = refundByOrder.get(order.id) || 0;
      if (orderRefund > 0) {
        const orderNet = (order.items || []).reduce((s, i) => {
          const g = (Number(i.price) || 0) * (Number(i.quantity) || 1);
          return s + (g - Math.round(g * orderDiscountRate));
        }, 0) || 1;
        for (const item of (order.items || [])) {
          const sid = item.stallId;
          if (!stallStats[sid]) continue;
          const g = (Number(item.price) || 0) * (Number(item.quantity) || 1);
          const itemNet = g - Math.round(g * orderDiscountRate);
          const share = Math.round(orderRefund * (itemNet / orderNet));
          stallStats[sid].refunds += share;
          stallStats[sid].netSales -= share;
        }
      }

      for (const sid of seenStallsInOrder) {
        stallStats[sid].orderCount += 1;
      }
    }

    return Object.values(stallStats).map(s => {
      let bestItem = 'N/A';
      let maxQty = 0;
      for (const [name, qty] of Object.entries(s.itemCounts)) {
        if (qty > maxQty) {
          maxQty = qty;
          bestItem = `${name} (${qty})`;
        }
      }

      // Commission rate is configured on the business settings, not hardcoded.
      const configuredRate = Number(this.db.settings?.foodCourtCommissionRate);
      const rate = Number.isFinite(configuredRate) && configuredRate >= 0
        ? Math.min(1, configuredRate)
        : 0.15;
      const commission = Math.round(s.netSales * rate);
      const merchantPayout = s.netSales - commission;

      return {
        ...s,
        bestSellingItem: bestItem,
        commissionRate: `${Math.round(rate * 1000) / 10}%`,
        managementCommission: commission,
        merchantPayout,
        grossProfit: s.netSales - s.cogs,
        profitMargin: s.netSales > 0 ? Number((((s.netSales - s.cogs) / s.netSales) * 100).toFixed(1)) : 0
      };
    }).sort((a, b) => b.netSales - a.netSales);
  }

  /**
   * Category-Wise Sales
   */
  getCategoryWiseSales({ dateFrom = null, dateTo = null, stallId = null } = {}) {
    const orders = this._filterOrders({ dateFrom, dateTo, stallId });
    const validOrders = orders.filter(o => Boolean(o.paidAt) && !['FAILED', 'UNPAID', 'PAYMENT DUE', 'CANCELLED'].includes(o.paymentStatus));

    const refundsInRange = this._refundsInRange({ dateFrom, dateTo });
    const refundByOrder = new Map();
    for (const r of refundsInRange.rows) {
      refundByOrder.set(r.orderId, (refundByOrder.get(r.orderId) || 0) + r.amount);
    }

    const catMap = new Map();
    let totalSales = 0;

    for (const order of validOrders) {
      const orderDiscountRate = order.subtotal > 0 ? (order.discount || 0) / order.subtotal : 0;
      const orderRefund = refundByOrder.get(order.id) || 0;
      const orderNet = (order.items || []).reduce((s, item) => {
        if (stallId && stallId !== 'ALL' && item.stallId !== stallId) return s;
        const gross = (Number(item.price) || 0) * (Number(item.quantity) || 1);
        return s + (gross - Math.round(gross * orderDiscountRate));
      }, 0);

      for (const item of (order.items || [])) {
        if (stallId && stallId !== 'ALL' && item.stallId !== stallId) continue;
        const dbItem = this.db.getMenuItem ? this.db.getMenuItem(item.menuItemId) : null;
        const cat = dbItem?.category || 'General';

        if (!catMap.has(cat)) {
          catMap.set(cat, {
            category: cat,
            itemCount: 0,
            quantitySold: 0,
            grossSales: 0,
            discounts: 0,
            refunds: 0,
            netSales: 0
          });
        }

        const entry = catMap.get(cat);
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const gross = price * qty;
        const disc = Math.round(gross * orderDiscountRate);
        const net = gross - disc;
        const refund = (orderRefund > 0 && orderNet > 0) ? Math.round(orderRefund * (net / orderNet)) : 0;

        entry.quantitySold += qty;
        entry.grossSales += gross;
        entry.discounts += disc;
        entry.refunds += refund;
        entry.netSales += (net - refund);
        totalSales += (net - refund);
      }
    }

    return Array.from(catMap.values()).map(c => ({
      ...c,
      percentage: totalSales > 0 ? Number(((c.netSales / totalSales) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.netSales - a.netSales);
  }

  /**
   * Hourly Sales Report in Asia/Dhaka
   */
  getHourlySales({ dateFrom = null, dateTo = null, stallId = null } = {}) {
    const orders = this._filterOrders({ dateFrom, dateTo, stallId });
    const validOrders = orders.filter(o => o.paymentStatus === 'PAID' && o.status !== 'CANCELLED');

    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${String(i).padStart(2, '0')}:00 - ${String(i).padStart(2, '0')}:59`,
      orders: 0,
      itemsSold: 0,
      sales: 0,
      paymentsCollected: 0
    }));

    for (const order of validOrders) {
      const parts = getDhakaDateParts(new Date(order.paidAt || order.createdAt));
      const h = parts.hour;
      if (h >= 0 && h < 24) {
        hours[h].orders += 1;
        hours[h].sales += (Number(order.grandTotal) || 0);
        hours[h].paymentsCollected += (Number(order.grandTotal) || 0);

        for (const item of (order.items || [])) {
          if (!stallId || stallId === 'ALL' || item.stallId === stallId) {
            hours[h].itemsSold += (Number(item.quantity) || 1);
          }
        }
      }
    }

    // Determine Peak & Slowest Hours
    let peakHour = hours[0];
    let slowestHour = hours[0];

    for (const h of hours) {
      h.averageOrderValue = h.orders > 0 ? Math.round(h.sales / h.orders) : 0;
      if (h.sales > peakHour.sales) peakHour = h;
      if (h.sales < slowestHour.sales && h.hour >= 10 && h.hour <= 22) slowestHour = h;
    }

    return {
      hours,
      peakSalesHour: peakHour,
      slowestBusinessHour: slowestHour,
      totalSales: hours.reduce((s, h) => s + h.sales, 0)
    };
  }

  /**
   * Payment Methods Breakdown & Discrepancy Detection
   */
  getPaymentMethodReport({ dateFrom = null, dateTo = null } = {}) {
    const orders = this._filterOrders({ dateFrom, dateTo });

    const methods = {
      CASH: { name: 'Cash in Till (Physical)', transactions: 0, successfulCollections: 0, pendingAmount: 0, failedAmount: 0, refunds: 0, netCollected: 0 },
      bKash: { name: 'bKash Merchant Pay', transactions: 0, successfulCollections: 0, pendingAmount: 0, failedAmount: 0, refunds: 0, netCollected: 0 },
      Nagad: { name: 'Nagad Merchant Pay', transactions: 0, successfulCollections: 0, pendingAmount: 0, failedAmount: 0, refunds: 0, netCollected: 0 },
      'Card / Physical POS Terminal': { name: 'Physical Card POS Terminal', transactions: 0, successfulCollections: 0, pendingAmount: 0, failedAmount: 0, refunds: 0, netCollected: 0 },
      'Online Card': { name: 'Online POS / Card Gateway', transactions: 0, successfulCollections: 0, pendingAmount: 0, failedAmount: 0, refunds: 0, netCollected: 0 },
      'NFC / Contactless': { name: 'NFC Contactless Tap', transactions: 0, successfulCollections: 0, pendingAmount: 0, failedAmount: 0, refunds: 0, netCollected: 0 }
    };

    let totalCollections = 0;

    for (const order of orders) {
      const m = order.paymentMethod || 'CASH';
      const target = methods[m] || methods.CASH;
      const amt = Number(order.grandTotal) || 0;

      target.transactions += 1;

      const wasCollected = Boolean(order.paidAt)
        && !['FAILED', 'UNPAID', 'PAYMENT DUE', 'CANCELLED'].includes(order.paymentStatus);

      if (wasCollected) {
        // A refunded sale was still collected on its payment date. The refund is
        // subtracted separately below, on the date the money left the till.
        target.successfulCollections += amt;
        target.netCollected += amt;
        totalCollections += amt;
      } else if (order.paymentStatus === 'FAILED') {
        target.failedAmount += amt;
      } else {
        target.pendingAmount += amt;
      }
    }

    // Refunds paid out inside this window, whatever the original sale date.
    const refundsInRange = this._refundsInRange({ dateFrom, dateTo });
    for (const refund of refundsInRange.rows) {
      const key = refund.method || 'CASH';
      const target = methods[key] || methods.CASH;
      target.refunds += refund.amount;
      target.netCollected -= refund.amount;
    }

    const list = Object.entries(methods).map(([key, val]) => ({
      key,
      ...val,
      percentage: totalCollections > 0 ? Number(((val.successfulCollections / totalCollections) * 100).toFixed(1)) : 0
    }));

    return {
      methods: list,
      totalCollections,
      totalRefunds: refundsInRange.total
    };
  }

  /**
   * Discounts, Refunds & Cancellations Audit Report
   */
  getDiscountsRefundsReport({ dateFrom = null, dateTo = null } = {}) {
    const orders = this._filterOrders({ dateFrom, dateTo });

    const discountsList = [];
    let refundsList = [];
    const cancellationsList = [];

    let totalDiscounts = 0;
    let totalRefunds = 0;
    let totalCancelledValue = 0;

    for (const order of orders) {
      // Check discount
      if (order.discount && order.discount > 0) {
        totalDiscounts += order.discount;
        discountsList.push({
          orderId: order.id,
          token: order.token,
          date: getDhakaDateParts(new Date(order.createdAt)).dateStr,
          subtotal: order.subtotal,
          discountAmount: order.discount,
          discountPercent: order.discountPercent || (order.subtotal ? Math.round((order.discount / order.subtotal) * 100) : 0),
          reason: order.discountReason || (order.couponCode ? `Coupon ${order.couponCode}` : 'Counter Discount'),
          authorizedBy: order.discountApprovedBy || order.discountAppliedBy || order.confirmedBy || 'System'
        });
      }

      // Check cancelled without refund
      if (order.status === 'CANCELLED' && order.paymentStatus !== 'REFUNDED') {
        totalCancelledValue += order.grandTotal;
        const cancelHistory = order.history?.find(h => h.status === 'CANCELLED');
        cancellationsList.push({
          orderId: order.id,
          token: order.token,
          date: getDhakaDateParts(new Date(cancelHistory?.time || order.createdAt)).dateStr,
          amount: order.grandTotal,
          reason: cancelHistory?.note || 'Cancelled before payment confirmation',
          cancelledBy: cancelHistory?.note?.match(/by (.*)\./)?.[1] || 'System / Customer'
        });
      }
    }

    // Refunds are reported on the date the money was actually paid back, even
    // when the original sale happened in an earlier period.
    const refundsInRange = this._refundsInRange({ dateFrom, dateTo });
    totalRefunds = refundsInRange.total;
    refundsList = refundsInRange.rows.map(r => ({
      orderId: r.orderId,
      token: r.token,
      invoiceNo: r.invoiceNo,
      date: r.date,
      amount: r.amount,
      reason: r.reason || 'Customer refund requested',
      refundedBy: r.refundedBy || 'Manager',
      method: r.method || 'CASH',
      transactionId: r.transactionId || null
    }));

    return {
      totalDiscounts,
      totalRefunds,
      totalCancelledValue,
      discountsList,
      refundsList,
      cancellationsList
    };
  }

  /**
   * QR Self-Order vs Manual Counter POS Sales Report
   */
  getOrderSourceReport({ dateFrom = null, dateTo = null } = {}) {
    const orders = this._filterOrders({ dateFrom, dateTo });
    const sources = {
      MANUAL_COUNTER: { name: 'Manual Counter (POS)', count: 0, itemsCount: 0, gross: 0, discount: 0, net: 0 },
      QR_CODE: { name: 'QR Self-Order (Diner Mobile)', count: 0, itemsCount: 0, gross: 0, discount: 0, net: 0 }
    };

    for (const order of orders) {
      if (order.paymentStatus !== 'PAID' || order.status === 'CANCELLED') continue;
      const srcKey = order.orderSource === 'MANUAL_COUNTER' ? 'MANUAL_COUNTER' : 'QR_CODE';
      const gross = Number(order.subtotal) || 0;
      const disc = Number(order.discount) || 0;
      const net = Number(order.grandTotal) || 0;
      const itemsQty = (order.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0);

      sources[srcKey].count += 1;
      sources[srcKey].itemsCount += itemsQty;
      sources[srcKey].gross += gross;
      sources[srcKey].discount += disc;
      sources[srcKey].net += net;
    }

    const totalNet = sources.MANUAL_COUNTER.net + sources.QR_CODE.net;
    return {
      manualCounter: {
        ...sources.MANUAL_COUNTER,
        percentage: totalNet > 0 ? Number(((sources.MANUAL_COUNTER.net / totalNet) * 100).toFixed(1)) : 0
      },
      qrCode: {
        ...sources.QR_CODE,
        percentage: totalNet > 0 ? Number(((sources.QR_CODE.net / totalNet) * 100).toFixed(1)) : 0
      },
      totalOrders: sources.MANUAL_COUNTER.count + sources.QR_CODE.count,
      totalNet
    };
  }

  /**
   * Cashier-wise Sales Report
   */
  getCashierSalesReport({ dateFrom = null, dateTo = null } = {}) {
    return this.getSalesByUser({ dateFrom, dateTo });
  }
}
