import { GuestOrderCancelledEvent, Order } from '../types';

/**
 * Guest-facing order cancellation notices.
 *
 * These helpers are shared by the global popup (App.tsx), the polling
 * realtime fallback and the order tracking page so that every surface uses the
 * exact same strict targeting rules and the same acknowledgement store.
 */

const ACK_KEY = 'vivacity_cancelled_notice_ack';
const MAX_ACK_ENTRIES = 200;

const readJsonArray = (key: string, storage: 'local' | 'session'): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = (storage === 'local' ? localStorage : sessionStorage).getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const getClientId = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem('vivacity_client_id') || '';
  } catch {
    return '';
  }
};

/** Has the guest already pressed OK on this exact cancellation popup? */
export const isCancellationAcknowledged = (eventId?: string | null): boolean => {
  if (!eventId) return false;
  return readJsonArray(ACK_KEY, 'local').includes(eventId);
};

/** Remember that the guest dismissed this exact cancellation popup. */
export const acknowledgeCancellation = (eventId?: string | null): void => {
  if (!eventId || typeof window === 'undefined') return;
  try {
    const next = [eventId, ...readJsonArray(ACK_KEY, 'local').filter(id => id !== eventId)].slice(0, MAX_ACK_ENTRIES);
    localStorage.setItem(ACK_KEY, JSON.stringify(next));
  } catch {}
};

/**
 * Build a cancellation notice from a stored order. Returns null when the order
 * was not cancelled or when no cancellation event was recorded.
 */
export const buildCancellationEvent = (order: Order | any | null | undefined): GuestOrderCancelledEvent | null => {
  if (!order || order.status !== 'CANCELLED' || !order.cancellationEventId) return null;

  const refunded = Array.isArray(order.refunds)
    ? order.refunds.reduce((sum: number, r: any) => sum + (Number(r?.refundAmount) || 0), 0)
    : 0;
  const fallbackCancelledAt =
    order.cancelledAt ||
    (Array.isArray(order.history)
      ? [...order.history].reverse().find((h: any) => h?.status === 'CANCELLED')?.time
      : null) ||
    null;

  return {
    type: 'ORDER_CANCELLED',
    eventId: order.cancellationEventId,
    cancellationEventId: order.cancellationEventId,
    orderId: order.id,
    token: order.token,
    invoiceNo: order.invoiceNo || null,
    tableId: order.tableId || null,
    clientId: order.clientId || null,
    customerName: order.customerName || null,
    reason: order.cancellationReason || 'Cancelled by the food court',
    cancelledAt: fallbackCancelledAt,
    cancelledBy: order.cancelledBy || null,
    cancelledByRole: order.cancelledByRole || null,
    source: order.cancellationSource || null,
    paymentStatus: order.paymentStatus || null,
    paymentMethod: order.paymentMethod || null,
    grandTotal: Number(order.grandTotal) || 0,
    refundAmount: refunded || Number(order.refundDetails?.refundAmount) || 0
  };
};

/**
 * Strict guest targeting for cancellation notices.
 *
 * The private client id or an exact order id stored on THIS device must match.
 * A shared table id is intentionally never accepted, because several guests at
 * the same table can hold independent orders.
 */
export const isCancellationForThisGuest = (evt: GuestOrderCancelledEvent | null | undefined): boolean => {
  if (!evt) return false;
  if (typeof window === 'undefined') return false;

  const clientId = getClientId();
  if (evt.clientId && clientId && evt.clientId === clientId) return true;

  const sessionOrders = readJsonArray('vivacity_session_orders', 'session');
  if (sessionOrders.includes(evt.orderId) || sessionOrders.includes(evt.token)) return true;

  const localOrders = readJsonArray('vivacity_customer_orders', 'local');
  if (localOrders.includes(evt.orderId) || localOrders.includes(evt.token)) return true;

  const pathname = window.location.pathname.replace(/\/+$/, '');
  if (pathname === `/orders/${evt.orderId}` || pathname === `/orders/${evt.token}`) return true;

  return false;
};
