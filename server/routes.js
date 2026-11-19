import { Router } from 'express';
import { db, DATA_DIR } from './db.js';
import { eventBus } from './events.js';
import { kvEnabled } from './persist.js';
import os from 'os';

const router = Router();
const MANAGER_ROLES = new Set(['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER']);

function getRequestRole(req) {
  return String(req.headers['x-user-role'] || req.body?.userRole || '').trim().toUpperCase();
}

function getRequestName(req, fallback = 'Manager') {
  return req.headers['x-user-name'] || req.body?.userName || fallback;
}

function requireManagerRole(req, res) {
  if (MANAGER_ROLES.has(getRequestRole(req))) return true;
  res.status(403).json({ error: 'Unauthorized: Manager access is required.' });
  return false;
}

// Cancellation/refund authority: when a caller explicitly declares a role, it
// must be a manager-level role. Cashiers can still submit a void request, but
// they cannot cancel or refund an order on their own.
function blockedFromCancelling(req) {
  const role = getRequestRole(req);
  return Boolean(role) && !MANAGER_ROLES.has(role);
}

// --- Real-time SSE Endpoint ---
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial connection ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', time: new Date().toISOString() })}\n\n`);

  // Attach subscription metadata so guest notifications can be targeted to the
  // correct table/order instead of being broadcast to every connected client.
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : null;
  const tableId = typeof req.query.tableId === 'string' ? req.query.tableId : null;
  const role = typeof req.query.role === 'string' ? req.query.role : null;
  const orderIds = typeof req.query.orderIds === 'string'
    ? req.query.orderIds.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  eventBus.addClient(res, { clientId, tableId, role, orderIds });

  // Replay any persisted cancellation for these exact order ids. This keeps a
  // refreshing/reconnecting guest phone informed even though the original
  // broadcast happened while it was offline.
  for (const orderId of new Set(orderIds.filter(Boolean))) {
    const order = db.getOrder(orderId);
    if (order && order.status === 'CANCELLED' && order.cancellationEventId && clientId) {
      const payload = db.getGuestCancellationPayload(order);
      if (payload) eventBus.sendToClient(clientId, 'guest_order_cancelled', payload);
    }
  }
});

// Late-binding subscription: the EventSource may connect before the guest page
// knows its order/table metadata, so the client registers them here.
router.post('/events/subscribe', (req, res) => {
  const { clientId, tableId, orderId, orderIds, role } = req.body || {};
  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required to subscribe.' });
  }
  eventBus.subscribeClient(clientId, { tableId, orderId, orderIds, role });

  // Replay a persisted cancellation notice to this exact phone only.
  const ids = [orderId, ...(Array.isArray(orderIds) ? orderIds : [])].filter(Boolean);
  for (const id of new Set(ids)) {
    const order = db.getOrder(id);
    if (order && order.status === 'CANCELLED' && order.cancellationEventId) {
      const payload = db.getGuestCancellationPayload(order);
      if (payload) eventBus.sendToClient(clientId, 'guest_order_cancelled', payload);
    }
  }

  res.json({ success: true, clientId });
});

// --- Polling sync endpoint (used on serverless deployments where SSE cannot
// broadcast between function instances). Returns a compact change feed.
router.get('/sync/state', (req, res) => {
  const sinceMs = req.query.since ? Date.parse(String(req.query.since)) : NaN;
  const includeIds = req.query.includeIds === '1';

  const touchTime = (o) => {
    let t = Date.parse(o.createdAt || '') || 0;
    if (o.paidAt) t = Math.max(t, Date.parse(o.paidAt) || 0);
    if (o.refundedAt) t = Math.max(t, Date.parse(o.refundedAt) || 0);
    if (o.cancelledAt) t = Math.max(t, Date.parse(o.cancelledAt) || 0);
    for (const h of o.history || []) {
      const v = Date.parse(h.time || '');
      if (Number.isFinite(v) && v > t) t = v;
    }
    for (const s of o.stalls || []) {
      for (const key of ['prepStartedAt', 'readyAt', 'counterConfirmedAt', 'collectedAt', 'notifiedAt']) {
        const v = Date.parse(s[key] || '');
        if (Number.isFinite(v) && v > t) t = v;
      }
    }
    return t;
  };

  const hashOf = (value) => {
    const str = JSON.stringify(value);
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return String(h);
  };

  const now = new Date().toISOString();
  const changedOrders = Number.isFinite(sinceMs)
    ? db.orders.filter(o => touchTime(o) >= sinceMs)
    : [];

  const hashes = {
    tables: hashOf(db.getAllTables().map(t => [t.id, t.status, t.currentSessionId || t.sessionId || null])),
    stalls: hashOf(db.stalls.map(s => [s.id, s.status || s.isPaused, s.isPaused])),
    menu: hashOf(db.menuItems.map(m => [m.id, m.isAvailable, m.available, m.price])),
    inventory: hashOf(Object.entries(db.inventory).map(([id, i]) => [id, i.preparedQty, i.isAvailable]))
  };

  res.json({
    now,
    orderIds: includeIds ? db.orders.map(o => o.id) : undefined,
    orders: changedOrders,
    hashes,
    revenue: db.getRevenueSummary()
  });
});

// --- Tables API ---
router.get('/tables', (req, res) => {
  res.json(db.getAllTables());
});

router.get('/tables/:id', (req, res) => {
  const table = db.getTable(req.params.id);
  if (!table) return res.status(404).json({ error: 'Table not found' });
  res.json(table);
});

router.post('/tables/:id/session/open', (req, res) => {
  const session = db.openTableSession(req.params.id.toUpperCase(), req.body.guestCount || 2);
  res.json(session);
});

router.post('/tables/:id/session/close', (req, res) => {
  const session = db.closeTableSession(req.params.id.toUpperCase());
  res.json({ success: true, session });
});

router.post('/tables/:id/status', (req, res) => {
  const table = db.updateTableStatus(req.params.id.toUpperCase(), req.body.status);
  res.json(table);
});

router.post('/tables/:id/mark-available', (req, res) => {
  const { clearedBy, role, forceOverride } = req.body || {};
  const userRole = role || req.headers['x-user-role'] || 'STAFF';
  const userName = clearedBy || req.headers['x-user-name'] || 'Staff';

  const result = db.markTableAvailable(req.params.id.toUpperCase(), userName, userRole, !!forceOverride);
  if (!result.success) {
    return res.status(result.code || 400).json(result);
  }
  res.json(result);
});

