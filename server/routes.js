import { Router } from 'express';
import { db } from './db.js';
import { eventBus } from './events.js';
import { rateLimit } from 'express-rate-limit';
import os from 'os';

const router = Router();
const orderCreationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many order attempts. Please wait before trying again.' }
});
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many payment attempts. Please wait before trying again.' }
});

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

// --- Customizations & Add-on Pricing API ---
router.get('/customizations/config', (req, res) => {
  res.json(db.getCustomizationConfig());
});

router.patch('/customizations/config', (req, res) => {
  const { categoryKey, addOnId, price } = req.body;
  if (!categoryKey || !addOnId || price === undefined) {
    return res.status(400).json({ error: 'categoryKey, addOnId, and price are required' });
  }
  try {
    const updated = db.updateCustomizationPrice(categoryKey, addOnId, price);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
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

router.post('/orders', orderCreationRateLimit, (req, res) => {
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
      serviceType,
      customerOrderType,
      cartSessionId: bodySessionId
    } = req.body;

    const cartSessionId = bodySessionId || req.headers['x-cart-session-id'] || null;

    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'Cart cannot be empty' });
    }
    if (rawItems.length > 50) {
      return res.status(400).json({ error: 'A cart cannot contain more than 50 items.' });
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

    const validCustomerOrderTypes = ['DINE_IN', 'TAKEAWAY'];
    if (!customerOrderType || !validCustomerOrderTypes.includes(customerOrderType)) {
      return res.status(400).json({ error: 'Please select Dine-in or Takeaway to continue.' });
    }

    const validPaymentMethods = ['bKash', 'Online Card', 'NFC / Contactless', 'CASH'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Please select a payment method to continue.' });
    }

    // Validate that all items exist and are not manually disabled
    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
          typeof raw.menuItemId !== 'string' || raw.menuItemId.length > 100) {
        return res.status(400).json({ error: 'Each cart item must include a valid menu item ID.' });
      }
      const quantity = raw.quantity === undefined ? 1 : raw.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return res.status(400).json({ error: 'Item quantity must be a whole number between 1 and 99.' });
      }
      const dbItem = db.getMenuItem(raw.menuItemId);
      if (!dbItem) {
        return res.status(400).json({ error: `Selected item (ID: ${raw.menuItemId}) not found in menu.` });
      }
      if (dbItem.isWeightBased && raw.weight !== undefined && raw.weight !== null &&
          (!Number.isInteger(raw.weight) || raw.weight < 1 || raw.weight > 10000)) {
        return res.status(400).json({ error: 'Item weight must be a whole number between 1g and 10000g.' });
      }
      const inv = db.inventory[raw.menuItemId];
      if (inv && inv.manuallyDisabled) {
        return res.status(400).json({
          error: `"${dbItem.name}" is currently unavailable. Please remove it from your tray before placing the order.`
        });
      }
    }

    const order = db.createOrder({
      tableId,
      type: type || 'DINE_IN',
      rawItems,
      customerName: trimmedName,
      customerPhone: cleanPhone,
      customerAddress: (customerAddress || '').trim(),
      serviceType,
      customerOrderType,
      customerNotes,
      paymentMethod,
      couponCode,
      cartSessionId,
      guestCount: req.body.guestCount
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
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

router.post('/orders/:id/replace-unavailable', (req, res) => {
  try {
    const { oldItemId, newMenuItemId, quantity, notes } = req.body;
    const order = db.customerReplaceUnavailableItem(req.params.id, oldItemId, newMenuItemId, quantity, notes);
    if (!order) return res.status(404).json({ error: 'Order or item not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Payment API
router.post('/orders/:id/payment', paymentRateLimit, (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({
      error: 'Payment confirmation is unavailable until a verified payment gateway and staff authentication are configured.'
    });
  }
  const { paymentMethod, transactionId, cashierName } = req.body;
  const order = db.confirmPayment(req.params.id, paymentMethod, transactionId, cashierName);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// Refund & Cancellation API
router.post('/orders/:id/refund', (req, res) => {
  const { reason, staffName } = req.body;
  const order = db.refundOrder(req.params.id, reason, staffName || 'Manager');
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
    // Skip virtual, docker, vmware, vbox, loopback, teredo, bluetooth interfaces
    if (/virtual|vethernet|vmware|vbox|docker|loopback|pseudo|teredo|isatap|bluetooth|npcap|wsl/i.test(name)) {
      continue;
    }
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        // Exclude link-local auto-configuration addresses (169.254.x.x) and 0.0.0.0
        if (!net.address.startsWith('169.254.') && net.address !== '0.0.0.0') {
          lanIps.push({
            interface: name,
            address: net.address,
            mac: net.mac,
            isWifi: /wi-?fi|wlan|wireless/i.test(name),
            isEthernet: /ethernet|eth|en|lan/i.test(name),
            isPrivateRange: /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(net.address)
          });
        }
      }
    }
  }

  // Prioritize active Wi-Fi adapters with private IP range, then Ethernet, then other LAN
  let primaryIp = null;
  const preferredWifi = lanIps.find(i => i.isWifi && i.isPrivateRange);
  const anyWifi = lanIps.find(i => i.isWifi);
  const preferredEthernet = lanIps.find(i => i.isEthernet && i.isPrivateRange);
  const anyPrivate = lanIps.find(i => i.isPrivateRange);

  if (preferredWifi) {
    primaryIp = preferredWifi.address;
  } else if (anyWifi) {
    primaryIp = anyWifi.address;
  } else if (preferredEthernet) {
    primaryIp = preferredEthernet.address;
  } else if (anyPrivate) {
    primaryIp = anyPrivate.address;
  } else if (lanIps.length > 0) {
    primaryIp = lanIps[0].address;
  } else {
    primaryIp = '127.0.0.1';
  }

  const isReachableOnLan = primaryIp !== '127.0.0.1' && primaryIp !== 'localhost';
  const recommendedBaseUrl = isReachableOnLan ? `http://${primaryIp}:${port}` : `http://localhost:${port}`;

  // Validate activeQrBaseUrl:
  // If db.settings.qrBaseUrl was set to a LAN IP that is no longer on this machine,
  // automatically update it to recommendedBaseUrl!
  let activeQrBaseUrl = recommendedBaseUrl;
  if (db.settings.qrBaseUrl) {
    const saved = db.settings.qrBaseUrl;
    // Check if saved is a private LAN IP URL (e.g. http://192.168.x.x:3000)
    const ipMatch = saved.match(/https?:\/\/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
    if (ipMatch) {
      const savedIp = ipMatch[1];
      const stillActive = lanIps.some(i => i.address === savedIp);
      if (stillActive) {
        activeQrBaseUrl = saved;
      } else {
        // Saved IP was from an old network (e.g. home Wi-Fi) -> auto-sync to current network!
        db.settings.qrBaseUrl = recommendedBaseUrl;
        activeQrBaseUrl = recommendedBaseUrl;
        db.saveData();
      }
    } else if (saved.includes('localhost') || saved.includes('127.0.0.1')) {
      // Localhost is inaccessible from phones on Wi-Fi: automatically sync to LAN IP
      if (isReachableOnLan) {
        db.settings.qrBaseUrl = recommendedBaseUrl;
        activeQrBaseUrl = recommendedBaseUrl;
        db.saveData();
      } else {
        activeQrBaseUrl = saved;
      }
    } else {
      // User specified a custom non-IP domain (e.g. https://vivacity.food) -> respect it
      activeQrBaseUrl = saved;
    }
  } else {
    db.settings.qrBaseUrl = recommendedBaseUrl;
    activeQrBaseUrl = recommendedBaseUrl;
  }

  return {
    lanIps,
    primaryIp,
    port: Number(port),
    isReachableOnLan,
    localhostUrl: `http://localhost:${port}`,
    recommendedBaseUrl,
    activeQrBaseUrl
  };
}

router.get('/network-info', (req, res) => {
  const effectivePort = req.socket.localPort || process.env.PORT || 3000;
  res.json(getNetworkInfo(effectivePort));
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

// ======================================================
// EXPENSE MANAGEMENT ROUTES
// ======================================================

const EXPENSE_ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];

router.get('/expenses', (req, res) => {
  try {
    const { date, dateFrom, dateTo } = req.query;
    const expenses = db.getExpenses({ date, dateFrom, dateTo });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/expenses', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.userRole || '';
  const userName = req.headers['x-user-name'] || req.body.userName || 'Manager';
  if (!EXPENSE_ALLOWED_ROLES.includes(userRole)) {
    return res.status(403).json({ error: 'Unauthorized: Only authorized roles can add expenses.' });
  }
  try {
    const { amount, date, category, notes } = req.body;
    const expense = db.addExpense({ amount, date, category, notes, createdBy: userName });
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/expenses/:id', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.userRole || '';
  const userName = req.headers['x-user-name'] || req.body.userName || 'Manager';
  if (!EXPENSE_ALLOWED_ROLES.includes(userRole)) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }
  try {
    const { amount, date, category, notes } = req.body;
    const updated = db.updateExpense(req.params.id, { amount, date, category, notes }, userName);
    if (!updated) return res.status(404).json({ error: 'Expense not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/expenses/:id', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.userRole || '';
  const userName = req.headers['x-user-name'] || req.body.userName || 'Manager';
  if (!EXPENSE_ALLOWED_ROLES.includes(userRole)) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }
  const result = db.deleteExpense(req.params.id, userName);
  if (!result) return res.status(404).json({ error: 'Expense not found' });
  res.json(result);
});

// ======================================================
// FINANCIAL OVERVIEW ROUTES
// ======================================================

router.get('/financial/daily-summary', (req, res) => {
  try {
    const { date } = req.query;
    const summary = db.getDailyFinancialSummary(date || undefined);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/financial/graph', (req, res) => {
  try {
    const { days, dateFrom, dateTo } = req.query;
    if (dateFrom && dateTo) {
      const graph = db.getFinancialGraph({ dateFrom, dateTo });
      return res.json(graph);
    }
    const daysNum = Math.min(366, Math.max(1, parseInt(days || '7', 10)));
    const graph = db.getFinancialGraph({ days: daysNum });
    res.json(graph);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// INVENTORY ROUTES
// ======================================================
const INVENTORY_ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER', 'STALL MANAGER', 'KITCHEN STAFF'];

router.get('/inventory', (req, res) => {
  const { stallId } = req.query;
  res.json(db.getFullInventory(stallId || null));
});

router.patch('/inventory/:menuItemId/stock', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.userRole || '';
  const userName = req.headers['x-user-name'] || req.body.userName || 'Chef';
  if (!INVENTORY_ALLOWED_ROLES.includes(userRole)) {
    return res.status(403).json({ error: 'Unauthorized: Only authorized staff can update stock.' });
  }

  const item = db.getMenuItem(req.params.menuItemId);
  if (!item) return res.status(404).json({ error: 'Menu item not found' });
  const userStallId = req.headers['x-user-stall-id'] || req.body.userStallId;
  if (userRole === 'STALL MANAGER' && userStallId && item.stallId !== userStallId) {
    return res.status(403).json({ error: 'You can only manage stock for your own stall.' });
  }

  try {
    const { preparedQty } = req.body;
    if (preparedQty === null || preparedQty === undefined || isNaN(Number(preparedQty)) || Number(preparedQty) < 0) {
      return res.status(400).json({ error: 'Please enter a valid non-negative prepared quantity.' });
    }
    const result = db.setItemStock(req.params.menuItemId, Number(preparedQty), userName);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/inventory/:menuItemId/availability', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.userRole || '';
  const userName = req.headers['x-user-name'] || req.body.userName || 'Manager';
  const ADMIN_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];
  if (!ADMIN_ROLES.includes(userRole)) {
    return res.status(403).json({ error: 'Unauthorized: Only admin or managers can override availability.' });
  }
  try {
    const { isAvailable } = req.body;
    const result = db.setItemManualAvailability(req.params.menuItemId, !!isAvailable, userName);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/inventory/:menuItemId/reset', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.userRole || '';
  const userName = req.headers['x-user-name'] || req.body.userName || 'Manager';
  const ADMIN_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];
  if (!ADMIN_ROLES.includes(userRole)) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }
  const result = db.resetItemStock(req.params.menuItemId, userName);
  res.json(result);
});

// ======================================================
// CART RESERVATION ROUTES (LIVE ACROSS ALL PHONES)
// ======================================================

router.post('/cart/reserve', (req, res) => {
  try {
    const { sessionId, menuItemId, quantity } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    if (!menuItemId) return res.status(400).json({ error: 'menuItemId is required' });
    const result = db.reserveCartItem(sessionId, menuItemId, quantity);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/cart/release-item', (req, res) => {
  try {
    const { sessionId, menuItemId } = req.body;
    if (!sessionId || !menuItemId) return res.status(400).json({ error: 'sessionId and menuItemId are required' });
    const result = db.releaseCartItem(sessionId, menuItemId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/cart/release-all', (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    const result = db.releaseCartSession(sessionId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/cart/heartbeat', (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    const result = db.touchCartSession(sessionId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/cart/reservations/:sessionId?', (req, res) => {
  try {
    const sessionId = req.params.sessionId || req.query.sessionId || null;
    const reservations = db.getCartReservations(sessionId);
    res.json(reservations);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ======================================================
// STALL PAUSE ROUTES
// ======================================================
const STALL_CONTROL_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];

router.post('/stalls/:id/pause', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.userRole || '';
  const userName = req.headers['x-user-name'] || req.body.userName || 'Manager';
  if (!STALL_CONTROL_ROLES.includes(userRole)) {
    return res.status(403).json({ error: 'Unauthorized: Only authorized admin can pause stalls.' });
  }
  try {
    const { reason, durationMinutes } = req.body;
    const result = db.pauseStall(req.params.id, reason, durationMinutes ? Number(durationMinutes) : null, userName);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/stalls/:id/resume', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.userRole || '';
  const userName = req.headers['x-user-name'] || req.body.userName || 'Manager';
  if (!STALL_CONTROL_ROLES.includes(userRole)) {
    return res.status(403).json({ error: 'Unauthorized: Only authorized admin can resume stalls.' });
  }
  try {
    const result = db.resumeStall(req.params.id, userName);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/stalls/:id/status', (req, res) => {
  const status = db.getStallStatus(req.params.id);
  res.json(status);
});

// ======================================================
// ORDER REVIEW ROUTES
// ======================================================
router.post('/orders/:id/review', (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const review = db.submitReview({ orderId: req.params.id, rating, feedback });
    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/orders/:id/review', (req, res) => {
  const review = db.getReviewForOrder(req.params.id);
  res.json(review || null);
});

router.get('/reviews', (req, res) => {
  const userRole = req.headers['x-user-role'] || '';
  const ADMIN_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER', 'STALL MANAGER'];
  if (!ADMIN_ROLES.includes(userRole)) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }
  const { limit, orderId } = req.query;
  res.json(db.getReviews({ orderId: orderId || null, limit: limit ? Number(limit) : 100 }));
});

// ======================================================
// ACCOUNTING ROUTES
// ======================================================
const ACCOUNTING_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];

router.get('/accounting/ledger', (req, res) => {
  const userRole = req.headers['x-user-role'] || '';
  if (!ACCOUNTING_ROLES.includes(userRole)) return res.status(403).json({ error: 'Unauthorized.' });
  const { dateFrom, dateTo, type, search, limit } = req.query;
  res.json(db.getAccountingLedger({ dateFrom, dateTo, type, search, limit: limit ? Number(limit) : 300 }));
});

router.get('/accounting/income-statement', (req, res) => {
  const userRole = req.headers['x-user-role'] || '';
  if (!ACCOUNTING_ROLES.includes(userRole)) return res.status(403).json({ error: 'Unauthorized.' });
  const { dateFrom, dateTo } = req.query;
  res.json(db.getIncomeStatement({ dateFrom, dateTo }));
});

router.get('/accounting/trial-balance', (req, res) => {
  const userRole = req.headers['x-user-role'] || '';
  if (!ACCOUNTING_ROLES.includes(userRole)) return res.status(403).json({ error: 'Unauthorized.' });
  const { dateFrom, dateTo } = req.query;
  res.json(db.getTrialBalance({ dateFrom, dateTo }));
});

router.get('/accounting/balance-sheet', (req, res) => {
  const userRole = req.headers['x-user-role'] || '';
  if (!ACCOUNTING_ROLES.includes(userRole)) return res.status(403).json({ error: 'Unauthorized.' });
  res.json(db.getBalanceSheet());
});

router.get('/accounting/dues', (req, res) => {
  const userRole = req.headers['x-user-role'] || '';
  if (!ACCOUNTING_ROLES.includes(userRole)) return res.status(403).json({ error: 'Unauthorized.' });
  res.json(db.getDueReceivables());
});

// Purchases / Due Purchases
router.get('/purchases', (req, res) => {
  const userRole = req.headers['x-user-role'] || '';
  if (!ACCOUNTING_ROLES.includes(userRole)) return res.status(403).json({ error: 'Unauthorized.' });
  const { dateFrom, dateTo, status } = req.query;
  res.json(db.getPurchases({ dateFrom, dateTo, status }));
});

router.post('/purchases', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.userRole || '';
  const userName = req.headers['x-user-name'] || req.body.userName || 'Manager';
  if (!ACCOUNTING_ROLES.includes(userRole)) return res.status(403).json({ error: 'Unauthorized.' });
  try {
    const purchase = db.addPurchase({ ...req.body, createdBy: userName });
    res.status(201).json(purchase);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/purchases/:id', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.userRole || '';
  const userName = req.headers['x-user-name'] || req.body.userName || 'Manager';
  if (!ACCOUNTING_ROLES.includes(userRole)) return res.status(403).json({ error: 'Unauthorized.' });
  const result = db.updatePurchase(req.params.id, req.body, userName);
  if (!result) return res.status(404).json({ error: 'Purchase not found' });
  res.json(result);
});

router.delete('/purchases/:id', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.userRole || '';
  const userName = req.headers['x-user-name'] || req.body.userName || 'Manager';
  if (!ACCOUNTING_ROLES.includes(userRole)) return res.status(403).json({ error: 'Unauthorized.' });
  const result = db.deletePurchase(req.params.id, userName);
  if (!result) return res.status(404).json({ error: 'Purchase not found' });
  res.json(result);
});

export default router;
