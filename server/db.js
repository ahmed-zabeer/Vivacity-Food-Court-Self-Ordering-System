import { stallsData, menuItemsData, tablesData, usersData } from './menuData.js';
import { eventBus } from './events.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const RESETS_FILE = path.join(DATA_DIR, 'revenue_resets.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

export function getDhakaDateParts(d = new Date()) {
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find(p => p.type === type)?.value;
  const y = parseInt(get('year'), 10);
  const m = parseInt(get('month'), 10);
  const day = parseInt(get('day'), 10);
  const hour = parseInt(get('hour'), 10);
  const minute = parseInt(get('minute'), 10);
  const second = parseInt(get('second'), 10);
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const monthStr = `${y}-${String(m).padStart(2, '0')}`;
  const yearStr = `${y}`;
  return { y, m, day, hour, minute, second, dateStr, monthStr, yearStr };
}

class Database {
  constructor() {
    this.stalls = [...stallsData];
    this.menuItems = [...menuItemsData];
    this.tables = [...tablesData];
    this.users = [...usersData];
    this.orders = [];
    this.tableSessions = [];
    this.runnerTasks = [];
    this.auditLogs = [];
    this.coupons = [
      { code: "VIVA10", type: "percent", value: 10, minSpend: 500, label: "10% Food Hall Welcome Discount" },
      { code: "STEAK50", type: "fixed", value: 50, minSpend: 800, label: "৳50 Off Fusion Steak Experience" },
      { code: "MOMOFREE", type: "fixed", value: 40, minSpend: 400, label: "৳40 Off Momo Buzz Orders" },
    ];
    this.settings = {
      taxRate: 0.05, // 5% VAT (configurable)
      serviceChargeRate: 0.03, // 3% service fee (configurable)
      taxEnabled: false,
      serviceChargeEnabled: false,
      demoMode: true,
      businessName: "Vivacity Food Court",
      tagline: "Premier Food Court Hub",
      qrBaseUrl: process.env.APP_BASE_URL || null
    };

    this.tokenCounter = 48; // Starts after seed token #0047
    this.parcelTokenCounter = 1;
    this.revenueResets = [];

    this.loadPersistedData();
    if (this.orders.length === 0 && !this._ordersFileExisted) {
      this.initSeedData();
    }
    this._scheduleMidnightReset();
  }

