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
const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const STALL_STATUS_FILE = path.join(DATA_DIR, 'stall_status.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
const CART_RESERVATIONS_FILE = path.join(DATA_DIR, 'cart_reservations.json');
const CUSTOMIZATION_CONFIG_FILE = path.join(DATA_DIR, 'customization_config.json');
const CART_INACTIVITY_MS = 60 * 1000; // 1 minute (60 seconds) inactivity timeout

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
    this.expenses = [];
    this.inventory = {};       // { menuItemId: { preparedQty, soldQty, reservedQty, manuallyDisabled, lastUpdatedAt, updatedBy } }
    this.stallStatus = {};     // { stallId: { isPaused, pausedAt, pauseReason, pauseUntil, pausedBy } }
    this.reviews = [];         // order reviews
    this.purchases = [];       // supplier purchases
    this.cartReservations = []; // [ { id, sessionId, menuItemId, quantity, createdAt, lastActiveAt } ]
    this.customizationConfig = null;

    this.loadPersistedData();
    if (this.orders.length === 0 && !this._ordersFileExisted) {
      this.initSeedData();
    }
    this._scheduleMidnightReset();
    // Auto-resume paused stalls when their timer expires
    const _autoResumeInterval = setInterval(() => {
      for (const stallId of Object.keys(this.stallStatus)) {
        if (this.stallStatus[stallId]?.isPaused) {
          this.getStallStatus(stallId); // triggers auto-expire check
        }
      }
    }, 30000);
    if (_autoResumeInterval && _autoResumeInterval.unref) _autoResumeInterval.unref();

    // Reliable background cleanup of expired cart reservations (1-minute inactivity timeout)
    const _cartCleanupInterval = setInterval(() => {
      this._purgeExpiredCartReservations();
    }, 2000);
    if (_cartCleanupInterval && _cartCleanupInterval.unref) _cartCleanupInterval.unref();
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
      if (fs.existsSync(EXPENSES_FILE)) {
        try {
          const rawExpenses = fs.readFileSync(EXPENSES_FILE, 'utf-8');
          const parsedExpenses = JSON.parse(rawExpenses);
          if (Array.isArray(parsedExpenses)) {
            this.expenses = parsedExpenses;
          }
        } catch (e) {
          console.error('Error loading expenses:', e);
          this.expenses = [];
        }
      }
      // Load inventory
      if (fs.existsSync(INVENTORY_FILE)) {
        try {
          const raw = fs.readFileSync(INVENTORY_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            this.inventory = parsed;
            // Sync isAvailable for items with inventory records
            for (const [menuItemId, inv] of Object.entries(this.inventory)) {
              const item = this.menuItems.find(m => m.id === menuItemId);
              if (!item) continue;
              if (inv.manuallyDisabled) {
                item.isAvailable = false;
              } else if (inv.preparedQty !== null && inv.preparedQty !== undefined) {
                const avail = Math.max(0, inv.preparedQty - (inv.soldQty || 0) - (inv.reservedQty || 0));
                item.isAvailable = avail > 0;
              }
            }
          }
        } catch (e) { console.error('Error loading inventory:', e); }
      }
      // Load stall status
      if (fs.existsSync(STALL_STATUS_FILE)) {
        try {
          const raw = fs.readFileSync(STALL_STATUS_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            this.stallStatus = parsed;
          }
        } catch (e) { console.error('Error loading stall status:', e); }
      }
      // Load reviews
      if (fs.existsSync(REVIEWS_FILE)) {
        try {
          const raw = fs.readFileSync(REVIEWS_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) this.reviews = parsed;
        } catch (e) { console.error('Error loading reviews:', e); }
      }
      // Load purchases
      if (fs.existsSync(PURCHASES_FILE)) {
        try {
          const raw = fs.readFileSync(PURCHASES_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) this.purchases = parsed;
        } catch (e) { console.error('Error loading purchases:', e); }
      }
      // Load cart reservations
      if (fs.existsSync(CART_RESERVATIONS_FILE)) {
        try {
          const raw = fs.readFileSync(CART_RESERVATIONS_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) this.cartReservations = parsed;
        } catch (e) { console.error('Error loading cart reservations:', e); }
      }
      this._purgeExpiredCartReservations();

      // Load or initialize customization config
      const defaultCustomizationConfig = {
        boba_pearls: [
          { id: "boba-no-extra", name: "No Extra Pearls", price: 0 },
          { id: "boba-regular", name: "Regular Pearls", price: 0 },
          { id: "extra-pearl", name: "Extra Pearls", price: 50 },
          { id: "boba-more-pearl", name: "More Pearls", price: 80 }
        ],
        pizza_toppings: [
          { id: "piz-top-cheese", name: "Extra Cheese", price: 60 },
          { id: "piz-top-chicken", name: "Chicken", price: 60 },
          { id: "piz-top-sausage", name: "Sausage", price: 50 },
          { id: "piz-top-beef", name: "Beef", price: 80 },
          { id: "piz-top-capsicum", name: "Capsicum", price: 30 },
          { id: "piz-top-onion", name: "Onion", price: 20 },
          { id: "piz-top-mushroom", name: "Mushroom", price: 40 },
          { id: "piz-top-olives", name: "Black Olives", price: 40 },
          { id: "piz-top-corn", name: "Sweet Corn", price: 30 },
          { id: "piz-top-jalapeno", name: "Jalapeño", price: 40 },
          { id: "piz-top-tomato", name: "Tomato", price: 20 }
        ],
        burger_patties: [
          { id: "bgr-pat-chicken", name: "Chicken Patty", price: 0 },
          { id: "bgr-pat-beef", name: "Beef Patty", price: 40 },
          { id: "bgr-pat-extra", name: "Extra Patty", price: 99 }
        ],
        burger_addons: [
          { id: "bgr-ado-cheese", name: "Extra Cheese Slice", price: 35 },
          { id: "bgr-ado-egg", name: "Fried Egg", price: 30 },
          { id: "bgr-ado-sausage", name: "Sausage", price: 40 },
          { id: "bgr-ado-chicken", name: "Extra Chicken", price: 60 },
          { id: "bgr-ado-beef", name: "Extra Beef", price: 80 },
          { id: "bgr-ado-lettuce", name: "Lettuce", price: 15 },
          { id: "bgr-ado-tomato", name: "Tomato", price: 15 },
          { id: "bgr-ado-onion", name: "Onion", price: 10 },
          { id: "bgr-ado-pickles", name: "Pickles", price: 20 },
          { id: "bgr-ado-jalapeno", name: "Jalapeño", price: 25 },
          { id: "bgr-ado-mayo", name: "Extra Mayo", price: 35 },
          { id: "bgr-ado-bbq", name: "BBQ Sauce", price: 20 },
          { id: "bgr-ado-special", name: "Special Sauce", price: 25 }
        ],
        waffle_toppings: [
          { id: "waf-top-vanilla-ice", name: "Vanilla Ice Cream", price: 60 },
          { id: "waf-top-choc-ice", name: "Chocolate Ice Cream", price: 60 },
          { id: "waf-top-straw-ice", name: "Strawberry Ice Cream", price: 60 },
          { id: "waf-top-nutella", name: "Nutella", price: 50 },
          { id: "waf-top-choc-syrup", name: "Chocolate Syrup", price: 30 },
          { id: "waf-top-caramel-syrup", name: "Caramel Syrup", price: 30 },
          { id: "waf-top-honey", name: "Honey", price: 30 },
          { id: "waf-top-whip-cream", name: "Whipped Cream", price: 40 },
          { id: "waf-top-oreo", name: "Oreo Crumbs", price: 30 },
          { id: "waf-top-brownie", name: "Brownie Pieces", price: 50 },
          { id: "waf-top-strawberry", name: "Strawberry", price: 40 },
          { id: "waf-top-banana", name: "Banana", price: 30 },
          { id: "waf-top-fruits", name: "Mixed Fruits", price: 50 },
          { id: "waf-top-nuts", name: "Chopped Nuts", price: 20 },
          { id: "waf-top-chips", name: "Chocolate Chips", price: 30 },
          { id: "waf-top-sprinkles", name: "Colour Sprinkles", price: 20 },
          { id: "waf-top-extra-portion", name: "Extra Waffle Portion", price: 80 }
        ]
      };

      if (fs.existsSync(CUSTOMIZATION_CONFIG_FILE)) {
        try {
          const rawCustom = fs.readFileSync(CUSTOMIZATION_CONFIG_FILE, 'utf-8');
          this.customizationConfig = JSON.parse(rawCustom);
        } catch (e) {
          console.error('Error loading customization config:', e);
          this.customizationConfig = defaultCustomizationConfig;
        }
      } else {
        this.customizationConfig = defaultCustomizationConfig;
        try {
          fs.writeFileSync(CUSTOMIZATION_CONFIG_FILE, JSON.stringify(defaultCustomizationConfig, null, 2));
        } catch (e) {}
      }
      this.applyCustomizationConfig();

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

          // Never re-issue a token/invoice that already exists after a restart.
          const maxToken = this.orders.reduce(
            (max, order) => Math.max(max, parseInt(order.token, 10) || 0),
            47
          );
          this.tokenCounter = Math.max(this.tokenCounter, maxToken + 1);
          const maxParcelToken = this.orders.reduce((max, order) => {
            const n = parseInt(String(order.parcelToken || '').replace(/^P/, ''), 10);
            return Number.isFinite(n) ? Math.max(max, n) : max;
          }, 0);
          this.parcelTokenCounter = Math.max(this.parcelTokenCounter, maxParcelToken + 1);
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
      fs.writeFileSync(EXPENSES_FILE, JSON.stringify(this.expenses, null, 2), 'utf-8');
      fs.writeFileSync(REVIEWS_FILE, JSON.stringify(this.reviews, null, 2), 'utf-8');
      fs.writeFileSync(PURCHASES_FILE, JSON.stringify(this.purchases, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving persisted data:', e);
    }
  }

  _saveInventory() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(INVENTORY_FILE, JSON.stringify(this.inventory, null, 2), 'utf-8');
    } catch (e) { console.error('Error saving inventory:', e); }
  }

  _saveStallStatus() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(STALL_STATUS_FILE, JSON.stringify(this.stallStatus, null, 2), 'utf-8');
    } catch (e) { console.error('Error saving stall status:', e); }
  }

  _saveCartReservations() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(CART_RESERVATIONS_FILE, JSON.stringify(this.cartReservations, null, 2), 'utf-8');
    } catch (e) { console.error('Error saving cart reservations:', e); }
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
    return this.stalls.map(s => ({ ...s, ...this.getStallStatus(s.id) }));
  }

  getStall(slugOrId) {
    const stall = this.stalls.find(s => s.slug === slugOrId || s.id === slugOrId);
    if (!stall) return null;
    return { ...stall, ...this.getStallStatus(stall.id) };
  }

  // --- Stall Pause / Resume ---
  getStallStatus(stallId) {
    const status = this.stallStatus[stallId];
    if (!status || !status.isPaused) return { isPaused: false };
    // Auto-expire paused stalls
    if (status.pauseUntil && new Date(status.pauseUntil) <= new Date()) {
      this.stallStatus[stallId] = { isPaused: false, pausedAt: null, pauseReason: '', pauseUntil: null, pausedBy: null };
      this._saveStallStatus();
      const stall = this.stalls.find(s => s.id === stallId);
      this.logAudit('STALL_RESUMED', `Stall "${stall?.name || stallId}" automatically resumed after pause period expired`, { stallId }, 'System');
      eventBus.broadcast('stall_updated', { stallId, stallName: stall?.name || stallId, isPaused: false });
      return { isPaused: false };
    }
    return status;
  }

  pauseStall(stallId, reason = '', durationMinutes = null, user = 'Manager') {
    const stall = this.stalls.find(s => s.id === stallId || s.slug === stallId);
    if (!stall) throw new Error('Stall not found');
    const pauseUntil = durationMinutes ? new Date(Date.now() + durationMinutes * 60000).toISOString() : null;
    this.stallStatus[stall.id] = {
      isPaused: true,
      pausedAt: new Date().toISOString(),
      pauseReason: reason || '',
      pauseUntil,
      pausedBy: user
    };
    this._saveStallStatus();
    this.logAudit('STALL_PAUSED', `Stall "${stall.name}" temporarily paused by ${user}. Reason: ${reason || 'Not specified'}. Duration: ${durationMinutes ? durationMinutes + ' min' : 'Manual resume'}`, { stallId: stall.id, reason, durationMinutes }, user);
    const payload = { stallId: stall.id, stallName: stall.name, ...this.stallStatus[stall.id] };
    eventBus.broadcast('stall_updated', payload);
    return { success: true, ...payload };
  }

  resumeStall(stallId, user = 'Manager') {
    const stall = this.stalls.find(s => s.id === stallId || s.slug === stallId);
    if (!stall) throw new Error('Stall not found');
    this.stallStatus[stall.id] = { isPaused: false, pausedAt: null, pauseReason: '', pauseUntil: null, pausedBy: null };
    this._saveStallStatus();
    this.logAudit('STALL_RESUMED', `Stall "${stall.name}" resumed by ${user}`, { stallId: stall.id }, user);
    eventBus.broadcast('stall_updated', { stallId: stall.id, stallName: stall.name, isPaused: false });
    return { success: true, stallId: stall.id, stallName: stall.name, isPaused: false };
  }

  applyCustomizationConfig() {
    if (!this.customizationConfig) return;
    const { boba_pearls, pizza_toppings, burger_patties, burger_addons, waffle_toppings } = this.customizationConfig;

    for (const item of this.menuItems) {
      if (['BOBA MILK TEA', 'SMOOTHIE', 'QQ JELLY', 'BOBA DRINK'].includes(item.category) && boba_pearls) {
        if (!item.isAddOn) {
          item.addOns = [...boba_pearls];
        }
      } else if (item.category === 'PIZZA' && pizza_toppings) {
        item.addOns = [...pizza_toppings];
      } else if (item.category === 'WAFFLE' && waffle_toppings) {
        item.addOns = [...waffle_toppings];
      }
    }
  }

  getCustomizationConfig() {
    return this.customizationConfig;
  }

  updateCustomizationPrice(categoryKey, addOnId, newPrice) {
    if (!this.customizationConfig || !this.customizationConfig[categoryKey]) {
      throw new Error(`Category "${categoryKey}" not found in customization config`);
    }
    const item = this.customizationConfig[categoryKey].find(a => a.id === addOnId);
    if (!item) {
      throw new Error(`Add-on "${addOnId}" not found`);
    }
    const priceNum = Math.max(0, parseInt(newPrice, 10) || 0);
    item.price = priceNum;
    try {
      fs.writeFileSync(CUSTOMIZATION_CONFIG_FILE, JSON.stringify(this.customizationConfig, null, 2));
    } catch (e) {
      console.error('Failed to write customization config:', e);
    }
    this.applyCustomizationConfig();
    return item;
  }

  _enrichMenuItem(item) {
    if (!item) return item;
    const available = this.getAvailableStock(item.id);
    const inv = this.inventory[item.id];
    return {
      ...item,
      available,
      inv: inv ? {
        preparedQty: inv.preparedQty,
        soldQty: inv.soldQty || 0,
        reservedQty: inv.reservedQty || 0,
        available,
        stockOut: (inv.preparedQty !== null && available === 0) || inv.manuallyDisabled,
        manuallyDisabled: inv.manuallyDisabled || false
      } : undefined
    };
  }

  getAllMenuItems(stallId = null, category = null, search = "") {
    this._purgeExpiredCartReservations();
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
    return items.map(i => this._enrichMenuItem(i));
  }

  getMenuItem(id) {
    const item = this.menuItems.find(i => i.id === id);
    return item ? this._enrichMenuItem(item) : null;
  }

  updateItemAvailability(id, isAvailable) {
    const item = this.menuItems.find(i => i.id === id);
    if (item) {
      item.isAvailable = isAvailable;
      this.logAudit("MENU_AVAILABILITY_CHANGED", `Item "${item.name}" availability set to ${isAvailable}`);
      eventBus.broadcast("menu_item_updated", this._enrichMenuItem(item));
    }
    return item ? this._enrichMenuItem(item) : null;
  }

  updateMenuItemPrice(id, newPrice) {
    const item = this.menuItems.find(i => i.id === id);
    if (item) {
      const old = item.price;
      item.price = Number(newPrice);
      this.logAudit("MENU_PRICE_CHANGED", `Price of "${item.name}" changed from ৳${old} to ৳${newPrice}`);
      eventBus.broadcast("menu_item_updated", this._enrichMenuItem(item));
    }
    return item ? this._enrichMenuItem(item) : null;
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
    customerOrderType = null,
    customerNotes = "",
    paymentMethod = null,
    couponCode = null,
    cartSessionId = null,
    guestCount = 0
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

    if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) {
      throw new Error("Cart must contain between 1 and 50 items.");
    }

    for (const raw of rawItems) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw) ||
          typeof raw.menuItemId !== "string" || raw.menuItemId.length > 100) {
        throw new Error("Each cart item must include a valid menu item ID.");
      }
      const quantity = raw.quantity === undefined ? 1 : raw.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        throw new Error("Item quantity must be a whole number between 1 and 99.");
      }
      const dbItem = this.getMenuItem(raw.menuItemId);
      if (!dbItem) {
        throw new Error(`Selected item (ID: ${raw.menuItemId}) not found in menu.`);
      }
      let weight = null;
      if (dbItem.isWeightBased) {
        weight = raw.weight === undefined || raw.weight === null ? 400 : raw.weight;
        if (!Number.isInteger(weight) || weight < 1 || weight > 10000) {
          throw new Error("Item weight must be a whole number between 1g and 10000g.");
        }
      }
      const inv = this.inventory[dbItem.id];
      if (inv?.manuallyDisabled) {
        throw new Error(`"${dbItem.name}" is currently unavailable. Please remove it from your tray.`);
      }
      if (dbItem.isAvailable === false) {
        if (inv && inv.preparedQty !== null && inv.preparedQty !== undefined) {
          const canOrder = this.getAvailableStock(dbItem.id, cartSessionId);
          if (canOrder < quantity) {
            const excess = quantity - canOrder;
            const portionWord = canOrder === 1 ? 'portion' : 'portions';
            const msg = canOrder > 0
              ? `Only ${canOrder} ${portionWord} available. Please reduce your quantity by ${excess}.`
              : `"${dbItem.name}" is currently out of stock (Stock Out). Please remove it from your tray.`;
            throw new Error(msg);
          }
        } else {
          throw new Error(`"${dbItem.name}" is currently out of stock (Stock Out). Please remove it from your tray.`);
        }
      }
      // Check stall pause status
      const stallPauseStatus = this.getStallStatus(dbItem.stallId);
      if (stallPauseStatus.isPaused) {
        const stallInfo = this.stalls.find(s => s.id === dbItem.stallId);
        throw new Error(`"${stallInfo?.name || dbItem.stallId}" is temporarily unavailable. Please remove its items from your tray or try again later.`);
      }

      let itemPrice = dbItem.price;

      // Handle variant pricing
      if (raw.variantId && dbItem.variants) {
        const variant = dbItem.variants.find(v => v.id === raw.variantId);
        if (variant) itemPrice = variant.price;
      }

      // Handle weight-based pricing (per 100g)
      if (dbItem.isWeightBased) {
        itemPrice = (dbItem.price / 100) * weight;
      }

      // Handle add-ons & customizations
      let addOnsTotal = 0;
      const matchedAddOns = [];
      if (raw.selectedAddOns && Array.isArray(raw.selectedAddOns)) {
        for (const addOnId of raw.selectedAddOns) {
          let matched = dbItem.addOns?.find(a => a.id === addOnId);
          if (!matched && this.customizationConfig) {
            for (const catList of Object.values(this.customizationConfig)) {
              if (Array.isArray(catList)) {
                matched = catList.find(a => a.id === addOnId);
                if (matched) break;
              }
            }
          }
          if (matched) {
            addOnsTotal += matched.price;
            matchedAddOns.push({
              id: matched.id,
              name: matched.name,
              price: matched.price
            });
          }
        }
      }

      const lineTotal = (itemPrice + addOnsTotal) * quantity;
      subtotal += lineTotal;

      const addOnDisplayNames = matchedAddOns.map(a => `${a.name}${a.price > 0 ? ` (+৳${a.price})` : ''}`);

      verifiedItems.push({
        id: "oli-" + randomUUID().slice(0, 8),
        menuItemId: dbItem.id,
        stallId: dbItem.stallId,
        name: dbItem.name,
        price: itemPrice + addOnsTotal,
        basePrice: dbItem.price,
        quantity,
        variantName: raw.variantName || null,
        weight,
        selectedAddOns: raw.selectedAddOns || [],
        addOnNames: addOnDisplayNames,
        customizations: matchedAddOns,
        notes: raw.notes || "",
        isUnavailable: false
      });
    }

    // --- Inventory reservation (atomic check-and-reserve, with cart reservation transfer) ---
    this._purgeExpiredCartReservations();
    const reservationsToApply = [];
    for (const item of verifiedItems) {
      const inv = this.inventory[item.menuItemId];
      if (inv && inv.preparedQty !== null && inv.preparedQty !== undefined) {
        // Maximum this session can order (accounting for its own cart hold, without double counting)
        const maxCanOrder = this.getAvailableStock(item.menuItemId, cartSessionId);

        if (maxCanOrder !== null && item.quantity > maxCanOrder) {
          const excess = item.quantity - maxCanOrder;
          const portionWord = maxCanOrder === 1 ? 'portion' : 'portions';
          const msg = maxCanOrder > 0
            ? `Only ${maxCanOrder} ${portionWord} available. Please reduce your quantity by ${excess}.`
            : `This item is out of stock. Please reduce your quantity by ${excess}.`;
          throw new Error(msg);
        }
        reservationsToApply.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity
        });
      }
    }

    // Atomically transfer: remove cart reservation and add to order reservedQty
    for (const res of reservationsToApply) {
      if (cartSessionId) {
        this.cartReservations = this.cartReservations.filter(r => !(r.sessionId === cartSessionId && r.menuItemId === res.menuItemId));
      }
      if (!this.inventory[res.menuItemId]) {
        this.inventory[res.menuItemId] = { preparedQty: null, soldQty: 0, reservedQty: 0, manuallyDisabled: false };
      }
      this.inventory[res.menuItemId].reservedQty = (this.inventory[res.menuItemId].reservedQty || 0) + res.quantity;
    }
    if (reservationsToApply.length > 0) {
      this._saveCartReservations();
      this._saveInventory();
      this._syncMenuItemsAvailability(reservationsToApply.map(r => r.menuItemId));
      eventBus.broadcast('inventory_updated', { transferred: reservationsToApply.map(r => r.menuItemId) });
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

    const isTakeaway = customerOrderType === "TAKEAWAY" || type === "PARCEL";
    const resolvedCustomerOrderType = isTakeaway ? "TAKEAWAY" : "DINE_IN";
    const resolvedType = isTakeaway ? "PARCEL" : "DINE_IN";
    const orderTypeExactLabel = isTakeaway
      ? "Takeaway → Carryout parcel box"
      : "Dine-in → Hall / Table dining";

    // Active session linkage
    let sessionId = null;
    if (!isTakeaway && tableId) {
      const session = this.openTableSession(tableId);
      sessionId = session.id;
      session.orderIds.push(orderId);
      this.updateTableStatus(tableId, "ACTIVE");
    }

    const order = {
      id: orderId,
      token: tokenNum,
      invoiceNo: String(88000 + Number(tokenNum)),
      guestCount: Number.isInteger(guestCount) && guestCount > 0 ? guestCount : 0,
      tableId: isTakeaway ? null : tableId,
      parcelToken: isTakeaway ? `P${(this.parcelTokenCounter++).toString().padStart(3, "0")}` : null,
      sessionId,
      type: resolvedType,
      status: "NEW", // Pipeline step 1: NEW / UNDER REVIEW
      paymentStatus: paymentMethod === "CASH" ? "PAYMENT DUE" : "UNPAID",
      paymentMethod,
      customerName,
      customerPhone,
      customerAddress,
      serviceType: isTableService ? "TABLE_SERVICE" : "SELF_SERVICE",
      customerOrderType: resolvedCustomerOrderType,
      orderTypeDescription: orderTypeExactLabel,
      customerNotes,
      createdAt: new Date().toISOString(),
      items: verifiedItems,
      stalls: stallOrders.map(s => ({
        ...s,
        orderType: resolvedCustomerOrderType,
        orderTypeDescription: orderTypeExactLabel,
        serviceType: isTableService ? "TABLE_SERVICE" : "SELF_SERVICE"
      })),
      subtotal,
      discount,
      tax,
      serviceCharge,
      grandTotal,
      kotGenerated: false,
      kotNumber: null,
      history: [
        { status: "NEW", time: new Date().toISOString(), note: `Customer submitted master order (${orderTypeExactLabel}).` }
      ]
    };

    this.orders.unshift(order);
    this.saveData();

    this.logAudit("ORDER_CREATED", `New master order Token #${tokenNum} (${order.serviceType}) for ${type === "DINE_IN" ? 'Table ' + tableId : 'Takeaway'} (৳${grandTotal})`, { orderId, token: tokenNum, serviceType: order.serviceType });
    
    // Broadcast real-time order arrival to Central Admin
    eventBus.broadcast("order_created", order);

    return order;
  }

  // --- Inventory helpers ---
  _releaseInventoryReservation(order) {
    // Release reserved stock without deducting (used on reject/cancel BEFORE deduction)
    let changed = false;
    for (const item of (order.items || [])) {
      const inv = this.inventory[item.menuItemId];
      if (!inv) continue;
      inv.reservedQty = Math.max(0, (inv.reservedQty || 0) - item.quantity);
      changed = true;
    }
    if (changed) {
      this._saveInventory();
      this._syncMenuItemsAvailability(order.items?.map(i => i.menuItemId));
      eventBus.broadcast('inventory_updated', { orderItems: order.items?.map(i => i.menuItemId) });
    }
  }

  _deductInventory(order) {
    // Move from reserved to sold (actual deduction at kitchen release)
    let changed = false;
    for (const item of (order.items || [])) {
      const inv = this.inventory[item.menuItemId];
      if (!inv || inv.preparedQty === null || inv.preparedQty === undefined) continue;
      inv.reservedQty = Math.max(0, (inv.reservedQty || 0) - item.quantity);
      inv.soldQty = (inv.soldQty || 0) + item.quantity;
      const available = Math.max(0, inv.preparedQty - (inv.soldQty || 0) - (inv.reservedQty || 0));
      const menuItem = this.menuItems.find(m => m.id === item.menuItemId);
      if (menuItem && !inv.manuallyDisabled) {
        menuItem.isAvailable = available > 0;
        if (!menuItem.isAvailable) {
          this.logAudit('STOCK_OUT', `"${menuItem.name}" is now Stock Out (${inv.soldQty} sold of ${inv.preparedQty} prepared)`, { menuItemId: item.menuItemId });
        }
      }
      changed = true;
    }
    if (changed) {
      this._saveInventory();
      this._syncMenuItemsAvailability(order.items?.map(i => i.menuItemId));
      eventBus.broadcast('inventory_updated', { orderItems: order.items?.map(i => i.menuItemId) });
    }
  }

  _reverseInventoryDeduction(order) {
    // Reverse a deduction (used for refunds)
    let changed = false;
    for (const item of (order.items || [])) {
      const inv = this.inventory[item.menuItemId];
      if (!inv || inv.preparedQty === null || inv.preparedQty === undefined) continue;
      inv.soldQty = Math.max(0, (inv.soldQty || 0) - item.quantity);
      changed = true;
    }
    if (changed) {
      this._saveInventory();
      this._syncMenuItemsAvailability(order.items?.map(i => i.menuItemId));
      eventBus.broadcast('inventory_updated', {});
    }
  }

  // Management Step 2: Accept or Reject Order
  acceptOrder(orderId, managerName = "Central Counter") {
    const order = this.getOrder(orderId);
    if (!order) return null;

    // Check every ordered food item's availability before acceptance
    const hasUnavailable = order.items.some(i => i.isUnavailable);
    if (hasUnavailable) {
      throw new Error("Cannot accept order: one or more items are unavailable. Guest must remove or replace them before acceptance.");
    }
    for (const item of order.items) {
      const dbItem = this.getMenuItem(item.menuItemId);
      const inv = this.inventory[item.menuItemId];
      if (inv?.manuallyDisabled || (dbItem && dbItem.isAvailable === false && (!inv || inv.preparedQty === null))) {
        throw new Error(`Cannot accept order: "${item.name}" is currently disabled/out of stock. Please mark it unavailable to notify guest.`);
      }
    }

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
    this.saveData();
    eventBus.broadcast("order_updated", order);
    return order;
  }

  rejectOrder(orderId, reason = "Kitchen overloaded", managerName = "Central Counter") {
    const order = this.getOrder(orderId);
    if (!order) return null;

    order.status = "CANCELLED";
    order.cancellationReason = reason;
    order.history.push({ status: "CANCELLED", time: new Date().toISOString(), note: `Rejected: ${reason}` });

    // Release inventory reservations when order is rejected
    this._releaseInventoryReservation(order);

    this.logAudit("ORDER_REJECTED", `Order #${order.token} rejected by ${managerName}: ${reason}`, { orderId });
    eventBus.broadcast("order_updated", order);
    eventBus.broadcast("revenue_updated", this.getRevenueSummary());
    eventBus.broadcast("financial_updated", this.getDailyFinancialSummary(order.paidAt ? getDhakaDateParts(new Date(order.paidAt)).dateStr : undefined));
    eventBus.broadcast("analytics_updated", this.getAnalyticsSummary());
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

    // Pipeline guard: Never mark an unpaid cash order as Paid & Released (PREPARING / READY / etc)
    if (["PREPARING", "READY", "OUT FOR DELIVERY", "DELIVERED", "COMPLETED"].includes(newStatus)) {
      if (order.paymentMethod === "CASH" && order.paymentStatus !== "PAID") {
        throw new Error("Cannot release or advance status: Cash payment is pending. Please confirm cash payment at Central Counter first.");
      }
      if (order.items.some(i => i.isUnavailable)) {
        throw new Error("Cannot release incomplete order: order contains unavailable food items.");
      }
    }

    const prevStatus = order.status;
    order.status = newStatus;
    const nowIso = new Date().toISOString();

    order.history.push({
      status: newStatus,
      time: nowIso,
      note: note || `Status updated from ${prevStatus} to ${newStatus} by ${staffName}.`
    });

    if (newStatus === "CANCELLED") {
      if (note) order.cancellationReason = note;
      if (order.paymentStatus !== "PAID") {
        this._releaseInventoryReservation(order);
      }
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
    if (newStatus === "CANCELLED" || prevStatus === "CANCELLED") {
      eventBus.broadcast("revenue_updated", this.getRevenueSummary());
      eventBus.broadcast("financial_updated", this.getDailyFinancialSummary(order.paidAt ? getDhakaDateParts(new Date(order.paidAt)).dateStr : undefined));
      eventBus.broadcast("analytics_updated", this.getAnalyticsSummary());
    }
    return order;
  }

  refundOrder(orderId, reason = "Customer refund", staffName = "Manager") {
    const order = this.getOrder(orderId);
    if (!order) return null;

    order.paymentStatus = "REFUNDED";
    order.status = "CANCELLED";
    order.history.push({
      status: "CANCELLED",
      time: new Date().toISOString(),
      note: `Payment refunded and order cancelled: ${reason} by ${staffName}.`
    });

    this.saveData();
    this.logAudit("ORDER_REFUNDED", `Order #${order.token} refunded (${order.grandTotal}) by ${staffName}: ${reason}`, { orderId });

    // Reverse inventory deduction for refunded orders
    this._reverseInventoryDeduction(order);

    eventBus.broadcast("order_updated", order);
    eventBus.broadcast("revenue_updated", this.getRevenueSummary());
    eventBus.broadcast("financial_updated", this.getDailyFinancialSummary(order.paidAt ? getDhakaDateParts(new Date(order.paidAt)).dateStr : undefined));
    eventBus.broadcast("analytics_updated", this.getAnalyticsSummary());
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

    const targetItem = order.items.find(i => i.id === itemId);
    const targetName = targetItem ? targetItem.name : "Item";

    if (targetItem) {
      const inv = this.inventory[targetItem.menuItemId];
      if (inv && (inv.reservedQty || 0) > 0) {
        inv.reservedQty = Math.max(0, (inv.reservedQty || 0) - (targetItem.quantity || 1));
        this._saveInventory();
        this._syncMenuItemsAvailability([targetItem.menuItemId]);
      }
    }

    order.items = order.items.filter(i => i.id !== itemId);
    // Also remove from stall sub-orders
    for (const stall of order.stalls) {
      stall.items = stall.items.filter(i => i.id !== itemId);
    }
    // Remove empty stalls
    order.stalls = order.stalls.filter(s => s.items.length > 0);

    this.recalculateOrderTotal(order);

    // If all items resolved, return to Hasan at Central Counter for recheck before acceptance
    const hasMoreUnavailable = order.items.some(i => i.isUnavailable);
    if (!hasMoreUnavailable) {
      order.status = "UNDER REVIEW";
      order.history.push({
        status: "UNDER REVIEW",
        time: new Date().toISOString(),
        note: `Guest removed "${targetName}". Awaiting counter recheck before acceptance.`
      });
    }

    this.logAudit("ORDER_MODIFIED", `Customer confirmed removal of unavailable item "${targetName}" in #${order.token}`);
    this.saveData();
    eventBus.broadcast("order_updated", order);
    return order;
  }

  // Customer selects replacement food item for an unavailable dish
  customerReplaceUnavailableItem(orderId, oldItemId, newMenuItemId, quantity = 1, notes = "") {
    const order = this.getOrder(orderId);
    if (!order) return null;

    const oldItem = order.items.find(i => i.id === oldItemId);
    if (!oldItem) return null;

    const newMenuItem = this.getMenuItem(newMenuItemId);
    if (!newMenuItem) {
      throw new Error("Selected replacement food item not found in menu.");
    }
    if (newMenuItem.isAvailable === false) {
      throw new Error(`"${newMenuItem.name}" is currently out of stock. Please choose another available food.`);
    }

    // Remove old item from order items
    order.items = order.items.filter(i => i.id !== oldItemId);
    for (const stall of order.stalls) {
      stall.items = stall.items.filter(i => i.id !== oldItemId);
    }

    // Add new replacement item
    const newItemId = "item-" + randomUUID().slice(0, 8);
    const replacementItem = {
      id: newItemId,
      menuItemId: newMenuItem.id,
      stallId: newMenuItem.stallId,
      name: newMenuItem.name,
      price: newMenuItem.price,
      basePrice: newMenuItem.price,
      quantity: quantity || oldItem.quantity || 1,
      variantName: null,
      weight: null,
      notes: notes || `Replacement for ${oldItem.name}`,
      isUnavailable: false
    };

    order.items.push(replacementItem);

    // Add to stall sub-order
    let stallSub = order.stalls.find(s => s.stallId === newMenuItem.stallId);
    if (stallSub) {
      stallSub.items.push({
        id: newItemId,
        menuItemId: newMenuItem.id,
        name: newMenuItem.name,
        price: newMenuItem.price,
        quantity: quantity || oldItem.quantity || 1,
        notes: notes || `Replacement for ${oldItem.name}`
      });
    } else {
      const stallData = this.getStall(newMenuItem.stallId);
      order.stalls.push({
        stallId: newMenuItem.stallId,
        stallName: stallData ? stallData.name : newMenuItem.stallId,
        status: "NEW",
        items: [{
          id: newItemId,
          menuItemId: newMenuItem.id,
          name: newMenuItem.name,
          price: newMenuItem.price,
          quantity: quantity || oldItem.quantity || 1,
          notes: notes || `Replacement for ${oldItem.name}`
        }]
      });
    }

    // Remove empty stalls
    order.stalls = order.stalls.filter(s => s.items.length > 0);
    this.recalculateOrderTotal(order);

    // Recheck the updated order before acceptance
    order.status = "UNDER REVIEW";
    order.history.push({
      status: "UNDER REVIEW",
      time: new Date().toISOString(),
      note: `Guest replaced unavailable "${oldItem.name}" with "${newMenuItem.name}". Awaiting counter recheck.`
    });

    this.logAudit("ORDER_ITEM_REPLACED", `Item "${oldItem.name}" replaced with "${newMenuItem.name}" in Order #${order.token}`);
    this.saveData();
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

    // Avoid duplicate payments or duplicate KOT generation
    if (order.paymentStatus === "PAID") {
      return order;
    }

    // Do not charge or release an incomplete order
    if (order.status === "ACTION REQUIRED" || order.items.some(i => i.isUnavailable)) {
      throw new Error("Cannot confirm payment: order contains unavailable food items. Incomplete orders cannot be charged or released.");
    }

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
    eventBus.broadcast("financial_updated", this.getDailyFinancialSummary());
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
    // Deduct inventory when order is released to kitchen
    this._deductInventory(order);
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
    const allStallsReady = order.stalls.every(s => s.status === "READY" || s.status === "NOTIFIED" || s.status === "COLLECTED" || s.status === "DELIVERED");
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

    const allStallsDelivered = order.stalls.every(s => s.status === "DELIVERED" || s.status === "COLLECTED");
    if (allStallsDelivered && order.status !== "DELIVERED" && order.status !== "COMPLETED") {
      order.status = "DELIVERED";
      if (order.tableId) this.updateTableStatus(order.tableId, "ACTIVE");
      order.history.push({
        status: "DELIVERED",
        time: nowIso,
        note: "All stall orders marked delivered/collected!"
      });
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

  // ========================================================
  // INVENTORY MANAGEMENT
  // ========================================================

  getInventoryItem(menuItemId) {
    return this.inventory[menuItemId] || { preparedQty: null, soldQty: 0, reservedQty: 0, manuallyDisabled: false, lastUpdatedAt: null, updatedBy: null };
  }

  getFullInventory(stallId = null) {
    this._purgeExpiredCartReservations();
    const items = stallId ? this.menuItems.filter(m => m.stallId === stallId) : [...this.menuItems];
    return items.map(item => {
      const inv = this.getInventoryItem(item.id);
      const preparedQty = inv.preparedQty;
      const soldQty = inv.soldQty || 0;
      const reservedQty = inv.reservedQty || 0;
      const cartReservedQty = this.cartReservations
        .filter(r => r.menuItemId === item.id)
        .reduce((sum, r) => sum + (r.quantity || 0), 0);
      const totalReserved = reservedQty + cartReservedQty;
      const available = preparedQty !== null ? Math.max(0, preparedQty - soldQty - totalReserved) : null;
      const stockOut = (preparedQty !== null && available === 0) || inv.manuallyDisabled;
      const stallData = this.stalls.find(s => s.id === item.stallId);
      return {
        ...item,
        stallName: stallData?.name || item.stallId,
        inv: {
          preparedQty,
          soldQty,
          reservedQty,
          cartReservedQty,
          available,
          stockOut,
          manuallyDisabled: inv.manuallyDisabled || false,
          lastUpdatedAt: inv.lastUpdatedAt,
          updatedBy: inv.updatedBy
        }
      };
    });
  }

  setItemStock(menuItemId, preparedQty, user = 'Chef') {
    const item = this.menuItems.find(m => m.id === menuItemId);
    if (!item) throw new Error('Menu item not found');
    const existing = this.inventory[menuItemId] || { manuallyDisabled: false };
    this.inventory[menuItemId] = {
      manuallyDisabled: existing.manuallyDisabled || false,
      preparedQty: Number(preparedQty),
      soldQty: 0,
      reservedQty: 0,
      lastUpdatedAt: new Date().toISOString(),
      updatedBy: user
    };
    // Clear any stale cart reservations for this item when stock is freshly set
    this.cartReservations = this.cartReservations.filter(r => r.menuItemId !== menuItemId);
    this._saveCartReservations();

    const inv = this.inventory[menuItemId];
    const available = Math.max(0, inv.preparedQty - (inv.soldQty || 0) - (inv.reservedQty || 0));
    if (!inv.manuallyDisabled) {
      item.isAvailable = available > 0 || inv.preparedQty === null;
      item.available = inv.preparedQty !== null ? available : null;
    }
    this._saveInventory();
    this.logAudit('STOCK_UPDATED', `Stock for "${item.name}" set to ${preparedQty} by ${user}. Available: ${available}`, { menuItemId, preparedQty, available }, user);
    eventBus.broadcast('inventory_updated', { menuItemId, stallId: item.stallId });
    eventBus.broadcast('menu_item_updated', this._enrichMenuItem(item));
    return this.getFullInventory().find(i => i.id === menuItemId);
  }

  setItemManualAvailability(menuItemId, isAvailable, user = 'Manager') {
    const item = this.menuItems.find(m => m.id === menuItemId);
    if (!item) throw new Error('Menu item not found');
    const existing = this.inventory[menuItemId] || { preparedQty: null, soldQty: 0, reservedQty: 0 };
    this.inventory[menuItemId] = {
      ...existing,
      manuallyDisabled: !isAvailable,
      lastUpdatedAt: new Date().toISOString(),
      updatedBy: user
    };
    item.isAvailable = isAvailable;
    item.available = isAvailable ? this.getAvailableStock(menuItemId) : 0;
    this._saveInventory();
    this.logAudit('MANUAL_AVAILABILITY', `"${item.name}" manually set to ${isAvailable ? 'Available' : 'Unavailable'} by ${user}`, { menuItemId, isAvailable }, user);
    eventBus.broadcast('inventory_updated', { menuItemId, stallId: item.stallId });
    eventBus.broadcast('menu_item_updated', this._enrichMenuItem(item));
    return this.getFullInventory().find(i => i.id === menuItemId);
  }

  resetItemStock(menuItemId, user = 'Manager') {
    const item = this.menuItems.find(m => m.id === menuItemId);
    delete this.inventory[menuItemId];
    this.cartReservations = this.cartReservations.filter(r => r.menuItemId !== menuItemId);
    this._saveCartReservations();
    if (item) {
      item.isAvailable = true;
      item.available = null;
    }
    this._saveInventory();
    this.logAudit('STOCK_RESET', `Stock for "${item?.name || menuItemId}" reset by ${user}`, { menuItemId }, user);
    eventBus.broadcast('inventory_updated', { menuItemId });
    if (item) eventBus.broadcast('menu_item_updated', this._enrichMenuItem(item));
    return { success: true };
  }

  // ========================================================
  // LIVE CART RESERVATIONS (ACROSS ALL PHONES)
  // ========================================================

  _purgeExpiredCartReservations() {
    if (!this.cartReservations || this.cartReservations.length === 0) return 0;
    const now = Date.now();
    const expired = [];
    const valid = [];
    for (const r of this.cartReservations) {
      const lastActive = new Date(r.lastActiveAt || r.createdAt || 0).getTime();
      if (now - lastActive > CART_INACTIVITY_MS) {
        expired.push(r);
      } else {
        valid.push(r);
      }
    }
    if (expired.length > 0) {
      this.cartReservations = valid;
      this._saveCartReservations();
      const affectedItemIds = [...new Set(expired.map(r => r.menuItemId))];
      this._syncMenuItemsAvailability(affectedItemIds);
      eventBus.broadcast('inventory_updated', { expired: affectedItemIds });
      return expired.length;
    }
    return 0;
  }

  _syncMenuItemsAvailability(menuItemIds = null) {
    const ids = menuItemIds ? (Array.isArray(menuItemIds) ? menuItemIds : [menuItemIds]) : Object.keys(this.inventory);
    for (const id of ids) {
      const item = this.menuItems.find(m => m.id === id);
      if (!item) continue;
      const inv = this.inventory[id];
      if (!inv) {
        const wasAvail = item.isAvailable;
        item.isAvailable = true;
        item.available = null;
        if (wasAvail !== true) {
          eventBus.broadcast('menu_item_updated', this._enrichMenuItem(item));
        }
        continue;
      }
      if (inv.manuallyDisabled) {
        const wasAvail = item.isAvailable;
        const prevAvail = item.available;
        item.isAvailable = false;
        item.available = 0;
        if (wasAvail !== false || prevAvail !== 0) {
          eventBus.broadcast('menu_item_updated', this._enrichMenuItem(item));
        }
        continue;
      }
      if (inv.preparedQty !== null && inv.preparedQty !== undefined) {
        const totalCartReserved = this.cartReservations
          .filter(r => r.menuItemId === id)
          .reduce((sum, r) => sum + (r.quantity || 0), 0);
        const available = Math.max(0, inv.preparedQty - (inv.soldQty || 0) - (inv.reservedQty || 0) - totalCartReserved);
        const wasAvailable = item.isAvailable;
        const prevAvailable = item.available;
        item.isAvailable = available > 0;
        item.available = available;
        if (wasAvailable !== item.isAvailable || prevAvailable !== available) {
          eventBus.broadcast('menu_item_updated', this._enrichMenuItem(item));
        }
      }
    }
  }

  getAvailableStock(menuItemId, forSessionId = null) {
    const inv = this.inventory[menuItemId];
    if (!inv) return null;
    if (inv.manuallyDisabled) return 0;
    if (inv.preparedQty === null || inv.preparedQty === undefined) return null;
    const preparedQty = inv.preparedQty;
    const soldQty = inv.soldQty || 0;
    const orderReserved = inv.reservedQty || 0;
    const otherCartReserved = this.cartReservations
      .filter(r => r.menuItemId === menuItemId && (forSessionId ? r.sessionId !== forSessionId : true))
      .reduce((sum, r) => sum + (r.quantity || 0), 0);
    return Math.max(0, preparedQty - soldQty - orderReserved - otherCartReserved);
  }

  reserveCartItem(sessionId, menuItemId, quantity) {
    if (!sessionId) throw new Error("Missing session ID for reservation");
    const item = this.menuItems.find(m => m.id === menuItemId);
    if (!item) throw new Error("Menu item not found");

    this._purgeExpiredCartReservations();
    const qty = Math.max(0, parseInt(quantity, 10) || 0);
    if (qty === 0) {
      return this.releaseCartItem(sessionId, menuItemId);
    }

    const inv = this.inventory[menuItemId];
    if (inv) {
      if (inv.manuallyDisabled) {
        throw new Error(`"${item.name}" is currently unavailable.`);
      }
      if (inv.preparedQty !== null && inv.preparedQty !== undefined) {
        const available = this.getAvailableStock(menuItemId, sessionId);
        if (available !== null && qty > available) {
          const excess = qty - available;
          const portionWord = available === 1 ? 'portion' : 'portions';
          const msg = available > 0
            ? `Only ${available} ${portionWord} available. Please reduce your quantity by ${excess}.`
            : `This item is out of stock. Please reduce your quantity by ${excess}.`;
          throw new Error(msg);
        }
      }
    }

    const now = new Date().toISOString();
    const existingIndex = this.cartReservations.findIndex(r => r.sessionId === sessionId && r.menuItemId === menuItemId);
    if (existingIndex >= 0) {
      this.cartReservations[existingIndex].quantity = qty;
      this.cartReservations[existingIndex].lastActiveAt = now;
    } else {
      this.cartReservations.push({
        id: 'cres-' + randomUUID(),
        sessionId,
        menuItemId,
        quantity: qty,
        createdAt: now,
        lastActiveAt: now
      });
    }

    this._saveCartReservations();
    this._syncMenuItemsAvailability([menuItemId]);
    eventBus.broadcast('inventory_updated', { menuItemId, sessionId });
    return { success: true, menuItemId, quantity: qty };
  }

  releaseCartItem(sessionId, menuItemId) {
    if (!sessionId || !menuItemId) return { success: true };
    const prevCount = this.cartReservations.length;
    this.cartReservations = this.cartReservations.filter(r => !(r.sessionId === sessionId && r.menuItemId === menuItemId));
    if (this.cartReservations.length !== prevCount) {
      this._saveCartReservations();
      this._syncMenuItemsAvailability([menuItemId]);
      eventBus.broadcast('inventory_updated', { menuItemId, sessionId });
    }
    return { success: true };
  }

  releaseCartSession(sessionId) {
    if (!sessionId) return { success: true };
    const sessionItems = this.cartReservations.filter(r => r.sessionId === sessionId).map(r => r.menuItemId);
    if (sessionItems.length > 0) {
      this.cartReservations = this.cartReservations.filter(r => r.sessionId !== sessionId);
      this._saveCartReservations();
      this._syncMenuItemsAvailability(sessionItems);
      eventBus.broadcast('inventory_updated', { sessionId, releasedItems: sessionItems });
    }
    return { success: true };
  }

  touchCartSession(sessionId) {
    if (!sessionId) return { success: true };
    const now = new Date().toISOString();
    let touched = false;
    for (const r of this.cartReservations) {
      if (r.sessionId === sessionId) {
        r.lastActiveAt = now;
        touched = true;
      }
    }
    if (touched) {
      this._saveCartReservations();
    }
    return { success: true };
  }

  getCartReservations(sessionId = null) {
    this._purgeExpiredCartReservations();
    if (sessionId) {
      return this.cartReservations.filter(r => r.sessionId === sessionId);
    }
    return [...this.cartReservations];
  }

  // ========================================================
  // ORDER REVIEWS
  // ========================================================

  submitReview({ orderId, rating, feedback }) {
    const order = this.getOrder(orderId);
    if (!order) throw new Error('Order not found');
    const isDelivered = order.status === 'DELIVERED' || order.status === 'COMPLETED' || (order.stalls && order.stalls.every(s => s.status === 'DELIVERED' || s.status === 'COLLECTED'));
    if (!isDelivered) {
      throw new Error('Reviews can only be submitted for delivered orders.');
    }
    const existing = this.reviews.find(r => r.orderId === orderId);
    if (existing) throw new Error('You have already submitted a review for this order.');
    if (!rating || Number(rating) < 1 || Number(rating) > 5) throw new Error('Please select a rating between 1 and 5 stars.');
    const review = {
      id: 'rev-' + randomUUID(),
      orderId,
      token: order.token,
      tableId: order.tableId,
      rating: Number(rating),
      feedback: (feedback || '').trim(),
      createdAt: new Date().toISOString(),
      orderTotal: order.grandTotal
    };
    this.reviews.unshift(review);
    this.saveData();
    this.logAudit('ORDER_REVIEWED', `Order #${order.token} rated ${rating}/5 stars`, { orderId, rating });
    eventBus.broadcast('review_submitted', review);
    return review;
  }

  getReviews({ orderId = null, limit = 100 } = {}) {
    let list = [...this.reviews];
    if (orderId) list = list.filter(r => r.orderId === orderId);
    return list.slice(0, limit);
  }

  getReviewForOrder(orderId) {
    return this.reviews.find(r => r.orderId === orderId) || null;
  }

  // ========================================================
  // PURCHASES (Due Purchases)
  // ========================================================

  addPurchase({ supplier, description, category, amount, date, status = 'UNPAID', createdBy = 'Manager' }) {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) throw new Error('Invalid purchase amount');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Purchase date is required (YYYY-MM-DD)');
    const purchase = {
      id: 'pur-' + randomUUID().slice(0, 10),
      supplier: supplier || '',
      description: description || '',
      category: category || 'Food Cost',
      amount: Math.round(Number(amount)),
      date,
      status: status || 'UNPAID',
      paidAt: null,
      createdBy,
      createdAt: new Date().toISOString()
    };
    this.purchases.push(purchase);
    this.saveData();
    this.logAudit('PURCHASE_ADDED', `Purchase from "${supplier}" for ৳${amount} added by ${createdBy}`, { purchaseId: purchase.id }, createdBy);
    return purchase;
  }

  updatePurchase(id, updates, user = 'Manager') {
    const purchase = this.purchases.find(p => p.id === id);
    if (!purchase) return null;
    Object.assign(purchase, updates, { updatedAt: new Date().toISOString(), updatedBy: user });
    if (updates.status === 'PAID' && !purchase.paidAt) purchase.paidAt = new Date().toISOString();
    this.saveData();
    this.logAudit('PURCHASE_UPDATED', `Purchase ${id} updated by ${user}`, { id }, user);
    return purchase;
  }

  deletePurchase(id, user = 'Manager') {
    const idx = this.purchases.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const [removed] = this.purchases.splice(idx, 1);
    this.saveData();
    this.logAudit('PURCHASE_DELETED', `Purchase ৳${removed.amount} deleted by ${user}`, { purchaseId: id }, user);
    return { success: true };
  }

  getPurchases({ dateFrom = null, dateTo = null, status = null } = {}) {
    let list = [...this.purchases];
    if (dateFrom) list = list.filter(p => p.date >= dateFrom);
    if (dateTo) list = list.filter(p => p.date <= dateTo);
    if (status) list = list.filter(p => p.status === status);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

  // ========================================================
  // ACCOUNTING QUERIES
  // ========================================================

  getAccountingLedger({ dateFrom = null, dateTo = null, type = null, search = '', limit = 300 } = {}) {
    const entries = [];
    for (const order of this.orders) {
      if (order.paymentStatus !== 'PAID' || order.status === 'CANCELLED') continue;
      const dateStr = getDhakaDateParts(new Date(order.paidAt || order.createdAt)).dateStr;
      if (dateFrom && dateStr < dateFrom) continue;
      if (dateTo && dateStr > dateTo) continue;
      entries.push({
        id: 'led-' + order.id,
        date: dateStr,
        refNo: `ORD-${order.token}`,
        type: 'Revenue',
        description: `Sales – Order #${order.token} (${order.paymentMethod || ''})`,
        debit: 0,
        credit: order.grandTotal,
        relatedId: order.id
      });
    }
    for (const expense of this.expenses) {
      if (dateFrom && expense.date < dateFrom) continue;
      if (dateTo && expense.date > dateTo) continue;
      entries.push({
        id: 'led-exp-' + expense.id,
        date: expense.date,
        refNo: `EXP-${expense.id.slice(-6).toUpperCase()}`,
        type: 'Expense',
        description: `${expense.category} – ${expense.notes || 'Operating Expense'}`,
        debit: expense.amount,
        credit: 0,
        relatedId: expense.id
      });
    }
    for (const p of this.purchases) {
      if (dateFrom && p.date < dateFrom) continue;
      if (dateTo && p.date > dateTo) continue;
      entries.push({
        id: 'led-pur-' + p.id,
        date: p.date,
        refNo: `PUR-${p.id.slice(-6).toUpperCase()}`,
        type: 'Purchase',
        description: `Purchase – ${p.supplier || 'Supplier'}: ${p.description || p.category}`,
        debit: p.amount,
        credit: 0,
        relatedId: p.id
      });
    }
    entries.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    let filtered = entries;
    if (type) filtered = filtered.filter(e => e.type === type);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(e => e.description.toLowerCase().includes(q) || e.refNo.toLowerCase().includes(q));
    }
    let balance = 0;
    const withBalance = [...filtered].reverse().map(e => {
      balance += e.credit - e.debit;
      return { ...e, balance };
    });
    withBalance.reverse();
    return withBalance.slice(0, limit);
  }

  getIncomeStatement({ dateFrom = null, dateTo = null } = {}) {
    const revenue = this.orders
      .filter(o => {
        if (o.paymentStatus !== 'PAID' || o.status === 'CANCELLED') return false;
        const dateStr = getDhakaDateParts(new Date(o.paidAt || o.createdAt)).dateStr;
        if (dateFrom && dateStr < dateFrom) return false;
        if (dateTo && dateStr > dateTo) return false;
        return true;
      })
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const expensesTotal = this.expenses
      .filter(e => (!dateFrom || e.date >= dateFrom) && (!dateTo || e.date <= dateTo))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const purchasesTotal = this.purchases
      .filter(p => (!dateFrom || p.date >= dateFrom) && (!dateTo || p.date <= dateTo))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const expenseByCategory = {};
    for (const e of this.expenses) {
      if (dateFrom && e.date < dateFrom) continue;
      if (dateTo && e.date > dateTo) continue;
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    }
    return { revenue, expensesTotal, purchasesTotal, totalCosts: expensesTotal + purchasesTotal, netProfit: revenue - expensesTotal - purchasesTotal, expenseByCategory, dateFrom, dateTo };
  }

  getTrialBalance({ dateFrom = null, dateTo = null } = {}) {
    const revenue = this.orders
      .filter(o => {
        if (o.paymentStatus !== 'PAID' || o.status === 'CANCELLED') return false;
        const d = getDhakaDateParts(new Date(o.paidAt || o.createdAt)).dateStr;
        return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      })
      .reduce((s, o) => s + o.grandTotal, 0);
    const expenses = this.expenses.filter(e => (!dateFrom || e.date >= dateFrom) && (!dateTo || e.date <= dateTo)).reduce((s, e) => s + e.amount, 0);
    const purchases = this.purchases.filter(p => (!dateFrom || p.date >= dateFrom) && (!dateTo || p.date <= dateTo)).reduce((s, p) => s + p.amount, 0);
    const netProfit = revenue - expenses - purchases;
    return {
      accounts: [
        { name: 'Cash / Bank (Revenue Received)', debit: revenue, credit: 0 },
        { name: 'Sales Revenue', debit: 0, credit: revenue },
        { name: 'Operating Expenses', debit: expenses, credit: 0 },
        { name: 'Purchases / COGS', debit: purchases, credit: 0 },
        netProfit >= 0
          ? { name: 'Retained Earnings (Net Profit)', debit: 0, credit: netProfit }
          : { name: 'Net Loss', debit: Math.abs(netProfit), credit: 0 }
      ].filter(a => a.debit > 0 || a.credit > 0),
      totalDebits: revenue + expenses + purchases + (netProfit < 0 ? Math.abs(netProfit) : 0),
      totalCredits: revenue + (netProfit >= 0 ? netProfit : 0),
      dateFrom, dateTo
    };
  }

  getBalanceSheet() {
    const totalRevenue = this.orders.filter(o => o.paymentStatus === 'PAID' && o.status !== 'CANCELLED').reduce((s, o) => s + o.grandTotal, 0);
    const totalExpenses = this.expenses.reduce((s, e) => s + e.amount, 0);
    const totalPurchases = this.purchases.reduce((s, p) => s + p.amount, 0);
    const unpaidPurchases = this.purchases.filter(p => p.status !== 'PAID').reduce((s, p) => s + p.amount, 0);
    const retainedEarnings = totalRevenue - totalExpenses - totalPurchases;
    return {
      assets: [{ name: 'Cash & Bank (from Sales)', amount: totalRevenue }],
      totalAssets: totalRevenue,
      liabilities: [{ name: 'Accounts Payable (Unpaid Purchases)', amount: unpaidPurchases }],
      totalLiabilities: unpaidPurchases,
      equity: [{ name: 'Retained Earnings', amount: retainedEarnings }],
      totalEquity: retainedEarnings,
      asOf: new Date().toISOString()
    };
  }

  getDueReceivables() {
    return this.orders
      .filter(o => o.status !== 'CANCELLED' && o.paymentStatus !== 'PAID')
      .map(o => ({
        orderId: o.id,
        token: o.token,
        tableId: o.tableId,
        customerName: o.customerName || 'Guest',
        customerPhone: o.customerPhone || '',
        orderType: o.type,
        serviceType: o.serviceType,
        grandTotal: o.grandTotal,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt
      }));
  }

  // ========================================================
  // EXPENSE MANAGEMENT
  // ========================================================

  addExpense({ amount, date, category, notes = '', createdBy = 'Manager' }) {
    const VALID_CATEGORIES = ['Food Cost', 'Labor', 'Utilities', 'Rent', 'Maintenance', 'Miscellaneous'];
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error('Expense amount must be a positive number.');
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Expense date must be in YYYY-MM-DD format.');
    }
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`Expense category must be one of: ${VALID_CATEGORIES.join(', ')}.`);
    }

    const nowIso = new Date().toISOString();
    const cleanAmount = Math.round(Number(amount));
    const cleanNotes = (notes || '').trim();

    const expense = {
      id: 'exp-' + randomUUID().slice(0, 10),
      amount: cleanAmount,
      date,
      category,
      notes: cleanNotes,
      createdBy,
      createdAt: nowIso,
      updatedAt: null,
      updatedBy: null,
      history: [
        {
          amount: cleanAmount,
          date,
          category,
          notes: cleanNotes,
          modifiedBy: createdBy,
          modifiedAt: nowIso,
          action: 'CREATED'
        }
      ]
    };

    this.expenses.push(expense);
    this.saveData();
    this.logAudit('EXPENSE_ADDED', `Expense of ৳${expense.amount} (${category}) added for ${date}`, { id: expense.id, amount: expense.amount }, createdBy);
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary(date));
    return expense;
  }

  updateExpense(id, { amount, date, category, notes }, updatedBy = 'Manager') {
    const expense = this.expenses.find(e => e.id === id);
    if (!expense) return null;

    const VALID_CATEGORIES = ['Food Cost', 'Labor', 'Utilities', 'Rent', 'Maintenance', 'Miscellaneous'];
    if (amount !== undefined) {
      if (isNaN(Number(amount)) || Number(amount) <= 0) throw new Error('Expense amount must be a positive number.');
    }
    if (date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Expense date must be in YYYY-MM-DD format.');
    }
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category)) throw new Error(`Invalid category.`);
    }

    if (!Array.isArray(expense.history)) {
      expense.history = [
        {
          amount: expense.amount,
          date: expense.date,
          category: expense.category,
          notes: expense.notes,
          modifiedBy: expense.createdBy || 'Manager',
          modifiedAt: expense.createdAt || new Date().toISOString(),
          action: 'CREATED'
        }
      ];
    }

    const previousDate = expense.date;
    if (amount !== undefined) expense.amount = Math.round(Number(amount));
    if (date !== undefined) expense.date = date;
    if (category !== undefined) expense.category = category;
    if (notes !== undefined) expense.notes = (notes || '').trim();

    const nowIso = new Date().toISOString();
    expense.updatedAt = nowIso;
    expense.updatedBy = updatedBy;

    // Record revision in history for audit & correction review
    expense.history.push({
      amount: expense.amount,
      date: expense.date,
      category: expense.category,
      notes: expense.notes,
      modifiedBy: updatedBy,
      modifiedAt: nowIso,
      action: 'CORRECTION'
    });

    this.saveData();
    this.logAudit('EXPENSE_UPDATED', `Expense ${id} updated to ৳${expense.amount} (${expense.category})`, { id }, updatedBy);
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary(expense.date));
    if (previousDate !== expense.date) {
      eventBus.broadcast('financial_updated', this.getDailyFinancialSummary(previousDate));
    }
    return expense;
  }

  deleteExpense(id, deletedBy = 'Manager') {
    const idx = this.expenses.findIndex(e => e.id === id);
    if (idx === -1) return null;
    const [removed] = this.expenses.splice(idx, 1);
    this.saveData();
    this.logAudit('EXPENSE_DELETED', `Expense ${id} (৳${removed.amount}) deleted`, { id }, deletedBy);
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary(removed.date));
    return { success: true, id };
  }

  getExpenses({ date, dateFrom, dateTo } = {}) {
    let results = [...this.expenses];
    if (date) results = results.filter(e => e.date === date);
    else if (dateFrom || dateTo) {
      results = results.filter(e => {
        if (dateFrom && e.date < dateFrom) return false;
        if (dateTo && e.date > dateTo) return false;
        return true;
      });
    }
    return results.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  getDailyFinancialSummary(dateStr) {
    if (!dateStr) {
      dateStr = getDhakaDateParts(new Date()).dateStr;
    }

    // Daily reset cutoff if viewing today
    const todayStr = getDhakaDateParts(new Date()).dateStr;
    let dailyResetCutoff = 0;
    if (dateStr === todayStr) {
      const dailyResets = this.revenueResets
        .filter(r => (r.date === dateStr) && (r.type === 'daily' || !r.type))
        .sort((a, b) => new Date(b.resetAt).getTime() - new Date(a.resetAt).getTime());
      const latestDailyReset = dailyResets[0] || null;
      if (latestDailyReset) {
        dailyResetCutoff = new Date(latestDailyReset.resetAt).getTime();
      }
    }

    // Revenue from actual eligible paid orders (avoid duplicate counting, exclude unpaid/pending/cancelled)
    const dayOrders = this.orders.filter(o => {
      if (o.paymentStatus !== 'PAID' || o.status === 'CANCELLED') return false;
      const paidDateTimestamp = o.paidAt || o.createdAt;
      if (!paidDateTimestamp) return false;
      const orderPaidMs = new Date(paidDateTimestamp).getTime();
      const orderParts = getDhakaDateParts(new Date(orderPaidMs));
      if (orderParts.dateStr !== dateStr) return false;
      if (dailyResetCutoff > 0 && orderPaidMs <= dailyResetCutoff) return false;
      return true;
    });
    const revenue = dayOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

    // Expenses on that date
    const dayExpenses = this.expenses.filter(e => e.date === dateStr);
    const expenses = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return {
      date: dateStr,
      revenue,
      expenses,
      profit: revenue - expenses,
      revenueOrders: dayOrders.length,
      expenseCount: dayExpenses.length
    };
  }

  getFinancialGraph(params = 7) {
    let days = null;
    let dateFrom = null;
    let dateTo = null;

    if (typeof params === 'number') {
      days = params;
    } else if (params && typeof params === 'object') {
      days = params.days ? parseInt(params.days, 10) : null;
      dateFrom = params.dateFrom || null;
      dateTo = params.dateTo || null;
    }

    const results = [];

    if (dateFrom && dateTo) {
      if (dateFrom > dateTo) {
        const tmp = dateFrom;
        dateFrom = dateTo;
        dateTo = tmp;
      }
      let curr = new Date(dateFrom + 'T00:00:00Z');
      const end = new Date(dateTo + 'T00:00:00Z');
      let safetyCount = 0;
      while (curr <= end && safetyCount < 366) {
        const dateStr = curr.toISOString().slice(0, 10);
        results.push(this.getDailyFinancialSummary(dateStr));
        curr.setUTCDate(curr.getUTCDate() + 1);
        safetyCount++;
      }
    } else {
      if (!days || isNaN(days) || days <= 0) days = 7;
      days = Math.min(366, days);

      const todayDhaka = getDhakaDateParts(new Date()).dateStr;
      const baseDate = new Date(todayDhaka + 'T00:00:00Z');
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(baseDate.getTime() - i * 86400000);
        const dateStr = d.toISOString().slice(0, 10);
        results.push(this.getDailyFinancialSummary(dateStr));
      }
    }

    return results;
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
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary());
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
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary());
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
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary());
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
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary());
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
