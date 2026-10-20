type EventHandler = (data: any) => void;

class RealtimeEventsClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private registeredEvents: Set<string> = new Set();

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
    'analytics_updated'
  ];

  connect() {
    if (this.eventSource || typeof window === 'undefined') return;

    this.eventSource = new EventSource('/api/events');
    this.registeredEvents.clear();

    this.eventSource.onopen = () => {
      // connected
    };

    this.eventSource.onerror = () => {
      // auto reconnect is built-in to EventSource
    };

    // Register default events
    this.defaultEvents.forEach(name => this.registerEvent(name));

    // Register any already subscribed events
    this.listeners.forEach((_, name) => this.registerEvent(name));
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
