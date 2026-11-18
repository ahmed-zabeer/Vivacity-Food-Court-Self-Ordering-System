import { stallsData, menuItemsData, tablesData, usersData } from './menuData.js';
import { eventBus } from './events.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JournalEngine } from './accounting/journalEngine.js';
import { SalesReportsEngine } from './accounting/salesReports.js';
import { ExpenseReportsEngine } from './accounting/expenseReports.js';
import { PurchaseReportsEngine } from './accounting/purchaseReports.js';
import { InventoryReportsEngine } from './accounting/inventoryReports.js';
import { DailyClosingEngine } from './accounting/dailyClosing.js';
import { BusinessIntelligenceEngine } from './accounting/biInsights.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : (process.env.VERCEL ? path.join('/tmp', 'vivacity_data') : path.join(__dirname, 'data'));
const RESETS_FILE = path.join(DATA_DIR, 'revenue_resets.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const STALL_STATUS_FILE = path.join(DATA_DIR, 'stall_status.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
const CART_RESERVATIONS_FILE = path.join(DATA_DIR, 'cart_reservations.json');
const CUSTOMIZATION_CONFIG_FILE = path.join(DATA_DIR, 'customization_config.json');
const MOVEMENTS_FILE = path.join(DATA_DIR, 'inventory_movements.json');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');
const CASH_RECONCILIATION_FILE = path.join(DATA_DIR, 'cash_reconciliation.json');
const VOID_REQUESTS_FILE = path.join(DATA_DIR, 'void_requests.json');
const RESET_HISTORY_FILE = path.join(DATA_DIR, 'reset_history.json');
const ARCHIVED_ORDERS_FILE = path.join(DATA_DIR, 'archived_orders.json');
const ARCHIVED_VOID_REQUESTS_FILE = path.join(DATA_DIR, 'archived_void_requests.json');
const REMOVED_WASTAGE_FILE = path.join(DATA_DIR, 'removed_wastage.json');
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
      qrBaseUrl: process.env.APP_BASE_URL || 'https://vivacityfoodcourt.vercel.app'
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
    this.inventoryMovements = [];
    this.recipes = {};
    this.cashReconciliations = [];
    this.voidRequests = [];
    this.archivedVoidRequests = [];
    this.resetHistory = [];
    this.archivedOrders = [];
    this.removedWastage = [];

    this.journalEngine = new JournalEngine(this);
    this.salesReports = new SalesReportsEngine(this);
    this.expenseReports = new ExpenseReportsEngine(this);
    this.purchaseReports = new PurchaseReportsEngine(this);
    this.inventoryReports = new InventoryReportsEngine(this);
    this.dailyClosing = new DailyClosingEngine(this);
    this.biInsights = new BusinessIntelligenceEngine(this);

    this.loadPersistedData();
    this.syncTablesWithOrders();
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

      // Load inventory movements
      if (fs.existsSync(MOVEMENTS_FILE)) {
        try {
          const raw = fs.readFileSync(MOVEMENTS_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) this.inventoryMovements = parsed;
        } catch (e) { console.error('Error loading inventory movements:', e); }
      }

      // Load recipes
      if (fs.existsSync(RECIPES_FILE)) {
        try {
          const raw = fs.readFileSync(RECIPES_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') this.recipes = parsed;
        } catch (e) { console.error('Error loading recipes:', e); }
      }

      // Load cash reconciliations
      if (fs.existsSync(CASH_RECONCILIATION_FILE)) {
        try {
          const raw = fs.readFileSync(CASH_RECONCILIATION_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) this.cashReconciliations = parsed;
        } catch (e) { console.error('Error loading cash reconciliations:', e); }
      }

      // Load void requests
      if (fs.existsSync(VOID_REQUESTS_FILE)) {
        try {
          const rawVoid = fs.readFileSync(VOID_REQUESTS_FILE, 'utf-8');
          const parsed = JSON.parse(rawVoid);
          if (Array.isArray(parsed)) this.voidRequests = parsed;
        } catch (e) {
          console.error('Error loading void requests:', e);
          this.voidRequests = [];
        }
      }

      // Load reset history
      if (fs.existsSync(RESET_HISTORY_FILE)) {
        try {
          const raw = fs.readFileSync(RESET_HISTORY_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) this.resetHistory = parsed;
        } catch (e) { this.resetHistory = []; }
      }

      // Load archived orders
      if (fs.existsSync(ARCHIVED_ORDERS_FILE)) {
        try {
          const raw = fs.readFileSync(ARCHIVED_ORDERS_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) this.archivedOrders = parsed;
        } catch (e) { this.archivedOrders = []; }
      }

      // Load archived void requests
      if (fs.existsSync(ARCHIVED_VOID_REQUESTS_FILE)) {
        try {
          const raw = fs.readFileSync(ARCHIVED_VOID_REQUESTS_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) this.archivedVoidRequests = parsed;
        } catch (e) { this.archivedVoidRequests = []; }
      }

      // Load removed wastage
      if (fs.existsSync(REMOVED_WASTAGE_FILE)) {
        try {
          const raw = fs.readFileSync(REMOVED_WASTAGE_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) this.removedWastage = parsed;
        } catch (e) { this.removedWastage = []; }
      }

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
      fs.writeFileSync(MOVEMENTS_FILE, JSON.stringify(this.inventoryMovements, null, 2), 'utf-8');
      fs.writeFileSync(CASH_RECONCILIATION_FILE, JSON.stringify(this.cashReconciliations, null, 2), 'utf-8');
      fs.writeFileSync(VOID_REQUESTS_FILE, JSON.stringify(this.voidRequests, null, 2), 'utf-8');
      fs.writeFileSync(RESET_HISTORY_FILE, JSON.stringify(this.resetHistory, null, 2), 'utf-8');
      fs.writeFileSync(ARCHIVED_ORDERS_FILE, JSON.stringify(this.archivedOrders, null, 2), 'utf-8');
      fs.writeFileSync(ARCHIVED_VOID_REQUESTS_FILE, JSON.stringify(this.archivedVoidRequests, null, 2), 'utf-8');
      fs.writeFileSync(REMOVED_WASTAGE_FILE, JSON.stringify(this.removedWastage, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving persisted data:', e);
    }
  }

  _saveResetHistory() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(RESET_HISTORY_FILE, JSON.stringify(this.resetHistory, null, 2), 'utf-8');
    } catch (e) { console.error('Error saving reset history:', e); }
  }

  _saveArchivedOrders() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(ARCHIVED_ORDERS_FILE, JSON.stringify(this.archivedOrders, null, 2), 'utf-8');
    } catch (e) { console.error('Error saving archived orders:', e); }
  }

  _saveArchivedVoidRequests() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(ARCHIVED_VOID_REQUESTS_FILE, JSON.stringify(this.archivedVoidRequests, null, 2), 'utf-8');
    } catch (e) { console.error('Error saving archived void requests:', e); }
  }

  _saveRemovedWastage() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(REMOVED_WASTAGE_FILE, JSON.stringify(this.removedWastage, null, 2), 'utf-8');
    } catch (e) { console.error('Error saving removed wastage:', e); }
  }

  _saveMovements() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(MOVEMENTS_FILE, JSON.stringify(this.inventoryMovements, null, 2), 'utf-8');
    } catch (e) { console.error('Error saving movements:', e); }
  }

  _saveCashReconciliations() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(CASH_RECONCILIATION_FILE, JSON.stringify(this.cashReconciliations, null, 2), 'utf-8');
    } catch (e) { console.error('Error saving cash reconciliations:', e); }
  }

  _saveRecipes() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(RECIPES_FILE, JSON.stringify(this.recipes, null, 2), 'utf-8');
    } catch (e) { console.error('Error saving recipes:', e); }
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

  syncTablesWithOrders() {
    const activeOrderMap = new Map();
    const todayStr = getDhakaDateParts(new Date()).dateStr;
    const tableSpentToday = new Map();

    for (const order of (this.orders || [])) {
      if (!order.tableId) continue;
      const tId = String(order.tableId).trim().toUpperCase();
      const orderDate = order.paidAt ? getDhakaDateParts(new Date(order.paidAt)).dateStr : (order.createdAt ? getDhakaDateParts(new Date(order.createdAt)).dateStr : todayStr);
      
      if (orderDate === todayStr && order.paymentStatus === 'PAID' && order.status !== 'CANCELLED' && order.status !== 'VOIDED') {
        tableSpentToday.set(tId, (tableSpentToday.get(tId) || 0) + (Number(order.grandTotal) || 0));
      }

      if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && order.status !== 'VOIDED') {
        if (!activeOrderMap.has(tId)) {
          activeOrderMap.set(tId, order);
        }
      }
    }

    for (const table of (this.tables || [])) {
      const activeOrder = activeOrderMap.get(table.id.toUpperCase());
      table.totalSpentToday = tableSpentToday.get(table.id.toUpperCase()) || 0;
      if (activeOrder) {
        table.activeOrderToken = activeOrder.token;
        table.currentSessionId = activeOrder.sessionId || table.currentSessionId || `sess-${table.id.toLowerCase()}`;
        if (activeOrder.paymentStatus === 'PAYMENT DUE' || activeOrder.status === 'PAYMENT DUE') {
          table.status = 'PAYMENT DUE';
        } else if (activeOrder.status === 'READY') {
          table.status = 'READY';
        } else if (activeOrder.status === 'PREPARING') {
          table.status = 'PREPARING';
        } else {
          table.status = 'ACTIVE';
        }
      } else {
        table.status = 'AVAILABLE';
        table.currentSessionId = null;
        table.activeOrderToken = null;
      }
    }
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
    guestCount = 0,
    clientId = null,
    orderSource = "QR_CODE",
    cashierName = null,
    cashierId = null,
    discountType = "NONE",
    discountPercent = 0,
    discountAmount = 0,
    discountReason = null,
    discountAppliedBy = null,
    discountApprovedBy = null,
    cashReceived = null,
    changeReturned = null,
    cardPosRef = null,
    cardPosStatus = null,
    cardPosTerminal = null,
    autoConfirmPayment = false
  }) {
    const invalidOrder = message => Object.assign(new Error(message), { statusCode: 400 });

    if (!serviceType || (serviceType !== "SELF_SERVICE" && serviceType !== "TABLE_SERVICE")) {
      throw invalidOrder("Please select Self-Service or Table Service to continue.");
    }

    const validPaymentMethods = [
      "bKash",
      "Nagad",
      "Online Card",
      "Card / Physical POS Terminal",
      "NFC / Contactless",
      "CASH"
    ];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      throw invalidOrder("Please select a payment method to continue.");
    }

    // Generate sequential customer token
    const tokenNum = (this.tokenCounter++).toString().padStart(4, "0");
    const orderId = "ord-" + randomUUID();

    // Verify items & compute server-side prices (Never trust client prices)
    const verifiedItems = [];
    let subtotal = 0;

    if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) {
      throw invalidOrder("Cart must contain between 1 and 50 items.");
    }

    for (const raw of rawItems) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw) ||
          typeof raw.menuItemId !== "string" || raw.menuItemId.length > 100) {
        throw invalidOrder("Each cart item must include a valid menu item ID.");
      }
      const quantity = raw.quantity === undefined ? 1 : raw.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        throw invalidOrder("Item quantity must be a whole number between 1 and 99.");
      }
      const dbItem = this.getMenuItem(raw.menuItemId);
      if (!dbItem) {
        throw invalidOrder(`Selected item (ID: ${raw.menuItemId}) not found in menu.`);
      }
      let weight = null;
      if (dbItem.isWeightBased) {
        weight = raw.weight === undefined || raw.weight === null ? 400 : raw.weight;
        if (!Number.isInteger(weight) || weight < 1 || weight > 10000) {
          throw invalidOrder("Item weight must be a whole number between 1g and 10000g.");
        }
      }
      const inv = this.inventory[dbItem.id];
      if (inv?.manuallyDisabled) {
        throw invalidOrder(`"${dbItem.name}" is currently unavailable. Please remove it from your tray.`);
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
            throw invalidOrder(msg);
          }
        } else {
          throw invalidOrder(`"${dbItem.name}" is currently out of stock (Stock Out). Please remove it from your tray.`);
        }
      }
      // Check stall pause status
      const stallPauseStatus = this.getStallStatus(dbItem.stallId);
      if (stallPauseStatus.isPaused) {
        const stallInfo = this.stalls.find(s => s.id === dbItem.stallId);
        throw invalidOrder(`"${stallInfo?.name || dbItem.stallId}" is temporarily unavailable. Please remove its items from your tray or try again later.`);
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
          throw invalidOrder(msg);
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
    } else if (discountPercent > 0) {
      discount = Math.round((subtotal * Math.min(100, Math.max(0, discountPercent))) / 100);
    } else if (discountAmount > 0) {
      discount = Math.min(subtotal, Math.max(0, Math.round(discountAmount)));
    }

    const resolvedDiscountPercent = discountPercent > 0
      ? discountPercent
      : (discount > 0 && subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0);

    const isManual = orderSource === "MANUAL_COUNTER";

    // Cash calculation validation
    let resolvedCashReceived = null;
    let resolvedChangeReturned = null;
    if (paymentMethod === "CASH" && cashReceived !== null && cashReceived !== undefined) {
      resolvedCashReceived = Number(cashReceived);
      if (resolvedCashReceived < (subtotal - discount + (serviceType === "TABLE_SERVICE" ? Math.round(subtotal * 0.05) : 0) + (this.settings.taxEnabled ? Math.round(subtotal * this.settings.taxRate) : 0))) {
        const netDue = (subtotal - discount + (serviceType === "TABLE_SERVICE" ? Math.round(subtotal * 0.05) : 0) + (this.settings.taxEnabled ? Math.round(subtotal * this.settings.taxRate) : 0)) - resolvedCashReceived;
        throw invalidOrder(`Cash received (৳${resolvedCashReceived}) is less than net payable total. Remaining due: ৳${netDue}.`);
      }
      resolvedChangeReturned = Math.max(0, resolvedCashReceived - (subtotal - discount + (serviceType === "TABLE_SERVICE" ? Math.round(subtotal * 0.05) : 0) + (this.settings.taxEnabled ? Math.round(subtotal * this.settings.taxRate) : 0)));
    }

    // Physical POS Card Terminal validation
    if (paymentMethod === "Card / Physical POS Terminal") {
      if (autoConfirmPayment && cardPosStatus !== "APPROVED") {
        throw invalidOrder("Physical POS Terminal card payment must be processed and marked APPROVED on the terminal before confirming.");
      }
      if (autoConfirmPayment && (!cardPosRef || !String(cardPosRef).trim())) {
        throw invalidOrder("Physical POS Terminal Approval/Transaction Reference is required for card payments.");
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
      ? "Takeaway"
      : "Dine-in";

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
      clientId: clientId || cartSessionId || null,
      token: tokenNum,
      invoiceNo: String(88000 + Number(tokenNum)),
      guestCount: Number.isInteger(guestCount) && guestCount > 0 ? guestCount : 0,
      tableId: isTakeaway ? null : tableId,
      parcelToken: isTakeaway ? `P${(this.parcelTokenCounter++).toString().padStart(3, "0")}` : null,
      sessionId,
      type: resolvedType,
      orderSource: isManual ? "MANUAL_COUNTER" : "QR_CODE",
      cashierName: cashierName || null,
      cashierId: cashierId || null,
      status: autoConfirmPayment ? "PREPARING" : "NEW",
      paymentStatus: autoConfirmPayment ? "PAID" : (paymentMethod === "CASH" ? "PAYMENT DUE" : "UNPAID"),
      paymentMethod,
      customerName: customerName || (isManual ? "Counter Guest" : ""),
      customerPhone: customerPhone || "",
      customerAddress,
      serviceType: isTableService ? "TABLE_SERVICE" : "SELF_SERVICE",
      customerOrderType: resolvedCustomerOrderType,
      orderTypeDescription: orderTypeExactLabel,
      customerNotes,
      createdAt: new Date().toISOString(),
      paidAt: autoConfirmPayment ? new Date().toISOString() : null,
      transactionId: cardPosRef || (autoConfirmPayment ? `TXN-POS-${tokenNum}` : null),
      cardPosRef: cardPosRef || null,
      cardPosStatus: cardPosStatus || null,
      cardPosTerminal: cardPosTerminal || null,
      cashReceived: resolvedCashReceived,
      changeReturned: resolvedChangeReturned,
      returnedAmount: resolvedChangeReturned || 0,
      discountPercent: resolvedDiscountPercent,
      discountReason: discountReason || (couponCode ? `Coupon ${couponCode}` : (discount > 0 ? 'Manual Counter Discount' : null)),
      discountAppliedBy: discountAppliedBy || cashierName || null,
      discountApprovedBy: discountApprovedBy || null,
      items: verifiedItems,
      stalls: stallOrders.map(s => ({
        ...s,
        status: autoConfirmPayment ? "PREPARING" : "NEW",
        prepStartedAt: autoConfirmPayment ? new Date().toISOString() : null,
        orderType: resolvedCustomerOrderType,
        orderTypeDescription: orderTypeExactLabel,
        serviceType: isTableService ? "TABLE_SERVICE" : "SELF_SERVICE"
      })),
      subtotal,
      discount,
      tax,
      serviceCharge,
      grandTotal,
      kotGenerated: autoConfirmPayment,
      kotNumber: autoConfirmPayment ? `KOT-${tokenNum}` : null,
      kotGeneratedAt: autoConfirmPayment ? new Date().toISOString() : null,
      history: [
        { status: "NEW", time: new Date().toISOString(), note: `${isManual ? 'Cashier placed counter order' : 'Customer submitted master order'} (${orderTypeExactLabel}).` }
      ]
    };

    if (autoConfirmPayment) {
      order.history.push({
        status: "PAID",
        time: new Date().toISOString(),
        note: `Paid via ${paymentMethod} at Central Counter by ${cashierName || 'Cashier'}.${resolvedChangeReturned !== null ? ` Cash: ৳${resolvedCashReceived}, Change: ৳${resolvedChangeReturned}.` : ''}`
      });
      order.history.push({
        status: "PREPARING",
        time: new Date().toISOString(),
        note: `KOT ${order.kotNumber} generated. Order released to stall kitchens.`
      });
      if (order.tableId) {
        this.updateTableStatus(order.tableId, "PREPARING");
      }
    }

    this.orders.unshift(order);

    if (autoConfirmPayment) {
      this._deductInventory(order);
    }
    this.saveData();

    this.logAudit("ORDER_CREATED", `New master order Token #${tokenNum} (${order.serviceType}) for ${type === "DINE_IN" ? 'Table ' + tableId : 'Takeaway'} (৳${grandTotal}) [${order.orderSource}]`, { orderId, token: tokenNum, serviceType: order.serviceType, orderSource: order.orderSource });
    
    // Broadcast real-time order arrival to Central Admin
    eventBus.broadcast("order_created", order);
    if (autoConfirmPayment) {
      eventBus.broadcast("kot_generated", order);
      eventBus.broadcast("revenue_updated", this.getRevenueSummary());
      eventBus.broadcast("financial_updated", this.getDailyFinancialSummary());
      eventBus.broadcast("analytics_updated", this.getAnalyticsSummary());
    }

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

  recordStockMovement(mov) {
    if (!this.inventoryMovements) this.inventoryMovements = [];
    const dateParts = getDhakaDateParts(new Date());
    const fullMovement = {
      id: 'mov-' + randomUUID().slice(0, 10),
      timestamp: new Date().toISOString(),
      date: mov.date || dateParts.dateStr,
      menuItemId: mov.menuItemId,
      itemName: mov.itemName || 'Inventory Item',
      stallId: mov.stallId || null,
      unit: mov.unit || 'portion',
      movementType: mov.movementType, // 'SALES_CONSUMPTION' | 'PURCHASE_RECEIPT' | 'WASTAGE' | 'DAMAGE' | 'ADJUSTMENT' | 'SUPPLIER_RETURN'
      quantityIn: Number(mov.quantityIn) || 0,
      quantityOut: Number(mov.quantityOut) || 0,
      previousBalance: Number(mov.previousBalance) || 0,
      newBalance: Number(mov.newBalance) || 0,
      unitCost: Number(mov.unitCost) || 0,
      totalValue: Number(mov.totalValue) || 0,
      refNo: mov.refNo || '',
      user: mov.user || 'System',
      notes: mov.notes || ''
    };
    this.inventoryMovements.unshift(fullMovement);
    if (this.inventoryMovements.length > 2000) this.inventoryMovements.pop();
    this._saveMovements();
    return fullMovement;
  }

  getRecipe(menuItemId) {
    return this.recipes?.[menuItemId] || null;
  }

  _deductInventory(order) {
    // Move from reserved to sold (actual deduction at kitchen release)
    let changed = false;
    for (const item of (order.items || [])) {
      const inv = this.inventory[item.menuItemId];
      if (!inv || inv.preparedQty === null || inv.preparedQty === undefined) continue;
      
      const prevBal = Math.max(0, inv.preparedQty - (inv.soldQty || 0));
      inv.reservedQty = Math.max(0, (inv.reservedQty || 0) - item.quantity);
      inv.soldQty = (inv.soldQty || 0) + item.quantity;
      const newBal = Math.max(0, inv.preparedQty - (inv.soldQty || 0));
      const available = Math.max(0, newBal - (inv.reservedQty || 0));

      const menuItem = this.menuItems.find(m => m.id === item.menuItemId);
      if (menuItem && !inv.manuallyDisabled) {
        menuItem.isAvailable = available > 0;
        if (!menuItem.isAvailable) {
          this.logAudit('STOCK_OUT', `"${menuItem.name}" is now Stock Out (${inv.soldQty} sold of ${inv.preparedQty} prepared)`, { menuItemId: item.menuItemId });
        }
      }

      this.recordStockMovement({
        menuItemId: item.menuItemId,
        itemName: item.name,
        stallId: item.stallId,
        unit: menuItem?.unit || 'portion',
        movementType: 'SALES_CONSUMPTION',
        quantityIn: 0,
        quantityOut: item.quantity,
        previousBalance: prevBal,
        newBalance: newBal,
        unitCost: Number(inv.unitCost) || Math.round((Number(item.price) || 100) * 0.45),
        totalValue: (item.quantity) * (Number(inv.unitCost) || Math.round((Number(item.price) || 100) * 0.45)),
        refNo: `ORD-${order.token}`,
        user: order.confirmedBy || 'Central Counter',
        notes: `Order #${order.token} kitchen release`
      });

      changed = true;
    }
    if (changed) {
      this._saveInventory();
      this._syncMenuItemsAvailability(order.items?.map(i => i.menuItemId));
      eventBus.broadcast('inventory_updated', { orderItems: order.items?.map(i => i.menuItemId) });
    }
  }

  _reverseInventoryDeduction(order) {
    // Reverse a deduction (used for refunds) - Idempotency guard: prevent duplicate reversals
    if (order._inventoryReversed) return;
    order._inventoryReversed = true;
    let changed = false;
    for (const item of (order.items || [])) {
      const inv = this.inventory[item.menuItemId];
      if (!inv || inv.preparedQty === null || inv.preparedQty === undefined) continue;
      
      const prevBal = Math.max(0, inv.preparedQty - (inv.soldQty || 0));
      inv.soldQty = Math.max(0, (inv.soldQty || 0) - item.quantity);
      const newBal = Math.max(0, inv.preparedQty - (inv.soldQty || 0));

      this.recordStockMovement({
        menuItemId: item.menuItemId,
        itemName: item.name,
        stallId: item.stallId,
        movementType: 'SUPPLIER_RETURN',
        quantityIn: item.quantity,
        quantityOut: 0,
        previousBalance: prevBal,
        newBalance: newBal,
        refNo: `REF-${order.token}`,
        user: 'Manager',
        notes: `Refund cancellation return for Order #${order.token}`
      });

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

  // =========================================================================
  // --- Manager-Approved Void & Order Cancellation System ---
  // =========================================================================
  createVoidRequest({
    orderId,
    requestType,
    reason,
    cashierId = 'usr-cashier',
    cashierName = 'Counter Cashier',
    cashierRole = 'CASHIER',
    requestDetails = {}
  }) {
    const order = this.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'CANCELLED') {
      throw new Error('Order is already cancelled');
    }

    const validTypes = ['FULL_CANCELLATION', 'ITEM_CANCELLATION', 'QUANTITY_CORRECTION', 'ORDER_MODIFICATION'];
    if (!validTypes.includes(requestType)) {
      throw new Error(`Invalid void request type: ${requestType}`);
    }

    if (!reason || reason.trim().length < 3) {
      throw new Error('A detailed reason for the void/cancellation request is required.');
    }

    // Check for existing pending void request on this order
    const existingPending = this.voidRequests.find(v => v.orderId === orderId && v.status === 'PENDING');
    if (existingPending) {
      throw new Error(`A ${existingPending.requestType} request is already pending manager approval for this order (Token #${order.token}).`);
    }

    // Calculate proposed financial and item impacts
    let newSubtotal = order.subtotal;
    let newGrandTotal = order.grandTotal;
    let differenceAmount = 0;
    let refundRequired = false;
    let refundAmount = 0;

    if (requestType === 'FULL_CANCELLATION') {
      newSubtotal = 0;
      newGrandTotal = 0;
      differenceAmount = order.grandTotal;
      if (order.paymentStatus === 'PAID') {
        refundRequired = true;
        refundAmount = order.grandTotal;
      }
    } else if (requestType === 'ITEM_CANCELLATION') {
      const itemsToRemove = requestDetails.itemsToRemove || [];
      if (!Array.isArray(itemsToRemove) || itemsToRemove.length === 0) {
        throw new Error('Please select at least one item to cancel.');
      }
      const removalPrice = itemsToRemove.reduce((sum, it) => sum + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);
      newSubtotal = Math.max(0, order.subtotal - removalPrice);
      const isTableService = order.serviceType === 'TABLE_SERVICE';
      const waiterCharge = isTableService ? Math.round(newSubtotal * 0.05) : 0;
      newGrandTotal = Math.max(0, newSubtotal - (order.discount || 0) + waiterCharge);
      differenceAmount = Math.max(0, order.grandTotal - newGrandTotal);
      if (order.paymentStatus === 'PAID' && differenceAmount > 0) {
        refundRequired = true;
        refundAmount = differenceAmount;
      }
    } else if (requestType === 'QUANTITY_CORRECTION') {
      const corrections = requestDetails.corrections || requestDetails.correctedItems || [];
      if (!Array.isArray(corrections) || corrections.length === 0) {
        throw new Error('Please provide at least one quantity correction.');
      }
      let subtotalAdjustment = 0;
      for (const corr of corrections) {
        const item = (order.items || []).find(it => it.menuItemId === corr.menuItemId || it.id === corr.id);
        if (!item) continue;
        const oldQty = Number(corr.oldQuantity ?? corr.originalQuantity ?? item.quantity);
        const newQty = Number(corr.newQuantity ?? corr.requestedQuantity);
        if (isNaN(newQty) || newQty < 0) {
          throw new Error(`Invalid new quantity ${corr.newQuantity ?? corr.requestedQuantity} for ${item.name}`);
        }
        if (newQty > oldQty) {
          throw new Error('Quantity correction can only decrease quantity. If customer wants more items, place a new additional order.');
        }
        const unitPrice = Number(item.price) || Number(corr.unitPrice ?? corr.price) || 0;
        const diffQty = oldQty - newQty;
        subtotalAdjustment += diffQty * unitPrice;
      }
      newSubtotal = Math.max(0, order.subtotal - subtotalAdjustment);
      const isTableService = order.serviceType === 'TABLE_SERVICE';
      const waiterCharge = isTableService ? Math.round(newSubtotal * 0.05) : 0;
      newGrandTotal = Math.max(0, newSubtotal - (order.discount || 0) + waiterCharge);
      differenceAmount = Math.max(0, order.grandTotal - newGrandTotal);
      if (order.paymentStatus === 'PAID' && differenceAmount > 0) {
        refundRequired = true;
        refundAmount = differenceAmount;
      }
    } else if (requestType === 'ORDER_MODIFICATION') {
      newSubtotal = order.subtotal;
      newGrandTotal = order.grandTotal;
    }

    const proposedImpact = {
      newSubtotal,
      newGrandTotal,
      differenceAmount,
      refundRequired,
      refundAmount
    };

    const voidRequest = {
      id: 'void-' + randomUUID(),
      orderId: order.id,
      invoiceNo: order.invoiceNo || order.token,
      token: order.token,
      tableId: order.tableId || null,
      orderType: order.customerOrderType || (order.type === 'PARCEL' ? 'TAKEAWAY' : 'DINE_IN'),
      requestType,
      status: 'PENDING',
      reason: reason.trim(),
      cashierId,
      cashierName,
      cashierRole,
      requestedAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      resolverId: null,
      resolverRole: null,
      resolutionReason: null,
      originalSnapshot: {
        items: JSON.parse(JSON.stringify(order.items || [])),
        subtotal: order.subtotal,
        discount: order.discount || 0,
        tax: order.tax || 0,
        serviceCharge: order.serviceCharge || 0,
        grandTotal: order.grandTotal,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        orderStatus: order.status,
        kotGenerated: Boolean(order.kotGenerated),
        kotNumber: order.kotNumber || null,
        stalls: JSON.parse(JSON.stringify(order.stalls || []))
      },
      requestDetails,
      proposedImpact,
      executionResult: null
    };

    this.voidRequests.unshift(voidRequest);

    // Update order state without altering original items or totals (Safety rule)
    order.voidStatus = 'PENDING';
    order.pendingVoidRequestId = voidRequest.id;
    if (!Array.isArray(order.voidHistory)) order.voidHistory = [];
    order.voidHistory.push(voidRequest.id);

    order.history.push({
      status: order.status,
      time: new Date().toISOString(),
      note: `[Void Request Submitted] ${requestType} requested by Cashier ${cashierName} (${cashierRole}). Reason: ${reason} (Awaiting Manager Approval)`
    });

    this.saveData();

    this.logAudit(
      'VOID_REQUEST_CREATED',
      `Void Request ${voidRequest.id} (${requestType}) submitted by ${cashierName} for Order #${order.token} (Table ${order.tableId || 'Takeaway'}). Reason: ${reason}`,
      {
        voidRequestId: voidRequest.id,
        orderId: order.id,
        token: order.token,
        requestType,
        reason,
        cashierName,
        proposedImpact
      },
      cashierName
    );

    // Real-time broadcast: alerts Manager and Chief Administrator
    eventBus.broadcast('void_request_created', voidRequest);
    eventBus.broadcast('order_updated', order);

    return voidRequest;
  }

  getVoidRequests({ status, orderId } = {}) {
    let list = [...this.voidRequests];
    if (status && status !== 'ALL') {
      list = list.filter(v => v.status === status);
    }
    if (orderId) {
      list = list.filter(v => v.orderId === orderId);
    }
    return list;
  }

  getVoidRequest(id) {
    return this.voidRequests.find(v => v.id === id) || null;
  }

  approveVoidRequest(id, { resolverId = 'usr-admin', resolverName = 'Manager', resolverRole = 'MANAGER', approvalNote = '' } = {}) {
    const authorizedRoles = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
    if (!authorizedRoles.includes(resolverRole)) {
      throw new Error(`Unauthorized: Role "${resolverRole}" does not have manager/chief administrator void approval authority.`);
    }

    const voidReq = this.getVoidRequest(id);
    if (!voidReq) {
      throw new Error('Void request not found');
    }

    if (voidReq.status !== 'PENDING') {
      throw new Error(`Void request is already ${voidReq.status} and cannot be processed again.`);
    }

    const order = this.getOrder(voidReq.orderId);
    if (!order) {
      throw new Error('Order associated with this void request not found');
    }

    const nowIso = new Date().toISOString();
    let refundRecorded = false;
    let refundAmount = 0;
    let refundTransactionId = null;
    let inventoryRestored = false;
    const inventoryItemsAdjusted = [];
    const stallsNotified = [];

    // --- 1. FULL CANCELLATION EXECUTION ---
    if (voidReq.requestType === 'FULL_CANCELLATION') {
      order.status = 'CANCELLED';
      order.cancellationReason = `Approved Void Request: ${voidReq.reason} (Approved by ${resolverName} [${resolverRole}])`;

      // Update stall sub-orders
      for (const stall of (order.stalls || [])) {
        stall.status = 'CANCELLED';
        stallsNotified.push(stall.stallId);
      }

      // Financial handling: If already paid, issue refund
      if (order.paymentStatus === 'PAID') {
        refundAmount = order.grandTotal;
        refundRecorded = true;
        refundTransactionId = `REF-${Date.now().toString().slice(-6)}`;
        order.paymentStatus = 'REFUNDED';
        order.refundDetails = {
          refundedAmount: refundAmount,
          refundAmount,
          refundedAt: nowIso,
          refundedBy: resolverName,
          reason: voidReq.reason,
          paymentMethod: order.paymentMethod,
          transactionId: refundTransactionId
        };
      } else {
        order.paymentStatus = 'CANCELLED';
      }

      // Inventory handling:
      if (order.paymentStatus === 'REFUNDED') {
        this._reverseInventoryDeduction(order);
        inventoryRestored = true;
        for (const it of (order.items || [])) {
          inventoryItemsAdjusted.push({ menuItemId: it.menuItemId, qtyRestored: it.quantity });
        }
      } else {
        this._releaseInventoryReservation(order);
        inventoryRestored = true;
      }

      // KOT & Kitchen Notification
      if (order.kotGenerated) {
        eventBus.broadcast('stall_order_voided', {
          orderId: order.id,
          token: order.token,
          tableId: order.tableId,
          reason: voidReq.reason,
          approvedBy: resolverName
        });
      }

      order.history.push({
        status: 'CANCELLED',
        time: nowIso,
        note: `[Void Approved] Full Order Cancellation approved by ${resolverName} (${resolverRole}). Reason: ${voidReq.reason}. ${refundRecorded ? `Refund ৳${refundAmount} recorded.` : ''}`
      });
    }

    // --- 2. QUANTITY CORRECTION EXECUTION ---
    else if (voidReq.requestType === 'QUANTITY_CORRECTION') {
      const corrections = voidReq.requestDetails.corrections || voidReq.requestDetails.correctedItems || [];
      const originalGrandTotal = order.grandTotal;

      for (const corr of corrections) {
        const item = (order.items || []).find(it => it.menuItemId === corr.menuItemId || it.id === corr.id);
        if (!item) continue;
        const oldQty = Number(item.quantity);
        const newQty = Number(corr.newQuantity ?? corr.requestedQuantity);
        const diffQty = Math.max(0, oldQty - newQty);
        item.quantity = newQty;

        // Also adjust stall sub-order item
        for (const stall of (order.stalls || [])) {
          const stallItem = (stall.items || []).find(it => it.menuItemId === corr.menuItemId || it.id === corr.id);
          if (stallItem) {
            stallItem.quantity = newQty;
            stallsNotified.push(stall.stallId);
          }
        }

        // Adjust inventory exactly once
        if (diffQty > 0) {
          const inv = this.inventory[item.menuItemId];
          if (inv) {
            if (order.paymentStatus === 'PAID') {
              inv.soldQty = Math.max(0, (inv.soldQty || 0) - diffQty);
            } else {
              inv.reservedQty = Math.max(0, (inv.reservedQty || 0) - diffQty);
            }
          }
          inventoryItemsAdjusted.push({ menuItemId: item.menuItemId, qtyRestored: diffQty });
          inventoryRestored = true;

          this.recordStockMovement({
            menuItemId: item.menuItemId,
            itemName: item.name,
            stallId: item.stallId,
            movementType: 'SUPPLIER_RETURN',
            quantityIn: diffQty,
            quantityOut: 0,
            previousBalance: inv ? Math.max(0, inv.preparedQty - (inv.soldQty || 0) - diffQty) : 0,
            newBalance: inv ? Math.max(0, inv.preparedQty - (inv.soldQty || 0)) : 0,
            refNo: `VOID-CORR-${order.token}`,
            user: resolverName,
            notes: `Void qty correction Order #${order.token} by ${resolverName} (${resolverRole})`
          });
        }
      }

      // Recompute subtotal, waiter service charge, and grand total
      const newSubtotal = order.items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
      const isTableService = order.serviceType === 'TABLE_SERVICE';
      const waiterCharge = isTableService ? Math.round(newSubtotal * 0.05) : 0;
      const newGrandTotal = Math.max(0, newSubtotal - (order.discount || 0) + waiterCharge);
      const diffAmount = Math.max(0, originalGrandTotal - newGrandTotal);

      order.subtotal = newSubtotal;
      order.serviceCharge = waiterCharge;
      order.grandTotal = newGrandTotal;

      if (order.paymentStatus === 'PAID' && diffAmount > 0) {
        refundAmount = diffAmount;
        refundRecorded = true;
        refundTransactionId = `PARTIAL-REF-${Date.now().toString().slice(-6)}`;
        if (!Array.isArray(order.refunds)) order.refunds = [];
        order.refunds.push({
          refundAmount,
          refundedAt: nowIso,
          refundedBy: resolverName,
          reason: `Quantity correction: ${voidReq.reason}`,
          paymentMethod: order.paymentMethod,
          transactionId: refundTransactionId
        });
        order.refundDetails = {
          refundedAmount: order.refunds.reduce((s, r) => s + (r.refundAmount || 0), 0),
          refundedAt: nowIso,
          refundedBy: resolverName,
          reason: `Quantity correction: ${voidReq.reason}`,
          voidRequestId: voidReq.id
        };
        order.paymentStatus = 'PARTIALLY_REFUNDED';
      }

      eventBus.broadcast('stall_order_modified', {
        orderId: order.id,
        token: order.token,
        tableId: order.tableId,
        corrections,
        newGrandTotal,
        approvedBy: resolverName
      });

      order.history.push({
        status: order.status,
        time: nowIso,
        note: `[Void Approved] Quantity correction approved by ${resolverName} (${resolverRole}). New Total: ৳${newGrandTotal}. ${refundRecorded ? `Refund ৳${refundAmount} due to customer.` : ''}`
      });
    }

    // --- 3. ITEM CANCELLATION EXECUTION ---
    else if (voidReq.requestType === 'ITEM_CANCELLATION') {
      const itemsToRemove = voidReq.requestDetails.itemsToRemove || [];
      const originalGrandTotal = order.grandTotal;
      const removeIds = new Set(itemsToRemove.map(it => it.menuItemId || it.id));

      for (const it of itemsToRemove) {
        const inv = this.inventory[it.menuItemId];
        const qtyToRestore = Number(it.quantity) || 1;
        if (inv) {
          if (order.paymentStatus === 'PAID') {
            inv.soldQty = Math.max(0, (inv.soldQty || 0) - qtyToRestore);
          } else {
            inv.reservedQty = Math.max(0, (inv.reservedQty || 0) - qtyToRestore);
          }
        }
        inventoryItemsAdjusted.push({ menuItemId: it.menuItemId, qtyRestored: qtyToRestore });
        inventoryRestored = true;

        this.recordStockMovement({
          menuItemId: it.menuItemId,
          itemName: it.name || 'Voided Dish',
          stallId: it.stallId,
          movementType: 'SUPPLIER_RETURN',
          quantityIn: qtyToRestore,
          quantityOut: 0,
          previousBalance: inv ? Math.max(0, inv.preparedQty - (inv.soldQty || 0) - qtyToRestore) : 0,
          newBalance: inv ? Math.max(0, inv.preparedQty - (inv.soldQty || 0)) : 0,
          refNo: `VOID-ITEM-${order.token}`,
          user: resolverName,
          notes: `Item voided Order #${order.token} by ${resolverName} (${resolverRole})`
        });
      }

      order.items = (order.items || []).filter(it => !removeIds.has(it.menuItemId) && !removeIds.has(it.id));

      for (const stall of (order.stalls || [])) {
        stall.items = (stall.items || []).filter(it => !removeIds.has(it.menuItemId) && !removeIds.has(it.id));
        stallsNotified.push(stall.stallId);
      }

      const newSubtotal = order.items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
      const isTableService = order.serviceType === 'TABLE_SERVICE';
      const waiterCharge = isTableService ? Math.round(newSubtotal * 0.05) : 0;
      const newGrandTotal = Math.max(0, newSubtotal - (order.discount || 0) + waiterCharge);
      const diffAmount = Math.max(0, originalGrandTotal - newGrandTotal);

      order.subtotal = newSubtotal;
      order.serviceCharge = waiterCharge;
      order.grandTotal = newGrandTotal;

      if (order.paymentStatus === 'PAID' && diffAmount > 0) {
        refundAmount = diffAmount;
        refundRecorded = true;
        refundTransactionId = `PARTIAL-REF-${Date.now().toString().slice(-6)}`;
        if (!Array.isArray(order.refunds)) order.refunds = [];
        order.refunds.push({
          refundAmount,
          refundedAt: nowIso,
          refundedBy: resolverName,
          reason: `Item cancellation: ${voidReq.reason}`,
          paymentMethod: order.paymentMethod,
          transactionId: refundTransactionId
        });
      }

      order.history.push({
        status: order.status,
        time: nowIso,
        note: `[Void Approved] Item cancellation approved by ${resolverName} (${resolverRole}). New Total: ৳${newGrandTotal}. ${refundRecorded ? `Refund ৳${refundAmount} due to customer.` : ''}`
      });
    }

    // --- 4. ORDER MODIFICATION EXECUTION ---
    else if (voidReq.requestType === 'ORDER_MODIFICATION') {
      if (voidReq.requestDetails.notes) {
        order.customerNotes = voidReq.requestDetails.notes;
      }
      order.history.push({
        status: order.status,
        time: nowIso,
        note: `[Void Approved] Order modification approved by ${resolverName} (${resolverRole}).`
      });
    }

    // Finalize void request state
    voidReq.status = 'APPROVED';
    voidReq.resolvedAt = nowIso;
    voidReq.resolvedBy = resolverName;
    voidReq.resolverId = resolverId;
    voidReq.resolverRole = resolverRole;
    voidReq.resolutionReason = approvalNote || 'Approved by Manager';
    voidReq.executionResult = {
      executedAt: nowIso,
      executedBy: resolverName,
      refundRecorded,
      refundAmount,
      refundTransactionId,
      inventoryRestored,
      inventoryItemsAdjusted,
      stallsNotified: Array.from(new Set(stallsNotified))
    };

    order.voidStatus = 'APPROVED';
    order.pendingVoidRequestId = null;

    this.saveData();

    this.logAudit(
      'VOID_REQUEST_APPROVED',
      `Void Request ${voidReq.id} (${voidReq.requestType}) APPROVED by ${resolverName} (${resolverRole}) for Order #${order.token}. ${refundRecorded ? `Refund: ৳${refundAmount}.` : ''} Note: ${approvalNote || 'None'}`,
      {
        voidRequestId: voidReq.id,
        orderId: order.id,
        token: order.token,
        requestType: voidReq.requestType,
        resolverName,
        resolverRole,
        approvalNote,
        executionResult: voidReq.executionResult
      },
      resolverName
    );

    eventBus.broadcast('void_request_approved', voidReq);
    eventBus.broadcast('order_updated', order);
    eventBus.broadcast('revenue_updated', this.getRevenueSummary());
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary(order.paidAt ? getDhakaDateParts(new Date(order.paidAt)).dateStr : undefined));
    eventBus.broadcast('inventory_updated', { orderItems: order.items?.map(i => i.menuItemId) || [] });
    eventBus.broadcast('analytics_updated', this.getAnalyticsSummary());

    return {
      success: true,
      voidRequest: voidReq,
      order
    };
  }

  rejectVoidRequest(id, { resolverId = 'usr-admin', resolverName = 'Manager', resolverRole = 'MANAGER', rejectionReason = 'Rejected by Manager' } = {}) {
    const authorizedRoles = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
    if (!authorizedRoles.includes(resolverRole)) {
      throw new Error(`Unauthorized: Role "${resolverRole}" does not have manager/chief administrator void approval authority.`);
    }

    const voidReq = this.getVoidRequest(id);
    if (!voidReq) {
      throw new Error('Void request not found');
    }

    if (voidReq.status !== 'PENDING') {
      throw new Error(`Void request is already ${voidReq.status} and cannot be processed again.`);
    }

    const order = this.getOrder(voidReq.orderId);
    if (!order) {
      throw new Error('Order associated with this void request not found');
    }

    const nowIso = new Date().toISOString();

    // Mark Void Request as REJECTED
    voidReq.status = 'REJECTED';
    voidReq.resolvedAt = nowIso;
    voidReq.resolvedBy = resolverName;
    voidReq.resolverId = resolverId;
    voidReq.resolverRole = resolverRole;
    voidReq.resolutionReason = rejectionReason;

    // Safety rule: Original order remains completely UNCHANGED!
    order.voidStatus = 'REJECTED';
    order.pendingVoidRequestId = null;

    order.history.push({
      status: order.status,
      time: nowIso,
      note: `[Void Request Rejected] ${voidReq.requestType} request rejected by ${resolverName} (${resolverRole}). Reason: ${rejectionReason}. Original order remains unchanged.`
    });

    this.saveData();

    this.logAudit(
      'VOID_REQUEST_REJECTED',
      `Void Request ${voidReq.id} (${voidReq.requestType}) REJECTED by ${resolverName} (${resolverRole}) for Order #${order.token}. Reason: ${rejectionReason}`,
      {
        voidRequestId: voidReq.id,
        orderId: order.id,
        token: order.token,
        requestType: voidReq.requestType,
        resolverName,
        resolverRole,
        rejectionReason
      },
      resolverName
    );

    eventBus.broadcast('void_request_rejected', voidReq);
    eventBus.broadcast('order_updated', order);

    return {
      success: true,
      voidRequest: voidReq,
      order
    };
  }

  resetVoidRequests(user = 'Manager', role = 'MANAGER', reason = 'Manual void register reset') {
    const authorizedRoles = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
    const normRole = (role || '').trim().toUpperCase();
    if (!authorizedRoles.includes(normRole)) {
      throw new Error(`Unauthorized: Role "${normRole}" does not have manager/chief administrator void reset authority.`);
    }

    const count = (this.voidRequests || []).length;
    if (!this.archivedVoidRequests) this.archivedVoidRequests = [];
    if (this.voidRequests && this.voidRequests.length > 0) {
      this.archivedVoidRequests.push(...this.voidRequests);
      this._saveArchivedVoidRequests();
    }
    this.voidRequests = [];
    this.saveData();

    eventBus.broadcast('void_request_updated', null);
    eventBus.broadcast('void_request_approved', null);
    eventBus.broadcast('void_request_rejected', null);

    this.logAudit(
      'VOID_REQUESTS_RESET',
      `Void requests register reset by ${user} (${normRole}): ${count} requests archived. Reason: ${reason}`,
      { resetVoidCount: count, reason },
      user
    );

    return {
      success: true,
      count,
      message: `Successfully reset and archived ${count} void requests.`
    };
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

  confirmAndNotifyCustomer(orderId, stallId, counterStaff = "Central Counter", reason = null) {
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
      attempt: stall.notificationCount,
      reason: reason || (isRepeat ? "Customer call reminder" : "Initial ready notification")
    });

    // Check if all stalls in master order are now NOTIFIED or COLLECTED
    const allStallsNotifiedOrCollected = order.stalls.every(s => s.status === "NOTIFIED" || s.status === "COLLECTED");
    if (allStallsNotifiedOrCollected) {
      order.status = "READY";
      if (order.tableId) this.updateTableStatus(order.tableId, "READY");
    }

    const reasonSuffix = reason ? ` (Reason: ${reason})` : '';
    const historyNote = isRepeat
      ? `Repeat reminder #${stall.notificationCount} dispatched by ${counterStaff} for ${stall.stallName}${reasonSuffix}.`
      : `${counterStaff} confirmed ${stall.stallName} is ready. Customer notified to collect.${reasonSuffix}`;

    order.history.push({
      status: "READY",
      time: nowIso,
      note: historyNote
    });

    this.saveData();
    this.logAudit(
      isRepeat ? "REPEAT_NOTIFICATION_DISPATCHED" : "COUNTER_CONFIRMED_READY",
      `${counterStaff} ${isRepeat ? `re-notified (attempt #${stall.notificationCount})` : 'confirmed food ready'} for "${stall.stallName}" in #${order.token} (Table ${order.tableId || 'Takeaway'})${reasonSuffix}. Customer notification dispatched.`,
      { orderId, stallId, attempt: stall.notificationCount, eventId: stall.notificationEventId, reason },
      counterStaff
    );

    const notificationPayload = {
      orderId: order.id,
      token: order.token,
      tableId: order.tableId,
      clientId: order.clientId || null,
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
      reason: reason || null,
      isRepeat
    };

    // Targeted notification: ONLY notify the specific guest whose order is ready
    eventBus.notifyGuest(notificationPayload);
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

  logReceiptReprint(orderId, staffName = "Cashier Counter", reason = "Customer copy request") {
    const order = this.getOrder(orderId);
    if (!order) return { error: "Order not found", code: 404 };
    if (!order.reprintCount) order.reprintCount = 0;
    order.reprintCount += 1;
    if (!Array.isArray(order.reprintHistory)) order.reprintHistory = [];
    order.reprintHistory.push({
      reprintedAt: new Date().toISOString(),
      staffName,
      reason
    });
    this.logAudit("RECEIPT_REPRINTED", `Receipt reprinted for Order #${order.token} by ${staffName}. Reason: ${reason}`, { orderId, token: order.token, reprintCount: order.reprintCount }, staffName);
    this.saveData();
    return { success: true, reprintCount: order.reprintCount, reprintHistory: order.reprintHistory };
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
    const pendingCount = this.orders.filter(o => o.status === "NEW" || o.status === "UNDER REVIEW" || o.paymentStatus === "PAYMENT DUE").length;
    const acceptedCount = this.orders.filter(o => o.status === "ACCEPTED" || o.status === "CONFIRMED" || (o.paymentStatus === "PAID" && o.status === "NEW")).length;
    const preparingCount = this.orders.filter(o => o.status === "PREPARING").length;
    const readyCount = this.orders.filter(o => o.status === "READY").length;
    const completedCount = this.orders.filter(o => o.status === "DELIVERED" || o.status === "COMPLETED").length;
    const cancelledCount = this.orders.filter(o => o.status === "CANCELLED" || o.status === "VOIDED").length;
    const paymentDueCount = this.orders.filter(o => o.paymentStatus === "PAYMENT DUE" || o.status === "PAYMENT DUE").length;
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
      pendingCount,
      acceptedCount,
      preparingCount,
      readyCount,
      completedCount,
      cancelledCount,
      paymentDueCount,
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
  // PURCHASES (Due Purchases & Extended Workflow)
  // ========================================================

  addPurchase({ supplier, description, category, amount, date, status = 'UNPAID', poNumber = null, invoiceNumber = null, expectedDeliveryDate = null, orderStatus = 'ORDERED', paymentMethod = 'CASH', paidAmount = 0, items = [], createdBy = 'Manager' }) {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) throw new Error('Invalid purchase amount');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Purchase date is required (YYYY-MM-DD)');

    const totalAmt = Math.round(Number(amount));
    const isPaid = status === 'PAID';
    const cleanPaid = paidAmount !== undefined ? Math.round(Number(paidAmount)) : (isPaid ? totalAmt : 0);
    const purchaseId = 'pur-' + randomUUID().slice(0, 10);

    const purchase = {
      id: purchaseId,
      poNumber: poNumber || `PO-${purchaseId.slice(-6).toUpperCase()}`,
      invoiceNumber: invoiceNumber || `INV-${purchaseId.slice(-6).toUpperCase()}`,
      supplier: supplier || '',
      description: description || '',
      category: category || 'Food Cost',
      amount: totalAmt,
      date,
      expectedDeliveryDate: expectedDeliveryDate || date,
      orderStatus: orderStatus || (isPaid ? 'RECEIVED' : 'ORDERED'),
      paymentStatus: cleanPaid >= totalAmt ? 'PAID' : (cleanPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'),
      status: cleanPaid >= totalAmt ? 'PAID' : 'UNPAID', // preserve backward compatibility
      paidAmount: cleanPaid,
      dueAmount: Math.max(0, totalAmt - cleanPaid),
      paymentMethod: paymentMethod || 'CASH',
      paidAt: cleanPaid >= totalAmt ? new Date().toISOString() : null,
      items: Array.isArray(items) ? items.map(item => ({
        itemId: item.itemId || item.id || `ing-${randomUUID().slice(0, 6)}`,
        itemName: item.itemName || item.name || 'Raw Ingredient',
        category: item.category || category || 'Ingredient',
        unit: item.unit || 'kg',
        quantity: Number(item.quantity) || 1,
        receivedQuantity: item.receivedQuantity !== undefined ? Number(item.receivedQuantity) : (orderStatus === 'RECEIVED' ? Number(item.quantity) || 1 : 0),
        returnedQuantity: Number(item.returnedQuantity) || 0,
        unitCost: Number(item.unitCost) || Math.round(totalAmt / Math.max(1, Number(item.quantity) || 1)),
        totalCost: Number(item.totalCost) || totalAmt
      })) : [],
      paymentHistory: cleanPaid > 0 ? [
        {
          id: 'pmt-' + randomUUID().slice(0, 8),
          amount: cleanPaid,
          date,
          paymentMethod: paymentMethod || 'CASH',
          recordedBy: createdBy,
          createdAt: new Date().toISOString()
        }
      ] : [],
      createdBy,
      createdAt: new Date().toISOString()
    };

    this.purchases.push(purchase);

    // If stock was already received at order creation, record stock movements
    if (purchase.orderStatus === 'RECEIVED' && purchase.items.length > 0) {
      for (const it of purchase.items) {
        this.recordStockMovement({
          menuItemId: it.itemId,
          itemName: it.itemName,
          unit: it.unit,
          movementType: 'PURCHASE_RECEIPT',
          quantityIn: it.receivedQuantity,
          quantityOut: 0,
          previousBalance: 0,
          newBalance: it.receivedQuantity,
          unitCost: it.unitCost,
          totalValue: it.receivedQuantity * it.unitCost,
          refNo: purchase.poNumber,
          user: createdBy,
          notes: `Goods received from ${purchase.supplier}`
        });
      }
    }

    this.saveData();
    this.logAudit('PURCHASE_ADDED', `Purchase #${purchase.poNumber} from "${supplier}" for ৳${amount} added by ${createdBy}`, { purchaseId: purchase.id }, createdBy);
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary(date));
    return purchase;
  }

  updatePurchase(id, updates, user = 'Manager') {
    const purchase = this.purchases.find(p => p.id === id);
    if (!purchase) return null;
    Object.assign(purchase, updates, { updatedAt: new Date().toISOString(), updatedBy: user });
    if (updates.status === 'PAID' && !purchase.paidAt) {
      purchase.paidAt = new Date().toISOString();
      purchase.paidAmount = purchase.amount;
      purchase.dueAmount = 0;
      purchase.paymentStatus = 'PAID';
    }
    this.saveData();
    this.logAudit('PURCHASE_UPDATED', `Purchase ${id} updated by ${user}`, { id }, user);
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary(purchase.date));
    return purchase;
  }

  recordPurchasePayment(id, { amount, paymentMethod = 'CASH', refNo = '', notes = '', recordedBy = 'Manager' }) {
    const purchase = this.purchases.find(p => p.id === id);
    if (!purchase) throw new Error('Purchase order not found');

    const numAmount = Math.round(Number(amount));
    if (isNaN(numAmount) || numAmount <= 0) throw new Error('Payment amount must be positive');

    const currentPaid = purchase.paidAmount !== undefined ? purchase.paidAmount : (purchase.status === 'PAID' ? purchase.amount : 0);
    const newPaid = currentPaid + numAmount;
    purchase.paidAmount = newPaid;
    purchase.dueAmount = Math.max(0, purchase.amount - newPaid);
    purchase.paymentStatus = purchase.dueAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';
    purchase.status = purchase.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID';

    if (!Array.isArray(purchase.paymentHistory)) purchase.paymentHistory = [];
    purchase.paymentHistory.push({
      id: 'pmt-' + randomUUID().slice(0, 8),
      amount: numAmount,
      date: getDhakaDateParts(new Date()).dateStr,
      paymentMethod,
      refNo: refNo || '',
      notes: notes || '',
      recordedBy,
      createdAt: new Date().toISOString()
    });

    if (purchase.paymentStatus === 'PAID') {
      purchase.paidAt = new Date().toISOString();
    }

    this.saveData();
    this.logAudit('PURCHASE_PAYMENT_RECORDED', `Payment of ৳${numAmount} recorded for PO #${purchase.poNumber || id} via ${paymentMethod} by ${recordedBy}`, { purchaseId: id, amount: numAmount }, recordedBy);
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary(purchase.date));
    return purchase;
  }

  recordGoodsReceipt(id, { itemsReceived = [], grnNumber = null, receivedBy = 'Storekeeper' }) {
    const purchase = this.purchases.find(p => p.id === id);
    if (!purchase) throw new Error('Purchase order not found');

    const grn = grnNumber || `GRN-${randomUUID().slice(0, 8).toUpperCase()}`;
    const today = getDhakaDateParts(new Date()).dateStr;

    if (!Array.isArray(purchase.goodsReceivedNotes)) purchase.goodsReceivedNotes = [];
    const grnRecord = {
      grnNumber: grn,
      date: today,
      receivedBy,
      items: itemsReceived
    };
    purchase.goodsReceivedNotes.push(grnRecord);

    // Update quantities in purchase.items and create inventory movement
    let totalPurchased = 0;
    let totalReceived = 0;

    if (Array.isArray(purchase.items)) {
      for (const item of purchase.items) {
        totalPurchased += (Number(item.quantity) || 0);
        const match = itemsReceived.find(ir => (ir.itemId && ir.itemId === item.itemId) || (ir.itemName && ir.itemName === item.itemName));
        if (match) {
          const qty = Number(match.quantityReceived) || 0;
          item.receivedQuantity = (Number(item.receivedQuantity) || 0) + qty;

          this.recordStockMovement({
            menuItemId: item.itemId,
            itemName: item.itemName,
            unit: item.unit || 'kg',
            movementType: 'PURCHASE_RECEIPT',
            quantityIn: qty,
            quantityOut: 0,
            previousBalance: 0,
            newBalance: qty,
            unitCost: item.unitCost,
            totalValue: qty * item.unitCost,
            refNo: grn,
            user: receivedBy,
            notes: `Goods received against PO #${purchase.poNumber}`
          });
        }
        totalReceived += (Number(item.receivedQuantity) || 0);
      }
    }

    purchase.orderStatus = totalReceived >= totalPurchased ? 'RECEIVED' : (totalReceived > 0 ? 'PARTIALLY_RECEIVED' : purchase.orderStatus);
    this.saveData();
    this.logAudit('GOODS_RECEIVED', `GRN ${grn} recorded for PO #${purchase.poNumber} by ${receivedBy}`, { purchaseId: id, grn }, receivedBy);
    return purchase;
  }

  deletePurchase(id, user = 'Manager') {
    const idx = this.purchases.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const [removed] = this.purchases.splice(idx, 1);
    this.saveData();
    this.logAudit('PURCHASE_DELETED', `Purchase ৳${removed.amount} deleted by ${user}`, { purchaseId: id }, user);
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary(removed.date));
    return { success: true };
  }

  getPurchases({ dateFrom = null, dateTo = null, status = null } = {}) {
    let list = [...this.purchases];
    if (dateFrom) list = list.filter(p => p.date >= dateFrom);
    if (dateTo) list = list.filter(p => p.date <= dateTo);
    if (status) list = list.filter(p => (p.paymentStatus === status || p.status === status));
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

  // ========================================================
  // ACCOUNTING QUERIES (DELEGATED TO ENGINES)
  // ========================================================

  getAccountingLedger({ dateFrom = null, dateTo = null, type = null, search = '', limit = 300 } = {}) {
    return this.journalEngine.getGeneralLedger({ dateFrom, dateTo, type, search, limit });
  }

  getIncomeStatement({ dateFrom = null, dateTo = null } = {}) {
    return this.journalEngine.getIncomeStatement({ dateFrom, dateTo });
  }

  getTrialBalance({ dateFrom = null, dateTo = null } = {}) {
    return this.journalEngine.getTrialBalance({ dateFrom, dateTo });
  }

  getBalanceSheet(asOfDate = null) {
    return this.journalEngine.getBalanceSheet(asOfDate);
  }

  getDueReceivables() {
    return this.orders
      .filter(o => o.status !== 'CANCELLED' && o.paymentStatus !== 'PAID')
      .map(o => ({
        orderId: o.id,
        token: o.token,
        invoiceNo: o.invoiceNo || String(88000 + Number(o.token)),
        tableId: o.tableId,
        customerName: o.customerName || 'Guest',
        customerPhone: o.customerPhone || '',
        orderType: o.type,
        serviceType: o.serviceType,
        grandTotal: o.grandTotal,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
        daysOverdue: Math.max(0, Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 86400000))
      }));
  }

  // ========================================================
  // EXPENSE MANAGEMENT
  // ========================================================

  addExpense({ amount, date, category, notes = '', supplier = '', payee = '', billNumber = '', dueDate = null, paymentStatus = 'PAID', paidAmount = null, paymentMethod = 'CASH', createdBy = 'Manager' }) {
    const VALID_CATEGORIES = ['Food Cost', 'Labor', 'Utilities', 'Rent', 'Maintenance', 'Marketing', 'Cleaning', 'Packaging', 'Miscellaneous'];
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
    const cleanSupplier = (supplier || payee || '').trim();
    const isPaid = paymentStatus === 'PAID';
    const cleanPaid = paidAmount !== null && paidAmount !== undefined ? Math.round(Number(paidAmount)) : (isPaid ? cleanAmount : 0);
    const dueAmount = Math.max(0, cleanAmount - cleanPaid);
    const resolvedStatus = dueAmount === 0 ? 'PAID' : (cleanPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

    const expense = {
      id: 'exp-' + randomUUID().slice(0, 10),
      amount: cleanAmount,
      date,
      dueDate: dueDate || date,
      category,
      notes: cleanNotes,
      supplier: cleanSupplier,
      payee: cleanSupplier,
      billNumber: billNumber || `EXP-${randomUUID().slice(0, 6).toUpperCase()}`,
      paymentMethod: paymentMethod || 'CASH',
      paymentStatus: resolvedStatus,
      paidAmount: cleanPaid,
      dueAmount,
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
      ],
      paymentHistory: cleanPaid > 0 ? [
        {
          id: 'pmt-' + randomUUID().slice(0, 8),
          amount: cleanPaid,
          date,
          paymentMethod: paymentMethod || 'CASH',
          recordedBy: createdBy,
          createdAt: nowIso
        }
      ] : []
    };

    this.expenses.push(expense);
    this.saveData();
    this.logAudit('EXPENSE_ADDED', `Expense of ৳${expense.amount} (${category}) added for ${date}`, { id: expense.id, amount: expense.amount }, createdBy);
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary(date));
    return expense;
  }

  recordExpensePayment(id, { amount, paymentMethod = 'CASH', notes = '', recordedBy = 'Manager' }) {
    const expense = this.expenses.find(e => e.id === id);
    if (!expense) throw new Error('Expense record not found');

    const numAmount = Math.round(Number(amount));
    if (isNaN(numAmount) || numAmount <= 0) throw new Error('Payment amount must be positive');

    const currentPaid = expense.paidAmount !== undefined ? Number(expense.paidAmount) : (expense.paymentStatus === 'UNPAID' ? 0 : expense.amount);
    const newPaid = currentPaid + numAmount;
    expense.paidAmount = newPaid;
    expense.dueAmount = Math.max(0, expense.amount - newPaid);
    expense.paymentStatus = expense.dueAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';

    if (!Array.isArray(expense.paymentHistory)) expense.paymentHistory = [];
    expense.paymentHistory.push({
      id: 'pmt-' + randomUUID().slice(0, 8),
      amount: numAmount,
      date: getDhakaDateParts(new Date()).dateStr,
      paymentMethod,
      notes: notes || '',
      recordedBy,
      createdAt: new Date().toISOString()
    });

    this.saveData();
    this.logAudit('EXPENSE_PAYMENT_RECORDED', `Payment of ৳${numAmount} recorded for expense #${expense.billNumber || id} via ${paymentMethod} by ${recordedBy}`, { expenseId: id, amount: numAmount }, recordedBy);
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary(expense.date));
    return expense;
  }

  recordInventoryWastage({ itemId, quantity, reason = 'Spoilage', unitCost = null, user = 'Kitchen Staff' }) {
    const item = this.getMenuItem(itemId);
    if (!item) throw new Error('Menu item not found');

    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) throw new Error('Wastage quantity must be positive');

    const inv = this.inventory[itemId] || { preparedQty: 50, soldQty: 0, reservedQty: 0 };
    const cost = unitCost !== null && !isNaN(Number(unitCost)) ? Number(unitCost) : (Number(inv.unitCost) || Math.round((Number(item.price) || 100) * 0.45));
    const totalLoss = Math.round(numQty * cost);

    const prevBal = Math.max(0, (inv.preparedQty || 50) - (inv.soldQty || 0));
    inv.soldQty = (inv.soldQty || 0) + numQty; // Count as consumed/lost from prepared stock
    const newBal = Math.max(0, (inv.preparedQty || 50) - (inv.soldQty || 0));
    this.inventory[itemId] = inv;
    this._saveInventory();

    const movement = this.recordStockMovement({
      menuItemId: itemId,
      itemName: item.name,
      stallId: item.stallId,
      unit: item.unit || 'portion',
      movementType: 'WASTAGE',
      quantityIn: 0,
      quantityOut: numQty,
      previousBalance: prevBal,
      newBalance: newBal,
      unitCost: cost,
      totalValue: totalLoss,
      refNo: `WST-${randomUUID().slice(0, 6).toUpperCase()}`,
      user,
      notes: reason
    });

    this.logAudit('INVENTORY_WASTAGE', `Wastage of ${numQty} x "${item.name}" (Loss: ৳${totalLoss}) recorded by ${user}: ${reason}`, { itemId, quantity: numQty, loss: totalLoss }, user);
    eventBus.broadcast('inventory_updated', { orderItems: [itemId] });
    return movement;
  }

  removeInventoryWastage(movementId, { user = 'Manager', role = 'MANAGER', reason = 'Incorrect entry removal' } = {}) {
    const ALLOWED = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'KITCHEN STAFF', 'KITCHEN'];
    const normRole = (role || '').trim().toUpperCase();
    if (role && !ALLOWED.includes(normRole)) {
      throw new Error(`Unauthorized: Role "${role}" cannot remove wastage records.`);
    }

    if (!this.inventoryMovements) this.inventoryMovements = [];
    const idx = this.inventoryMovements.findIndex(m => m.id === movementId || m.refNo === movementId);
    if (idx === -1) {
      throw new Error('Wastage record not found');
    }

    const mov = this.inventoryMovements[idx];
    if (mov.movementType !== 'WASTAGE' && mov.movementType !== 'DAMAGE') {
      throw new Error('Only wastage or damage records can be removed with this action');
    }

    // 1. Revert inventory consumption
    const itemId = mov.menuItemId;
    if (itemId && this.inventory[itemId]) {
      const inv = this.inventory[itemId];
      const qtyOut = Number(mov.quantityOut) || 0;
      inv.soldQty = Math.max(0, (Number(inv.soldQty) || 0) - qtyOut);
      this._saveInventory();
    }

    // 2. Track removed record in audit archive so history remains traceable
    if (!this.removedWastage) this.removedWastage = [];
    const removedRecord = {
      id: 'del-wst-' + randomUUID().slice(0, 8),
      originalMovement: { ...mov },
      removedAt: new Date().toISOString(),
      removedBy: user,
      removerRole: normRole,
      removalReason: reason
    };
    this.removedWastage.unshift(removedRecord);
    this._saveRemovedWastage();

    // 3. Remove movement from active movements list
    this.inventoryMovements.splice(idx, 1);
    this._saveMovements();

    // 4. Log detailed audit event
    this.logAudit(
      'INVENTORY_WASTAGE_REMOVED',
      `Wastage record #${mov.refNo || mov.id} for "${mov.itemName}" (Qty: ${mov.quantityOut}, Loss: ৳${mov.totalValue}) removed by ${user} (${normRole}): ${reason}`,
      { movementId, itemName: mov.itemName, quantity: mov.quantityOut, totalValue: mov.totalValue, reason },
      user
    );

    // 5. Broadcast real-time updates
    eventBus.broadcast('inventory_updated', { orderItems: [itemId] });
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary());

    return {
      success: true,
      removedId: movementId,
      restoredItem: mov.itemName,
      restoredQuantity: mov.quantityOut,
      reversedQuantity: mov.quantityOut,
      removedRecord
    };
  }

  recordStockAdjustment({ itemId, newQuantity, reason = 'Physical inventory count reconciliation', user = 'Manager' }) {
    const item = this.getMenuItem(itemId);
    if (!item) throw new Error('Menu item not found');

    const numNewQty = Number(newQuantity);
    if (isNaN(numNewQty) || numNewQty < 0) throw new Error('New stock quantity must be non-negative');

    const inv = this.inventory[itemId] || { preparedQty: 50, soldQty: 0, reservedQty: 0 };
    const prevStock = Math.max(0, (inv.preparedQty || 50) - (inv.soldQty || 0));
    const diff = numNewQty - prevStock;

    inv.preparedQty = numNewQty;
    inv.soldQty = 0; // reset sold count for fresh baseline
    inv.lastUpdatedAt = new Date().toISOString();
    inv.updatedBy = user;
    this.inventory[itemId] = inv;
    this._saveInventory();

    const cost = Number(inv.unitCost) || Math.round((Number(item.price) || 100) * 0.45);
    const totalVariance = Math.abs(diff) * cost;

    const movement = this.recordStockMovement({
      menuItemId: itemId,
      itemName: item.name,
      stallId: item.stallId,
      unit: item.unit || 'portion',
      movementType: 'ADJUSTMENT',
      quantityIn: diff > 0 ? diff : 0,
      quantityOut: diff < 0 ? Math.abs(diff) : 0,
      previousBalance: prevStock,
      newBalance: numNewQty,
      unitCost: cost,
      totalValue: totalVariance,
      refNo: `ADJ-${randomUUID().slice(0, 6).toUpperCase()}`,
      user,
      notes: reason
    });

    this.logAudit('INVENTORY_ADJUSTMENT', `Stock for "${item.name}" adjusted from ${prevStock} to ${numNewQty} (${diff >= 0 ? '+' : ''}${diff}) by ${user}: ${reason}`, { itemId, prevStock, numNewQty, diff }, user);
    eventBus.broadcast('inventory_updated', { orderItems: [itemId] });
    return movement;
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
    const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
    const normRole = (role || '').trim().toUpperCase();
    if (!ALLOWED_ROLES.includes(normRole)) {
      return { 
        error: 'Unauthorized: Only Super Admin, Food Court Owner, or Manager can reset daily revenue.',
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
      role: normRole
    };

    this.revenueResets.push(entry);
    this.saveData();

    this.logAudit(
      'DAILY_REVENUE_RESET',
      `Daily revenue summary for ${todayParts.dateStr} reset to ৳0 by ${user} (${normRole}). Historical transactions preserved.`,
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
    const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
    const normRole = (role || '').trim().toUpperCase();
    if (!ALLOWED_ROLES.includes(normRole)) {
      return { 
        error: 'Unauthorized: Only Super Admin, Food Court Owner, or Manager can reset monthly revenue.',
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
      role: normRole
    };

    this.revenueResets.push(entry);
    this.saveData();

    this.logAudit(
      'MONTHLY_REVENUE_RESET',
      `Monthly revenue summary for ${todayParts.monthStr} reset to ৳0 by ${user} (${normRole}). Historical transactions preserved.`,
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
    const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
    const normRole = (role || '').trim().toUpperCase();
    if (!ALLOWED_ROLES.includes(normRole)) {
      return { 
        error: 'Unauthorized: Only Super Admin, Food Court Owner, or Manager can reset yearly revenue.',
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
      role: normRole
    };

    this.revenueResets.push(entry);
    this.saveData();

    this.logAudit(
      'YEARLY_REVENUE_RESET',
      `Yearly revenue summary for ${todayParts.yearStr} reset to ৳0 by ${user} (${normRole}). Historical transactions preserved.`,
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
    const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
    const normRole = (role || '').trim().toUpperCase();
    if (!ALLOWED_ROLES.includes(normRole)) {
      return { 
        error: 'Unauthorized: Only Super Admin, Food Court Owner, or Manager can reset tables.',
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
    this.logAudit('TABLES_RESET', `All 55 tables and sessions reset to AVAILABLE by ${user} (${normRole}).`, {}, user);
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
  clearAllOrdersAndReset(userOrOptions = 'Manager', role = 'MANAGER', reason = 'Routine shift restart') {
    let user = userOrOptions;
    if (typeof userOrOptions === 'object' && userOrOptions !== null) {
      user = userOrOptions.user || userOrOptions.name || 'Manager';
      role = userOrOptions.role || 'MANAGER';
      reason = userOrOptions.reason || 'Routine shift restart';
    }
    const ALLOWED_ROLES = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'];
    const normRole = (role || '').trim().toUpperCase();
    if (!ALLOWED_ROLES.includes(normRole)) {
      throw new Error('Unauthorized: Only Manager or Chief Administrator can delete orders and perform full reset.');
    }

    const todayParts = getDhakaDateParts(new Date());
    const nowIso = new Date().toISOString();

    // 1. Snapshot and archive all orders so data is never permanently lost
    const ordersSnapshot = JSON.parse(JSON.stringify(this.orders || []));
    const deletedCount = ordersSnapshot.length;
    const financialSnapshot = this.getRevenueSummary();

    if (!this.archivedOrders) this.archivedOrders = [];
    this.archivedOrders.push(...ordersSnapshot);
    this._saveArchivedOrders();

    // 2. Record in Reset History Audit Log
    const resetEntry = {
      id: 'rst-' + randomUUID().slice(0, 8),
      timestamp: nowIso,
      date: todayParts.dateStr,
      performedBy: user,
      role: normRole,
      reason: (reason || 'Operational shift restart / order board refresh').trim(),
      ordersCount: deletedCount,
      orderTokens: ordersSnapshot.map(o => o.token || o.id),
      totalSalesValue: ordersSnapshot.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0),
      financialSnapshot: {
        dailyRevenue: financialSnapshot.daily.revenue,
        dailyOrders: financialSnapshot.daily.orders,
        monthlyRevenue: financialSnapshot.monthly.revenue,
        yearlyRevenue: financialSnapshot.yearly.revenue
      },
      ordersSnapshot
    };
    if (!this.resetHistory) this.resetHistory = [];
    this.resetHistory.unshift(resetEntry);
    this._saveResetHistory();

    // 3. Clear active orders, runner tasks, and active void requests (archive them safely)
    this.orders = [];
    this.runnerTasks = [];
    if (!this.archivedVoidRequests) this.archivedVoidRequests = [];
    if (this.voidRequests && this.voidRequests.length > 0) {
      this.archivedVoidRequests.push(...this.voidRequests);
      this._saveArchivedVoidRequests();
    }
    this.voidRequests = [];

    // 4. Reset token counters
    this.tokenCounter = 1;
    this.parcelTokenCounter = 1;

    // 5. Reset all 55 tables to AVAILABLE and close table sessions
    this.syncTablesWithOrders();
    for (const session of (this.tableSessions || [])) {
      session.active = false;
      session.endedAt = nowIso;
    }

    // 6. Record reset entries for daily, monthly, and yearly
    this.revenueResets.push(
      { id: 'rev-reset-day-' + randomUUID(), type: 'daily', date: todayParts.dateStr, resetAt: nowIso, user, role: normRole },
      { id: 'rev-reset-month-' + randomUUID(), type: 'monthly', month: todayParts.monthStr, resetAt: nowIso, user, role: normRole },
      { id: 'rev-reset-year-' + randomUUID(), type: 'yearly', year: todayParts.yearStr, resetAt: nowIso, user, role: normRole }
    );

    // 7. Save state to disk immediately
    this.saveData();

    // 8. Log audit event
    this.logAudit(
      'FULL_RESET_ORDERS_DELETED',
      `One-click restart executed by ${user} (${normRole}): ${deletedCount} orders archived and reset, all tables reset to AVAILABLE, all revenue metrics defaulted to ৳0. Reason: ${resetEntry.reason}`,
      { resetId: resetEntry.id, deletedOrdersCount: deletedCount, reason: resetEntry.reason, resetAt: nowIso },
      user
    );

    // 9. Broadcast real-time updates across all connected clients & dashboards
    const summary = this.getRevenueSummary();
    const analytics = this.getAnalyticsSummary();
    // Broadcast all_orders_reset FIRST so dashboards can clear immediately
    eventBus.broadcast('all_orders_reset', { resetId: resetEntry.id, timestamp: nowIso, performedBy: user, role: normRole });
    eventBus.broadcast('order_updated', null);
    eventBus.broadcast('runner_task_updated', null);
    eventBus.broadcast('tables_updated', this.tables);
    eventBus.broadcast('revenue_updated', summary);
    eventBus.broadcast('financial_updated', this.getDailyFinancialSummary());
    eventBus.broadcast('analytics_updated', analytics);
    eventBus.broadcast('void_request_updated', null);

    return {
      success: true,
      deletedCount,
      resetEntry,
      message: `Successfully reset and archived ${deletedCount} orders. All revenue metrics defaulted to ৳0.`,
      summary,
      tables: this.tables
    };
  }

  // --- Void & Cancellation Reports (Accounting) ---
  getVoidSummaryReport({ dateFrom = null, dateTo = null, search = '' } = {}) {
    const all = [...(this.voidRequests || []), ...(this.archivedVoidRequests || [])];
    const seen = new Set();
    let requests = [];
    for (const r of all) {
      if (r && r.id && !seen.has(r.id)) {
        seen.add(r.id);
        requests.push(r);
      }
    }

    if (dateFrom) {
      requests = requests.filter(r => {
        const d = (r.requestedAt || '').slice(0, 10);
        return d >= dateFrom;
      });
    }
    if (dateTo) {
      requests = requests.filter(r => {
        const d = (r.requestedAt || '').slice(0, 10);
        return d <= dateTo;
      });
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      requests = requests.filter(r =>
        (r.token || '').toLowerCase().includes(q) ||
        (r.invoiceNo || '').toLowerCase().includes(q) ||
        (r.orderId || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q) ||
        (r.cashierName || '').toLowerCase().includes(q) ||
        (r.cashierId || '').toLowerCase().includes(q) ||
        (r.resolvedBy || '').toLowerCase().includes(q) ||
        (r.tableId || '').toLowerCase().includes(q)
      );
    }

    requests.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());

    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status === 'PENDING').length;
    const approvedVoids = requests.filter(r => r.status === 'APPROVED').length;
    const rejectedRequests = requests.filter(r => r.status === 'REJECTED').length;

    const fullOrderVoids = requests.filter(r => r.requestType === 'FULL_CANCELLATION').length;
    const partialItemVoids = requests.filter(r => r.requestType === 'ITEM_CANCELLATION').length;
    const quantityCorrections = requests.filter(r => r.requestType === 'QUANTITY_CORRECTION').length;

    let totalVoidedSalesValue = 0;
    let totalRefundsIssued = 0;

    for (const r of requests) {
      if (r.status === 'APPROVED') {
        const diff = Number(r.proposedImpact?.differenceAmount) || Number(r.originalSnapshot?.grandTotal) || 0;
        totalVoidedSalesValue += diff;
        if (r.executionResult?.refundRecorded && r.executionResult?.refundAmount) {
          totalRefundsIssued += Number(r.executionResult.refundAmount) || 0;
        }
      }
    }

    return {
      totalRequests,
      pendingRequests,
      approvedVoids,
      rejectedRequests,
      fullOrderVoids,
      partialItemVoids,
      quantityCorrections,
      totalVoidedSalesValue,
      totalVoidedSales: totalVoidedSalesValue,
      totalRefundsIssued,
      requests
    };
  }

  // --- Reset History Report (Accounting) ---
  getResetHistoryReport({ dateFrom = null, dateTo = null, search = '' } = {}) {
    let history = [...(this.resetHistory || [])];

    if (dateFrom) {
      history = history.filter(h => (h.date || h.timestamp.slice(0, 10)) >= dateFrom);
    }
    if (dateTo) {
      history = history.filter(h => (h.date || h.timestamp.slice(0, 10)) <= dateTo);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      history = history.filter(h =>
        (h.performedBy || '').toLowerCase().includes(q) ||
        (h.role || '').toLowerCase().includes(q) ||
        (h.reason || '').toLowerCase().includes(q) ||
        (h.id || '').toLowerCase().includes(q)
      );
    }

    return {
      totalResets: history.length,
      totalOrdersArchived: history.reduce((s, h) => s + (h.ordersCount || 0), 0),
      totalValueArchived: history.reduce((s, h) => s + (h.totalSalesValue || 0), 0),
      history
    };
  }
}

export const db = new Database();
