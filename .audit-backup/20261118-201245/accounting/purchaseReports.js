import { getDhakaDateParts } from '../db.js';

export class PurchaseReportsEngine {
  constructor(db) {
    this.db = db;
  }

  _filterPurchases({ dateFrom = null, dateTo = null, supplier = null, status = null, paymentStatus = null, search = '' } = {}) {
    return (this.db.purchases || []).filter(p => {
      if (!p) return false;
      const purDate = p.date || getDhakaDateParts(new Date(p.createdAt)).dateStr;

      if (dateFrom && purDate < dateFrom) return false;
      if (dateTo && purDate > dateTo) return false;
      if (supplier && supplier !== 'ALL' && p.supplier !== supplier) return false;
      if (status && (p.orderStatus || p.status) !== status) return false;

      const isPaid = p.status === 'PAID' || p.paymentStatus === 'PAID';
      const total = Number(p.amount) || 0;
      const paid = p.paidAmount !== undefined ? Number(p.paidAmount) : (isPaid ? total : 0);
      const isDue = paid < total;

      if (paymentStatus === 'PAID' && isDue) return false;
      if (paymentStatus === 'UNPAID' && !isDue) return false;
      if (paymentStatus === 'PARTIALLY_PAID' && (paid <= 0 || paid >= total)) return false;

      if (search) {
        const q = search.toLowerCase();
        const matchesSupplier = (p.supplier || '').toLowerCase().includes(q);
        const matchesDesc = (p.description || '').toLowerCase().includes(q);
        const matchesCat = (p.category || '').toLowerCase().includes(q);
        const matchesPo = (p.poNumber || '').toLowerCase().includes(q);
        const matchesInv = (p.invoiceNumber || '').toLowerCase().includes(q);
        if (!matchesSupplier && !matchesDesc && !matchesCat && !matchesPo && !matchesInv) return false;
      }

      return true;
    });
  }

  /**
   * Purchase Order List with Purchasing Workflow
   */
  getPurchaseOrderList({ dateFrom = null, dateTo = null, supplier = null, status = null, search = '', page = 1, limit = 50 } = {}) {
    const list = this._filterPurchases({ dateFrom, dateTo, supplier, status, search });

    const formatted = list.map(p => {
      const total = Number(p.amount) || 0;
      const isPaid = p.status === 'PAID' || p.paymentStatus === 'PAID';
      const paid = p.paidAmount !== undefined ? Number(p.paidAmount) : (isPaid ? total : 0);
      const due = Math.max(0, total - paid);

      const items = Array.isArray(p.items) ? p.items : [];
      const purchasedQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
      const receivedQty = items.reduce((s, i) => s + (Number(i.receivedQuantity) || 0), 0);
      const pendingQty = Math.max(0, purchasedQty - receivedQty);

      return {
        id: p.id,
        poNumber: p.poNumber || `PO-${p.id.slice(-6).toUpperCase()}`,
        invoiceNumber: p.invoiceNumber || `INV-${p.id.slice(-6).toUpperCase()}`,
        supplier: p.supplier || 'Vendor',
        category: p.category || 'Raw Ingredients',
        description: p.description || '',
        orderDate: p.date,
        expectedDeliveryDate: p.expectedDeliveryDate || p.date,
        totalAmount: total,
        paidAmount: paid,
        dueAmount: due,
        purchasedQuantity: purchasedQty,
        receivedQuantity: receivedQty,
        pendingQuantity: pendingQty,
        orderStatus: p.orderStatus || (receivedQty > 0 && receivedQty < purchasedQty ? 'PARTIALLY_RECEIVED' : (isPaid ? 'RECEIVED' : 'ORDERED')),
        paymentStatus: due === 0 ? 'PAID' : (paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'),
        createdBy: p.createdBy || 'Staff',
        createdAt: p.createdAt,
        items,
        paymentHistory: p.paymentHistory || [],
        goodsReceivedNotes: p.goodsReceivedNotes || []
      };
    }).sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || ''));

    const totalCount = formatted.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = formatted.slice(startIndex, startIndex + Number(limit));

