import { Router } from 'express';
import { db } from './db.js';
import { eventBus } from './events.js';
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

// --- Real-time SSE Endpoint ---
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial connection ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', time: new Date().toISOString() })}\n\n`);

  eventBus.addClient(res);
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
      serviceType
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
      couponCode
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Manager Actions
router.post('/orders/:id/accept', (req, res) => {
  const order = db.acceptOrder(req.params.id, req.body.managerName || 'Central Counter');
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

router.post('/orders/:id/reject', (req, res) => {
  const order = db.rejectOrder(req.params.id, req.body.reason || 'Kitchen overloaded');
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// Manager Update Status directly (without navigating away or closing page)
router.patch('/orders/:id/status', (req, res) => {
  try {
    const { status, note, staffName } = req.body;
    const order = db.updateOrderStatus(req.params.id, status, note, staffName || 'Manager');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/orders/:id/status', (req, res) => {
  try {
    const { status, note, staffName } = req.body;
    const order = db.updateOrderStatus(req.params.id, status, note, staffName || 'Manager');
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
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({
      error: 'Payment confirmation is unavailable until a verified payment gateway is configured.'
    });
  }

  const { paymentMethod, transactionId, cashierName } = req.body;
  const order = db.confirmPayment(req.params.id, paymentMethod, transactionId, cashierName);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

router.post('/orders/:id/refund', (req, res) => {
  try {
    const order = db.refundOrder(
      req.params.id,
      req.body?.reason || 'Customer refund',
      req.body?.staffName || getRequestName(req)
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
  const result = db.confirmAndNotifyCustomer(req.params.id, req.params.stallId, staffName);
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
  const result = db.confirmAndNotifyCustomer(req.params.id, req.params.stallId, staffName);
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
  const RESTRICTED_ROLES = ['CASHIER', 'STALL MANAGER', 'KITCHEN STAFF', 'KITCHEN', 'RUNNER'];
  if (role && RESTRICTED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Revenue summaries are restricted to Manager and Chief Administrator only.'
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

  const recommendedBaseUrl = `http://${primaryIp}:${port}`;
  const activeQrBaseUrl = db.settings.qrBaseUrl || process.env.APP_BASE_URL || recommendedBaseUrl;

  return {
    lanIps,
    primaryIp,
    port: Number(port),
    recommendedBaseUrl,
    activeQrBaseUrl
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

export default router;