  loadPersistedData() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(RESETS_FILE)) {
        const rawResets = fs.readFileSync(RESETS_FILE, 'utf-8');
        this.revenueResets = JSON.parse(rawResets);
      }
      if (fs.existsSync(ORDERS_FILE)) {
        const rawOrders = fs.readFileSync(ORDERS_FILE, 'utf-8');
        const parsed = JSON.parse(rawOrders);
        if (Array.isArray(parsed)) {
          this.orders = parsed.map(order => {
            if (Array.isArray(order.stalls)) {
              order.stalls = order.stalls.map(s => {
                const prepMin = s.prepTimeMinutes || (s.prepTimeEst ? parseInt(s.prepTimeEst, 10) : 15) || 15;
                return {
                  prepTimeMinutes: prepMin,
                  prepTimeEst: s.prepTimeEst || `${prepMin} min`,
                  prepStartedAt: s.prepStartedAt || null,
                  readyAt: s.readyAt || null,
                  counterConfirmedAt: s.counterConfirmedAt || null,
                  notifiedAt: s.notifiedAt || null,
                  lastNotifiedAt: s.lastNotifiedAt || s.notifiedAt || null,
                  notificationCount: typeof s.notificationCount === 'number' ? s.notificationCount : (s.notifiedAt ? 1 : 0),
                  notificationHistory: Array.isArray(s.notificationHistory) ? s.notificationHistory : (s.notifiedAt ? [{ eventId: s.notificationEventId || 'legacy-1', notifiedAt: s.notifiedAt, confirmedBy: s.confirmedBy || 'Central Counter', attempt: 1 }] : []),
                  collectedAt: s.collectedAt || null,
                  confirmedBy: s.confirmedBy || null,
                  notificationEventId: s.notificationEventId || null,
                  ...s
                };
              });
            }
            return order;
          });
          this._ordersFileExisted = true;
          return;
        }
      }
    } catch (e) {
      console.error('Error loading persisted data:', e);
    }
  }

  saveData() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(RESETS_FILE, JSON.stringify(this.revenueResets, null, 2), 'utf-8');
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(this.orders, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving persisted data:', e);
    }
  }

  _scheduleMidnightReset() {
    const calcMsToMidnight = () => {
      const parts = getDhakaDateParts(new Date());
      // Seconds elapsed today in Dhaka
      const secondsToday = parts.hour * 3600 + parts.minute * 60 + parts.second;
      const secondsInDay = 86400;
      const remainingSeconds = Math.max(1, secondsInDay - secondsToday);
      return remainingSeconds * 1000 + 1000; // plus 1s buffer past 00:00:00
    };

    const runAtMidnight = () => {
      const delay = calcMsToMidnight();
      const timer = setTimeout(() => {
        try {
          const parts = getDhakaDateParts(new Date());
          this.logAudit("DAILY_AUTO_ADVANCE", `New daily revenue period automatically started for ${parts.dateStr} (Asia/Dhaka).`, {}, 'System');
          const summary = this.getRevenueSummary();
          eventBus.broadcast("revenue_updated", summary);
          eventBus.broadcast("analytics_updated", this.getAnalyticsSummary());
        } catch (err) {
          console.error("Error during midnight auto advance:", err);
        }
        runAtMidnight();
      }, delay);
      if (timer && timer.unref) timer.unref();
    };

    runAtMidnight();
  }

  initSeedData() {
    // Seed initial active order for Table T17 (Token #0047) awaiting payment
    const t17Order = {
      id: "ord-seed-0047",
      token: "0047",
      tableId: "T17",
      sessionId: "sess-t17-active",
      type: "DINE_IN",
      status: "NEW",
      paymentStatus: "PAYMENT DUE",
      paymentMethod: "CASH",
      paidAt: null,
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      items: [
        {
          id: "item-1",
          menuItemId: "cb-stk-1",
          stallId: "fusion-cafe",
          name: "T Bone Steak (300+6M)",
          price: 1450,
          quantity: 1,
          notes: "Medium well, homemade sauce on side",
          isUnavailable: false
        },
        {
          id: "item-2",
          menuItemId: "mb-mom-1",
          stallId: "momo-buzz",
          name: "Chicken Momo",
          price: 150,
          quantity: 2,
          notes: "Extra spicy dipping sauce",
          isUnavailable: false
        },
        {
          id: "item-3",
          menuItemId: "bb-bgr-3",
          stallId: "burger-bar",
          name: "Chicken Cheese Delight",
          price: 249,
          quantity: 1,
          notes: "No onions",
          isUnavailable: false
        }
      ],
      subtotal: 1999,
      discount: 0,
      tax: 0,
      serviceCharge: 0,
      grandTotal: 1999,
      kotGenerated: true,
      kotNumber: "KOT-0047",
      stalls: [
        {
          stallId: "fusion-cafe",
          stallName: "Coffee Buzz Fusion Cafe",
          status: "PREPARING",
          prepTimeMinutes: 15,
          prepTimeEst: "15 min",
          prepStartedAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
          readyAt: null,
          counterConfirmedAt: null,
          notifiedAt: null,
          collectedAt: null,
          items: [
            { id: "item-1", name: "T Bone Steak (300+6M)", quantity: 1, price: 1450, notes: "Medium well, homemade sauce on side" }
          ]
        },
        {
          stallId: "momo-buzz",
          stallName: "Momo Buzz",
          status: "READY",
          prepTimeMinutes: 10,
          prepTimeEst: "10 min",
          prepStartedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
          readyAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          counterConfirmedAt: null,
          notifiedAt: null,
          collectedAt: null,
          items: [
            { id: "item-2", name: "Chicken Momo", quantity: 2, price: 150, notes: "Extra spicy dipping sauce" }
          ]
        },
        {
          stallId: "burger-bar",
          stallName: "Burger Bar",
          status: "PREPARING",
          prepTimeMinutes: 12,
          prepTimeEst: "12 min",
          prepStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          readyAt: null,
          counterConfirmedAt: null,
          notifiedAt: null,
          collectedAt: null,
          items: [
            { id: "item-3", name: "Chicken Cheese Delight", quantity: 1, price: 249, notes: "No onions" }
          ]
        }
      ]
    };

    this.orders.push(t17Order);

    // Initial session for T17
    this.tableSessions.push({
      id: "sess-t17-active",
      tableId: "T17",
      startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      orderIds: ["ord-seed-0047"],
      active: true,
      guestCount: 3
    });

    this.logAudit("SYSTEM_INIT", "Seeded table T17 with demo order #0047", { orderId: "ord-seed-0047" });
  }

  logAudit(action, details, metadata = {}, user = "System") {
    const entry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      user,
      action,
      details,
      metadata
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) this.auditLogs.pop();
    eventBus.broadcast("audit_log", entry);
    return entry;
  }

  // --- Tables ---
  getAllTables() {
    return this.tables;
  }

  getTable(id) {
    const table = this.tables.find(t => t.id.toUpperCase() === id.toUpperCase());
    if (!table) return null;
    const session = this.tableSessions.find(s => s.tableId === table.id && s.active);
    const activeOrders = this.orders.filter(o => o.tableId === table.id && !["COMPLETED", "CANCELLED"].includes(o.status));
    return {
      ...table,
      session,
      activeOrders
    };
  }

  updateTableStatus(id, status) {
    const table = this.tables.find(t => t.id.toUpperCase() === id.toUpperCase());
    if (table) {
      table.status = status;
      this.logAudit("TABLE_STATUS_CHANGE", `Table ${id} marked ${status}`);
      eventBus.broadcast("table_updated", table);
    }
    return table;
  }

  openTableSession(tableId, guestCount = 2) {
    let session = this.tableSessions.find(s => s.tableId === tableId && s.active);
    if (!session) {
      session = {
        id: "sess-" + randomUUID().slice(0, 8),
        tableId,
        startedAt: new Date().toISOString(),
        orderIds: [],
        active: true,
        guestCount
      };
      this.tableSessions.push(session);
      this.updateTableStatus(tableId, "ACTIVE");
      this.logAudit("SESSION_START", `New session started on Table ${tableId}`);
    }
    return session;
  }

  closeTableSession(tableId) {
    const session = this.tableSessions.find(s => s.tableId === tableId && s.active);
    if (session) {
      session.active = false;
      session.endedAt = new Date().toISOString();
    }
    this.updateTableStatus(tableId, "AVAILABLE");
    this.logAudit("SESSION_CLOSED", `Session closed for Table ${tableId}`);
    return session;
  }

  markTableAvailable(tableId, clearedBy = "Staff", role = "STAFF", forceOverride = false) {
    const table = this.tables.find(t => t.id.toUpperCase() === tableId.toUpperCase());
    if (!table) {
      return { success: false, code: 404, error: `Table ${tableId} not found.` };
    }

    // Safety checks: Find any active/unresolved orders on this table
    const tableOrders = this.orders.filter(o => o.tableId === table.id);
    const unresolvedIssues = [];

    for (const order of tableOrders) {
      // Ignore fully delivered/completed or cancelled orders
      if (order.status === "CANCELLED" || order.status === "COMPLETED") {
        continue;
      }

      // 1. Unpaid check
      if (order.paymentStatus !== "PAID") {
        unresolvedIssues.push({
          orderId: order.id,
          token: order.token,
          issue: "PAYMENT_DUE",
          message: `Order #${order.token} has unpaid balance (৳${order.grandTotal}, ${order.paymentStatus}). Payment must be settled.`
        });
      }

      // 2. Active preparation / undelivered food check
      for (const stall of order.stalls) {
        if (stall.status === "NEW" || stall.status === "PREPARING") {
          unresolvedIssues.push({
            orderId: order.id,
            token: order.token,
            stallId: stall.stallId,
            stallName: stall.stallName,
            issue: "KITCHEN_ACTIVE",
            message: `Order #${order.token} has items actively preparing in ${stall.stallName}.`
          });
        } else if (stall.status === "READY" || stall.status === "NOTIFIED") {
          unresolvedIssues.push({
            orderId: order.id,
            token: order.token,
            stallId: stall.stallId,
            stallName: stall.stallName,
            issue: "FOOD_NOT_COLLECTED",
            message: `Order #${order.token} has ready food at ${stall.stallName} not yet collected by guest.`
          });
        }
      }
    }

    if (unresolvedIssues.length > 0 && !forceOverride) {
      return {
        success: false,
        code: 400,
        error: `Cannot mark Table ${table.id} as AVAILABLE: Table has ${unresolvedIssues.length} unresolved order(s) or active kitchen items.`,
        unresolvedIssues
      };
    }

    // Perform Table Reset & Clearance
    table.status = "AVAILABLE";
    table.currentSessionId = null;
    table.activeOrderToken = null;

    // Close any active session for this table
    const activeSession = this.tableSessions.find(s => s.tableId === table.id && s.active);
    if (activeSession) {
      activeSession.active = false;
      activeSession.endedAt = new Date().toISOString();
      activeSession.clearedBy = clearedBy;
    }

    this.saveData();
    this.logAudit("TABLE_CLEARED_AVAILABLE", `Table ${table.id} cleared and marked AVAILABLE by ${clearedBy} (${role}). Ready for next guest.`, { tableId: table.id, clearedBy, role });
    
    eventBus.broadcast("table_updated", table);
    eventBus.broadcast("analytics_updated", this.getAnalyticsSummary());

    return {
      success: true,
      table,
      message: `Table ${table.id} successfully marked AVAILABLE and ready for the next guest.`
    };
  }

  // --- Stalls & Menu ---
  getAllStalls() {
    return this.stalls;
  }

  getStall(slugOrId) {
    return this.stalls.find(s => s.slug === slugOrId || s.id === slugOrId);
  }

  getAllMenuItems(stallId = null, category = null, search = "") {
    let items = [...this.menuItems];
    if (stallId) {
      items = items.filter(i => i.stallId === stallId);
    }
    if (category && category !== "ALL") {
      const catLower = category.toLowerCase();
      items = items.filter(i => 
        i.category.toLowerCase() === catLower ||
        (i.parentCategory && i.parentCategory.toLowerCase() === catLower)
      );
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => 
        i.name.toLowerCase().includes(q) || 
        (i.description && i.description.toLowerCase().includes(q)) ||
        (i.subCategory && i.subCategory.toLowerCase().includes(q)) ||
        i.category.toLowerCase().includes(q) ||
        (i.parentCategory && i.parentCategory.toLowerCase().includes(q))
      );
    }
    return items;
  }

  getMenuItem(id) {
    return this.menuItems.find(i => i.id === id);
  }

  updateItemAvailability(id, isAvailable) {
    const item = this.menuItems.find(i => i.id === id);
    if (item) {
      item.isAvailable = isAvailable;
      this.logAudit("MENU_AVAILABILITY_CHANGED", `Item "${item.name}" availability set to ${isAvailable}`);
      eventBus.broadcast("menu_item_updated", item);
    }
    return item;
  }

  updateMenuItemPrice(id, newPrice) {
    const item = this.menuItems.find(i => i.id === id);
    if (item) {
      const old = item.price;
      item.price = Number(newPrice);
      this.logAudit("MENU_PRICE_CHANGED", `Price of "${item.name}" changed from ৳${old} to ৳${newPrice}`);
      eventBus.broadcast("menu_item_updated", item);
    }
    return item;
  }

  addMenuItem(itemData) {
    const newItem = {
      id: "item-" + randomUUID().slice(0, 8),
      isAvailable: true,
      ...itemData
    };
    this.menuItems.push(newItem);
    this.logAudit("MENU_ITEM_ADDED", `Added new menu item "${newItem.name}" to ${newItem.stallId}`);
    eventBus.broadcast("menu_item_updated", newItem);
    return newItem;
  }

  // --- Orders Workflow ---
  getAllOrders(filter = {}) {
    let list = [...this.orders];
    if (filter.status) list = list.filter(o => o.status === filter.status);
    if (filter.tableId) list = list.filter(o => o.tableId === filter.tableId);
    if (filter.stallId) {
      list = list.filter(o => o.stalls.some(s => s.stallId === filter.stallId));
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getOrder(idOrToken) {
    return this.orders.find(o => o.id === idOrToken || o.token === idOrToken);
  }

  createOrder({
    tableId = null,
    type = "DINE_IN",
    rawItems = [],
    customerName = "",
    customerPhone = "",
    customerAddress = "",
    serviceType,
    customerNotes = "",
    paymentMethod = null,
    couponCode = null
  }) {
    if (!serviceType || (serviceType !== "SELF_SERVICE" && serviceType !== "TABLE_SERVICE")) {
      throw new Error("Please select Self-Service or Table Service to continue.");
    }

    const validPaymentMethods = ["bKash", "Online Card", "NFC / Contactless", "CASH"];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      throw new Error("Please select a payment method to continue.");
    }

    // Generate sequential customer token
    const tokenNum = (this.tokenCounter++).toString().padStart(4, "0");
    const orderId = "ord-" + randomUUID();

    // Verify items & compute server-side prices (Never trust client prices)
    const verifiedItems = [];
    let subtotal = 0;

    for (const raw of rawItems) {
      const dbItem = this.getMenuItem(raw.menuItemId);
      if (!dbItem) continue;

      let itemPrice = dbItem.price;

      // Handle variant pricing
      if (raw.variantId && dbItem.variants) {
        const variant = dbItem.variants.find(v => v.id === raw.variantId);
        if (variant) itemPrice = variant.price;
      }

      // Handle weight-based pricing (per 100g)
      if (dbItem.isWeightBased && raw.weight) {
        const weight = Number(raw.weight) || 400;
        itemPrice = (dbItem.price / 100) * weight;
      }

      // Handle add-ons
      let addOnsTotal = 0;
      if (raw.selectedAddOns && Array.isArray(raw.selectedAddOns)) {
        for (const addOnId of raw.selectedAddOns) {
          const matched = dbItem.addOns?.find(a => a.id === addOnId);
          if (matched) addOnsTotal += matched.price;
        }
      }

      const lineTotal = (itemPrice + addOnsTotal) * (raw.quantity || 1);
      subtotal += lineTotal;

      verifiedItems.push({
        id: "oli-" + randomUUID().slice(0, 8),
        menuItemId: dbItem.id,
        stallId: dbItem.stallId,
        name: dbItem.name,
        price: itemPrice + addOnsTotal,
        basePrice: dbItem.price,
        quantity: raw.quantity || 1,
        variantName: raw.variantName || null,
        weight: raw.weight || null,
        notes: raw.notes || "",
        isUnavailable: false
      });
    }

    // Apply Coupon if valid
    let discount = 0;
    if (couponCode) {
      const coupon = this.coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
      if (coupon && subtotal >= coupon.minSpend) {
        if (coupon.type === "percent") {
          discount = Math.round((subtotal * coupon.value) / 100);
        } else {
          discount = coupon.value;
        }
      }
    }

    // Table Service adds exactly 5% waiter service fee on subtotal; Self-Service is ৳0
    const isTableService = serviceType === "TABLE_SERVICE";
    const serviceCharge = isTableService ? Math.round(subtotal * 0.05) : 0;
    const tax = this.settings.taxEnabled ? Math.round(subtotal * this.settings.taxRate) : 0;
    const grandTotal = Math.max(0, subtotal - discount + tax + serviceCharge);

    // Group items into Stall Sub-Orders
    const stallMap = new Map();
    for (const item of verifiedItems) {
      if (!stallMap.has(item.stallId)) {
        const stallInfo = this.getStall(item.stallId);
        const stallDefaultPrep = stallInfo?.prepTimeMinutes || (stallInfo?.prepTime ? parseInt(stallInfo.prepTime, 10) : 15) || 15;
        stallMap.set(item.stallId, {
          stallId: item.stallId,
          stallName: stallInfo?.name || item.stallId,
          status: "NEW",
          prepTimeMinutes: stallDefaultPrep,
          prepTimeEst: `${stallDefaultPrep} min`,
          prepStartedAt: null,
          readyAt: null,
          counterConfirmedAt: null,
          notifiedAt: null,
          lastNotifiedAt: null,
          notificationCount: 0,
          notificationHistory: [],
          collectedAt: null,
          confirmedBy: null,
          notificationEventId: null,
          items: []
        });
      }
      const stallEntry = stallMap.get(item.stallId);
      stallEntry.items.push(item);
      const dbItem = this.getMenuItem(item.menuItemId);
      if (dbItem?.prepTimeMinutes || dbItem?.prepTime) {
        const itemPrep = dbItem.prepTimeMinutes || parseInt(dbItem.prepTime, 10);
        if (!isNaN(itemPrep) && itemPrep > stallEntry.prepTimeMinutes) {
          stallEntry.prepTimeMinutes = itemPrep;
          stallEntry.prepTimeEst = `${itemPrep} min`;
        }
      }
    }
    const stallOrders = Array.from(stallMap.values());

    // Active session linkage
    let sessionId = null;
    if (type === "DINE_IN" && tableId) {
      const session = this.openTableSession(tableId);
      sessionId = session.id;
      session.orderIds.push(orderId);
      this.updateTableStatus(tableId, "ACTIVE");
    }

    const order = {
      id: orderId,
      token: tokenNum,
      tableId: type === "DINE_IN" ? tableId : null,
      parcelToken: type === "PARCEL" ? `P${(this.parcelTokenCounter++).toString().padStart(3, "0")}` : null,
      sessionId,
      type,
      status: "NEW", // Pipeline step 1: NEW / UNDER REVIEW
      paymentStatus: paymentMethod === "CASH" ? "PAYMENT DUE" : "UNPAID",
      paymentMethod,
      customerName,
      customerPhone,
      customerAddress,
      serviceType: isTableService ? "TABLE_SERVICE" : "SELF_SERVICE",
      customerNotes,
      createdAt: new Date().toISOString(),
      items: verifiedItems,
      stalls: stallOrders,
      subtotal,
      discount,
      tax,
      serviceCharge,
      grandTotal,
      kotGenerated: false,
      kotNumber: null,
      history: [
        { status: "NEW", time: new Date().toISOString(), note: "Customer submitted master order." }
      ]
    };

    this.orders.unshift(order);
    this.saveData();

    this.logAudit("ORDER_CREATED", `New master order Token #${tokenNum} (${order.serviceType}) for ${type === "DINE_IN" ? 'Table ' + tableId : 'Takeaway'} (৳${grandTotal})`, { orderId, token: tokenNum, serviceType: order.serviceType });
    
    // Broadcast real-time order arrival to Central Admin
    eventBus.broadcast("order_created", order);

    return order;
  }

  // Management Step 2: Accept or Reject Order
  acceptOrder(orderId, managerName = "Central Counter") {
    const order = this.getOrder(orderId);
    if (!order) return null;

    order.status = "ACCEPTED";
    order.history.push({ status: "ACCEPTED", time: new Date().toISOString(), note: `Accepted by ${managerName}.` });

    // If online payment was already processed or once paid, auto release
    if (order.paymentStatus === "PAID") {
      this.releaseOrderToKitchen(orderId);
    } else if (order.paymentMethod === "CASH") {
      order.status = "PAYMENT DUE";
      if (order.tableId) this.updateTableStatus(order.tableId, "PAYMENT DUE");
    }

    this.logAudit("ORDER_ACCEPTED", `Order #${order.token} accepted by ${managerName}`, { orderId });
    eventBus.broadcast("order_updated", order);
    return order;
  }

  rejectOrder(orderId, reason = "Kitchen overloaded", managerName = "Central Counter") {
    const order = this.getOrder(orderId);
    if (!order) return null;

    order.status = "CANCELLED";
    order.cancellationReason = reason;
    order.history.push({ status: "CANCELLED", time: new Date().toISOString(), note: `Rejected: ${reason}` });

    this.logAudit("ORDER_REJECTED", `Order #${order.token} rejected by ${managerName}: ${reason}`, { orderId });
    eventBus.broadcast("order_updated", order);
    return order;
  }

  // Manager Direct Status Update (OK / Confirm)
  updateOrderStatus(orderId, newStatus, note = "", staffName = "Manager") {
    const order = this.getOrder(orderId);
    if (!order) return null;

    const validStatuses = [
      "NEW",
      "UNDER REVIEW",
      "ACCEPTED",
      "PAYMENT DUE",
      "PREPARING",
      "READY",
      "OUT FOR DELIVERY",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED",
      "ACTION REQUIRED"
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const prevStatus = order.status;
    order.status = newStatus;
    const nowIso = new Date().toISOString();

    order.history.push({
      status: newStatus,
      time: nowIso,
      note: note || `Status updated from ${prevStatus} to ${newStatus} by ${staffName}.`
    });

    if (newStatus === "CANCELLED" && note) {
      order.cancellationReason = note;
    }

    // Sync stall statuses
    if (newStatus === "PREPARING") {
      if (!order.kotGenerated) {
        order.kotGenerated = true;
        order.kotNumber = order.token ? `KOT-${order.token}` : `KOT-${Date.now().toString().slice(-4)}`;
      }
      for (const stall of order.stalls) {
        if (stall.status === "NEW") {
          stall.status = "PREPARING";
          if (!stall.prepStartedAt) stall.prepStartedAt = nowIso;
        }
      }
    } else if (newStatus === "COMPLETED" || newStatus === "DELIVERED") {
      for (const stall of order.stalls) {
        if (stall.status !== "COLLECTED") {
          stall.status = "COLLECTED";
          stall.collectedAt = nowIso;
        }
      }
    }

    // Update table status if dine-in
    if (order.tableId) {
      if (newStatus === "READY") {
        this.updateTableStatus(order.tableId, "READY");
      } else if (newStatus === "PREPARING") {
        this.updateTableStatus(order.tableId, "PREPARING");
      } else if (newStatus === "PAYMENT DUE") {
        this.updateTableStatus(order.tableId, "PAYMENT DUE");
      }
    }

    this.saveData();
    this.logAudit("ORDER_STATUS_UPDATE", `Order #${order.token} status updated to ${newStatus} by ${staffName}`, { orderId, prevStatus, newStatus }, staffName);
    eventBus.broadcast("order_updated", order);
    return order;
  }

  // Management Step: Mark individual item unavailable
  markItemUnavailable(orderId, itemId, reason = "Out of stock") {
    const order = this.getOrder(orderId);
    if (!order) return null;

    const targetItem = order.items.find(i => i.id === itemId);
    if (!targetItem) return null;

    targetItem.isUnavailable = true;
    targetItem.unavailableReason = reason;
    order.status = "ACTION REQUIRED";

    // Recalculate remaining items
    this.recalculateOrderTotal(order);

    order.history.push({
      status: "ACTION REQUIRED",
      time: new Date().toISOString(),
      note: `Item "${targetItem.name}" marked unavailable.`
    });

    this.logAudit("ITEM_UNAVAILABLE", `Item "${targetItem.name}" in Order #${order.token} marked unavailable`, { orderId, itemId });
    eventBus.broadcast("order_updated", order);
    return order;
  }

  // Customer responds to unavailable item (remove / keep remaining)
  customerRemoveUnavailableItem(orderId, itemId) {
    const order = this.getOrder(orderId);
    if (!order) return null;

    order.items = order.items.filter(i => i.id !== itemId);
    // Also remove from stall sub-orders
    for (const stall of order.stalls) {
      stall.items = stall.items.filter(i => i.id !== itemId);
    }
    // Remove empty stalls
    order.stalls = order.stalls.filter(s => s.items.length > 0);

    this.recalculateOrderTotal(order);

    // If all items resolved
    const hasMoreUnavailable = order.items.some(i => i.isUnavailable);
    if (!hasMoreUnavailable) {
      order.status = "ACCEPTED";
      order.history.push({ status: "ACCEPTED", time: new Date().toISOString(), note: "Customer accepted modified order." });
    }

    this.logAudit("ORDER_MODIFIED", `Customer confirmed removal of unavailable item in #${order.token}`);
    eventBus.broadcast("order_updated", order);
    return order;
  }

  recalculateOrderTotal(order) {
    let subtotal = 0;
    for (const item of order.items) {
      if (!item.isUnavailable) {
        subtotal += item.price * item.quantity;
      }
    }
    order.subtotal = subtotal;
    const tax = this.settings.taxEnabled ? Math.round(subtotal * this.settings.taxRate) : 0;
    const serviceCharge = order.serviceType === "TABLE_SERVICE" ? Math.round(subtotal * 0.05) : 0;
    order.tax = tax;
    order.serviceCharge = serviceCharge;
    order.grandTotal = Math.max(0, subtotal - (order.discount || 0) + tax + serviceCharge);
  }

  // Payment Confirmation (Cashier confirm cash OR Online Gateway success)
  confirmPayment(orderId, paymentMethod = null, transactionId = null, cashierName = "Cashier Counter") {
    const order = this.getOrder(orderId);
    if (!order) return null;

    order.paymentStatus = "PAID";
    if (paymentMethod) order.paymentMethod = paymentMethod;
    order.transactionId = transactionId || "TXN-" + randomUUID().slice(0, 10).toUpperCase();
    order.paidAt = new Date().toISOString();

    order.history.push({
      status: "PAID",
      time: new Date().toISOString(),
      note: `Payment confirmed via ${order.paymentMethod} by ${cashierName}.`
    });

    this.logAudit("PAYMENT_CONFIRMED", `Payment confirmed for Order #${order.token} (৳${order.grandTotal}) via ${order.paymentMethod}`);

    // Generate KOT and release order to kitchen
    this.releaseOrderToKitchen(orderId);

    this.saveData();

    // Broadcast real-time revenue update
    eventBus.broadcast("revenue_updated", this.getRevenueSummary());
    eventBus.broadcast("analytics_updated", this.getAnalyticsSummary());

    eventBus.broadcast("order_updated", order);
    return order;
  }

  // Release Order & Generate KOT
  releaseOrderToKitchen(orderId) {
    const order = this.getOrder(orderId);
    if (!order) return;

    order.status = "PREPARING";
    order.kotGenerated = true;
    order.kotNumber = `KOT-${order.token}`;
    order.kotGeneratedAt = new Date().toISOString();

    const nowIso = new Date().toISOString();
    // Mark all stall sub-orders as PREPARING
    for (const stall of order.stalls) {
      stall.status = "PREPARING";
      if (!stall.prepStartedAt) {
        stall.prepStartedAt = nowIso;
      }
    }

    if (order.tableId) {
      this.updateTableStatus(order.tableId, "PREPARING");
    }

    order.history.push({
      status: "PREPARING",
      time: nowIso,
      note: `KOT ${order.kotNumber} generated. Order released to stalls.`
    });

    this.logAudit("KOT_GENERATED", `KOT #${order.kotNumber} generated for Table ${order.tableId || 'Takeaway'}`);
    this.saveData();
    eventBus.broadcast("kot_generated", order);
    eventBus.broadcast("order_updated", order);
  }

  // Stall Kitchen Actions: Update individual stall sub-order status
  updateStallOrderStatus(orderId, stallId, newStatus, staffName = "Kitchen Staff") {
    const order = this.getOrder(orderId);
    if (!order) return null;

    const stallOrder = order.stalls.find(s => s.stallId === stallId);
    if (!stallOrder) return null;

    const nowIso = new Date().toISOString();
    stallOrder.status = newStatus;

    if (newStatus === "PREPARING" && !stallOrder.prepStartedAt) {
      stallOrder.prepStartedAt = nowIso;
    } else if (newStatus === "READY") {
      stallOrder.readyAt = nowIso;
      eventBus.broadcast("stall_kitchen_ready", {
        orderId: order.id,
        token: order.token,
        tableId: order.tableId,
        stallId: stallOrder.stallId,
        stallName: stallOrder.stallName,
        items: stallOrder.items,
        readyAt: stallOrder.readyAt
      });
    }

    this.logAudit("STALL_STATUS_CHANGE", `Stall "${stallOrder.stallName}" marked sub-order for #${order.token} as ${newStatus}`, { orderId, stallId }, staffName);

    // Check if ALL stalls for this master order are READY
    const allStallsReady = order.stalls.every(s => s.status === "READY" || s.status === "NOTIFIED" || s.status === "COLLECTED");
    if (allStallsReady && order.status !== "READY" && order.status !== "OUT FOR DELIVERY" && order.status !== "DELIVERED") {
      order.status = "READY";
      if (order.tableId) this.updateTableStatus(order.tableId, "READY");

      order.history.push({
        status: "READY",
        time: nowIso,
        note: "All stall kitchens marked items ready for runner pickup!"
      });

      // Create unified Runner Task!
      this.createRunnerTask(order);
    }

    this.saveData();
    eventBus.broadcast("order_updated", order);
    return order;
  }

  // Dedicated Kitchen & Stall Lifecycle methods
  startPreparingStall(orderId, stallId, staffName = "Kitchen Staff") {
    const order = this.getOrder(orderId);
    if (!order) return null;
    const stall = order.stalls.find(s => s.stallId === stallId);
    if (!stall) return null;

    stall.status = "PREPARING";
    if (!stall.prepStartedAt) {
      stall.prepStartedAt = new Date().toISOString();
    }
    if (order.status === "NEW" || order.status === "ACCEPTED") {
      order.status = "PREPARING";
    }
    this.saveData();
    this.logAudit("STALL_PREPARING", `Stall "${stall.stallName}" started preparing order #${order.token}`, { orderId, stallId }, staffName);
    eventBus.broadcast("order_updated", order);
    return order;
  }

  markStallReady(orderId, stallId, staffName = "Kitchen Staff") {
    const order = this.getOrder(orderId);
    if (!order) return null;
    const stall = order.stalls.find(s => s.stallId === stallId);
    if (!stall) return null;

    const nowIso = new Date().toISOString();
    stall.status = "READY";
    stall.readyAt = nowIso;
    this.saveData();
    this.logAudit("STALL_KITCHEN_READY", `Stall "${stall.stallName}" marked food READY for #${order.token} (Awaiting counter confirmation)`, { orderId, stallId }, staffName);

    // Broadcast to Central Counter Dashboard: Kitchen Ready!
    eventBus.broadcast("stall_kitchen_ready", {
      orderId: order.id,
      token: order.token,
      tableId: order.tableId,
      customerName: order.customerName || null,
      customerPhone: order.customerPhone || null,
      stallId: stall.stallId,
      stallName: stall.stallName,
      items: stall.items,
      readyAt: stall.readyAt
    });
    eventBus.broadcast("order_updated", order);
    return order;
  }

  confirmAndNotifyCustomer(orderId, stallId, counterStaff = "Central Counter") {
    const order = this.getOrder(orderId);
    if (!order) return { error: "Order not found", code: 404 };
    const stall = order.stalls.find(s => s.stallId === stallId);
    if (!stall) return { error: "Stall not found in order", code: 404 };

    // Cannot notify if food has already been collected
    if (stall.status === "COLLECTED") {
      return {
        error: `Cannot notify customer: Food at "${stall.stallName}" has already been collected.`,
        code: 400
      };
    }

    if (stall.status !== "READY" && stall.status !== "NOTIFIED") {
      return {
        error: `Cannot notify customer: Food at "${stall.stallName}" is still ${stall.status} and has not been marked READY by kitchen staff yet.`,
        code: 400
      };
    }

    const isRepeat = stall.status === "NOTIFIED";
    const nowIso = new Date().toISOString();
    stall.notificationCount = (stall.notificationCount || 0) + 1;
    stall.status = "NOTIFIED";
    if (!stall.counterConfirmedAt) stall.counterConfirmedAt = nowIso;
    if (!stall.notifiedAt) stall.notifiedAt = nowIso;
    stall.lastNotifiedAt = nowIso;
    stall.confirmedBy = counterStaff;
    stall.notificationEventId = "notif-" + randomUUID();

    if (!Array.isArray(stall.notificationHistory)) {
      stall.notificationHistory = [];
    }
    stall.notificationHistory.push({
      eventId: stall.notificationEventId,
      notifiedAt: nowIso,
      confirmedBy: counterStaff,
      attempt: stall.notificationCount
    });

    // Check if all stalls in master order are now NOTIFIED or COLLECTED
    const allStallsNotifiedOrCollected = order.stalls.every(s => s.status === "NOTIFIED" || s.status === "COLLECTED");
    if (allStallsNotifiedOrCollected) {
      order.status = "READY";
      if (order.tableId) this.updateTableStatus(order.tableId, "READY");
    }

    const historyNote = isRepeat
      ? `Repeat reminder #${stall.notificationCount} dispatched by ${counterStaff} for ${stall.stallName}.`
      : `${counterStaff} confirmed ${stall.stallName} is ready. Customer notified to collect.`;

    order.history.push({
      status: "READY",
      time: nowIso,
      note: historyNote
    });

    this.saveData();
    this.logAudit(
      isRepeat ? "REPEAT_NOTIFICATION_DISPATCHED" : "COUNTER_CONFIRMED_READY",
      `${counterStaff} ${isRepeat ? `re-notified (attempt #${stall.notificationCount})` : 'confirmed food ready'} for "${stall.stallName}" in #${order.token} (Table ${order.tableId || 'Takeaway'}). Customer notification dispatched.`,
      { orderId, stallId, attempt: stall.notificationCount, eventId: stall.notificationEventId },
      counterStaff
    );

    const notificationPayload = {
      orderId: order.id,
      token: order.token,
      tableId: order.tableId,
      customerName: order.customerName || null,
      customerPhone: order.customerPhone || null,
      stallId: stall.stallId,
      stallName: stall.stallName,
      serviceType: order.serviceType || 'SELF_SERVICE',
      confirmedBy: counterStaff,
      items: stall.items,
      notificationEventId: stall.notificationEventId,
      notifiedAt: stall.lastNotifiedAt,
      attempt: stall.notificationCount,
      isRepeat
    };

    // Broadcast customer-facing event: triggers sound & modal
    eventBus.broadcast("stall_ready_confirmed", notificationPayload);
    eventBus.broadcast("order_updated", order);

    return {
      success: true,
      order,
      stall,
      notificationEvent: notificationPayload,
      alreadyNotified: isRepeat,
      isRepeat
    };
  }

  markStallCollected(orderId, stallId, staffName = "Central Counter") {
    const order = this.getOrder(orderId);
    if (!order) return { error: "Order not found", code: 404 };
    const stall = order.stalls.find(s => s.stallId === stallId);
    if (!stall) return { error: "Stall not found in order", code: 404 };

    const nowIso = new Date().toISOString();
    stall.status = "COLLECTED";
    stall.collectedAt = nowIso;

    // Check if ALL stalls in master order are COLLECTED
    const allStallsCollected = order.stalls.every(s => s.status === "COLLECTED");
    if (allStallsCollected) {
      order.status = "DELIVERED";
      if (order.tableId) this.updateTableStatus(order.tableId, "ACTIVE");
      order.history.push({
        status: "DELIVERED",
        time: nowIso,
        note: "All food items collected from food court counters! Order complete."
      });
    }

    this.saveData();
    this.logAudit("STALL_COLLECTED", `Food from "${stall.stallName}" in #${order.token} marked COLLECTED by ${staffName}`, { orderId, stallId }, staffName);
    eventBus.broadcast("order_updated", order);

    return { success: true, order, stall };
  }

  getAwaitingCounterConfirmations() {
    const list = [];
    const now = Date.now();
    for (const order of this.orders) {
      if (["CANCELLED", "COMPLETED"].includes(order.status)) continue;
      for (const stall of order.stalls) {
        if (["READY", "NOTIFIED", "COLLECTED"].includes(stall.status)) {
          const readyTime = stall.readyAt ? new Date(stall.readyAt).getTime() : 0;
          const waitMinutes = readyTime > 0 ? Math.max(0, Math.floor((now - readyTime) / 60000)) : 0;
          list.push({
            orderId: order.id,
            token: order.token,
            tableId: order.tableId,
            customerName: order.customerName || null,
            customerPhone: order.customerPhone || null,
            serviceType: order.serviceType || 'SELF_SERVICE',
            orderType: order.type,
            createdAt: order.createdAt,
            stallId: stall.stallId,
            stallName: stall.stallName,
            items: stall.items,
            status: stall.status,
            prepStartedAt: stall.prepStartedAt,
            readyAt: stall.readyAt,
            counterConfirmedAt: stall.counterConfirmedAt,
            notifiedAt: stall.notifiedAt,
            lastNotifiedAt: stall.lastNotifiedAt || stall.notifiedAt || null,
            notificationCount: stall.notificationCount || (stall.notifiedAt ? 1 : 0),
            notificationHistory: stall.notificationHistory || [],
            collectedAt: stall.collectedAt,
            confirmedBy: stall.confirmedBy,
            notificationEventId: stall.notificationEventId,
            waitMinutes
          });
        }
      }
    }
    const statusOrder = { READY: 0, NOTIFIED: 1, COLLECTED: 2 };
    list.sort((a, b) => {
      const diff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (diff !== 0) return diff;
      return (new Date(b.readyAt || b.createdAt).getTime()) - (new Date(a.readyAt || a.createdAt).getTime());
    });
    return list;
  }

  updateMenuItemPrepTime(id, prepMinutes) {
    const item = this.menuItems.find(i => i.id === id);
    if (item) {
      item.prepTime = `${prepMinutes} min`;
      item.prepTimeMinutes = Number(prepMinutes);
      this.logAudit("MENU_PREPTIME_CHANGED", `Prep time for "${item.name}" set to ${prepMinutes} min`);
      eventBus.broadcast("menu_item_updated", item);
    }
    return item;
  }

  updateStallPrepTime(id, prepMinutes) {
    const stall = this.getStall(id);
    if (stall) {
      stall.prepTime = `${prepMinutes} min`;
      stall.prepTimeMinutes = Number(prepMinutes);
      this.logAudit("STALL_PREPTIME_CHANGED", `Prep time for stall "${stall.name}" set to ${prepMinutes} min`);
      eventBus.broadcast("stall_updated", stall);
    }
    return stall;
  }

  // Unified Runner / Waiter Delivery Task
  createRunnerTask(order) {
    const existing = this.runnerTasks.find(t => t.orderId === order.id);
    if (existing) return existing;

    const task = {
      id: "run-" + randomUUID().slice(0, 8),
      orderId: order.id,
      token: order.token,
      tableId: order.tableId,
      customerName: order.customerName || null,
      customerPhone: order.customerPhone || null,
      status: "READY_TO_DELIVER",
      stalls: order.stalls.map(s => s.stallName),
      itemCount: order.items.length,
      createdAt: new Date().toISOString(),
      assignedRunner: "Runner Kabir"
    };

    this.runnerTasks.unshift(task);
    this.logAudit("RUNNER_TASK_CREATED", `Unified Runner task created for Token #${order.token} (Table ${order.tableId})`);
    eventBus.broadcast("runner_task_created", task);
    return task;
  }

  updateRunnerTask(taskId, newStatus) {
    const task = this.runnerTasks.find(t => t.id === taskId);
    if (!task) return null;

    task.status = newStatus;
    const order = this.getOrder(task.orderId);

    if (newStatus === "OUT_FOR_DELIVERY") {
      if (order) {
        order.status = "OUT FOR DELIVERY";
        if (order.tableId) this.updateTableStatus(order.tableId, "DELIVERING");
        order.history.push({ status: "OUT FOR DELIVERY", time: new Date().toISOString(), note: "Runner picked up tray and is heading to table." });
      }
    } else if (newStatus === "DELIVERED") {
      task.deliveredAt = new Date().toISOString();
      if (order) {
        order.status = "DELIVERED";
        if (order.tableId) this.updateTableStatus(order.tableId, "ACTIVE");
        order.history.push({ status: "DELIVERED", time: new Date().toISOString(), note: "Delivered to table! Enjoy your meal." });
      }
    }

    this.logAudit("RUNNER_STATUS_UPDATE", `Runner task #${task.token} updated to ${newStatus}`);
    eventBus.broadcast("runner_task_updated", task);
    if (order) eventBus.broadcast("order_updated", order);
    return task;
  }

  // --- Reports & Analytics ---
  getAnalyticsSummary() {
    const rev = this.getRevenueSummary();
    const totalOrders = rev.daily.orders;
    const totalRevenue = rev.daily.revenue;

    const activeTables = this.tables.filter(t => t.status !== "AVAILABLE").length;
    const paymentDueCount = this.orders.filter(o => o.paymentStatus === "PAYMENT DUE" || o.status === "PAYMENT DUE").length;
    const preparingCount = this.orders.filter(o => o.status === "PREPARING").length;
    const readyCount = this.orders.filter(o => o.status === "READY").length;
    const parcelCount = this.orders.filter(o => o.type === "PARCEL").length;

    // Stall-by-stall revenue breakdown
    const stallPerformance = this.stalls.map(stall => {
      let gross = 0;
      let orderCount = 0;
      for (const order of this.orders) {
        if (order.paymentStatus === "PAID" && order.status !== "CANCELLED") {
          const stallSub = order.stalls.find(s => s.stallId === stall.id);
          if (stallSub) {
            orderCount++;
            for (const item of stallSub.items) {
              gross += item.price * item.quantity;
            }
          }
        }
      }
      const commissionRate = 0.15; // 15% food court commission
      const commission = Math.round(gross * commissionRate);
      const netSettlement = gross - commission;

      return {
        stallId: stall.id,
        name: stall.name,
        orders: orderCount,
        grossSales: gross,
        discount: 0,
        commissionRate: "15%",
        commission,
        netSettlement
      };
    });

    return {
      totalOrders,
      totalRevenue,
      activeTables,
      paymentDueCount,
      preparingCount,
      readyCount,
      parcelCount,
      stallPerformance,
      revenueSummary: rev
    };
  }

  // --- Real-World Accurate Revenue Engine (Asia/Dhaka UTC+6) ---
  getRevenueSummary() {
    const now = new Date();
    const todayParts = getDhakaDateParts(now);
    const yesterdayParts = getDhakaDateParts(new Date(now.getTime() - 86400000));
    const prevMonthStr = todayParts.m === 1 
      ? `${todayParts.y - 1}-12` 
      : `${todayParts.y}-${String(todayParts.m - 1).padStart(2, '0')}`;
    const prevYearStr = `${todayParts.y - 1}`;

    // Active reset cutoffs for today's Dhaka date, month, and year (persisted in this.revenueResets)
    const dailyResets = this.revenueResets
      .filter(r => (r.date === todayParts.dateStr) && (r.type === 'daily' || !r.type))
      .sort((a, b) => new Date(b.resetAt).getTime() - new Date(a.resetAt).getTime());
    const latestDailyReset = dailyResets[0] || null;
    const dailyResetCutoff = latestDailyReset ? new Date(latestDailyReset.resetAt).getTime() : 0;

    const monthlyResets = this.revenueResets
      .filter(r => r.type === 'monthly' && r.month === todayParts.monthStr)
      .sort((a, b) => new Date(b.resetAt).getTime() - new Date(a.resetAt).getTime());
    const latestMonthlyReset = monthlyResets[0] || null;
    const monthlyResetCutoff = latestMonthlyReset ? new Date(latestMonthlyReset.resetAt).getTime() : 0;

    const yearlyResets = this.revenueResets
      .filter(r => r.type === 'yearly' && r.year === todayParts.yearStr)
      .sort((a, b) => new Date(b.resetAt).getTime() - new Date(a.resetAt).getTime());
    const latestYearlyReset = yearlyResets[0] || null;
    const yearlyResetCutoff = latestYearlyReset ? new Date(latestYearlyReset.resetAt).getTime() : 0;

    let dailyRevenue = 0;
    let dailyOrders = 0;
    let prevDailyRevenue = 0;
    let prevDailyOrders = 0;

    let monthlyRevenue = 0;
    let monthlyOrders = 0;
    let prevMonthlyRevenue = 0;
    let prevMonthlyOrders = 0;

    let yearlyRevenue = 0;
    let yearlyOrders = 0;
    let prevYearlyRevenue = 0;
    let prevYearlyOrders = 0;

    for (const order of this.orders) {
      // Must be confirmed PAID and not CANCELLED
      if (order.paymentStatus !== 'PAID' || order.status === 'CANCELLED') continue;

      const paidDateTimestamp = order.paidAt || order.createdAt;
      if (!paidDateTimestamp) continue;

      const orderPaidMs = new Date(paidDateTimestamp).getTime();
      const orderParts = getDhakaDateParts(new Date(orderPaidMs));
      const amount = Number(order.grandTotal) || 0;

      // 1. YEARLY REVENUE (Jan 1 of current year in Asia/Dhaka through current date)
      if (orderParts.yearStr === todayParts.yearStr) {
        if (orderPaidMs > yearlyResetCutoff) {
          yearlyRevenue += amount;
          yearlyOrders++;
        }
      } else if (orderParts.yearStr === prevYearStr) {
        prevYearlyRevenue += amount;
        prevYearlyOrders++;
      }

      // 2. MONTHLY REVENUE (1st day of current month in Asia/Dhaka through current date)
      if (orderParts.monthStr === todayParts.monthStr) {
        if (orderPaidMs > monthlyResetCutoff) {
          monthlyRevenue += amount;
          monthlyOrders++;
        }
      } else if (orderParts.monthStr === prevMonthStr) {
        prevMonthlyRevenue += amount;
        prevMonthlyOrders++;
      }

      // 3. DAILY REVENUE (Current day in Asia/Dhaka)
      if (orderParts.dateStr === todayParts.dateStr) {
        // If a reset was performed today, only count sales strictly AFTER the reset cutoff
        if (orderPaidMs > dailyResetCutoff) {
          dailyRevenue += amount;
          dailyOrders++;
        }
      } else if (orderParts.dateStr === yesterdayParts.dateStr) {
        prevDailyRevenue += amount;
        prevDailyOrders++;
      }
    }

    const calcComparison = (current, prev) => {
      if (prev > 0) {
        return Math.round(((current - prev) / prev) * 100);
      }
      return null;
    };

    return {
      daily: {
        revenue: dailyRevenue,
        orders: dailyOrders,
        period: todayParts.dateStr,
        resetAt: latestDailyReset ? latestDailyReset.resetAt : null,
        comparison: {
          prevRevenue: prevDailyRevenue,
          prevOrders: prevDailyOrders,
          percentageChange: calcComparison(dailyRevenue, prevDailyRevenue)
        }
      },
      monthly: {
        revenue: monthlyRevenue,
        orders: monthlyOrders,
        period: todayParts.monthStr,
        resetAt: latestMonthlyReset ? latestMonthlyReset.resetAt : null,
        comparison: {
          prevRevenue: prevMonthlyRevenue,
          prevOrders: prevMonthlyOrders,
          percentageChange: calcComparison(monthlyRevenue, prevMonthlyRevenue)
        }
      },
      yearly: {
        revenue: yearlyRevenue,
        orders: yearlyOrders,
        period: todayParts.yearStr,
        resetAt: latestYearlyReset ? latestYearlyReset.resetAt : null,
        comparison: {
          prevRevenue: prevYearlyRevenue,
          prevOrders: prevYearlyOrders,
          percentageChange: calcComparison(yearlyRevenue, prevYearlyRevenue)
        }
      },
      timezone: 'Asia/Dhaka',
      currency: '৳',
      lastUpdated: new Date().toISOString()
    };
  }

  // --- Reset Daily Revenue Summary ---
  resetDailyRevenue(user = 'Manager', role = 'MANAGER') {
    const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];
    if (!ALLOWED_ROLES.includes(role)) {
      return { 
        error: 'Unauthorized: Only Super Admin, Food Court Owner, Manager, or Cashier can reset daily revenue.',
        code: 403
      };
    }

    const todayParts = getDhakaDateParts(new Date());
    const entry = {
      id: 'rev-reset-day-' + randomUUID(),
      type: 'daily',
      date: todayParts.dateStr,
      resetAt: new Date().toISOString(),
      user: user || 'Manager',
      role: role || 'MANAGER'
    };

    this.revenueResets.push(entry);
    this.saveData();

    this.logAudit(
      'DAILY_REVENUE_RESET',
      `Daily revenue summary for ${todayParts.dateStr} reset to ৳0 by ${user} (${role}). Historical transactions preserved.`,
      { resetId: entry.id, date: todayParts.dateStr, resetAt: entry.resetAt },
      user
    );

    const summary = this.getRevenueSummary();
    eventBus.broadcast('revenue_updated', summary);
    eventBus.broadcast('analytics_updated', this.getAnalyticsSummary());

    return { success: true, resetEntry: entry, summary };
  }

  // --- Reset Monthly Revenue Summary ---
  resetMonthlyRevenue(user = 'Manager', role = 'MANAGER') {
    const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];
    if (!ALLOWED_ROLES.includes(role)) {
      return { 
        error: 'Unauthorized: Only Super Admin, Food Court Owner, Manager, or Cashier can reset monthly revenue.',
        code: 403
      };
    }

    const todayParts = getDhakaDateParts(new Date());
    const entry = {
      id: 'rev-reset-month-' + randomUUID(),
      type: 'monthly',
      month: todayParts.monthStr,
      resetAt: new Date().toISOString(),
      user: user || 'Manager',
      role: role || 'MANAGER'
    };

    this.revenueResets.push(entry);
    this.saveData();

    this.logAudit(
      'MONTHLY_REVENUE_RESET',
      `Monthly revenue summary for ${todayParts.monthStr} reset to ৳0 by ${user} (${role}). Historical transactions preserved.`,
      { resetId: entry.id, month: todayParts.monthStr, resetAt: entry.resetAt },
      user
    );

    const summary = this.getRevenueSummary();
    eventBus.broadcast('revenue_updated', summary);
    eventBus.broadcast('analytics_updated', this.getAnalyticsSummary());

    return { success: true, resetEntry: entry, summary };
  }

  // --- Reset Yearly Revenue Summary ---
  resetYearlyRevenue(user = 'Manager', role = 'MANAGER') {
    const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];
    if (!ALLOWED_ROLES.includes(role)) {
      return { 
        error: 'Unauthorized: Only Super Admin, Food Court Owner, Manager, or Cashier can reset yearly revenue.',
        code: 403
      };
    }

    const todayParts = getDhakaDateParts(new Date());
    const entry = {
      id: 'rev-reset-year-' + randomUUID(),
      type: 'yearly',
      year: todayParts.yearStr,
      resetAt: new Date().toISOString(),
      user: user || 'Manager',
      role: role || 'MANAGER'
    };

    this.revenueResets.push(entry);
    this.saveData();

    this.logAudit(
      'YEARLY_REVENUE_RESET',
      `Yearly revenue summary for ${todayParts.yearStr} reset to ৳0 by ${user} (${role}). Historical transactions preserved.`,
      { resetId: entry.id, year: todayParts.yearStr, resetAt: entry.resetAt },
      user
    );

    const summary = this.getRevenueSummary();
    eventBus.broadcast('revenue_updated', summary);
    eventBus.broadcast('analytics_updated', this.getAnalyticsSummary());

    return { success: true, resetEntry: entry, summary };
  }

  // --- Reset Tables & Active Sessions ---
  resetTables(user = 'Manager', role = 'MANAGER') {
    const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];
    if (!ALLOWED_ROLES.includes(role)) {
      return { 
        error: 'Unauthorized: Only Super Admin, Food Court Owner, Manager, or Cashier can reset tables.',
        code: 403
      };
    }

    for (const table of this.tables) {
      table.status = 'AVAILABLE';
      table.currentSessionId = null;
      table.activeOrderToken = null;
      table.totalSpentToday = 0;
    }

    for (const session of this.tableSessions) {
      if (session.active) {
        session.active = false;
        session.endedAt = new Date().toISOString();
      }
    }

    this.saveData();
    this.logAudit('TABLES_RESET', `All 55 tables and sessions reset to AVAILABLE by ${user} (${role}).`, {}, user);
    eventBus.broadcast('tables_updated', this.tables);
    eventBus.broadcast('analytics_updated', this.getAnalyticsSummary());

    return { success: true, tables: this.tables };
  }

  // --- Reset All Metrics (Daily, Monthly, Yearly, Tables) ---
  resetAll(user = 'Manager', role = 'MANAGER') {
    const rDay = this.resetDailyRevenue(user, role);
    if (rDay.error) return rDay;
    const rMonth = this.resetMonthlyRevenue(user, role);
    if (rMonth.error) return rMonth;
    const rYear = this.resetYearlyRevenue(user, role);
    if (rYear.error) return rYear;
    const rTables = this.resetTables(user, role);
    if (rTables.error) return rTables;

    return {
      success: true,
      message: 'All revenue metrics (Daily, Monthly, Yearly) and table sessions successfully reset to ৳0.',
      summary: this.getRevenueSummary()
    };
  }

  // --- One-Click Reset All & Delete Orders (Default ৳0) ---
  clearAllOrdersAndReset(user = 'Manager', role = 'MANAGER') {
    const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'];
    if (!ALLOWED_ROLES.includes(role)) {
      return {
        error: 'Unauthorized: Only Super Admin, Food Court Owner, Manager, or Cashier can delete orders and perform full reset.',
        code: 403
      };
    }

    const todayParts = getDhakaDateParts(new Date());

    // 1. Delete all orders and active runner tasks
    const deletedCount = this.orders.length;
    this.orders = [];
    this.runnerTasks = [];

    // 2. Reset token counters
    this.tokenCounter = 1;
    this.parcelTokenCounter = 1;

    // 3. Reset all 55 tables to AVAILABLE and close table sessions
    for (const table of this.tables) {
      table.status = 'AVAILABLE';
      table.currentSessionId = null;
      table.activeOrderToken = null;
      table.totalSpentToday = 0;
    }
    for (const session of this.tableSessions) {
      session.active = false;
      session.endedAt = new Date().toISOString();
    }

    // 4. Record reset entries for daily, monthly, and yearly
    const nowIso = new Date().toISOString();
    this.revenueResets.push(
      { id: 'rev-reset-day-' + randomUUID(), type: 'daily', date: todayParts.dateStr, resetAt: nowIso, user, role },
      { id: 'rev-reset-month-' + randomUUID(), type: 'monthly', month: todayParts.monthStr, resetAt: nowIso, user, role },
      { id: 'rev-reset-year-' + randomUUID(), type: 'yearly', year: todayParts.yearStr, resetAt: nowIso, user, role }
    );

    // 5. Save state to disk immediately
    this.saveData();

    // 6. Log audit event
    this.logAudit(
      'FULL_RESET_ORDERS_DELETED',
      `One-click reset executed by ${user} (${role}): ${deletedCount} orders deleted, all 55 tables reset to AVAILABLE, all revenue metrics defaulted to ৳0.`,
      { deletedOrdersCount: deletedCount, resetAt: nowIso },
      user
    );

    // 7. Broadcast real-time updates across all connected clients & dashboards
    const summary = this.getRevenueSummary();
    const analytics = this.getAnalyticsSummary();
    eventBus.broadcast('order_updated', null);
    eventBus.broadcast('tables_updated', this.tables);
    eventBus.broadcast('revenue_updated', summary);
    eventBus.broadcast('analytics_updated', analytics);

    return {
      success: true,
      deletedCount,
      message: `Successfully deleted all ${deletedCount} orders and reset all metrics (Daily, Monthly, Yearly revenue) to default ৳0.`,
      summary,
      tables: this.tables
    };
  }
}

export const db = new Database();
