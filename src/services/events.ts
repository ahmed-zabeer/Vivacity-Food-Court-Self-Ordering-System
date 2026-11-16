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

class RealtimeEventsClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private registeredEvents: Set<string> = new Set();
  private reconnectAttempts = 0;
  private isConnected = false;

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

    try {
      const cid = getClientId();
      const tid = sessionStorage.getItem('vivacity_table_id') || localStorage.getItem('vivacity_table_id') || '';
      const params = new URLSearchParams();
      if (cid) params.append('clientId', cid);
      if (tid) params.append('tableId', tid.trim().toUpperCase());
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