// --- Stalls API ---
router.get('/stalls', (req, res) => {
  res.json(db.getAllStalls());
});

router.get('/stalls/:slug', (req, res) => {
  const stall = db.getStall(req.params.slug);
  if (!stall) return res.status(404).json({ error: 'Stall not found' });
  res.json(stall);
});

router.post('/stalls/:id/pause', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  try {
    const { reason, durationMinutes } = req.body || {};
    if (durationMinutes != null && (!Number.isFinite(Number(durationMinutes)) || Number(durationMinutes) <= 0)) {
      return res.status(400).json({ error: 'Pause duration must be a positive number of minutes.' });
    }
    res.json(db.pauseStall(req.params.id, reason, durationMinutes, getRequestName(req)));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/stalls/:id/resume', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  try {
    res.json(db.resumeStall(req.params.id, getRequestName(req)));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.get('/stalls/:id/status', (req, res) => {
  const stall = db.getStall(req.params.id);
  if (!stall) return res.status(404).json({ error: 'Stall not found' });
  res.json(db.getStallStatus(stall.id));
});

// --- Menu API ---
router.get('/menu', (req, res) => {
  const { stallId, category, search } = req.query;
  const items = db.getAllMenuItems(stallId, category, search);
  res.json(items);
});

router.get('/menu/:id', (req, res) => {
  const item = db.getMenuItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Menu item not found' });
  res.json(item);
});

router.post('/menu', (req, res) => {
  const newItem = db.addMenuItem(req.body);
  res.status(201).json(newItem);
});

router.patch('/menu/:id/availability', (req, res) => {
  const item = db.updateItemAvailability(req.params.id, req.body.isAvailable);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

router.patch('/menu/:id/price', (req, res) => {
  const item = db.updateMenuItemPrice(req.params.id, req.body.price);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

router.patch('/menu/:id/prep-time', (req, res) => {
  const item = db.updateMenuItemPrepTime(req.params.id, req.body.prepMinutes);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

router.patch('/stalls/:id/prep-time', (req, res) => {
  const stall = db.updateStallPrepTime(req.params.id, req.body.prepMinutes);
  if (!stall) return res.status(404).json({ error: 'Stall not found' });
  res.json(stall);
});

router.get('/inventory', (req, res) => {
  const stallId = typeof req.query.stallId === 'string' ? req.query.stallId : null;
  res.json(db.getFullInventory(stallId));
});

router.patch('/inventory/:id/stock', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  const { preparedQty } = req.body || {};
  if (!Number.isInteger(Number(preparedQty)) || Number(preparedQty) < 0) {
    return res.status(400).json({ error: 'Prepared quantity must be a non-negative whole number.' });
  }
  try {
    res.json(db.setItemStock(req.params.id, Number(preparedQty), getRequestName(req)));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.patch('/inventory/:id/availability', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  const { isAvailable } = req.body || {};
  if (typeof isAvailable !== 'boolean') {
    return res.status(400).json({ error: 'isAvailable must be a boolean.' });
  }
  try {
    res.json(db.setItemManualAvailability(req.params.id, isAvailable, getRequestName(req)));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.patch('/inventory/:id/reset', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  res.json(db.resetItemStock(req.params.id, getRequestName(req)));
});

// --- Orders API ---
router.get('/orders', (req, res) => {
  const role = req.headers['x-user-role'] || req.query.role;
  const userStallId = req.headers['x-user-stall-id'] || req.query.userStallId;
  let { status, tableId, stallId } = req.query;

  // If request is from a STALL MANAGER, lock stallId strictly to their assigned stall
  if (role === 'STALL MANAGER' && userStallId) {
    stallId = userStallId;
  }

  const orders = db.getAllOrders({ status, tableId, stallId });
  res.json(orders);
});

router.get('/orders/:id', (req, res) => {
  const order = db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

router.post('/orders', (req, res) => {
  try {
    const {
      tableId,
      type,
      customerOrderType,
      rawItems,
      customerNotes,
      paymentMethod,
      couponCode,
      customerName,
      customerPhone,
      customerAddress,
      serviceType,
      cartSessionId,
      clientId,
      clientOrderId
    } = req.body;

    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'Cart cannot be empty' });
    }

    if (customerOrderType !== 'DINE_IN' && customerOrderType !== 'TAKEAWAY') {
      return res.status(400).json({ error: 'Please select Dine-in or Takeaway to continue.' });
    }

    const trimmedName = (customerName || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ error: 'Customer Name is required (minimum 2 characters).' });
    }

    const cleanPhone = (customerPhone || '').replace(/[\s\-]/g, '');
    const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
    if (!cleanPhone || !bdPhoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: 'Valid Bangladesh Phone Number is required (e.g. 017XXXXXXXX).' });
    }

    if (!serviceType || (serviceType !== 'SELF_SERVICE' && serviceType !== 'TABLE_SERVICE')) {
      return res.status(400).json({ error: 'Please select Self-Service or Table Service to continue.' });
    }

    const validPaymentMethods = ['bKash', 'Online Card', 'NFC / Contactless', 'CASH'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Please select a payment method to continue.' });
    }

    const order = db.createOrder({
      tableId,
      type: type || 'DINE_IN',
      customerOrderType,
      rawItems,
      customerName: trimmedName,
      customerPhone: cleanPhone,
      customerAddress: (customerAddress || '').trim(),
      serviceType,
      customerNotes,
      paymentMethod,
      couponCode,
      cartSessionId: cartSessionId || null,
      clientId: clientId || null,
      clientOrderId: clientOrderId || null,
      orderSource: 'QR_CODE'
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Central Counter Manual POS Ordering
router.post('/orders/manual', (req, res) => {
  try {
    const {
      tableId,
      type,
      customerOrderType,
      rawItems,
      customerNotes,
      paymentMethod,
      customerName,
      customerPhone,
      serviceType,
      discountType,
      discountPercent,
      discountAmount,
      discountReason,
      discountAppliedBy,
      discountApprovedBy,
      cashReceived,
      changeReturned,
      cardPosRef,
      cardPosStatus,
      cardPosTerminal,
      cashierName,
      cashierId
    } = req.body;

    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'Order cart cannot be empty' });
    }

    if (customerOrderType !== 'DINE_IN' && customerOrderType !== 'TAKEAWAY') {
      return res.status(400).json({ error: 'Please select Dine-in or Takeaway to continue.' });
    }

    if (customerOrderType === 'DINE_IN' && (!tableId || !String(tableId).trim())) {
      return res.status(400).json({ error: 'Table selection is required for Dine-in orders.' });
    }

    if (!serviceType || (serviceType !== 'SELF_SERVICE' && serviceType !== 'TABLE_SERVICE')) {
      return res.status(400).json({ error: 'Please select Self-Service or Table Service to continue.' });
    }

    const validPaymentMethods = [
      'CASH',
      'bKash',
      'Nagad',
      'Card / Physical POS Terminal',
      'Online Card',
      'NFC / Contactless'
    ];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Please select a valid payment method.' });
    }

    const order = db.createOrder({
      tableId: customerOrderType === 'DINE_IN' ? String(tableId).trim().toUpperCase() : null,
      type: customerOrderType === 'TAKEAWAY' ? 'PARCEL' : 'DINE_IN',
      customerOrderType,
      rawItems,
      customerName: (customerName || '').trim() || 'Counter Guest',
      customerPhone: (customerPhone || '').trim(),
      customerAddress: '',
      serviceType,
      customerNotes: (customerNotes || '').trim(),
      paymentMethod,
      orderSource: 'MANUAL_COUNTER',
      cashierName: cashierName || req.headers['x-user-name'] || 'Central Counter',
      cashierId: cashierId || req.headers['x-user-id'] || 'usr-cashier',
      discountType: discountType || 'NONE',
      discountPercent: Number(discountPercent) || 0,
      discountAmount: Number(discountAmount) || 0,
      discountReason: discountReason || null,
      discountAppliedBy: discountAppliedBy || cashierName || req.headers['x-user-name'] || 'Central Counter',
      discountApprovedBy: discountApprovedBy || null,
      cashReceived: cashReceived !== undefined && cashReceived !== null ? Number(cashReceived) : null,
      changeReturned: changeReturned !== undefined && changeReturned !== null ? Number(changeReturned) : null,
      cardPosRef: cardPosRef || null,
      cardPosStatus: cardPosStatus || null,
      cardPosTerminal: cardPosTerminal || null,
      autoConfirmPayment: true
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

router.post('/orders/:id/reprint-receipt', (req, res) => {
  const staffName = req.body.staffName || req.headers['x-user-name'] || 'Central Counter';
  const reason = req.body.reason || 'Customer request';
  const result = db.logReceiptReprint(req.params.id, staffName, reason);
  if (result.error) return res.status(result.code || 400).json({ error: result.error });
  res.json(result);
});

// Manager Actions
router.post('/orders/:id/accept', (req, res) => {
  const order = db.acceptOrder(req.params.id, req.body.managerName || 'Central Counter');
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

router.post('/orders/:id/reject', (req, res) => {
  if (blockedFromCancelling(req)) {
    return res.status(403).json({ error: 'Unauthorized: Cashiers and stall staff cannot reject or cancel an order without manager approval. Submit a void request instead.' });
  }
  const staffName = req.body.managerName || req.headers['x-user-name'] || req.body.staffName || 'Central Counter';
  const staffRole = getRequestRole(req) || null;
  const order = db.rejectOrder(req.params.id, req.body.reason || 'Kitchen overloaded', staffName, staffRole);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// Manager Update Status directly (without navigating away or closing page)
router.patch('/orders/:id/status', (req, res) => {
  try {
    const { status, note, staffName, staffRole } = req.body;
    if (status === 'CANCELLED' && blockedFromCancelling(req)) {
      return res.status(403).json({ error: 'Unauthorized: Cashiers and stall staff cannot cancel an order without manager approval. Submit a void request instead.' });
    }
    const order = db.updateOrderStatus(req.params.id, status, note, staffName || 'Manager', staffRole || getRequestRole(req) || null);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/orders/:id/status', (req, res) => {
  try {
    const { status, note, staffName, staffRole } = req.body;
    if (status === 'CANCELLED' && blockedFromCancelling(req)) {
      return res.status(403).json({ error: 'Unauthorized: Cashiers and stall staff cannot cancel an order without manager approval. Submit a void request instead.' });
    }
    const order = db.updateOrderStatus(req.params.id, status, note, staffName || 'Manager', staffRole || getRequestRole(req) || null);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/orders/:id/mark-unavailable', (req, res) => {
  const { itemId, reason } = req.body;
  const order = db.markItemUnavailable(req.params.id, itemId, reason);
  if (!order) return res.status(404).json({ error: 'Order or item not found' });
  res.json(order);
});

router.post('/orders/:id/remove-unavailable', (req, res) => {
  const { itemId } = req.body;
  const order = db.customerRemoveUnavailableItem(req.params.id, itemId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// Payment API
router.post('/orders/:id/payment', (req, res) => {
  try {
    const { paymentMethod, transactionId, cashierName } = req.body || {};

    // Payment confirmation is a real state transition on the server, not a UI
    // flag. It is available in every environment (including the deployment) and
    // validates the order state inside db.confirmPayment().
    const allowedMethods = ['bKash', 'Nagad', 'Online Card', 'NFC / Contactless', 'Card / Physical POS Terminal', 'CASH'];
    if (!paymentMethod || !allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Please select a valid payment method.' });
    }

    const order = db.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.paymentStatus === 'PAID') {
      return res.json(order);
    }

    const updated = db.confirmPayment(
      req.params.id,
      paymentMethod,
      transactionId || null,
      cashierName || 'Guest Online Payment'
    );
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json(updated);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.post('/orders/:id/refund', (req, res) => {
  try {
    if (blockedFromCancelling(req)) {
      return res.status(403).json({ error: 'Unauthorized: Cashiers and stall staff cannot refund or cancel an order without manager approval. Submit a void request instead.' });
    }
    const order = db.refundOrder(
      req.params.id,
      req.body?.reason || 'Customer refund',
      req.body?.staffName || getRequestName(req),
      getRequestRole(req) || req.body?.staffRole || null
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/orders/:id/review', (req, res) => {
  const order = db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(db.getReviewForOrder(req.params.id));
});

router.post('/orders/:id/review', (req, res) => {
  try {
    const review = db.submitReview({
      orderId: req.params.id,
      rating: req.body?.rating,
      feedback: req.body?.feedback
    });
    res.status(201).json(review);
  } catch (error) {
    const status = error.message === 'Order not found' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

// Stall Kitchen & Central Counter Lifecycle Endpoints
router.patch('/orders/:id/stalls/:stallId/status', (req, res) => {
  const role = req.headers['x-user-role'] || req.body.role;
  const userStallId = req.headers['x-user-stall-id'] || req.body.userStallId;

  if (role === 'STALL MANAGER') {
    if (!userStallId || userStallId !== req.params.stallId) {
      return res.status(403).json({
        error: `Unauthorized: Stall Manager for "${userStallId || 'unassigned'}" cannot update orders for stall "${req.params.stallId}".`
      });
    }
  }

  const { status, staffName } = req.body;
  const order = db.updateStallOrderStatus(req.params.id, req.params.stallId, status, staffName);
  if (!order) return res.status(404).json({ error: 'Order or stall sub-order not found' });
  res.json(order);
});

router.post('/orders/:id/stalls/:stallId/start-prep', (req, res) => {
  const role = req.headers['x-user-role'] || req.body.role;
  const userStallId = req.headers['x-user-stall-id'] || req.body.userStallId;

  if (role === 'STALL MANAGER') {
    if (!userStallId || userStallId !== req.params.stallId) {
      return res.status(403).json({
        error: `Unauthorized: Stall Manager for "${userStallId || 'unassigned'}" cannot start preparing orders for stall "${req.params.stallId}".`
      });
    }
  }

  const order = db.startPreparingStall(req.params.id, req.params.stallId, req.body.staffName || 'Kitchen Staff');
  if (!order) return res.status(404).json({ error: 'Order or stall sub-order not found' });
  res.json(order);
});

router.post('/orders/:id/stalls/:stallId/ready', (req, res) => {
  const role = req.headers['x-user-role'] || req.body.role;
  const userStallId = req.headers['x-user-stall-id'] || req.body.userStallId;

  if (role === 'STALL MANAGER') {
    if (!userStallId || userStallId !== req.params.stallId) {
      return res.status(403).json({
        error: `Unauthorized: Stall Manager for "${userStallId || 'unassigned'}" cannot mark orders ready for stall "${req.params.stallId}".`
      });
    }
  }

  // A kitchen must never start working on food that has not been paid for.
  // QR cash orders stay NEW / PAYMENT DUE at the Central Counter until the
  // cashier confirms the cash, which is what releases them to the kitchens.
  const targetOrder = db.getOrder(req.params.id);
  if (!targetOrder) return res.status(404).json({ error: 'Order not found' });
  if (!['PAID', 'PARTIALLY_REFUNDED'].includes(targetOrder.paymentStatus)) {
    return res.status(400).json({
      error: 'Cannot mark food ready: payment for this order has not been confirmed at the Central Counter yet.'
    });
  }

  const order = db.markStallReady(req.params.id, req.params.stallId, req.body.staffName || 'Kitchen Staff');
  if (!order) return res.status(404).json({ error: 'Order or stall sub-order not found' });
  res.json(order);
});

router.post('/orders/:id/stalls/:stallId/counter-confirm', (req, res) => {
  const role = req.headers['x-user-role'] || req.body.role;
  const userStallId = req.headers['x-user-stall-id'] || req.body.userStallId;

  if (role === 'STALL MANAGER') {
    if (!userStallId || userStallId !== req.params.stallId) {
      return res.status(403).json({
        error: `Unauthorized: Stall Manager for "${userStallId || 'unassigned'}" cannot manage orders for stall "${req.params.stallId}".`
      });
    }
  }

  const staffName = req.body.counterStaff || req.body.staffName || 'Central Counter';
  const reason = req.body.reason || null;
  const result = db.confirmAndNotifyCustomer(req.params.id, req.params.stallId, staffName, reason);
  if (result.error) return res.status(result.code || 400).json({ error: result.error });
  res.json(result);
});

// Stall-specific NOTIFY GUEST action (invoked directly from stall kitchen dashboard or counter)
router.post('/orders/:id/stalls/:stallId/notify', (req, res) => {
  const role = req.headers['x-user-role'] || req.body.role;
  const userStallId = req.headers['x-user-stall-id'] || req.body.userStallId;

  // Stall ownership enforcement: A STALL MANAGER can only notify orders for their own stall
  if (role === 'STALL MANAGER') {
    if (!userStallId || userStallId !== req.params.stallId) {
      return res.status(403).json({
        error: `Unauthorized: Stall Manager for "${userStallId || 'unassigned'}" cannot notify orders for stall "${req.params.stallId}".`
      });
    }
  }

  const staffName = req.body.staffName || (role === 'STALL MANAGER' ? `${req.params.stallId} Manager` : 'Stall Kitchen Staff');
  const reason = req.body.reason || null;
  const result = db.confirmAndNotifyCustomer(req.params.id, req.params.stallId, staffName, reason);
  if (result.error) return res.status(result.code || 400).json({ error: result.error });
  res.json(result);
});

router.post('/orders/:id/stalls/:stallId/collect', (req, res) => {
  const role = req.headers['x-user-role'] || req.body.role;
  const userStallId = req.headers['x-user-stall-id'] || req.body.userStallId;

  if (role === 'STALL MANAGER') {
    if (!userStallId || userStallId !== req.params.stallId) {
      return res.status(403).json({
        error: `Unauthorized: Stall Manager for "${userStallId || 'unassigned'}" cannot mark collected for stall "${req.params.stallId}".`
      });
    }
  }

  const result = db.markStallCollected(req.params.id, req.params.stallId, req.body.staffName || 'Central Counter');
  if (result.error) return res.status(result.code || 400).json({ error: result.error });
  res.json(result);
});

// Central Counter Ready Food Confirmations list
router.get('/counter/ready-confirmations', (req, res) => {
  res.json(db.getAwaitingCounterConfirmations());
});

// Runner Tasks
router.get('/runners', (req, res) => {
  res.json(db.runnerTasks);
});

router.post('/runners/:id/status', (req, res) => {
  const task = db.updateRunnerTask(req.params.id, req.body.status);
  if (!task) return res.status(404).json({ error: 'Runner task not found' });
  res.json(task);
});

// Analytics & Reports
router.get('/analytics', (req, res) => {
  res.json(db.getAnalyticsSummary());
});

router.get('/financial/daily-summary', (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  res.json(db.getDailyFinancialSummary(date));
});

router.get('/financial/graph', (req, res) => {
  res.json(db.getFinancialGraph(req.query));
});

router.get('/expenses', (req, res) => {
  res.json(db.getExpenses({
    date: req.query.date,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo
  }));
});

router.post('/expenses', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  try {
    const expense = db.addExpense({
      ...req.body,
      createdBy: getRequestName(req)
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/expenses/:id', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  try {
    const expense = db.updateExpense(req.params.id, req.body || {}, getRequestName(req));
    if (!expense) return res.status(404).json({ error: 'Expense record not found' });
    res.json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/expenses/:id', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  const result = db.deleteExpense(req.params.id, getRequestName(req));
  if (!result) return res.status(404).json({ error: 'Expense record not found' });
  res.json(result);
});

router.get('/purchases', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  res.json(db.getPurchases({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    status: req.query.status
  }));
});

router.post('/purchases', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  try {
    const purchase = db.addPurchase({
      ...req.body,
      createdBy: getRequestName(req)
    });
    res.status(201).json(purchase);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/purchases/:id', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  const purchase = db.updatePurchase(req.params.id, req.body || {}, getRequestName(req));
  if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
  res.json(purchase);
});

router.delete('/purchases/:id', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  const result = db.deletePurchase(req.params.id, getRequestName(req));
  if (!result) return res.status(404).json({ error: 'Purchase not found' });
  res.json(result);
});

router.get('/accounting/ledger', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  res.json(db.getAccountingLedger({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    type: req.query.type,
    search: req.query.search,
    limit: req.query.limit ? Number(req.query.limit) : undefined
  }));
});

router.get('/accounting/income-statement', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  res.json(db.getIncomeStatement({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo
  }));
});

router.get('/accounting/trial-balance', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  res.json(db.getTrialBalance({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo
  }));
});

router.get('/accounting/balance-sheet', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  res.json(db.getBalanceSheet(req.query.asOfDate || null));
});

router.get('/accounting/dues', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  res.json(db.getDueReceivables());
});

// Revenue Endpoints (Daily, Monthly, Yearly in Asia/Dhaka)
router.get('/revenue', (req, res) => {
  const role = (req.headers['x-user-role'] || req.query.userRole || '').trim().toUpperCase();
  const RESTRICTED_ROLES = ['STALL MANAGER', 'KITCHEN STAFF', 'KITCHEN', 'RUNNER'];
  if (role && RESTRICTED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Revenue summaries are restricted to Manager, Cashier, and Chief Administrator only.'
    });
  }
  res.json(db.getRevenueSummary());
});

router.post('/revenue/reset-daily', (req, res) => {
  const role = (req.body.userRole || req.headers['x-user-role'] || 'MANAGER').trim().toUpperCase();
  const user = req.body.userName || req.headers['x-user-name'] || 'Manager';

  const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Only Super Admin, Food Court Owner, or Manager can reset daily revenue.',
      code: 403
    });
  }

  const result = db.resetDailyRevenue(user, role);
  if (result.error) {
    return res.status(result.code || 403).json({ error: result.error });
  }
  res.json(result);
});

router.post('/revenue/reset-monthly', (req, res) => {
  const role = (req.body.userRole || req.headers['x-user-role'] || 'MANAGER').trim().toUpperCase();
  const user = req.body.userName || req.headers['x-user-name'] || 'Manager';

  const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Only Super Admin, Food Court Owner, or Manager can reset monthly revenue.',
      code: 403
    });
  }

  const result = db.resetMonthlyRevenue(user, role);
  if (result.error) {
    return res.status(result.code || 403).json({ error: result.error });
  }
  res.json(result);
});

router.post('/revenue/reset-yearly', (req, res) => {
  const role = (req.body.userRole || req.headers['x-user-role'] || 'MANAGER').trim().toUpperCase();
  const user = req.body.userName || req.headers['x-user-name'] || 'Manager';

  const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Only Super Admin, Food Court Owner, or Manager can reset yearly revenue.',
      code: 403
    });
  }

  const result = db.resetYearlyRevenue(user, role);
  if (result.error) {
    return res.status(result.code || 403).json({ error: result.error });
  }
  res.json(result);
});

router.post('/revenue/reset-tables', (req, res) => {
  const role = (req.body.userRole || req.headers['x-user-role'] || 'MANAGER').trim().toUpperCase();
  const user = req.body.userName || req.headers['x-user-name'] || 'Manager';

  const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Only Super Admin, Food Court Owner, or Manager can reset tables.',
      code: 403
    });
  }

  const result = db.resetTables(user, role);
  if (result.error) {
    return res.status(result.code || 403).json({ error: result.error });
  }
  res.json(result);
});

router.post('/revenue/reset-all', (req, res) => {
  const role = (req.body.userRole || req.headers['x-user-role'] || 'MANAGER').trim().toUpperCase();
  const user = req.body.userName || req.headers['x-user-name'] || 'Manager';

  const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Only Super Admin, Food Court Owner, or Manager can perform a full reset.',
      code: 403
    });
  }

  const result = db.resetAll(user, role);
  if (result.error) {
    return res.status(result.code || 403).json({ error: result.error });
  }
  res.json(result);
});

// Single Master 1-Click Button: Reset Everything & Delete All Orders (Default ৳0)
router.post('/revenue/reset-everything', (req, res) => {
  const role = (req.body.userRole || req.headers['x-user-role'] || 'MANAGER').trim().toUpperCase();
  const user = req.body.userName || req.headers['x-user-name'] || 'Manager';
  const reason = req.body.reason || 'Operational shift restart / order board refresh';

  const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Only Manager or Chief Administrator can delete all orders and perform clean restart.',
      code: 403
    });
  }

  const result = db.clearAllOrdersAndReset(user, role, reason);
  if (result.error) {
    return res.status(result.code || 403).json({ error: result.error });
  }
  res.json(result);
});

// --- Void / Order Cancellation Approval System ---
router.post('/void-requests', (req, res) => {
  try {
    const role = (req.headers['x-user-role'] || req.body.cashierRole || 'CASHIER').trim().toUpperCase();
    const cashierName = req.headers['x-user-name'] || req.body.cashierName || 'Counter Cashier';
    const cashierId = req.headers['x-user-id'] || req.body.cashierId || 'usr-cashier';

    const allowedSubmitters = ['CASHIER', 'MANAGER', 'SUPER ADMIN', 'FOOD COURT OWNER'];
    if (!allowedSubmitters.includes(role)) {
      return res.status(403).json({
        error: `Unauthorized: Role "${role}" cannot submit void requests. Only Cashiers and Managers can submit.`
      });
    }

    const voidReq = db.createVoidRequest({
      orderId: req.body.orderId,
      requestType: req.body.requestType,
      reason: req.body.reason,
      cashierId,
      cashierName,
      cashierRole: role,
      voidItems: req.body.voidItems,
      tableId: req.body.tableId,
      token: req.body.token,
      invoiceNo: req.body.invoiceNo
    });

    res.status(201).json(voidReq);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/void-requests', (req, res) => {
  try {
    const list = db.getVoidRequests({
      status: req.query.status,
      orderId: req.query.orderId
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/void-requests/:id', (req, res) => {
  const voidReq = db.getVoidRequest(req.params.id);
  if (!voidReq) return res.status(404).json({ error: 'Void request not found' });
  res.json(voidReq);
});

router.post('/void-requests/:id/approve', (req, res) => {
  try {
    const role = (req.headers['x-user-role'] || req.body.resolverRole || 'MANAGER').trim().toUpperCase();
    const resolverName = req.headers['x-user-name'] || req.body.resolverName || 'Food Court Manager';
    const resolverId = req.headers['x-user-id'] || req.body.resolverId || 'usr-manager';
    const approvalNote = req.body.approvalNote || 'Approved by Manager';

    const ALLOWED = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
    if (!ALLOWED.includes(role)) {
      return res.status(403).json({
        error: `Unauthorized: Role "${role}" cannot approve void requests. Only Authorized Managers and Administrators have approval authority.`
      });
    }

    const result = db.approveVoidRequest(req.params.id, {
      resolverId,
      resolverName,
      resolverRole: role,
      approvalNote
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/void-requests/:id/reject', (req, res) => {
  try {
    const role = (req.headers['x-user-role'] || req.body.resolverRole || 'MANAGER').trim().toUpperCase();
    const resolverName = req.headers['x-user-name'] || req.body.resolverName || 'Food Court Manager';
    const resolverId = req.headers['x-user-id'] || req.body.resolverId || 'usr-manager';
    const rejectionReason = req.body.rejectionReason || 'Rejected by Manager';

    const ALLOWED = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
    if (!ALLOWED.includes(role)) {
      return res.status(403).json({
        error: `Unauthorized: Role "${role}" cannot reject void requests. Only Authorized Managers and Administrators have rejection authority.`
      });
    }

    const result = db.rejectVoidRequest(req.params.id, {
      resolverId,
      resolverName,
      resolverRole: role,
      rejectionReason
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reset Void Requests (STRICTLY Manager & Chief Administrator only)
router.post('/void-requests/reset', (req, res) => {
  try {
    const role = (req.headers['x-user-role'] || req.body.userRole || 'MANAGER').trim().toUpperCase();
    const user = req.headers['x-user-name'] || req.body.userName || 'Manager';
    const reason = req.body.reason || 'Reset void requests register to default zero';

    const ALLOWED = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
    if (!ALLOWED.includes(role)) {
      return res.status(403).json({
        error: `Unauthorized: Role "${role}" cannot reset void register.`
      });
    }

    const result = db.resetVoidRequests(user, role, reason);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Accounting: Void & Cancellation Reports
router.get('/reports/accounting/void-summary', (req, res) => {
  const userRole = (req.headers['x-user-role'] || '').trim().toUpperCase();
  const ALLOWED = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
  if (userRole && !ALLOWED.includes(userRole)) {
    return res.status(403).json({ error: 'Unauthorized: Only Manager and Chief Administrator can access Void Reports.' });
  }
  const { dateFrom, dateTo, search } = req.query;
  res.json(db.getVoidSummaryReport({ dateFrom, dateTo, search }));
});

// Accounting: Delete Report / Reset History
router.get('/reports/accounting/reset-history', (req, res) => {
  const userRole = (req.headers['x-user-role'] || '').trim().toUpperCase();
  const ALLOWED = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
  if (userRole && !ALLOWED.includes(userRole)) {
    return res.status(403).json({ error: 'Unauthorized: Only Manager and Chief Administrator can access Reset History.' });
  }
  const { dateFrom, dateTo, search } = req.query;
  res.json(db.getResetHistoryReport({ dateFrom, dateTo, search }));
});

// Inventory Wastage Removal Endpoint
router.delete('/reports/inventory/wastage/:id', (req, res) => {
  const userRole = (req.headers['x-user-role'] || req.body?.userRole || 'MANAGER').trim().toUpperCase();
  const userName = req.headers['x-user-name'] || req.body?.userName || 'Manager';
  const ALLOWED = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
  if (!ALLOWED.includes(userRole)) return res.status(403).json({ error: 'Unauthorized: Only Manager can remove wastage entries.' });
  try {
    const reason = req.body?.reason || req.query?.reason || 'Incorrect entry removal';
    const result = db.removeInventoryWastage(req.params.id, { user: userName, role: userRole, reason });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/reports/inventory/wastage/:id/remove', (req, res) => {
  const userRole = (req.headers['x-user-role'] || req.body?.userRole || 'MANAGER').trim().toUpperCase();
  const userName = req.headers['x-user-name'] || req.body?.userName || 'Manager';
  const ALLOWED = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
  if (!ALLOWED.includes(userRole)) return res.status(403).json({ error: 'Unauthorized: Only Manager can remove wastage entries.' });
  try {
    const reason = req.body?.reason || 'Incorrect entry removal';
    const result = db.removeInventoryWastage(req.params.id, { user: userName, role: userRole, reason });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Alias for accounting module compatibility
router.get('/accounting/audit-trail', (req, res) => {
  try {
    const logs = db.auditLogs || [];
    const { action, from, to, limit = 200 } = req.query;
    let filtered = logs;
    if (action) {
      filtered = filtered.filter(l => l.action && l.action.includes(action.toUpperCase()));
    }
    if (from) {
      filtered = filtered.filter(l => new Date(l.timestamp) >= new Date(from));
    }
    if (to) {
      filtered = filtered.filter(l => new Date(l.timestamp) <= new Date(to));
    }
    filtered = filtered.slice().reverse().slice(0, Number(limit));
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit-logs', (req, res) => {
  res.json(db.auditLogs);
});

router.get('/users', (req, res) => {
  res.json(db.users);
});

// System Settings
router.get('/settings', (req, res) => {
  res.json(db.settings);
});

router.post('/settings', (req, res) => {
  db.settings = { ...db.settings, ...req.body };
  res.json(db.settings);
});

// Network & QR Base URL Information
export function getNetworkInfo(port = process.env.PORT || 3000) {
  const interfaces = os.networkInterfaces();
  const lanIps = [];

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        lanIps.push({
          interface: name,
          address: net.address,
          mac: net.mac
        });
      }
    }
  }

  // Prioritize active Wi-Fi / Ethernet LAN adapters
  let primaryIp = null;
  const preferred = lanIps.find(i => /wi-?fi|wlan|ethernet|eth|en/i.test(i.interface));
  if (preferred) {
    primaryIp = preferred.address;
  } else if (lanIps.length > 0) {
    primaryIp = lanIps[0].address;
  } else {
    primaryIp = 'localhost';
  }

  const isVercel = Boolean(process.env.VERCEL);
  const isLoopback = (url) => /localhost|127\.0\.0\.1/i.test(String(url || ''));
  const isPrivateOrLoopback = (url) =>
    /localhost|127\.0\.0\.1|^https?:\/\/(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(String(url || ''));

  const cleanUrl = (url) => String(url || '').trim().replace(/\/+$/, '');
  const envBase = cleanUrl(process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL);
  const vercelBase = cleanUrl(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  );
  const savedBase = cleanUrl(db.settings?.qrBaseUrl);

  const recommendedBaseUrl = `http://${primaryIp}:${port}`;
  const localhostUrl = `http://localhost:${port}`;
  const isReachableOnLan = Boolean(primaryIp && primaryIp !== 'localhost' && primaryIp !== '127.0.0.1');

  // Resolve the base URL that table QR codes should contain.
  //  - Vercel: always the deployed public domain (never localhost / LAN IP).
  //  - Localhost: always the reachable LAN IP so a phone on the same Wi-Fi can open it.
  //  - An explicit APP_BASE_URL always wins.
  let activeQrBaseUrl;
  if (envBase) {
    activeQrBaseUrl = envBase;
  } else if (isVercel) {
    activeQrBaseUrl = (vercelBase && !isPrivateOrLoopback(vercelBase))
      ? vercelBase
      : ((savedBase && !isPrivateOrLoopback(savedBase)) ? savedBase : '');
  } else {
    activeQrBaseUrl = isReachableOnLan ? recommendedBaseUrl : localhostUrl;
  }

  return {
    lanIps,
    primaryIp,
    port: Number(port),
    isVercel,
    environment: isVercel ? 'vercel' : 'localhost',
    isReachableOnLan,
    localhostUrl,
    recommendedBaseUrl,
    activeQrBaseUrl,
    savedQrBaseUrl: savedBase || null,
    storage: {
      durable: kvEnabled,
      backend: kvEnabled ? 'kv' : 'filesystem',
      dataDir: DATA_DIR,
      warning: !kvEnabled && isVercel
        ? 'Orders will not survive a cold start. Configure KV_REST_API_URL and KV_REST_API_TOKEN (or Upstash equivalents).'
        : null
    }
  };
}

router.get('/network-info', (req, res) => {
  res.json(getNetworkInfo());
});

router.post('/settings/qr-base-url', (req, res) => {
  const { qrBaseUrl } = req.body;
  if (!qrBaseUrl) {
    return res.status(400).json({ error: 'qrBaseUrl is required' });
  }
  db.settings.qrBaseUrl = qrBaseUrl.trim().replace(/\/+$/, '');
  db.saveData();
  db.logAudit("QR_BASE_URL_UPDATED", `QR base URL updated to ${db.settings.qrBaseUrl}`, { qrBaseUrl: db.settings.qrBaseUrl });
  eventBus.broadcast("settings_updated", db.settings);
  res.json({ success: true, qrBaseUrl: db.settings.qrBaseUrl });
});

// ========================================================
// CART RESERVATIONS, CUSTOMIZATIONS & REVIEWS
// ========================================================
router.post('/cart/reserve', (req, res) => {
  const { sessionId, menuItemId, quantity } = req.body || {};
  if (!sessionId || !menuItemId) {
    return res.status(400).json({ error: 'sessionId and menuItemId are required.' });
  }
  try {
    res.json(db.reserveCartItem(sessionId, menuItemId, quantity));
  } catch (error) {
    res.status(409).json({ error: error.message });
  }
});

router.post('/cart/release-item', (req, res) => {
  const { sessionId, menuItemId } = req.body || {};
  if (!sessionId || !menuItemId) {
    return res.status(400).json({ error: 'sessionId and menuItemId are required.' });
  }
  res.json(db.releaseCartItem(sessionId, menuItemId));
});

router.post('/cart/release-all', (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required.' });
  res.json(db.releaseCartSession(sessionId));
});

router.post('/cart/heartbeat', (req, res) => {
  const { sessionId } = req.body || {};
  res.json(db.touchCartSession(sessionId));
});

router.get('/cart/reservations', (_req, res) => {
  res.json(db.getCartReservations());
});

router.get('/cart/reservations/:sessionId', (req, res) => {
  res.json(db.getCartReservations(req.params.sessionId));
});

// --- Menu Customization (add-on price configuration) ---
router.get('/customizations/config', (_req, res) => {
  res.json(db.getCustomizationConfig());
});

router.patch('/customizations/config', (req, res) => {
  if (!requireManagerRole(req, res)) return;
  const { categoryKey, addOnId, price } = req.body || {};
  if (!categoryKey || !addOnId || price === undefined) {
    return res.status(400).json({ error: 'categoryKey, addOnId and price are required.' });
  }
  try {
    res.json(db.updateCustomizationPrice(categoryKey, addOnId, price));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- Order Reviews ---
router.get('/reviews', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  res.json(db.getReviews({
    orderId: typeof req.query.orderId === 'string' ? req.query.orderId : null,
    limit
  }));
});

router.post('/reviews', (req, res) => {
  try {
    res.status(201).json(db.submitReview(req.body || {}));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- Guest item replacement (out of stock while order is open) ---
router.post('/orders/:id/replace-unavailable', (req, res) => {
  const { oldItemId, newMenuItemId, quantity, notes } = req.body || {};
  if (!oldItemId || !newMenuItemId) {
    return res.status(400).json({ error: 'oldItemId and newMenuItemId are required.' });
  }
  try {
    const order = db.customerReplaceUnavailableItem(
      req.params.id,
      oldItemId,
      newMenuItemId,
      quantity ? Number(quantity) : 1,
      notes
    );
    if (!order) return res.status(404).json({ error: 'Order or item not found' });
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ========================================================
// REPORTING & BUSINESS INTELLIGENCE API
// ========================================================
const REPORT_ROLES = new Set(['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER']);

function requireReportAccess(req, res) {
  const role = getRequestRole(req);
  if (!role || REPORT_ROLES.has(role)) return true;
  res.status(403).json({ error: 'Unauthorized: Only Manager and Chief Administrator can access reports.' });
  return false;
}

// --- Sales Reports ---
router.get('/reports/sales/top-selling', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.salesReports.getTopSellingItems({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    stallId: req.query.stallId || null,
    category: req.query.category || null,
    limit: req.query.limit ? Number(req.query.limit) : 50,
    sortBy: req.query.sortBy || 'quantity',
    search: req.query.search || ''
  }));
});

router.get('/reports/sales/summary', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.salesReports.getSalesSummary({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    stallId: req.query.stallId || null
  }));
});

router.get('/reports/sales/details', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.salesReports.getSalesDetails({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    stallId: req.query.stallId || null,
    paymentMethod: req.query.paymentMethod || null,
    search: req.query.search || '',
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 50
  }));
});

router.get('/reports/sales/by-user', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.salesReports.getSalesByUser({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null
  }));
});

router.get('/reports/sales/order-type', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.salesReports.getOrderTypeSummary({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null
  }));
});

router.get('/reports/sales/stall-wise', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.salesReports.getStallWiseSales({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null
  }));
});

router.get('/reports/sales/category-wise', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.salesReports.getCategoryWiseSales({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    stallId: req.query.stallId || null
  }));
});

router.get('/reports/sales/hourly', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.salesReports.getHourlySales({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    stallId: req.query.stallId || null
  }));
});

router.get('/reports/sales/payment-methods', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.salesReports.getPaymentMethodReport({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null
  }));
});

router.get('/reports/sales/discounts-refunds', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.salesReports.getDiscountsRefundsReport({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null
  }));
});

// --- Expense Reports ---
router.get('/reports/expenses/by-category', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.expenseReports.getExpenseByCategory({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null
  }));
});

router.get('/reports/expenses/by-supplier', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.expenseReports.getExpenseBySupplier({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null
  }));
});

router.get('/reports/expenses/dues', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.expenseReports.getDueExpenses());
});

router.get('/reports/expenses/list', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.expenseReports.getExpenseList({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    category: req.query.category || null,
    search: req.query.search || '',
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 50
  }));
});

router.get('/reports/expenses/summary', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.expenseReports.getExpenseSummary({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null
  }));
});

