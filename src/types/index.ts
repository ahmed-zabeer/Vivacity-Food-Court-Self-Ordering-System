export type OrderStatus =
  | 'NEW'
  | 'UNDER REVIEW'
  | 'ACTION REQUIRED'
  | 'ACCEPTED'
  | 'PAYMENT DUE'
  | 'PAYMENT PROCESSING'
  | 'PAID'
  | 'KOT GENERATED'
  | 'RELEASED'
  | 'PREPARING'
  | 'READY'
  | 'OUT FOR DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'UNPAID'
  | 'PAYMENT DUE'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY REFUNDED'
  | 'CANCELLED';

export type PaymentMethod = 'bKash' | 'Online Card' | 'NFC / Contactless' | 'CASH';

export type TableStatus =
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'PAYMENT DUE'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERING';

export type Role =
  | 'SUPER ADMIN'
  | 'FOOD COURT OWNER'
  | 'MANAGER'
  | 'STALL MANAGER'
  | 'KITCHEN STAFF'
  | 'RUNNER / WAITER'
  | 'CASHIER'
  | 'CUSTOMER';

export interface Stall {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  badge: string;
  isFeatured: boolean;
  rating: number;
  prepTime: string;
  coverImage: string;
  avatar: string;
  logo?: string | null;
  description: string;
  categories: string[];
  isPaused?: boolean;
  pausedAt?: string | null;
  pauseReason?: string;
  pauseUntil?: string | null;
  pausedBy?: string | null;
}

export interface MenuVariant {
  id: string;
  name: string;
  price: number;
}

export interface MenuAddOn {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  stallId: string;
  category: string;
  parentCategory?: string;
  subCategory?: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  isAvailable: boolean;
  prepTime?: string;
  hasVariants?: boolean;
  variants?: MenuVariant[];
  unit?: string;
  isWeightBased?: boolean;
  minWeight?: number;
  stepWeight?: number;
  addOns?: MenuAddOn[];
  burgerPatties?: MenuAddOn[];
  burgerAddons?: MenuAddOn[];
  isAddOn?: boolean;
  isPopular?: boolean;
  isSpecial?: boolean;
  available?: number | null;
  inv?: any;
}

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  stallId: string;
  stallName: string;
  name: string;
  price: number;
  basePrice: number;
  quantity: number;
  variantId?: string;
  variantName?: string;
  weight?: number;
  selectedAddOns?: string[];
  addOnNames?: string[];
  notes?: string;
  image?: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  stallId: string;
  name: string;
  price: number;
  basePrice: number;
  quantity: number;
  variantName?: string | null;
  weight?: number | null;
  selectedAddOns?: string[];
  addOnNames?: string[];
  customizations?: Array<{ id: string; name: string; price: number }>;
  notes?: string;
  isUnavailable: boolean;
  unavailableReason?: string;
}

export interface StallSubOrder {
  stallId: string;
  stallName: string;
  status: OrderStatus | 'NOTIFIED' | 'COLLECTED';
  prepTimeEst?: string;
  prepTimeMinutes?: number;
  prepStartedAt?: string | null;
  readyAt?: string | null;
  counterConfirmedAt?: string | null;
  notifiedAt?: string | null;
  lastNotifiedAt?: string | null;
  notificationCount?: number;
  notificationHistory?: Array<{
    eventId: string;
    notifiedAt: string;
    confirmedBy?: string;
    attempt?: number;
  }>;
  collectedAt?: string | null;
  confirmedBy?: string | null;
  notificationEventId?: string | null;
  orderType?: 'DINE_IN' | 'TAKEAWAY';
  orderTypeDescription?: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    variantName?: string | null;
    selectedAddOns?: string[];
    addOnNames?: string[];
    customizations?: Array<{ id: string; name: string; price: number }>;
    notes?: string;
  }[];
}

export interface StallReadyConfirmedEvent {
  orderId: string;
  token: string;
  tableId: string | null;
  stallId: string;
  stallName: string;
  serviceType: ServiceType;
  customerName?: string;
  customerPhone?: string | null;
  orderType?: 'DINE_IN' | 'TAKEAWAY';
  orderTypeDescription?: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    price?: number;
    notes?: string;
    variantName?: string | null;
    selectedAddOns?: string[];
    addOnNames?: string[];
    customizations?: Array<{ id: string; name: string; price: number }>;
  }[];
  notificationEventId: string;
  notifiedAt: string;
  confirmedBy?: string;
  attempt?: number;
  isRepeat?: boolean;
}

export interface CounterReadyItem {
  orderId: string;
  token: string;
  tableId: string | null;
  customerName?: string;
  customerPhone?: string | null;
  serviceType: ServiceType;
  orderType: 'DINE_IN' | 'PARCEL';
  createdAt: string;
  stallId: string;
  stallName: string;
  orderTypeDescription?: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
    variantName?: string | null;
    selectedAddOns?: string[];
    addOnNames?: string[];
    customizations?: Array<{ id: string; name: string; price: number }>;
  }[];
  status: 'READY' | 'NOTIFIED' | 'COLLECTED';
  prepStartedAt?: string | null;
  readyAt?: string | null;
  counterConfirmedAt?: string | null;
  notifiedAt?: string | null;
  lastNotifiedAt?: string | null;
  notificationCount?: number;
  notificationHistory?: Array<{
    eventId: string;
    notifiedAt: string;
    confirmedBy?: string;
    attempt?: number;
  }>;
  collectedAt?: string | null;
  confirmedBy?: string | null;
  notificationEventId?: string | null;
  waitMinutes: number;
}

