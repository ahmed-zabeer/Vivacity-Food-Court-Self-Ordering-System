import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { db } from '../server/db.js';
import apiRouter from '../server/routes.js';

const menuItem = db.getAllMenuItems().find(item => item.isAvailable !== false) || db.getAllMenuItems()[0];

async function withServer(fn) {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  try {
    return await fn(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

async function request(baseUrl, path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, body: json, text };
}

const qrOrder = (clientId, paymentMethod, clientOrderId) => ({
  tableId: 'T17',
  customerOrderType: 'DINE_IN',
  serviceType: 'SELF_SERVICE',
  paymentMethod,
  customerName: 'Authorization Guest',
  customerPhone: '01712345678',
  clientId,
  clientOrderId,
  rawItems: [{ menuItemId: menuItem.id, quantity: 1 }]
});

test('a guest can never confirm its own cash payment', async () => {
  await withServer(async baseUrl => {
    const created = await request(baseUrl, '/orders', {
      method: 'POST',
      body: qrOrder('guest-cash-a', 'CASH', 'req-auth-cash-1')
    });
    assert.equal(created.status, 201, created.text);
    const order = created.body;

    const denied = await request(baseUrl, `/orders/${order.id}/payment`, {
      method: 'POST',
      body: { paymentMethod: 'CASH', clientId: 'guest-cash-a', cashierName: 'Guest' }
    });
    assert.equal(denied.status, 403, denied.text);
    assert.match(denied.body.error, /authorized Central Counter cashier/);

    const stillPending = await request(baseUrl, `/orders/${order.id}?clientId=guest-cash-a`);
    assert.equal(stillPending.body.paymentStatus, 'PAYMENT DUE');

    const confirmed = await request(baseUrl, `/orders/${order.id}/payment`, {
      method: 'POST',
      headers: { 'x-user-role': 'CASHIER' },
      body: { paymentMethod: 'CASH', cashierName: 'Counter Cashier' }
    });
    assert.equal(confirmed.status, 200, confirmed.text);
    assert.equal(confirmed.body.paymentStatus, 'PAID');
    assert.equal(confirmed.body.status, 'PREPARING');
  });
});

test('a guest may read only its own order and list', async () => {
  await withServer(async baseUrl => {
    const created = await request(baseUrl, '/orders', {
      method: 'POST',
      body: qrOrder('guest-read-a', 'bKash', 'req-auth-read-1')
    });
    assert.equal(created.status, 201, created.text);
    const order = created.body;

    const otherGuest = await request(baseUrl, `/orders/${order.id}?clientId=guest-read-b`);
    assert.equal(otherGuest.status, 403, otherGuest.text);

    const owner = await request(baseUrl, `/orders/${order.id}?clientId=guest-read-a`);
    assert.equal(owner.status, 200, owner.text);
    assert.equal(owner.body.id, order.id);

    const anonymousList = await request(baseUrl, '/orders');
    assert.equal(anonymousList.status, 200);
    assert.deepEqual(anonymousList.body, [], 'anonymous guests must not receive the whole order book');

    const ownerList = await request(baseUrl, '/orders?clientId=guest-read-a');
    assert.equal(ownerList.status, 200);
    assert.ok(ownerList.body.every(o => !o.clientId || o.clientId === 'guest-read-a'));
    assert.ok(ownerList.body.some(o => o.id === order.id));
  });
});

test('online payment must come from the guest device that placed the order', async () => {
  await withServer(async baseUrl => {
    const created = await request(baseUrl, '/orders', {
      method: 'POST',
      body: qrOrder('guest-online-a', 'bKash', 'req-auth-online-1')
    });
    assert.equal(created.status, 201, created.text);
    const order = created.body;

    const forged = await request(baseUrl, `/orders/${order.id}/payment`, {
      method: 'POST',
      body: { paymentMethod: 'bKash', clientId: 'guest-online-b', transactionId: 'FAKE-1' }
    });
    assert.equal(forged.status, 403, forged.text);

    const genuine = await request(baseUrl, `/orders/${order.id}/payment`, {
      method: 'POST',
      body: { paymentMethod: 'bKash', clientId: 'guest-online-a', transactionId: 'BKASH-1' }
    });
    assert.equal(genuine.status, 200, genuine.text);
    assert.equal(genuine.body.paymentStatus, 'PAID');
  });
});

test('sync replay returns an owned order even when nothing changed', async () => {
  await withServer(async baseUrl => {
    const created = await request(baseUrl, '/orders', {
      method: 'POST',
      body: qrOrder('guest-sync-a', 'CASH', 'req-auth-sync-1')
    });
    assert.equal(created.status, 201, created.text);
    const order = created.body;

    // Include a "since" marker in the future so the normal change feed would
    // return nothing; the explicit owned-order replay must still work.
    const since = encodeURIComponent(new Date(Date.now() + 60_000).toISOString());
    const sync = await request(
      baseUrl,
      `/sync/state?since=${since}&orderIds=${encodeURIComponent(order.id)}&clientId=guest-sync-a`
    );
    assert.equal(sync.status, 200, sync.text);
    assert.ok(
      (sync.body.orders || []).some(o => o.id === order.id),
      'owned order must be replayed for offline/reconnect notification recovery'
    );

    const foreign = await request(
      baseUrl,
      `/sync/state?since=${since}&orderIds=${encodeURIComponent(order.id)}&clientId=guest-sync-b`
    );
    assert.equal(foreign.status, 200);
    assert.ok(!(foreign.body.orders || []).some(o => o.id === order.id), 'foreign client id must not read the order');
  });
});
