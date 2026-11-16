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
