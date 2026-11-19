import { API_BASE } from '../config/api';

type EventHandler = (data: any) => void;

export const getClientId = (): string => {
  if (typeof window === 'undefined') return 'server';
  let cid = sessionStorage.getItem('vivacity_client_id');
  if (!cid) {
    cid = 'cli_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    try {
      sessionStorage.setItem('vivacity_client_id', cid);
    } catch {}
  }
  return cid;
};

/**
 * Server-Sent Events need one long-lived connection to one server process.
 * That works on localhost / a LAN server, but on serverless hosting (Vercel)
 * every request may be handled by a different instance, so broadcasts never
 * reach the browser. There we poll a compact change feed instead.
 */
const shouldUseSse = (): boolean => {
  const override = String(import.meta.env.VITE_REALTIME_MODE || '').toLowerCase();
  if (override === 'poll') return false;
  if (override === 'sse') return true;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
};

class RealtimeEventsClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private registeredEvents: Set<string> = new Set();
  private reconnectAttempts = 0;
  private isConnected = false;

  // Polling fallback state
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private pollInFlight = false;
  private lastSync: string | null = null;
  private knownOrderIds: Set<string> = new Set();
  private lastHashes: Record<string, string> = {};
  private lastRevenue = '';
  private hasBaseline = false;

  // Guest notification targeting for the polling fallback. Serverless platforms
  // cannot share an SSE stream between instances, so ready-to-collect popups are
  // reconstructed from the order records returned by /sync/state.
  private subscribedOrderIds: Set<string> = new Set();
  private subscribedTableId: string | null = null;
  private seenNotificationEvents: Set<string> = new Set();

  private defaultEvents = [
    'order_created',
    'order_updated',
    'table_updated',
    'menu_item_updated',
    'kot_generated',
    'runner_task_created',
    'runner_task_updated',
    'audit_log',
    'stall_ready_confirmed',
    'stall_kitchen_ready',
    'revenue_updated',
    'analytics_updated',
    'financial_updated',
    'network_updated',
    'settings_updated',
    'inventory_updated',
    'stall_updated',
    'review_submitted',
    'all_orders_reset',
    'void_request_created',
    'void_request_approved',
    'void_request_rejected',
    'void_request_updated',
    'wastage_removed'
  ];

  connect() {
    if (this.eventSource || typeof window === 'undefined') return;

    if (!shouldUseSse()) {
      this.startPolling();
      return;
    }

    try {
      const cid = getClientId();
      const tid = sessionStorage.getItem('vivacity_table_id') || localStorage.getItem('vivacity_table_id') || '';
      let role = '';
      try {
        const storedUser = JSON.parse(localStorage.getItem('vivacity_user') || 'null');
        role = storedUser?.role || '';
      } catch {}
      const params = new URLSearchParams();
      if (cid) params.append('clientId', cid);
      if (tid) params.append('tableId', tid.trim().toUpperCase());
      if (role) params.append('role', role);
      const url = `${API_BASE}/events${params.toString() ? '?' + params.toString() : ''}`;
      this.eventSource = new EventSource(url);
    } catch (e) {
      this.isConnected = false;
      return;
    }
    this.registeredEvents.clear();

    this.eventSource.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.trigger('connection_status', { connected: true, attempts: 0 });
      // Re-register all listeners on open
      this.defaultEvents.forEach(name => this.registerEvent(name));
      this.listeners.forEach((_, name) => this.registerEvent(name));
    };

    this.eventSource.onerror = () => {
      this.isConnected = false;
      this.reconnectAttempts++;
      this.trigger('connection_status', { connected: false, attempts: this.reconnectAttempts });
      if (this.eventSource) {
        try {
          this.eventSource.close();
        } catch {}
        this.eventSource = null;
        this.registeredEvents.clear();
        // Some hosts (reverse proxies, serverless) cannot keep an event stream
        // open. After a few failures, switch to the polling change feed.
        if (this.reconnectAttempts >= 3) {
          this.startPolling();
          return;
        }
        const delay = Math.min(8000, 1500 * Math.min(this.reconnectAttempts, 4));
        setTimeout(() => this.connect(), delay);
      }
    };

    // Register default events
    this.defaultEvents.forEach(name => this.registerEvent(name));

    // Register any already subscribed events
    this.listeners.forEach((_, name) => this.registerEvent(name));
  }

  subscribe(opts: { tableId?: string; orderId?: string; orderIds?: string[]; role?: string }) {
    // Remember the subscription locally: it is what lets the polling fallback
    // deliver a ready notification only to the matching order/table.
    if (opts.tableId) {
      this.subscribedTableId = String(opts.tableId).trim().toUpperCase();
    }
    if (opts.orderId) {
      this.subscribedOrderIds.add(opts.orderId);
    }
    for (const id of opts.orderIds || []) {
      if (id) this.subscribedOrderIds.add(id);
    }

    const cid = getClientId();
    if (typeof window !== 'undefined' && 'fetch' in window) {
      fetch(`${API_BASE}/events/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: cid,
          ...opts
        })
      }).catch(() => {});
    }
  }

  reconnectWithMetadata() {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
      this.registeredEvents.clear();
    }
    this.connect();
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // ---------------------------------------------------------------------------
  // Polling fallback (serverless deployments)
  // ---------------------------------------------------------------------------
  private startPolling(intervalMs = 5000) {
    if (this.pollTimer || typeof window === 'undefined') return;
    this.pollTimer = setInterval(() => {
      this.pollOnce();
    }, intervalMs);
    this.pollOnce();
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollOnce() {
    if (this.pollInFlight) return;
    this.pollInFlight = true;
    try {
      const params = new URLSearchParams();
      if (this.lastSync) params.append('since', this.lastSync);
      else params.append('includeIds', '1');

      const res = await fetch(`${API_BASE}/sync/state?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Sync failed (${res.status})`);
      const data = await res.json();

      if (!this.isConnected) {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.trigger('connection_status', { connected: true, attempts: 0 });
      }

      if (!this.hasBaseline) {
        (data.orderIds || []).forEach((id: string) => this.knownOrderIds.add(id));
        this.lastHashes = data.hashes || {};
        this.lastRevenue = JSON.stringify(data.revenue || {});
        this.lastSync = data.now;
        this.hasBaseline = true;
        return;
      }

      const orders: any[] = Array.isArray(data.orders) ? data.orders : [];
      for (const order of orders) {
        if (!order || !order.id) continue;
        if (!this.knownOrderIds.has(order.id)) {
          this.knownOrderIds.add(order.id);
          this.trigger('order_created', order);
        }
        this.trigger('order_updated', order);
        this.emitPendingNotifications(order);
      }

      const hashes = data.hashes || {};
      if (this.lastHashes.tables !== hashes.tables) this.trigger('table_updated', null);
      if (this.lastHashes.stalls !== hashes.stalls) this.trigger('stall_updated', null);
      if (this.lastHashes.menu !== hashes.menu) this.trigger('menu_item_updated', null);
      if (this.lastHashes.inventory !== hashes.inventory) this.trigger('inventory_updated', null);
      this.lastHashes = hashes;

      const revenueJson = JSON.stringify(data.revenue || {});
      if (revenueJson !== this.lastRevenue) {
        this.lastRevenue = revenueJson;
        this.trigger('revenue_updated', data.revenue);
        this.trigger('financial_updated', null);
        this.trigger('analytics_updated', null);
      }

      this.lastSync = data.now;
    } catch (err) {
      if (this.isConnected) {
        this.isConnected = false;
        this.reconnectAttempts++;
        this.trigger('connection_status', { connected: false, attempts: this.reconnectAttempts });
      }
    } finally {
      this.pollInFlight = false;
    }
  }

  /**
   * Build the same `stall_ready_confirmed` payload SSE delivers, from a polled
   * order record. Emits once per notification event id so a reminder is never
   * repeated on every poll.
   */
  private emitPendingNotifications(order: any) {
    if (!order || !order.id) return;

    const orderTable = order.tableId ? String(order.tableId).trim().toUpperCase() : null;
    const targetsThisGuest =
      this.subscribedOrderIds.has(order.id) ||
      Boolean(this.subscribedTableId && orderTable && this.subscribedTableId === orderTable);

    if (!targetsThisGuest) return;

    for (const stall of order.stalls || []) {
      const eventId = stall?.notificationEventId;
      const notifiedAt = stall?.lastNotifiedAt || stall?.notifiedAt;
      if (!eventId || !notifiedAt) continue;
      if (this.seenNotificationEvents.has(eventId)) continue;
      this.seenNotificationEvents.add(eventId);

      const attempt = stall.notificationCount || 1;
      const history = Array.isArray(stall.notificationHistory) ? stall.notificationHistory : [];
      const lastAttempt = history.length > 0 ? history[history.length - 1] : null;

      this.trigger('stall_ready_confirmed', {
        orderId: order.id,
        token: order.token,
        tableId: order.tableId || null,
        clientId: order.clientId || null,
        customerName: order.customerName || null,
        customerPhone: order.customerPhone || null,
        stallId: stall.stallId,
        stallName: stall.stallName,
        serviceType: order.serviceType || 'SELF_SERVICE',
        confirmedBy: stall.confirmedBy || null,
        items: stall.items || [],
        notificationEventId: eventId,
        notifiedAt,
        attempt,
        reason: lastAttempt?.reason || null,
        isRepeat: attempt > 1
      });
    }
  }

  private registerEvent(name: string) {
    if (!this.eventSource || this.registeredEvents.has(name)) return;
    this.registeredEvents.add(name);
    this.eventSource.addEventListener(name, (event: any) => {
      try {
        const data = JSON.parse(event.data);
        this.trigger(name, data);
      } catch (e) {
        console.error(`Error parsing SSE event ${name}:`, e);
      }
    });
  }

  on(eventName: string, handler: EventHandler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(handler);
    this.connect(); // ensure connected
    this.registerEvent(eventName);

    return () => {
      this.listeners.get(eventName)?.delete(handler);
    };
  }

  private trigger(eventName: string, data: any) {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.forEach(fn => fn(data));
    }
  }
}

export const realtime = new RealtimeEventsClient();
