// Real-time Event Broadcaster using Server-Sent Events (SSE)
class EventBroadcaster {
  constructor() {
    this.clients = new Set();
    this.startHeartbeat();
  }

  startHeartbeat() {
    if (this._heartbeatInterval) return;
    this._heartbeatInterval = setInterval(() => {
      for (const client of this.clients) {
        try {
          client.write(`: keepalive ${Date.now()}\n\n`);
        } catch (err) {
          this.clients.delete(client);
        }
      }
    }, 15000);
    if (this._heartbeatInterval.unref) {
      this._heartbeatInterval.unref();
    }
  }

  addClient(res, meta = {}) {
    res._clientMeta = {
      clientId: meta.clientId || null,
      tableId: meta.tableId ? String(meta.tableId).trim().toUpperCase() : null,
      role: meta.role || 'GUEST',
      orderIds: new Set(meta.orderIds || [])
    };
    this.clients.add(res);
    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  subscribeClient(clientId, { tableId, orderId, orderIds, role }) {
    if (!clientId) return;
    for (const client of this.clients) {
      if (client._clientMeta && client._clientMeta.clientId === clientId) {
        if (tableId) client._clientMeta.tableId = String(tableId).trim().toUpperCase();
        if (orderId) client._clientMeta.orderIds.add(orderId);
        if (Array.isArray(orderIds)) {
          orderIds.forEach(id => client._clientMeta.orderIds.add(id));
        }
        if (role) client._clientMeta.role = role;
      }
    }
  }

  // Targeted notification: ONLY notify the specific guest whose order is ready
  notifyGuest(payload) {
    const message = `event: stall_ready_confirmed\ndata: ${JSON.stringify(payload)}\n\n`;
    const targetOrderId = payload.orderId;
    const targetTableId = payload.tableId ? String(payload.tableId).trim().toUpperCase() : null;
    const targetClientId = payload.clientId || null;

    for (const client of this.clients) {
      try {
        const meta = client._clientMeta || {};
        const isStaff = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'RUNNER'].includes(meta.role);

        // 1. Staff dashboards (Admin, Kitchen, Stall) receive data update for counter ready-confirmations
        if (isStaff) {
          client.write(message);
          continue;
        }

        // 2. GUEST TARGETING:
        // If guest client is explicitly at a DIFFERENT table, NEVER send
        if (targetTableId && meta.tableId && meta.tableId !== targetTableId) {
          continue;
        }

        // 3. Client must match target order, target client, or target table
        const matchesClient = Boolean(targetClientId && meta.clientId && meta.clientId === targetClientId);
        const hasExactOrder = Boolean(targetOrderId && meta.orderIds && meta.orderIds.has(targetOrderId));
        const matchesTable = Boolean(targetTableId && meta.tableId && meta.tableId === targetTableId);
        const hasOtherOrdersOnly = Boolean(meta.orderIds && meta.orderIds.size > 0 && !meta.orderIds.has(targetOrderId));

        // Send only if matching client, matching order, or matching table without other orders
        if (matchesClient || hasExactOrder || (matchesTable && !hasOtherOrdersOnly)) {
          client.write(message);
        }
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Send one event to a single guest connection by its private client id.
   * Used to replay a persisted cancellation notice when a phone reconnects.
   */
  sendToClient(clientId, eventType, data) {
    if (!clientId) return 0;
    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    let delivered = 0;
    for (const client of this.clients) {
      try {
        if (client._clientMeta && client._clientMeta.clientId === clientId) {
          client.write(message);
          delivered++;
        }
      } catch (err) {
        this.clients.delete(client);
      }
    }
    return delivered;
  }

  /**
   * ORDER CANCELLED notification.
   *
   * STRICT guest targeting: an event is delivered only to the device that
   * matches the order's private client id, or to a connection that explicitly
   * subscribed to that exact order id from its tracking page.
   *
   * A shared table id is deliberately NOT enough: one table can hold several
   * independent orders from different phones, and every one of them must keep
   * receiving nothing when a different order at the same table is cancelled.
   */
  notifyGuestCancellation(payload) {
    const targetOrderId = payload && payload.orderId;
    const targetClientId = payload && payload.clientId;
    const eventId = payload && (payload.cancellationEventId || payload.eventId);
    if (!eventId || !targetOrderId) return 0;

    const message = `event: guest_order_cancelled\ndata: ${JSON.stringify(payload)}\n\n`;
    let delivered = 0;

    for (const client of this.clients) {
      try {
        const meta = client._clientMeta || {};
        const isStaff = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'STALL MANAGER', 'KITCHEN STAFF', 'RUNNER', 'RUNNER / WAITER'].includes(meta.role);
        if (isStaff) continue;

        const matchesClient = Boolean(targetClientId && meta.clientId && meta.clientId === targetClientId);
        const hasExactOrder = Boolean(meta.orderIds && meta.orderIds.has(targetOrderId));

        if (matchesClient || hasExactOrder) {
          client.write(message);
          delivered++;
        }
      } catch (err) {
        this.clients.delete(client);
      }
    }
    return delivered;
  }

  broadcast(eventType, data) {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }
}

export const eventBus = new EventBroadcaster();
