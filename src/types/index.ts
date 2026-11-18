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

export type PaymentMethod =
  | 'bKash'
  | 'Nagad'
  | 'Online Card'
  | 'Card / Physical POS Terminal'
  | 'NFC / Contactless'
  | 'CASH';

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
  clientId?: string | null;
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
  category: 'Food Cost' | 'Labor' | 'Utilities' | 'Rent' | 'Maintenance' | 'Marketing' | 'Cleaning' | 'Packaging' | 'Miscellaneous';
  notes?: string;
  modifiedBy: string;
  modifiedAt: string;
  action: 'CREATED' | 'CORRECTION';
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
  orderSource?: 'MANUAL_COUNTER' | 'QR_CODE' | 'ONLINE';
  cashierName?: string | null;
  cashierId?: string | null;
  cashReceived?: number | null;
  changeReturned?: number | null;
  cardPosRef?: string | null;
  cardPosStatus?: 'APPROVED' | 'DECLINED' | 'PENDING' | null;
  cardPosTerminal?: string | null;
  discountPercent?: number;
  discountReason?: string | null;
  discountAppliedBy?: string | null;
  discountApprovedBy?: string | null;
  reprintCount?: number;
  reprintHistory?: Array<{ reprintedAt: string; staffName: string; reason: string }>;
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
  voidStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  pendingVoidRequestId?: string | null;
  voidHistory?: string[];
  refundDetails?: {
    refundAmount: number;
    refundedAt: string;
    refundedBy: string;
    reason: string;
    paymentMethod: string;
    transactionId?: string;
  };
  refunds?: Array<{
    refundAmount: number;
    refundedAt: string;
    refundedBy: string;
    reason: string;
    paymentMethod: string;
    transactionId?: string;
  }>;
}

export type VoidRequestType =
  | 'FULL_CANCELLATION'
  | 'ITEM_CANCELLATION'
  | 'QUANTITY_CORRECTION'
  | 'ORDER_MODIFICATION';

export type VoidRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VoidItemCorrection {
  menuItemId: string;
  variantId?: string;
  name: string;
  oldQuantity: number;
  newQuantity: number;
  unitPrice: number;
  stallId?: string;
  stallName?: string;
}

export interface VoidItemRemoval {
  menuItemId: string;
  variantId?: string;
  name: string;
  quantity: number;
  price: number;
  stallId?: string;
  stallName?: string;
}

export interface VoidRequestDetails {
  cancelEntireOrder?: boolean;
  itemsToRemove?: VoidItemRemoval[];
  corrections?: VoidItemCorrection[];
  notes?: string;
  serviceType?: ServiceType;
}

export interface VoidProposedImpact {
  newSubtotal: number;
  newGrandTotal: number;
  differenceAmount: number;
  refundRequired: boolean;
  refundAmount: number;
}

export interface VoidExecutionResult {
  executedAt: string;
  executedBy: string;
  refundRecorded: boolean;
  refundAmount: number;
  refundTransactionId?: string;
  inventoryRestored: boolean;
  inventoryItemsAdjusted: Array<{ menuItemId: string; qtyRestored: number }>;
  stallsNotified: string[];
}