router.post('/reports/expenses/:id/pay', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  try {
    res.json(db.recordExpensePayment(req.params.id, {
      ...req.body,
      recordedBy: req.body?.recordedBy || getRequestName(req)
    }));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- Purchase Reports ---
router.get('/reports/purchases/orders', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.purchaseReports.getPurchaseOrderList({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    supplier: req.query.supplier || null,
    status: req.query.status || null,
    search: req.query.search || '',
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 50
  }));
});

router.get('/reports/purchases/by-supplier', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.purchaseReports.getPurchaseBySupplier({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null
  }));
});

router.get('/reports/purchases/items', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.purchaseReports.getPurchaseItemDetails({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    supplier: req.query.supplier || null,
    search: req.query.search || ''
  }));
});

router.get('/reports/purchases/summary', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.purchaseReports.getPurchaseSummary({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null
  }));
});

router.post('/reports/purchases/:id/pay', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  try {
    res.json(db.recordPurchasePayment(req.params.id, {
      ...req.body,
      recordedBy: req.body?.recordedBy || getRequestName(req)
    }));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/reports/purchases/:id/receive', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  try {
    res.json(db.recordGoodsReceipt(req.params.id, {
      ...req.body,
      receivedBy: req.body?.receivedBy || getRequestName(req)
    }));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- Inventory Reports ---
router.get('/reports/inventory/valuation', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.inventoryReports.getInventoryValuation({
    stallId: req.query.stallId || null,
    category: req.query.category || null,
    search: req.query.search || ''
  }));
});