export interface OrderHistoryStep {
  status: OrderStatus;
  time: string;
  note: string;
}

export type ServiceType = 'SELF_SERVICE' | 'TABLE_SERVICE';

export type CustomerOrderType = 'DINE_IN' | 'TAKEAWAY';

export interface ExpenseRevision {
  amount: number;
  date: string;
  category: 'Food Cost' | 'Labor' | 'Utilities' | 'Rent' | 'Maintenance' | 'Miscellaneous';
  notes?: string;
  modifiedBy: string;
  modifiedAt: string;
  action: 'CREATED' | 'CORRECTION';
}

export interface Expense {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD in Asia/Dhaka
  category: 'Food Cost' | 'Labor' | 'Utilities' | 'Rent' | 'Maintenance' | 'Miscellaneous';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  history?: ExpenseRevision[];
}

export interface DailyFinancialSummary {
  date: string; // YYYY-MM-DD
  revenue: number;
  expenses: number;
  profit: number;
  revenueOrders: number;
  expenseCount: number;
}

export interface Order {
  id: string;
  token: string;
  invoiceNo?: string;
  guestCount?: number;
  tableId: string | null;
  parcelToken?: string | null;
  sessionId?: string | null;
  type: 'DINE_IN' | 'PARCEL';
  customerOrderType?: CustomerOrderType; // explicit Dine-in / Takeaway selection by customer
  orderTypeDescription?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  serviceType?: ServiceType;
  customerNotes?: string;
  createdAt: string;
  items: OrderItem[];
  stalls: StallSubOrder[];
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  grandTotal: number;
  kotGenerated: boolean;
  kotNumber?: string | null;
  kotGeneratedAt?: string;
  history: OrderHistoryStep[];
  cancellationReason?: string;
}

export interface Table {
  id: string; // T01 .. T55
  name: string;
  zone: string;
  seats: number;
  status: TableStatus;
  currentSessionId: string | null;
  activeOrderToken: string | null;
  totalSpentToday: number;
}

export interface TableSession {
  id: string;
  tableId: string;
  startedAt: string;
  endedAt?: string;
  orderIds: string[];
  active: boolean;
  guestCount: number;
}

export interface RunnerTask {
  id: string;
  orderId: string;
  token: string;
  tableId: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  status: 'READY_TO_DELIVER' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  stalls: string[];
  itemCount: number;
  createdAt: string;
  deliveredAt?: string;
  assignedRunner: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  stallId?: string | null;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  metadata?: any;
}

export interface RevenueComparison {
  prevRevenue: number;
  prevOrders: number;
  percentageChange?: number | null;
}

export interface RevenuePeriodData {
  revenue: number;
  orders: number;
  period: string;
  resetAt?: string | null;
  comparison?: RevenueComparison | null;
}

export interface RevenueSummary {
  daily: RevenuePeriodData;
  monthly: RevenuePeriodData;
  yearly: RevenuePeriodData;
  timezone: string;
  currency: string;
  lastUpdated: string;
}

export interface InventoryInfo {
  preparedQty: number | null;
  soldQty: number;
  reservedQty: number;
  available: number | null;
  stockOut: boolean;
  manuallyDisabled: boolean;
  lastUpdatedAt: string | null;
  updatedBy: string | null;
}

export interface InventoryMenuItem extends MenuItem {
  stallName: string;
  inv: InventoryInfo;
}

export interface OrderReview {
  id: string;
  orderId: string;
  token: string;
  tableId: string | null;
  rating: number;
  feedback: string;
  createdAt: string;
  orderTotal?: number;
}

export interface Purchase {
  id: string;
  supplier: string;
  description: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  status: 'PAID' | 'UNPAID';
  paidAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface LedgerEntry {
  id: string;
  date: string;
  refNo: string;
  type: 'Revenue' | 'Expense' | 'Purchase';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  relatedId?: string;
}

export interface IncomeStatement {
  revenue: number;
  expensesTotal: number;
  purchasesTotal: number;
  totalCosts: number;
  netProfit: number;
  expenseByCategory: Record<string, number>;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface TrialBalanceAccount {
  name: string;
  debit: number;
  credit: number;
}

export interface TrialBalance {
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface BalanceSheetItem {
  name: string;
  amount: number;
}

export interface BalanceSheet {
  assets: BalanceSheetItem[];
  totalAssets: number;
  liabilities: BalanceSheetItem[];
  totalLiabilities: number;
  equity: BalanceSheetItem[];
  totalEquity: number;
  asOf: string;
}

export interface DueReceivable {
  orderId: string;
  token: string;
  tableId: string | null;
  customerName: string;
  customerPhone: string;
  orderType: string;
  serviceType?: string;
  grandTotal: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
}

