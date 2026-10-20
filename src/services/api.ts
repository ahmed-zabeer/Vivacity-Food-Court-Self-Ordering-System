import { Table, Stall, MenuItem, Order, RunnerTask, AuditLogEntry, CounterReadyItem, StallReadyConfirmedEvent, StallSubOrder } from '../types';

const API_BASE = '/api';

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
    rawItems: any[];
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    serviceType: 'SELF_SERVICE' | 'TABLE_SERVICE';
    customerNotes?: string;
    paymentMethod?: string;
    couponCode?: string | null;
  }): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit order');
    }
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

  async confirmAndNotifyCustomer(orderId: string, stallId: string, counterStaff?: string, role?: string, userStallId?: string | null): Promise<{ success: boolean; order: Order; stall: StallSubOrder; notificationEvent?: StallReadyConfirmedEvent; alreadyNotified?: boolean }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/stalls/${stallId}/counter-confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(role ? { 'x-user-role': role } : {}),
        ...(userStallId ? { 'x-user-stall-id': userStallId } : {})
      },
      body: JSON.stringify({ counterStaff, role, userStallId })
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
    userStallId?: string | null
  ): Promise<{ success: boolean; order: Order; stall: StallSubOrder; notificationEvent?: StallReadyConfirmedEvent; alreadyNotified?: boolean; isRepeat?: boolean }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/stalls/${stallId}/notify`, {
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

  async resetEverything(user: { name: string; role: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/revenue/reset-everything`, {
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
    lanIps: Array<{ interface: string; address: string; mac: string }>;
    primaryIp: string;
    port: number;
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
  }
};

