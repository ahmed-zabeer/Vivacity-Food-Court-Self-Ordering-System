/**
 * Cost of Goods Sold helpers.
 *
 * COGS is derived ONLY from configured data:
 *  - the recipe of each sold menu item (sum of its ingredient line costs), or
 *  - an explicitly configured per-item unit cost in inventory.
 *
 * When neither exists the item contributes 0 and is reported as "uncovered" so
 * the UI can be honest about cost coverage. We never invent a food-cost ratio.
 */

export function getMenuItemCost(db, menuItemId) {
  const recipe = db.getRecipe?.(menuItemId);
  if (recipe && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
    const total = recipe.ingredients.reduce((sum, ing) => {
      const lineCost = Number(ing.cost);
      if (!Number.isFinite(lineCost) || lineCost <= 0) return sum;
      return sum + lineCost;
    }, 0);
    if (total > 0) return Math.round(total);
  }
  const inv = db.inventory?.[menuItemId];
  const invCost = Number(inv?.unitCost);
  if (Number.isFinite(invCost) && invCost > 0) return Math.round(invCost);
  return null;
}

/** Cost of a single order's items, with cost-coverage information. */
export function getOrderItemCost(db, order) {
  let cogs = 0;
  let coveredRevenue = 0;
  let uncoveredRevenue = 0;
  let quantity = 0;

  for (const item of (order.items || [])) {
    const qty = Number(item.quantity) || 1;
    const lineRevenue = (Number(item.price) || 0) * qty;
    quantity += qty;
    const unitCost = getMenuItemCost(db, item.menuItemId);
    if (unitCost === null) {
      uncoveredRevenue += lineRevenue;
      continue;
    }
    cogs += unitCost * qty;
    coveredRevenue += lineRevenue;
  }

  return { cogs: Math.round(cogs), coveredRevenue, uncoveredRevenue, quantity };
}

/**
 * Ingredient COGS + wastage + stock-count adjustments for a set of orders
 * (already filtered to eligible sales) and a date window.
 */
export function computeCogs(db, orders, { dateFrom = null, dateTo = null } = {}) {
  let ingredientCogs = 0;
  let coveredRevenue = 0;
  let uncoveredRevenue = 0;

  for (const order of orders) {
    const c = getOrderItemCost(db, order);
    ingredientCogs += c.cogs;
    coveredRevenue += c.coveredRevenue;
    uncoveredRevenue += c.uncoveredRevenue;
  }

  let wastage = 0;
  let adjustments = 0;
  for (const mov of (db.inventoryMovements || [])) {
    if (!mov) continue;
    const movDate = mov.date || (mov.timestamp ? new Date(mov.timestamp).toISOString().slice(0, 10) : null);
    if (dateFrom && (!movDate || movDate < dateFrom)) continue;
    if (dateTo && (!movDate || movDate > dateTo)) continue;
    const value = Math.abs(Number(mov.totalValue) || 0);
    if (value <= 0) continue;
    if (mov.movementType === 'WASTAGE' || mov.movementType === 'DAMAGE') {
      wastage += value;
    } else if (mov.movementType === 'ADJUSTMENT') {
      adjustments += value;
    }
  }

  const total = Math.round(ingredientCogs + wastage + adjustments);
  const totalRevenue = coveredRevenue + uncoveredRevenue;

  return {
    cogs: total,
    ingredientCogs: Math.round(ingredientCogs),
    wastage: Math.round(wastage),
    adjustments: Math.round(adjustments),
    coveredRevenue: Math.round(coveredRevenue),
    uncoveredRevenue: Math.round(uncoveredRevenue),
    // Share of sales value whose cost is backed by a real recipe/unit cost.
    coveragePercent: totalRevenue > 0 ? Number(((coveredRevenue / totalRevenue) * 100).toFixed(1)) : 100
  };
}