export interface VoidRequest {
  id: string;
  orderId: string;
  invoiceNo: string;
  token: string;
  tableId: string | null;
  orderType: CustomerOrderType;
  requestType: VoidRequestType;
  status: VoidRequestStatus;
  reason: string;
  cashierId: string;
  cashierName: string;
  cashierRole: string;
  requestedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolverId: string | null;
  resolverRole: string | null;
  resolutionReason: string | null;
  originalSnapshot: {
    items: OrderItem[];
    subtotal: number;
    discount: number;
    tax: number;
    serviceCharge: number;
    grandTotal: number;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    orderStatus: OrderStatus;
    kotGenerated: boolean;
    kotNumber?: string | null;
    stalls?: StallSubOrder[];
  };
  requestDetails: VoidRequestDetails;
  proposedImpact: VoidProposedImpact;
  executionResult: VoidExecutionResult | null;
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
  poNumber?: string;
  invoiceNumber?: string;
  supplier: string;
  description: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  expectedDeliveryDate?: string;
  orderStatus?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  paymentStatus?: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  status: 'PAID' | 'UNPAID';
  paidAmount?: number;
  dueAmount?: number;
  paymentMethod?: string;
  paidAt?: string | null;
  items?: Array<{
    itemId: string;
    itemName: string;
    category?: string;
    unit?: string;
    quantity: number;
    receivedQuantity?: number;
    returnedQuantity?: number;
    unitCost: number;
    totalCost: number;
  }>;
  paymentHistory?: Array<{
    id: string;
    amount: number;
    date: string;
    paymentMethod: string;
    refNo?: string;
    notes?: string;
    recordedBy: string;
  }>;
  goodsReceivedNotes?: Array<{
    grnNumber: string;
    date: string;
    receivedBy: string;
    items: any[];
  }>;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface ExpenseHistoryEntry {
  amount: number;
  date: string;
  category: Expense['category'];
  notes?: string;
  modifiedBy: string;
  modifiedAt: string;
  action: 'CREATED' | 'CORRECTION';
}

export interface Expense {
  id: string;
  amount: number;
  date: string;
  dueDate?: string;
  category:
    | 'Food Cost'
    | 'Labor'
    | 'Utilities'
    | 'Rent'
    | 'Maintenance'
    | 'Marketing'
    | 'Cleaning'
    | 'Packaging'
    | 'Miscellaneous';
  notes?: string;
  supplier?: string;
  payee?: string;
  billNumber?: string;
  paymentMethod?: string;
  paymentStatus?: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  paidAmount?: number;
  dueAmount?: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  history?: ExpenseHistoryEntry[];
  paymentHistory?: Array<{
    id: string;
    amount: number;
    date: string;
    paymentMethod: string;
    notes?: string;
    recordedBy: string;
  }>;
}

export interface TopSellingItem {
  itemId: string;
  name: string;
  stallId: string;
  stallName: string;
  category: string;
  unit: string;
  quantitySold: number;
  orderCount: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  avgSellingPrice: number;
  recipeCostPerUnit: number | null;
  totalCost: number | null;
  grossProfit: number | null;
  profitMargin: number | null;
  contributionPercent: number;
  hasRecipe: boolean;
}

export interface SalesSummaryReport {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  totalQuantitySold: number;
  grossItemSales: number;
  totalDiscounts: number;
  totalRefunds: number;
  netSales: number;
  vatTaxCollected: number;
  serviceChargesCollected: number;
  totalCollections: number;
  outstandingReceivables: number;
  paymentMethods: Record<string, number>;
  averageOrderValue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  comparison?: {
    prevDateFrom: string;
    prevDateTo: string;
    prevRevenue: number;
    prevOrdersCount: number;
    revenueChange: number | null;
    ordersChange: number | null;
  } | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface SalesDetailTransaction {
  orderId: string;
  invoiceNo: string;
  token: string;
  date: string;
  time: string;
  guestName: string;
  customerPhone: string;
  tableNumber: string;
  orderType: string;
  serviceType: string;
  stallId: string;
  stallName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  cashier: string;
}

export interface SalesByUserItem {
  userName: string;
  role: string;
  ordersHandled: number;
  salesProcessed: number;
  paymentsConfirmed: number;
  discountsAuthorized: number;
  refundsProcessed: number;
  cancelledOrders: number;
  totalValue: number;
  averageTransactionValue: number;
}

export interface OrderTypeSummaryItem {
  key: string;
  name: string;
  count: number;
  quantity: number;
  gross: number;
  discount: number;
  refund: number;
  net: number;
  averageOrderValue: number;
  payments: Record<string, number>;
}

export interface StallWiseSaleItem {
  stallId: string;
  stallName: string;
  badge: string;
  orderCount: number;
  quantitySold: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  profitMargin: number;
  bestSellingItem: string;
  commissionRate: string;
  managementCommission: number;
  merchantPayout: number;
  paymentBreakdown: Record<string, number>;
}

export interface CategoryWiseSaleItem {
  category: string;
  itemCount: number;
  quantitySold: number;
  grossSales: number;
  discounts: number;
  netSales: number;
  percentage: number;
}

export interface HourlySaleItem {
  hour: number;
  label: string;
  orders: number;
  itemsSold: number;
  sales: number;
  paymentsCollected: number;
  averageOrderValue: number;
}

export interface PaymentMethodItem {
  key: string;
  name: string;
  transactions: number;
  successfulCollections: number;
  pendingAmount: number;
  failedAmount: number;
  refunds: number;
  netCollected: number;
  percentage: number;
}

export interface StockMovementItem {
  id: string;
  timestamp: string;
  date: string;
  menuItemId: string;
  itemName: string;
  stallId?: string | null;
  unit: string;
  movementType: string;
  quantityIn: number;
  quantityOut: number;
  previousBalance: number;
  newBalance: number;
  unitCost: number;
  totalValue: number;
  refNo: string;
  user: string;
  notes: string;
}

export interface InventoryValuationItem {
  itemId: string;
  name: string;
  stallId: string;
  stallName: string;
  category: string;
  unit: string;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  unitCost: number;
  stockValue: number;
  minStock: number;
  reorderLevel: number;
  maxStock: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL' | 'OUT_OF_STOCK';
}

export interface DailyClosingReportData {
  date: string;
  isClosed: boolean;
  closedBy?: string | null;
  closedAt?: string | null;
  sales: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalFoodQty: number;
    grossSales: number;
    discounts: number;
    refunds: number;
    netSales: number;
    salesByStall: Record<string, number>;
    salesByPaymentMethod: Record<string, number>;
  };
  expenses: {
    cashExpenses: number;
    bankMobileExpenses: number;
    dueExpenses: number;
    totalExpenses: number;
  };
  purchases: {
    totalPurchases: number;
    goodsReceived: number;
    supplierPayments: number;
    supplierOutstanding: number;
    cashPurchasesPaid: number;
  };
  inventory: {
    currentStockValue: number;
    purchasesReceived: number;
    wastageLoss: number;
  };
  profitability: {
    netSales: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
  cashManagement: {
    openingCash: number;
    cashSalesReceived: number;
    cashRefunds: number;
    cashExpenses: number;
    cashPurchasesPaid: number;
    cashDeposits: number;
    cashWithdrawals: number;
    adjustments: number;
    expectedClosingCash: number;
    countedCash: number | null;
    cashDiscrepancy: number | null;
    isReconciled: boolean;
    notes: string;
  };
  nonCashCollections: {
    bKash: number;
    Nagad: number;
    onlineCard: number;
    nfcContactless: number;
    totalNonCash: number;
  };
}

export interface BusinessHealthData {
  today: {
    date: string;
    sales: number;
    ordersCount: number;
    salesChange: number | null;
    expenses: number;
    grossProfit: number;
    netProfit: number;
    wastage: number;
  };
  receivables: {
    customerReceivables: number;
  };
  payables: {
    supplierPayables: number;
    overdueExpenses: number;
  };
  inventory: {
    valuation: number;
    lowStockCount: number;
  };
  insights: Array<{
    id: string;
    type: 'POSITIVE' | 'WARNING' | 'ALERT';
    title: string;
    message: string;
    metric: string;
  }>;
  alerts: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    link: string;
  }>;
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

