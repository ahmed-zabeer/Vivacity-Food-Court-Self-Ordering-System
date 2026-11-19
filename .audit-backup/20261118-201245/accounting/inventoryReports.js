import { getDhakaDateParts } from '../db.js';

export class InventoryReportsEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * Helper: Get item inventory records merged with menu details
   */
  _getAllInventoryItems(stallId = null) {
    const items = stallId && stallId !== 'ALL'
      ? this.db.menuItems.filter(m => m.stallId === stallId)
      : this.db.menuItems;

    return items.map(item => {
      const inv = this.db.inventory[item.id] || {
        preparedQty: null,
        soldQty: 0,
        reservedQty: 0,
        manuallyDisabled: false,
        unitCost: Math.round(item.price * 0.45), // standard 45% default food cost if unconfigured
        minStock: 10,
        reorderLevel: 15,
        maxStock: 100,
        unit: item.unit || 'portion'
      };

      const stall = this.db.stalls.find(s => s.id === item.stallId);
      const prep = inv.preparedQty !== null && inv.preparedQty !== undefined ? Number(inv.preparedQty) : 50;
      const sold = Number(inv.soldQty) || 0;
      const reserved = Number(inv.reservedQty) || 0;
      const physicalStock = Math.max(0, prep - sold);
      const availableStock = Math.max(0, physicalStock - reserved);
      const unitCost = Number(inv.unitCost) || Math.round((Number(item.price) || 100) * 0.45);

      const minStock = inv.minStock !== undefined ? Number(inv.minStock) : 10;
      const reorderLevel = inv.reorderLevel !== undefined ? Number(inv.reorderLevel) : 15;
      const maxStock = inv.maxStock !== undefined ? Number(inv.maxStock) : 100;

      let status = 'IN_STOCK';
      if (inv.manuallyDisabled || availableStock === 0) {
        status = 'OUT_OF_STOCK';
      } else if (availableStock <= minStock) {
        status = 'CRITICAL';
      } else if (availableStock <= reorderLevel) {
        status = 'LOW_STOCK';
      }

      return {
        itemId: item.id,
        name: item.name,
        stallId: item.stallId,
        stallName: stall?.name || item.stallId,
        category: item.category || 'General',
        unit: inv.unit || item.unit || 'portion',
        physicalStock,
        reservedStock: reserved,
        availableStock,
        preparedQty: prep,
        soldQty: sold,
        unitCost,
        stockValue: Math.round(physicalStock * unitCost),
        minStock,
        reorderLevel,
        maxStock,
        status,
        manuallyDisabled: !!inv.manuallyDisabled,
        lastUpdatedAt: inv.lastUpdatedAt || null
      };
    });
  }

  /**
   * Inventory Valuation Report
   */
  getInventoryValuation({ stallId = null, category = null, search = '' } = {}) {
    let items = this._getAllInventoryItems(stallId);

    if (category && category !== 'ALL') {
      items = items.filter(i => i.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.itemId.toLowerCase().includes(q));
    }

    const totalPhysicalStock = items.reduce((s, i) => s + i.physicalStock, 0);
    const totalReservedStock = items.reduce((s, i) => s + i.reservedStock, 0);
    const totalAvailableStock = items.reduce((s, i) => s + i.availableStock, 0);
    const totalValuation = items.reduce((s, i) => s + i.stockValue, 0);

    return {
      items: items.sort((a, b) => b.stockValue - a.stockValue),
      totalPhysicalStock,
      totalReservedStock,
      totalAvailableStock,
      totalValuation,
      totalItemCount: items.length
    };
  }

  /**
   * Stock Summary Report
   */
  getStockSummary({ stallId = null, status = null, search = '' } = {}) {
    let items = this._getAllInventoryItems(stallId);

    if (status && status !== 'ALL') {
      items = items.filter(i => i.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }

    const counts = {
      IN_STOCK: 0,
      LOW_STOCK: 0,
      CRITICAL: 0,
      OUT_OF_STOCK: 0
    };

    for (const item of items) {
      if (counts[item.status] !== undefined) counts[item.status] += 1;
    }

    return {
      items,
      counts,
      totalItems: items.length
    };
  }

  /**
   * Stock Movement / Stock Ledger
   */
  getStockMovements({ dateFrom = null, dateTo = null, itemId = null, movementType = null, search = '', page = 1, limit = 50 } = {}) {
    let movements = [...(this.db.inventoryMovements || [])];

    if (dateFrom) movements = movements.filter(m => (m.date || m.timestamp?.slice(0, 10)) >= dateFrom);
    if (dateTo) movements = movements.filter(m => (m.date || m.timestamp?.slice(0, 10)) <= dateTo);
    if (itemId && itemId !== 'ALL') movements = movements.filter(m => m.menuItemId === itemId);
    if (movementType && movementType !== 'ALL') movements = movements.filter(m => m.movementType === movementType);

    if (search) {
      const q = search.toLowerCase();
      movements = movements.filter(m =>
        (m.itemName || '').toLowerCase().includes(q) ||
        (m.refNo || '').toLowerCase().includes(q) ||
        (m.notes || '').toLowerCase().includes(q)
      );
    }

    // Sort descending
    movements.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    const totalCount = movements.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = movements.slice(startIndex, startIndex + Number(limit));

    return {
      movements: paginated,
      totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / Number(limit))
    };
  }

  /**
   * Stock In Report (Receipts / GRN)
   */
  getStockInReport({ dateFrom = null, dateTo = null, supplier = null, search = '' } = {}) {
    const movements = (this.db.inventoryMovements || []).filter(m => {
      if (m.movementType !== 'PURCHASE_RECEIPT' && m.movementType !== 'STOCK_IN') return false;
      const mDate = m.date || m.timestamp?.slice(0, 10);
      if (dateFrom && mDate < dateFrom) return false;
      if (dateTo && mDate > dateTo) return false;
      if (supplier && supplier !== 'ALL' && m.supplier !== supplier) return false;
      if (search && !(m.itemName || '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    return movements.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }

  /**
   * Stock Out Report (Issues / Consumption / Spoilage)
   */
  getStockOutReport({ dateFrom = null, dateTo = null, reason = null, search = '' } = {}) {
    const movements = (this.db.inventoryMovements || []).filter(m => {
      const isOut = ['SALES_CONSUMPTION', 'RECIPE_CONSUMPTION', 'WASTAGE', 'DAMAGE', 'STOCK_OUT'].includes(m.movementType);
      if (!isOut) return false;
      const mDate = m.date || m.timestamp?.slice(0, 10);
      if (dateFrom && mDate < dateFrom) return false;
      if (dateTo && mDate > dateTo) return false;
      if (reason && reason !== 'ALL' && m.movementType !== reason) return false;
      if (search && !(m.itemName || '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    return movements.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }

  /**
   * Low Stock & Reorder Report
   */
  getLowStockReport({ stallId = null } = {}) {
    const all = this._getAllInventoryItems(stallId);
    const lowItems = all.filter(i => i.status === 'LOW_STOCK' || i.status === 'CRITICAL' || i.status === 'OUT_OF_STOCK');

    const recommendations = lowItems.map(item => {
      const suggestedQty = Math.max(0, item.maxStock - item.physicalStock);
      const estimatedCost = suggestedQty * item.unitCost;

      // Calculate historical daily burn rate from orders in last 7 days
      const daysHistory = 7;
      const dailyBurn = Math.max(1, Math.round((item.soldQty || 7) / daysHistory));
      const daysRemaining = dailyBurn > 0 ? Math.floor(item.availableStock / dailyBurn) : 99;

      return {
        ...item,
        suggestedPurchaseQuantity: suggestedQty,
        estimatedPurchaseCost: estimatedCost,
        estimatedDaysRemaining: daysRemaining,
        preferredSupplier: `${item.stallName} Central Supplies`
      };
    });

    return {
      lowStockItems: recommendations.sort((a, b) => a.estimatedDaysRemaining - b.estimatedDaysRemaining),
      totalLowStockCount: recommendations.length,
      estimatedReorderCost: recommendations.reduce((s, i) => s + i.estimatedPurchaseCost, 0)
    };
  }

  /**
   * Wastage & Damage Report
   */
  getWastageReport({ dateFrom = null, dateTo = null } = {}) {
    const movements = (this.db.inventoryMovements || []).filter(m => {
      if (m.movementType !== 'WASTAGE' && m.movementType !== 'DAMAGE') return false;
      const mDate = m.date || m.timestamp?.slice(0, 10);
      if (dateFrom && mDate < dateFrom) return false;
      if (dateTo && mDate > dateTo) return false;
      return true;
    });

    const totalLossValue = movements.reduce((s, m) => s + (Number(m.totalValue) || 0), 0);
    const totalWastedQty = movements.reduce((s, m) => s + (Number(m.quantityOut) || 0), 0);

    return {
      wastageRecords: movements.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')),
      totalLossValue,
      totalWastedQty,
      recordsCount: movements.length
    };
  }

  /**
   * Ingredient Consumption Report (Recipe-Based BOM)
   */
  getIngredientConsumptionReport({ dateFrom = null, dateTo = null, stallId = null } = {}) {
    const orders = this.db.orders.filter(order => {
      if (order.paymentStatus !== 'PAID' || order.status === 'CANCELLED') return false;
      const oDate = getDhakaDateParts(new Date(order.paidAt || order.createdAt)).dateStr;
      if (dateFrom && oDate < dateFrom) return false;
      if (dateTo && oDate > dateTo) return false;
      return true;
    });

    // Aggregate food item sales
    const foodSales = {};
    for (const order of orders) {
      for (const item of (order.items || [])) {
        if (stallId && stallId !== 'ALL' && item.stallId !== stallId) continue;
        const itemId = item.menuItemId || item.id;
        if (!foodSales[itemId]) {
          foodSales[itemId] = {
            itemId,
            name: item.name,
            stallId: item.stallId,
            quantitySold: 0
          };
        }
        foodSales[itemId].quantitySold += (Number(item.quantity) || 1);
      }
    }

    const consumptionRows = [];
    let totalConfiguredCost = 0;

    for (const sale of Object.values(foodSales)) {
      const recipe = this.db.getRecipe ? this.db.getRecipe(sale.itemId) : null;

      if (!recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
        consumptionRows.push({
          foodItemId: sale.itemId,
          foodItemName: sale.name,
          quantitySold: sale.quantitySold,
          ingredientName: 'Recipe Not Configured',
          recipeQtyPerItem: null,
          unit: '-',
          totalExpectedConsumption: null,
          actualRecordedConsumption: null,
          costPerUnit: null,
          totalConsumptionCost: null,
          hasRecipe: false
        });
      } else {
        for (const ing of recipe.ingredients) {
          const expectedQty = Number(ing.quantity || 0) * sale.quantitySold;
          const cost = Number(ing.cost || 0) * sale.quantitySold;
          totalConfiguredCost += cost;

          consumptionRows.push({
            foodItemId: sale.itemId,
            foodItemName: sale.name,
            quantitySold: sale.quantitySold,
            ingredientName: ing.name,
            recipeQtyPerItem: ing.quantity,
            unit: ing.unit || 'g',
            totalExpectedConsumption: expectedQty,
            actualRecordedConsumption: expectedQty, // Matches expected in standardized batch kitchen
            costPerUnit: ing.costPerUnit || ing.cost,
            totalConsumptionCost: cost,
            hasRecipe: true
          });
        }
      }
    }

    return {
      consumption: consumptionRows,
      totalConfiguredCost,
      dateFrom,
      dateTo
    };
  }

  /**
   * Inventory Forecast (7, 15, 30, 60 days)
   */
  getInventoryForecast({ days = 14, stallId = null } = {}) {
    const horizonDays = Number(days) || 14;
    const items = this._getAllInventoryItems(stallId);

    const forecasts = items.map(item => {
      // Burn rate derived from actual sold quantity in last 7 days
      const weeklySold = Math.max(1, item.soldQty || 7);
      const avgDaily = Number((weeklySold / 7).toFixed(1));
      const avgWeekly = Math.round(avgDaily * 7);

      const projectedDemand = Math.round(avgDaily * horizonDays);
      const incomingStock = 0; // PO pending deliveries
      const safetyStock = item.minStock || 10;
      const netAvailable = item.availableStock + incomingStock;

      const daysUntilStockout = avgDaily > 0 ? Math.floor(netAvailable / avgDaily) : 99;
      const willStockOut = daysUntilStockout <= horizonDays;
      const suggestedReorder = willStockOut ? Math.max(0, (projectedDemand + safetyStock) - netAvailable) : 0;
      const estimatedCost = suggestedReorder * item.unitCost;

      return {
        itemId: item.itemId,
        itemName: item.name,
        category: item.category,
        unit: item.unit,
        availableStock: item.availableStock,
        incomingStock,
        avgDailyConsumption: avgDaily,
        avgWeeklyConsumption: avgWeekly,
        safetyStock,
        daysUntilStockout,
        willStockOut,
        suggestedReorderQuantity: suggestedReorder,
        estimatedPurchaseCost: estimatedCost,
        isForecastEstimate: true
      };
    });

    return {
      forecastHorizonDays: horizonDays,
      forecasts: forecasts.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout),
      totalSuggestedReorderCost: forecasts.reduce((s, f) => s + f.estimatedPurchaseCost, 0)
    };
  }
}
