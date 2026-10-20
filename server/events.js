// Real-time Event Broadcaster using Server-Sent Events (SSE)
class EventBroadcaster {
  constructor() {
    this.clients = new Set();
  }

  addClient(res) {
    this.clients.add(res);
    res.on('close', () => {
      this.clients.delete(res);
    });
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