router.get('/reports/inventory/stock-summary', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.inventoryReports.getStockSummary({
    stallId: req.query.stallId || null,
    status: req.query.status || null,
    search: req.query.search || ''
  }));
});

router.get('/reports/inventory/movements', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.inventoryReports.getStockMovements({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    itemId: req.query.itemId || null,
    movementType: req.query.movementType || null,
    search: req.query.search || '',
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 50
  }));
});

router.get('/reports/inventory/stock-in', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.inventoryReports.getStockInReport({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    supplier: req.query.supplier || null,
    search: req.query.search || ''
  }));
});

router.get('/reports/inventory/stock-out', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.inventoryReports.getStockOutReport({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    reason: req.query.reason || null,
    search: req.query.search || ''
  }));
});

router.get('/reports/inventory/low-stock', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.inventoryReports.getLowStockReport({
    stallId: req.query.stallId || null
  }));
});

router.get('/reports/inventory/wastage', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.inventoryReports.getWastageReport({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null
  }));
});

router.post('/reports/inventory/wastage', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  try {
    res.status(201).json(db.recordInventoryWastage({
      ...req.body,
      user: req.body?.user || getRequestName(req)
    }));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/reports/inventory/adjustment', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  try {
    res.json(db.recordStockAdjustment({
      ...req.body,
      user: req.body?.user || getRequestName(req)
    }));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/reports/inventory/consumption', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.inventoryReports.getIngredientConsumptionReport({
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    stallId: req.query.stallId || null
  }));
});

router.get('/reports/inventory/forecast', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.inventoryReports.getInventoryForecast({
    days: req.query.days ? Number(req.query.days) : 14,
    stallId: req.query.stallId || null
  }));
});

// --- Daily Closing & Cash Reconciliation ---
router.get('/reports/daily-closing', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.dailyClosing.getDailyClosingReport(req.query.date || null));
});

router.post('/reports/daily-closing/reconcile-cash', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  try {
    res.json(db.dailyClosing.recordCashReconciliation({
      ...req.body,
      closedBy: req.body?.closedBy || getRequestName(req)
    }));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- Business Intelligence ---
router.get('/reports/bi/health', (req, res) => {
  if (!requireReportAccess(req, res)) return;
  res.json(db.biInsights.getHealthOverview());
});

// Unknown API routes must answer with JSON. Without this, the Vite dev server /
// SPA fallback returns index.html and the client fails with "Unexpected token '<'".
router.use((req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

export default router;