    return {
      orders: paginated,
      totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / Number(limit)),
      totalPurchasesAmount: formatted.reduce((s, p) => s + p.totalAmount, 0),
      totalPaidAmount: formatted.reduce((s, p) => s + p.paidAmount, 0),
      totalDueAmount: formatted.reduce((s, p) => s + p.dueAmount, 0)
    };
  }

  /**
   * Purchase By Supplier Report
   */
  getPurchaseBySupplier({ dateFrom = null, dateTo = null } = {}) {
    const list = this._filterPurchases({ dateFrom, dateTo });
    const supMap = new Map();

    for (const p of list) {
      const sup = p.supplier || 'General Supplier';
      const total = Number(p.amount) || 0;
      const isPaid = p.status === 'PAID' || p.paymentStatus === 'PAID';
      const paid = p.paidAmount !== undefined ? Number(p.paidAmount) : (isPaid ? total : 0);
      const due = Math.max(0, total - paid);

      const items = Array.isArray(p.items) ? p.items : [];
      const receivedVal = items.length > 0
        ? items.reduce((s, i) => s + (Number(i.receivedQuantity || 0) * Number(i.unitCost || 0)), 0)
        : (p.orderStatus === 'RECEIVED' || isPaid ? total : 0);

      const returnedVal = items.reduce((s, i) => s + (Number(i.returnedQuantity || 0) * Number(i.unitCost || 0)), 0);

      if (!supMap.has(sup)) {
        supMap.set(sup, {
          supplierName: sup,
          purchaseCount: 0,
          totalPurchaseAmount: 0,
          receivedValue: 0,
          paidAmount: 0,
          outstandingDue: 0,
          purchaseReturns: 0,
          supplierCredit: 0,
          lastPurchaseDate: p.date || null
        });
      }

      const entry = supMap.get(sup);
      entry.purchaseCount += 1;
      entry.totalPurchaseAmount += total;
      entry.receivedValue += receivedVal;
      entry.paidAmount += paid;
      entry.outstandingDue += due;
      entry.purchaseReturns += returnedVal;
      entry.supplierCredit += (p.supplierCredit || 0);

      if (p.date && (!entry.lastPurchaseDate || p.date > entry.lastPurchaseDate)) {
        entry.lastPurchaseDate = p.date;
      }
    }

    return Array.from(supMap.values()).sort((a, b) => b.totalPurchaseAmount - a.totalPurchaseAmount);
  }

  /**
   * Purchase Item Details (Item-wise purchasing history)
   */
  getPurchaseItemDetails({ dateFrom = null, dateTo = null, supplier = null, search = '' } = {}) {
    const list = this._filterPurchases({ dateFrom, dateTo, supplier });
    const rows = [];

    for (const p of list) {
      const items = Array.isArray(p.items) ? p.items : [];
      if (items.length === 0) {
        // Fallback for simple purchases without item breakdown
        const row = {
          itemId: `ITEM-${p.id.slice(-6)}`,
          itemName: p.description || p.category || 'Kitchen Ingredient',
          category: p.category || 'Supplies',
          supplier: p.supplier || 'Vendor',
          invoiceNumber: p.invoiceNumber || p.poNumber || `INV-${p.id.slice(-6).toUpperCase()}`,
          purchaseDate: p.date,
          purchasedQuantity: 1,
          receivedQuantity: p.orderStatus === 'RECEIVED' || p.status === 'PAID' ? 1 : 0,
          unit: 'unit',
          unitPurchaseCost: Number(p.amount) || 0,
          totalPurchaseValue: Number(p.amount) || 0,
          returnedQuantity: 0,
          remainingAcceptedQuantity: p.orderStatus === 'RECEIVED' || p.status === 'PAID' ? 1 : 0
        };
        if (!search || row.itemName.toLowerCase().includes(search.toLowerCase()) || row.supplier.toLowerCase().includes(search.toLowerCase())) {
          rows.push(row);
        }
      } else {
        for (const item of items) {
          if (search && !(item.itemName || '').toLowerCase().includes(search.toLowerCase())) continue;
          rows.push({
            itemId: item.itemId || item.id,
            itemName: item.itemName || 'Raw Item',
            category: item.category || p.category || 'Ingredient',
            supplier: p.supplier || 'Vendor',
            invoiceNumber: p.invoiceNumber || p.poNumber || `INV-${p.id.slice(-6).toUpperCase()}`,
            purchaseDate: p.date,
            purchasedQuantity: Number(item.quantity) || 0,
            receivedQuantity: Number(item.receivedQuantity) || 0,
            unit: item.unit || 'kg',
            unitPurchaseCost: Number(item.unitCost) || 0,
            totalPurchaseValue: (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
            returnedQuantity: Number(item.returnedQuantity) || 0,
            remainingAcceptedQuantity: Math.max(0, (Number(item.receivedQuantity) || 0) - (Number(item.returnedQuantity) || 0))
          });
        }
      }
    }

    return rows.sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''));
  }

  /**
   * Purchase Summary Report
   */
  getPurchaseSummary({ dateFrom = null, dateTo = null } = {}) {
    const list = this._filterPurchases({ dateFrom, dateTo });

    let totalPurchaseOrders = list.length;
    let totalPurchaseValue = 0;
    let totalGoodsReceivedValue = 0;
    let pendingDeliveriesCount = 0;
    let purchaseReturnsValue = 0;
    let totalSupplierInvoices = 0;
    let amountPaid = 0;
    let amountDue = 0;

    const supplierTotals = {};

    for (const p of list) {
      const amt = Number(p.amount) || 0;
      totalPurchaseValue += amt;
      totalSupplierInvoices += 1;

      const isPaid = p.status === 'PAID' || p.paymentStatus === 'PAID';
      const paid = p.paidAmount !== undefined ? Number(p.paidAmount) : (isPaid ? amt : 0);
      const due = Math.max(0, amt - paid);

      amountPaid += paid;
      amountDue += due;

      const items = Array.isArray(p.items) ? p.items : [];
      if (items.length > 0) {
        const recVal = items.reduce((s, i) => s + ((Number(i.receivedQuantity) || 0) * (Number(i.unitCost) || 0)), 0);
        const retVal = items.reduce((s, i) => s + ((Number(i.returnedQuantity) || 0) * (Number(i.unitCost) || 0)), 0);
        totalGoodsReceivedValue += recVal;
        purchaseReturnsValue += retVal;

        const hasPending = items.some(i => (Number(i.receivedQuantity) || 0) < (Number(i.quantity) || 0));
        if (hasPending) pendingDeliveriesCount += 1;
      } else {
        if (p.orderStatus === 'RECEIVED' || isPaid) {
          totalGoodsReceivedValue += amt;
        } else {
          pendingDeliveriesCount += 1;
        }
      }

      const sup = p.supplier || 'Vendor';
      supplierTotals[sup] = (supplierTotals[sup] || 0) + amt;
    }

    const topSuppliers = Object.entries(supplierTotals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      totalPurchaseOrders,
      totalPurchaseValue,
      totalGoodsReceivedValue,
      pendingDeliveriesCount,
      purchaseReturnsValue,
      totalSupplierInvoices,
      amountPaid,
      amountDue,
      averagePurchaseValue: totalPurchaseOrders > 0 ? Math.round(totalPurchaseValue / totalPurchaseOrders) : 0,
      topSuppliers,
      dateFrom,
      dateTo
    };
  }
}
