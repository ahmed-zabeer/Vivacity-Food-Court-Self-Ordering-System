import { getDhakaDateParts } from '../db.js';

/**
 * Canonical list of refunds for an order.
 *
 * A refund is money that was actually paid out to the guest. Orders that were
 * cancelled before any payment was collected are NOT refunds and must never
 * appear here (otherwise the books would show cash leaving the till that never
 * entered it).
 *
 * `order.refunds` is the authoritative list when present. `order.refundDetails`
 * is only used as a fallback for legacy orders, and legacy REFUNDED orders
 * without any detail are treated as one full refund on their cancellation date.
 */
export function getOrderRefunds(order) {
  if (!order) return [];
  const list = [];

  if (Array.isArray(order.refunds) && order.refunds.length > 0) {
    for (const r of order.refunds) {
      const amount = Number(r.refundAmount ?? r.amount) || 0;
      if (amount <= 0) continue;
      list.push({
        amount,
        date: r.refundedAt || r.date || null,
        by: r.refundedBy || 'Manager',
        reason: r.reason || '',
        method: r.paymentMethod || order.paymentMethod || 'CASH',
        transactionId: r.transactionId || null
      });
    }
    return list;
  }

  const d = order.refundDetails;
  if (d) {
    const amount = Number(d.refundAmount ?? d.refundedAmount) || 0;
    if (amount > 0) {
      list.push({
        amount,
        date: d.refundedAt || null,
        by: d.refundedBy || 'Manager',
        reason: d.reason || '',
        method: d.paymentMethod || order.paymentMethod || 'CASH',
        transactionId: d.transactionId || null
      });
    }
    if (list.length > 0) return list;
  }

  // Legacy safety net: a REFUNDED order with no refund record at all.
  if (order.paymentStatus === 'REFUNDED') {
    const amount = Number(order.grandTotal) || 0;
    if (amount > 0) {
      const cancelTime = order.history?.find(h => h.status === 'CANCELLED')?.time;
      list.push({
        amount,
        date: cancelTime || order.paidAt || order.createdAt || null,
        by: 'Manager',
        reason: 'Refund (legacy record)',
        method: order.paymentMethod || 'CASH',
        transactionId: null
      });
    }
  }

  return list;
}

/** Dhaka date string (YYYY-MM-DD) for a refund record, or null. */
export function getRefundDateStr(refund, fallbackOrder) {
  const stamp = refund?.date || fallbackOrder?.paidAt || fallbackOrder?.createdAt || null;
  if (!stamp) return null;
  const d = new Date(stamp);
  if (Number.isNaN(d.getTime())) return null;
  return getDhakaDateParts(d).dateStr;
}

/** Sum of refunds for an order that fall inside an optional date window. */
export function sumOrderRefunds(order, { dateFrom = null, dateTo = null } = {}) {
  let total = 0;
  for (const refund of getOrderRefunds(order)) {
    const dateStr = getRefundDateStr(refund, order);
    if (dateFrom && (!dateStr || dateStr < dateFrom)) continue;
    if (dateTo && (!dateStr || dateStr > dateTo)) continue;
    total += refund.amount;
  }
  return total;
}

/** Sum of refunds paid out with a given payment method inside an optional date window. */
export function sumOrderRefundsByMethod(order, method, { dateFrom = null, dateTo = null } = {}) {
  let total = 0;
  for (const refund of getOrderRefunds(order)) {
    if ((refund.method || 'CASH') !== method) continue;
    const dateStr = getRefundDateStr(refund, order);
    if (dateFrom && (!dateStr || dateStr < dateFrom)) continue;
    if (dateTo && (!dateStr || dateStr > dateTo)) continue;
    total += refund.amount;
  }
  return total;
}
