import { Router } from 'express';
import { db } from './db.js';
import { eventBus } from './events.js';
import os from 'os';

const router = Router();

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
    res.status(500).json({ error: err.message });
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
  const { paymentMethod, transactionId, cashierName } = req.body;
  const order = db.confirmPayment(req.params.id, paymentMethod, transactionId, cashierName);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
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

// Revenue Endpoints (Daily, Monthly, Yearly in Asia/Dhaka)
router.get('/revenue', (req, res) => {
  res.json(db.getRevenueSummary());
});

router.post('/revenue/reset-daily', (req, res) => {
  const role = req.body.userRole || req.headers['x-user-role'];
  const user = req.body.userName || req.headers['x-user-name'] || 'Manager';

  const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Only Super Admin, Food Court Owner, Manager, or Cashier can reset daily revenue.',
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
  const role = req.body.userRole || req.headers['x-user-role'];
  const user = req.body.userName || req.headers['x-user-name'] || 'Manager';

  const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Only Super Admin, Food Court Owner, Manager, or Cashier can reset monthly revenue.',
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
  const role = req.body.userRole || req.headers['x-user-role'];
  const user = req.body.userName || req.headers['x-user-name'] || 'Manager';

  const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Only Super Admin, Food Court Owner, Manager, or Cashier can reset yearly revenue.',
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
  const role = req.body.userRole || req.headers['x-user-role'];
  const user = req.body.userName || req.headers['x-user-name'] || 'Manager';

  const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Only Super Admin, Food Court Owner, Manager, or Cashier can reset tables.',
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
  const role = req.body.userRole || req.headers['x-user-role'];
  const user = req.body.userName || req.headers['x-user-name'] || 'Manager';

  const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Only Super Admin, Food Court Owner, Manager, or Cashier can perform a full reset.',
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
  const role = req.body.userRole || req.headers['x-user-role'];
  const user = req.body.userName || req.headers['x-user-name'] || 'Manager';

  const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Unauthorized: Only Super Admin, Food Court Owner, Manager, or Cashier can delete all orders and perform clean restart.',
      code: 403
    });
  }

  const result = db.clearAllOrdersAndReset(user, role);
  if (result.error) {
    return res.status(result.code || 403).json({ error: result.error });
  }
  res.json(result);
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
