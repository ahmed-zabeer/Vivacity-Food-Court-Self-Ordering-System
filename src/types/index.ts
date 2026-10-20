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
  description: string;
  categories: string[];
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
  isAddOn?: boolean;
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
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
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
  items: {
    id: string;
    name: string;
    quantity: number;
    price?: number;
    notes?: string;
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
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
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

export interface Order {
  id: string;
  token: string;
  tableId: string | null;
  parcelToken?: string | null;
  sessionId?: string | null;
  type: 'DINE_IN' | 'PARCEL';
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

