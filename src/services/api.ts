import {
  Table, Stall, MenuItem, Order, RunnerTask, AuditLogEntry,
  CounterReadyItem, StallReadyConfirmedEvent, StallSubOrder, Expense,
  DailyFinancialSummary, CustomerOrderType, InventoryMenuItem, OrderReview,
  Purchase, LedgerEntry, IncomeStatement, TrialBalance, BalanceSheet, DueReceivable,
  VoidRequest, VoidRequestType
} from '../types';
import { API_BASE } from '../config/api';

export const api = {
  // Tables
  async getTables(): Promise<Table[]> {
    const res = await fetch(`${API_BASE}/tables`);
    return res.json();
  },

  async getTable(id: string): Promise<Table & { session: any; activeOrders: Order[] }> {
    const res = await fetch(`${API_BASE}/tables/${id}`);
    return res.json();
  },

  async updateTableStatus(id: string, status: string): Promise<Table> {
    const res = await fetch(`${API_BASE}/tables/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async openTableSession(id: string, guestCount = 2) {
    const res = await fetch(`${API_BASE}/tables/${id}/session/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestCount })
    });
    return res.json();
  },

  async closeTableSession(id: string) {
    const res = await fetch(`${API_BASE}/tables/${id}/session/close`, {
      method: 'POST'
    });
    return res.json();
  },

  async markTableAvailable(id: string, options?: { clearedBy?: string; role?: string; forceOverride?: boolean }) {
    const res = await fetch(`${API_BASE}/tables/${id}/mark-available`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {})
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Failed to mark table ${id} as available`);
    }
    return data;
  },

  // Stalls
  async getStalls(): Promise<Stall[]> {
    const res = await fetch(`${API_BASE}/stalls`);
    return res.json();
  },

  async getStall(slug: string): Promise<Stall> {
    const res = await fetch(`${API_BASE}/stalls/${slug}`);
    return res.json();
  },

  // Menu
  async getMenuItems(params?: { stallId?: string; category?: string; search?: string }): Promise<MenuItem[]> {
    const query = new URLSearchParams();
    if (params?.stallId) query.set('stallId', params.stallId);
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    const res = await fetch(`${API_BASE}/menu?${query.toString()}`);
    return res.json();
  },

  async updateItemAvailability(id: string, isAvailable: boolean): Promise<MenuItem> {
    const res = await fetch(`${API_BASE}/menu/${id}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable })
    });
    return res.json();
  },

  async updateItemPrice(id: string, price: number): Promise<MenuItem> {
    const res = await fetch(`${API_BASE}/menu/${id}/price`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price })
    });
    return res.json();
  },

  async getCustomizationConfig(): Promise<any> {
    const res = await fetch(`${API_BASE}/customizations/config`);
    return res.json();
  },

  async updateCustomizationPrice(categoryKey: string, addOnId: string, price: number): Promise<any> {
    const res = await fetch(`${API_BASE}/customizations/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryKey, addOnId, price })
    });
    return res.json();
  },

  // Orders
  async getOrders(params?: { status?: string; tableId?: string; stallId?: string; role?: string; userStallId?: string | null }): Promise<Order[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.tableId) query.set('tableId', params.tableId);
    if (params?.stallId) query.set('stallId', params.stallId);
    const res = await fetch(`${API_BASE}/orders?${query.toString()}`, {
      headers: {
        ...(params?.role ? { 'x-user-role': params.role } : {}),
        ...(params?.userStallId ? { 'x-user-stall-id': params.userStallId } : {})
      }
    });
    return res.json();
  },

  async getOrder(idOrToken: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${idOrToken}`);
    return res.json();
  },

  async createOrder(payload: {
    tableId: string | null;
    type?: 'DINE_IN' | 'PARCEL';
    customerOrderType?: CustomerOrderType;
    rawItems: any[];
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    serviceType: 'SELF_SERVICE' | 'TABLE_SERVICE';
    customerNotes?: string;
    paymentMethod?: string;
    couponCode?: string | null;
    cartSessionId?: string | null;
    clientId?: string | null;
  }): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(payload.cartSessionId ? { 'x-cart-session-id': payload.cartSessionId } : {})
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit order');
    }
    return res.json();
  },

  async createManualOrder(payload: {
    tableId: string | null;
    type?: 'DINE_IN' | 'PARCEL';
    customerOrderType: 'DINE_IN' | 'TAKEAWAY';
    rawItems: any[];
    customerName?: string;
    customerPhone?: string;
    serviceType: 'SELF_SERVICE' | 'TABLE_SERVICE';
    customerNotes?: string;
    paymentMethod: string;
    discountType?: string;
    discountPercent?: number;
    discountAmount?: number;
    discountReason?: string;
    discountAppliedBy?: string;
    discountApprovedBy?: string;
    cashReceived?: number | null;
    changeReturned?: number | null;
    cardPosRef?: string | null;
    cardPosStatus?: string | null;
    cardPosTerminal?: string | null;
    cashierName?: string;
    cashierId?: string;
  }): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit counter order');
    }
    return res.json();
  },

  async logReceiptReprint(orderId: string, staffName?: string, reason?: string): Promise<{ success: boolean; reprintCount: number }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/reprint-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffName, reason })
    });
    return res.json();
  },

  async acceptOrder(id: string, managerName?: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerName })
    });
    return res.json();
  },

  async rejectOrder(id: string, reason: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  async updateOrderStatus(id: string, status: string, note?: string, staffName?: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note, staffName })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update order status');
    }
    return res.json();
  },

  async markItemUnavailable(orderId: string, itemId: string, reason: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/mark-unavailable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, reason })
    });
    return res.json();
  },

  async customerRemoveUnavailableItem(orderId: string, itemId: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/remove-unavailable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId })
    });
    return res.json();
  },

  async customerReplaceUnavailableItem(
    orderId: string,
    oldItemId: string,
    newMenuItemId: string,
    quantity?: number,
    notes?: string
  ): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/replace-unavailable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldItemId, newMenuItemId, quantity, notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to replace unavailable item');
    }
    return res.json();
  },

  async processPayment(orderId: string, payload: {
    paymentMethod: string;
    transactionId?: string;
    cashierName?: string;
  }): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async updateStallStatus(orderId: string, stallId: string, status: string, staffName?: string, role?: string, userStallId?: string | null): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/stalls/${stallId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(role ? { 'x-user-role': role } : {}),
        ...(userStallId ? { 'x-user-stall-id': userStallId } : {})
      },
      body: JSON.stringify({ status, staffName, role, userStallId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update stall status');
    }
    return res.json();
  },

  async startPreparingStall(orderId: string, stallId: string, staffName?: string, role?: string, userStallId?: string | null): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/stalls/${stallId}/start-prep`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(role ? { 'x-user-role': role } : {}),
        ...(userStallId ? { 'x-user-stall-id': userStallId } : {})
      },
      body: JSON.stringify({ staffName, role, userStallId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to start preparing');
    }
    return res.json();
  },

  async markStallReady(orderId: string, stallId: string, staffName?: string, role?: string, userStallId?: string | null): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/stalls/${stallId}/ready`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(role ? { 'x-user-role': role } : {}),
        ...(userStallId ? { 'x-user-stall-id': userStallId } : {})
      },
      body: JSON.stringify({ staffName, role, userStallId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to mark ready');
    }
    return res.json();
  },

  async confirmAndNotifyCustomer(orderId: string, stallId: string, counterStaff?: string, role?: string, userStallId?: string | null, reason?: string): Promise<{ success: boolean; order: Order; stall: StallSubOrder; notificationEvent?: StallReadyConfirmedEvent; alreadyNotified?: boolean }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/stalls/${stallId}/counter-confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(role ? { 'x-user-role': role } : {}),
        ...(userStallId ? { 'x-user-stall-id': userStallId } : {})
      },
      body: JSON.stringify({ counterStaff, role, userStallId, reason })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to confirm customer notification');
    }
    return res.json();
  },

  async notifyGuestStall(
    orderId: string,
    stallId: string,
    staffName?: string,
    role?: string,
    userStallId?: string | null,
    reason?: string
  ): Promise<{ success: boolean; order: Order; stall: StallSubOrder; notificationEvent?: StallReadyConfirmedEvent; alreadyNotified?: boolean; isRepeat?: boolean }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/stalls/${stallId}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(role ? { 'x-user-role': role } : {}),
        ...(userStallId ? { 'x-user-stall-id': userStallId } : {})
      },
      body: JSON.stringify({ staffName, role, userStallId, reason })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to notify guest');
    }
    return res.json();
  },

  async markStallCollected(orderId: string, stallId: string, staffName?: string, role?: string, userStallId?: string | null): Promise<{ success: boolean; order: Order; stall: StallSubOrder }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/stalls/${stallId}/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(role ? { 'x-user-role': role } : {}),
        ...(userStallId ? { 'x-user-stall-id': userStallId } : {})
      },
      body: JSON.stringify({ staffName, role, userStallId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to mark food collected');
    }
    return res.json();
  },

  async getCounterReadyConfirmations(): Promise<CounterReadyItem[]> {
    const res = await fetch(`${API_BASE}/counter/ready-confirmations`);
    return res.json();
  },

  async updateMenuItemPrepTime(id: string, prepMinutes: number): Promise<MenuItem> {
    const res = await fetch(`${API_BASE}/menu/${id}/prep-time`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prepMinutes })
    });
    return res.json();
  },

  async updateStallPrepTime(id: string, prepMinutes: number): Promise<Stall> {
    const res = await fetch(`${API_BASE}/stalls/${id}/prep-time`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prepMinutes })
    });
    return res.json();
  },

  // Runners
  async getRunners(): Promise<RunnerTask[]> {
    const res = await fetch(`${API_BASE}/runners`);
    return res.json();
  },

  async updateRunnerStatus(taskId: string, status: string): Promise<RunnerTask> {
    const res = await fetch(`${API_BASE}/runners/${taskId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  // Analytics & Logs
  async getAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics`);
    return res.json();
  },

  async getRevenueSummary(): Promise<any> {
    const res = await fetch(`${API_BASE}/revenue`);
    return res.json();
  },

  async resetDailyRevenue(user: { name: string; role: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/revenue/reset-daily`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify({
        userName: user.name,
        userRole: user.role
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reset daily revenue');
    }
    return res.json();
  },

  async resetMonthlyRevenue(user: { name: string; role: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/revenue/reset-monthly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify({
        userName: user.name,
        userRole: user.role
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reset monthly revenue');
    }
    return res.json();
  },

  async resetYearlyRevenue(user: { name: string; role: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/revenue/reset-yearly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify({
        userName: user.name,
        userRole: user.role
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reset yearly revenue');
    }
    return res.json();
  },

  async resetTables(user: { name: string; role: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/revenue/reset-tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify({
        userName: user.name,
        userRole: user.role
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reset tables');
    }
    return res.json();
  },

  async resetAllMetrics(user: { name: string; role: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/revenue/reset-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify({
        userName: user.name,
        userRole: user.role
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to perform full reset');
    }
    return res.json();
  },

  async resetEverything(user: { name: string; role: string; reason?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/revenue/reset-everything`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify({
        userName: user.name,
        userRole: user.role,
        reason: user.reason
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete orders and reset metrics');
    }
    return res.json();
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await fetch(`${API_BASE}/audit-logs`);
    return res.json();
  },

  async getUsers(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/users`);
    return res.json();
  },

  async getNetworkInfo(): Promise<{
    lanIps: Array<{ interface: string; address: string; mac: string; isWifi?: boolean; isEthernet?: boolean; isPrivateRange?: boolean }>;
    primaryIp: string;
    port: number;
    isReachableOnLan: boolean;
    localhostUrl: string;
    recommendedBaseUrl: string;
    activeQrBaseUrl: string;
  }> {
    const res = await fetch(`${API_BASE}/network-info`);
    if (!res.ok) throw new Error('Failed to fetch network information');
    return res.json();
  },

  async updateQrBaseUrl(qrBaseUrl: string): Promise<{ success: boolean; qrBaseUrl: string }> {
    const res = await fetch(`${API_BASE}/settings/qr-base-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrBaseUrl })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update QR base URL');
    }
    return res.json();
  },

  // ── Expense Management ──
  async getExpenses(params?: { date?: string; dateFrom?: string; dateTo?: string }): Promise<Expense[]> {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    const res = await fetch(`${API_BASE}/expenses?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch expenses');
    return res.json();
  },

  async addExpense(data: {
    amount: number;
    date: string;
    category: Expense['category'];
    notes?: string;
  }, user: { name: string; role: string }): Promise<Expense> {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add expense');
    }
    return res.json();
  },

  async updateExpense(id: string, data: Partial<{
    amount: number;
    date: string;
    category: Expense['category'];
    notes: string;
  }>, user: { name: string; role: string }): Promise<Expense> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update expense');
    }
    return res.json();
  },

  async deleteExpense(id: string, user: { name: string; role: string }): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete expense');
    }
    return res.json();
  },

  async getDailyFinancialSummary(date?: string): Promise<DailyFinancialSummary> {
    const query = date ? `?date=${date}` : '';
    const res = await fetch(`${API_BASE}/financial/daily-summary${query}`);
    if (!res.ok) throw new Error('Failed to fetch daily financial summary');
    return res.json();
  },

  async getFinancialGraph(params?: number | { days?: number; dateFrom?: string; dateTo?: string }): Promise<DailyFinancialSummary[]> {
    let url = `${API_BASE}/financial/graph`;
    if (typeof params === 'number') {
      url += `?days=${params}`;
    } else if (params) {
      const q = new URLSearchParams();
      if (params.days) q.append('days', params.days.toString());
      if (params.dateFrom) q.append('dateFrom', params.dateFrom);
      if (params.dateTo) q.append('dateTo', params.dateTo);
      url += `?${q.toString()}`;
    } else {
      url += `?days=7`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch financial graph data');
    return res.json();
  },

  async refundOrder(orderId: string, reason?: string, staffName = 'Manager'): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, staffName })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to refund order');
    }
    return res.json();
  },

  // --- Inventory Management ---
  async getInventory(stallId?: string): Promise<InventoryMenuItem[]> {
    const url = stallId ? `${API_BASE}/inventory?stallId=${encodeURIComponent(stallId)}` : `${API_BASE}/inventory`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
  },

  async setItemStock(menuItemId: string, preparedQty: number, user: { name: string; role: string; stallId?: string | null }): Promise<InventoryMenuItem> {
    const res = await fetch(`${API_BASE}/inventory/${menuItemId}/stock`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name,
        ...(user.stallId ? { 'x-user-stall-id': user.stallId } : {})
      },
      body: JSON.stringify({ preparedQty })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update stock');
    }
    return res.json();
  },

  async setItemManualAvailability(menuItemId: string, isAvailable: boolean, user: { name: string; role: string }): Promise<InventoryMenuItem> {
    const res = await fetch(`${API_BASE}/inventory/${menuItemId}/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify({ isAvailable })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update item availability');
    }
    return res.json();
  },

  async resetItemStock(menuItemId: string, user: { name: string; role: string }): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/inventory/${menuItemId}/reset`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reset stock');
    }
    return res.json();
  },

  // --- Live Cart Reservation ---
  async reserveCartItem(sessionId: string, menuItemId: string, quantity: number): Promise<{ success: boolean; menuItemId: string; quantity: number }> {
    const res = await fetch(`${API_BASE}/cart/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, menuItemId, quantity })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reserve food item');
    }
    return res.json();
  },

  async releaseCartItem(sessionId: string, menuItemId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/cart/release-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, menuItemId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to release item');
    }
    return res.json();
  },

  async releaseCartSession(sessionId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/cart/release-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to release cart session');
    }
    return res.json();
  },

  async sendCartHeartbeat(sessionId: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/cart/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (!res.ok) return { success: false };
      return res.json();
    } catch {
      return { success: false };
    }
  },

  async getCartReservations(sessionId?: string): Promise<any[]> {
    const url = sessionId ? `${API_BASE}/cart/reservations/${encodeURIComponent(sessionId)}` : `${API_BASE}/cart/reservations`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch cart reservations');
    return res.json();
  },

  // --- Stall Pause / Resume ---
  async pauseStall(stallId: string, reason: string, durationMinutes: number | null, user: { name: string; role: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/stalls/${stallId}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify({ reason, durationMinutes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to pause stall');
    }
    return res.json();
  },

  async resumeStall(stallId: string, user: { name: string; role: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/stalls/${stallId}/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to resume stall');
    }
    return res.json();
  },

  async getStallStatus(stallId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/stalls/${stallId}/status`);
    if (!res.ok) return { isPaused: false };
    return res.json();
  },

  // --- Order Reviews ---
  async submitOrderReview(orderId: string, payload: { rating: number; feedback?: string }): Promise<OrderReview> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit review');
    }
    return res.json();
  },

  async getOrderReview(orderId: string): Promise<OrderReview | null> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/review`);
    if (!res.ok) return null;
    return res.json();
  },

  async getReviews(user: { name: string; role: string }, limit = 100): Promise<OrderReview[]> {
    const res = await fetch(`${API_BASE}/reviews?limit=${limit}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name
      }
    });
    if (!res.ok) return [];
    return res.json();
  },

  // --- Accounting & Ledger ---
  async getAccountingLedger(params: { dateFrom?: string; dateTo?: string; type?: string; search?: string }, user: { name: string; role: string }): Promise<LedgerEntry[]> {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.type) q.append('type', params.type);
    if (params.search) q.append('search', params.search);
    const res = await fetch(`${API_BASE}/accounting/ledger?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name
      }
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getIncomeStatement(params: { dateFrom?: string; dateTo?: string }, user: { name: string; role: string }): Promise<IncomeStatement> {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    const res = await fetch(`${API_BASE}/accounting/income-statement?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name
      }
    });
    if (!res.ok) throw new Error('Failed to fetch income statement');
    return res.json();
  },

  async getTrialBalance(params: { dateFrom?: string; dateTo?: string }, user: { name: string; role: string }): Promise<TrialBalance> {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    const res = await fetch(`${API_BASE}/accounting/trial-balance?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name
      }
    });
    if (!res.ok) throw new Error('Failed to fetch trial balance');
    return res.json();
  },

  async getBalanceSheet(user: { name: string; role: string }): Promise<BalanceSheet> {
    const res = await fetch(`${API_BASE}/accounting/balance-sheet`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name
      }
    });
    if (!res.ok) throw new Error('Failed to fetch balance sheet');
    return res.json();
  },

  async getDueReceivables(user: { name: string; role: string }): Promise<DueReceivable[]> {
    const res = await fetch(`${API_BASE}/accounting/dues`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name
      }
    });
    if (!res.ok) return [];
    return res.json();
  },

  // --- Purchases (Due Purchases) ---
  async getPurchases(params: { dateFrom?: string; dateTo?: string; status?: string }, user: { name: string; role: string }): Promise<Purchase[]> {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.status) q.append('status', params.status);
    const res = await fetch(`${API_BASE}/purchases?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name
      }
    });
    if (!res.ok) return [];
    return res.json();
  },

  async addPurchase(data: { supplier: string; description: string; category: string; amount: number; date: string; status: 'PAID' | 'UNPAID' }, user: { name: string; role: string }): Promise<Purchase> {
    const res = await fetch(`${API_BASE}/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add purchase');
    }
    return res.json();
  },

  async updatePurchase(id: string, data: Partial<Purchase>, user: { name: string; role: string }): Promise<Purchase> {
    const res = await fetch(`${API_BASE}/purchases/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update purchase');
    }
    return res.json();
  },

  async deletePurchase(id: string, user: { name: string; role: string }): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/purchases/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete purchase');
    }
    return res.json();
  },

  // ======================================================
  // REPORTING & BUSINESS INTELLIGENCE API METHODS
  // ======================================================

  async getTopSellingItems(params: any, user: { name: string; role: string; stallId?: string | null }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.stallId) q.append('stallId', params.stallId);
    if (params.category) q.append('category', params.category);
    if (params.sortBy) q.append('sortBy', params.sortBy);
    if (params.limit) q.append('limit', params.limit);
    if (params.search) q.append('search', params.search);

    const res = await fetch(`${API_BASE}/reports/sales/top-selling?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-stall': user.stallId || ''
      }
    });
    if (!res.ok) return { items: [] };
    return res.json();
  },

  async getSalesSummary(params: any, user: { name: string; role: string; stallId?: string | null }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.stallId) q.append('stallId', params.stallId);

    const res = await fetch(`${API_BASE}/reports/sales/summary?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-stall': user.stallId || ''
      }
    });
    if (!res.ok) return null;
    return res.json();
  },

  async getSalesDetails(params: any, user: { name: string; role: string; stallId?: string | null }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.stallId) q.append('stallId', params.stallId);
    if (params.paymentMethod) q.append('paymentMethod', params.paymentMethod);
    if (params.search) q.append('search', params.search);
    if (params.page) q.append('page', params.page);
    if (params.limit) q.append('limit', params.limit);

    const res = await fetch(`${API_BASE}/reports/sales/details?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-stall': user.stallId || ''
      }
    });
    if (!res.ok) return { transactions: [], totalCount: 0 };
    return res.json();
  },

  async getSalesByUser(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);

    const res = await fetch(`${API_BASE}/reports/sales/by-user?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getOrderTypeSummary(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);

    const res = await fetch(`${API_BASE}/reports/sales/order-type?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getStallWiseSales(params: any, user: { name: string; role: string; stallId?: string | null }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);

    const res = await fetch(`${API_BASE}/reports/sales/stall-wise?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-stall': user.stallId || ''
      }
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getCategoryWiseSales(params: any, user: { name: string; role: string; stallId?: string | null }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.stallId) q.append('stallId', params.stallId);

    const res = await fetch(`${API_BASE}/reports/sales/category-wise?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-stall': user.stallId || ''
      }
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getHourlySales(params: any, user: { name: string; role: string; stallId?: string | null }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.stallId) q.append('stallId', params.stallId);

    const res = await fetch(`${API_BASE}/reports/sales/hourly?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-stall': user.stallId || ''
      }
    });
    if (!res.ok) return { hours: [] };
    return res.json();
  },

  async getPaymentMethodReport(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);

    const res = await fetch(`${API_BASE}/reports/sales/payment-methods?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return { methods: [], totalCollections: 0 };
    return res.json();
  },

  async getDiscountsRefundsReport(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);

    const res = await fetch(`${API_BASE}/reports/sales/discounts-refunds?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return null;
    return res.json();
  },

  // --- Expense Reports ---
  async getExpenseByCategory(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);

    const res = await fetch(`${API_BASE}/reports/expenses/by-category?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getExpenseBySupplier(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);

    const res = await fetch(`${API_BASE}/reports/expenses/by-supplier?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getDueExpenses(user: { name: string; role: string }) {
    const res = await fetch(`${API_BASE}/reports/expenses/dues`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return { dueExpenses: [], totalDueOverall: 0 };
    return res.json();
  },

  async recordExpensePayment(id: string, data: any, user: { name: string; role: string }) {
    const res = await fetch(`${API_BASE}/reports/expenses/${id}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record expense payment');
    }
    return res.json();
  },

  async getExpenseList(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.category) q.append('category', params.category);
    if (params.search) q.append('search', params.search);
    if (params.page) q.append('page', params.page);
    if (params.limit) q.append('limit', params.limit);

    const res = await fetch(`${API_BASE}/reports/expenses/list?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return { expenses: [], totalCount: 0 };
    return res.json();
  },

  async getExpenseSummary(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);

    const res = await fetch(`${API_BASE}/reports/expenses/summary?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return null;
    return res.json();
  },

  // --- Purchase Reports ---
  async getPurchaseOrders(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.supplier) q.append('supplier', params.supplier);
    if (params.status) q.append('status', params.status);
    if (params.search) q.append('search', params.search);
    if (params.page) q.append('page', params.page);
    if (params.limit) q.append('limit', params.limit);

    const res = await fetch(`${API_BASE}/reports/purchases/orders?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return { orders: [], totalCount: 0 };
    return res.json();
  },

  async getPurchaseBySupplier(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);

    const res = await fetch(`${API_BASE}/reports/purchases/by-supplier?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getPurchaseItemDetails(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.supplier) q.append('supplier', params.supplier);
    if (params.search) q.append('search', params.search);

    const res = await fetch(`${API_BASE}/reports/purchases/items?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getPurchaseSummary(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);

    const res = await fetch(`${API_BASE}/reports/purchases/summary?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return null;
    return res.json();
  },

  async recordPurchasePayment(id: string, data: any, user: { name: string; role: string }) {
    const res = await fetch(`${API_BASE}/reports/purchases/${id}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record purchase payment');
    }
    return res.json();
  },

  async recordGoodsReceipt(id: string, data: any, user: { name: string; role: string }) {
    const res = await fetch(`${API_BASE}/reports/purchases/${id}/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record goods receipt');
    }
    return res.json();
  },

  // --- Inventory Reports ---
  async getInventoryValuation(params: any, user: { name: string; role: string; stallId?: string | null }) {
    const q = new URLSearchParams();
    if (params.stallId) q.append('stallId', params.stallId);
    if (params.category) q.append('category', params.category);
    if (params.search) q.append('search', params.search);

    const res = await fetch(`${API_BASE}/reports/inventory/valuation?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-stall': user.stallId || ''
      }
    });
    if (!res.ok) return { items: [], totalValuation: 0 };
    return res.json();
  },

  async getStockSummary(params: any, user: { name: string; role: string; stallId?: string | null }) {
    const q = new URLSearchParams();
    if (params.stallId) q.append('stallId', params.stallId);
    if (params.status) q.append('status', params.status);
    if (params.search) q.append('search', params.search);

    const res = await fetch(`${API_BASE}/reports/inventory/stock-summary?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-stall': user.stallId || ''
      }
    });
    if (!res.ok) return { items: [], counts: {} };
    return res.json();
  },

  async getStockMovements(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.itemId) q.append('itemId', params.itemId);
    if (params.movementType) q.append('movementType', params.movementType);
    if (params.search) q.append('search', params.search);
    if (params.page) q.append('page', params.page);
    if (params.limit) q.append('limit', params.limit);

    const res = await fetch(`${API_BASE}/reports/inventory/movements?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return { movements: [], totalCount: 0 };
    return res.json();
  },

  async getStockInReport(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.supplier) q.append('supplier', params.supplier);
    if (params.search) q.append('search', params.search);

    const res = await fetch(`${API_BASE}/reports/inventory/stock-in?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getStockOutReport(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.reason) q.append('reason', params.reason);
    if (params.search) q.append('search', params.search);

    const res = await fetch(`${API_BASE}/reports/inventory/stock-out?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getLowStockReport(params: any, user: { name: string; role: string; stallId?: string | null }) {
    const q = new URLSearchParams();
    if (params.stallId) q.append('stallId', params.stallId);

    const res = await fetch(`${API_BASE}/reports/inventory/low-stock?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-stall': user.stallId || ''
      }
    });
    if (!res.ok) return { lowStockItems: [], totalLowStockCount: 0 };
    return res.json();
  },

  async getWastageReport(params: any, user: { name: string; role: string }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);

    const res = await fetch(`${API_BASE}/reports/inventory/wastage?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return { wastageRecords: [], totalLossValue: 0 };
    return res.json();
  },

  async recordWastage(data: any, user: { name: string; role: string }) {
    const res = await fetch(`${API_BASE}/reports/inventory/wastage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record wastage');
    }
    return res.json();
  },

  async removeWastage(movementId: string, reason: string, user: { name: string; role: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/reports/inventory/wastage/${movementId}/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify({ reason, userRole: user.role, userName: user.name })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to remove wastage');
    }
    return res.json();
  },

  async getVoidSummaryReport(params: { dateFrom?: string; dateTo?: string; search?: string }, user: { name: string; role: string }): Promise<any> {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.search) q.append('search', params.search);
    const res = await fetch(`${API_BASE}/reports/accounting/void-summary?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return { totalRequests: 0, pendingRequests: 0, approvedVoids: 0, rejectedRequests: 0, fullOrderVoids: 0, partialItemVoids: 0, quantityCorrections: 0, totalVoidedSales: 0, totalRefundsIssued: 0, requests: [] };
    return res.json();
  },

  async getResetHistoryReport(params: { dateFrom?: string; dateTo?: string; search?: string }, user: { name: string; role: string }): Promise<any> {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.search) q.append('search', params.search);
    const res = await fetch(`${API_BASE}/reports/accounting/reset-history?${q.toString()}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return { totalResets: 0, history: [] };
    return res.json();
  },

  async recordStockAdjustment(data: any, user: { name: string; role: string }) {
    const res = await fetch(`${API_BASE}/reports/inventory/adjustment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record stock adjustment');
    }
    return res.json();
  },

  async getIngredientConsumption(params: any, user: { name: string; role: string; stallId?: string | null }) {
    const q = new URLSearchParams();
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.stallId) q.append('stallId', params.stallId);

    const res = await fetch(`${API_BASE}/reports/inventory/consumption?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-stall': user.stallId || ''
      }
    });
    if (!res.ok) return { consumption: [] };
    return res.json();
  },

  async getInventoryForecast(params: any, user: { name: string; role: string; stallId?: string | null }) {
    const q = new URLSearchParams();
    if (params.days) q.append('days', params.days);
    if (params.stallId) q.append('stallId', params.stallId);

    const res = await fetch(`${API_BASE}/reports/inventory/forecast?${q.toString()}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-stall': user.stallId || ''
      }
    });
    if (!res.ok) return { forecasts: [] };
    return res.json();
  },

  // --- Daily Closing & Cash Management ---
  async getDailyClosing(date: string, user: { name: string; role: string }) {
    const res = await fetch(`${API_BASE}/reports/daily-closing?date=${date}`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return null;
    return res.json();
  },

  async recordCashReconciliation(data: any, user: { name: string; role: string }) {
    const res = await fetch(`${API_BASE}/reports/daily-closing/reconcile-cash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-name': user.name
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record cash reconciliation');
    }
    return res.json();
  },

  // --- Business Intelligence ---
  async getBusinessHealth(user: { name: string; role: string }) {
    const res = await fetch(`${API_BASE}/reports/bi/health`, {
      headers: { 'x-user-role': user.role, 'x-user-name': user.name }
    });
    if (!res.ok) return null;
    return res.json();
  },

  // --- Void / Order Cancellation Approval System ---
  async createVoidRequest(payload: {
    orderId: string;
    requestType: VoidRequestType;
    reason: string;
    cashierId?: string;
    cashierName?: string;
    cashierRole?: string;
    requestDetails?: any;
  }): Promise<VoidRequest> {
    const res = await fetch(`${API_BASE}/void-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': payload.cashierRole || 'CASHIER',
        'x-user-name': payload.cashierName || 'Cashier'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit void request');
    }
    return res.json();
  },

  async getVoidRequests(params?: { status?: string; orderId?: string }): Promise<VoidRequest[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.orderId) query.append('orderId', params.orderId);
    const res = await fetch(`${API_BASE}/void-requests${query.toString() ? '?' + query.toString() : ''}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch void requests');
    }
    return res.json();
  },

  async getVoidRequest(id: string): Promise<VoidRequest> {
    const res = await fetch(`${API_BASE}/void-requests/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch void request');
    }
    return res.json();
  },

  async approveVoidRequest(id: string, payload: {
    resolverId?: string;
    resolverName?: string;
    resolverRole?: string;
    approvalNote?: string;
  }): Promise<{ success: boolean; voidRequest: VoidRequest; order: Order }> {
    const res = await fetch(`${API_BASE}/void-requests/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': payload.resolverRole || 'MANAGER',
        'x-user-name': payload.resolverName || 'Manager'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to approve void request');
    }
    return res.json();
  },

  async rejectVoidRequest(id: string, payload: {
    resolverId?: string;
    resolverName?: string;
    resolverRole?: string;
    rejectionReason: string;
  }): Promise<{ success: boolean; voidRequest: VoidRequest; order: Order }> {
    const res = await fetch(`${API_BASE}/void-requests/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': payload.resolverRole || 'MANAGER',
        'x-user-name': payload.resolverName || 'Manager'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reject void request');
    }
    return res.json();
  }
};

