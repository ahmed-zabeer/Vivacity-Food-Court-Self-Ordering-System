import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { db } from '../server/db.js';
import apiRouter from '../server/routes.js';

const menuItem = db.getAllMenuItems()[0];
const weightBasedItem = db.getAllMenuItems().find(item => item.isWeightBased);

const validOrder = rawItems => ({
  rawItems,
  customerName: 'Security Test',
  customerPhone: '01712345678',
  serviceType: 'SELF_SERVICE',
  customerOrderType: 'DINE_IN',
  paymentMethod: 'CASH'
});

test('createOrder rejects invalid quantities without creating an order', () => {
  for (const quantity of [0, -1, 1.5, 100, '2', NaN, Infinity]) {
    assert.throws(
      () => db.createOrder(validOrder([{ menuItemId: menuItem.id, quantity }])),
      /quantity must be a whole number/
    );
  }
});

test('createOrder rejects invalid weight-based portions', () => {
  assert.ok(weightBasedItem, 'a weight-based menu item is required for this regression test');

  for (const weight of [0, -1, 10001, 1.5, '400', NaN, Infinity]) {
    assert.throws(
      () => db.createOrder(validOrder([{ menuItemId: weightBasedItem.id, quantity: 1, weight }])),
      /weight must be a whole number/
    );
  }
});

test('createOrder rejects empty, oversized, malformed, and unknown carts', () => {
  assert.throws(() => db.createOrder(validOrder([])), /between 1 and 50 items/);
  assert.throws(
    () => db.createOrder(validOrder(Array(51).fill({ menuItemId: menuItem.id }))),
    /between 1 and 50 items/
  );
  assert.throws(() => db.createOrder(validOrder([null])), /valid menu item ID/);
  assert.throws(
    () => db.createOrder(validOrder([{ menuItemId: 'missing-menu-item' }])),
    /not found in menu/
  );
});

test('production payment confirmations fail closed without gateway verification', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/orders/not-a-real-order/payment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'CASH', transactionId: 'FORGED' })
      }
    );
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /verified payment gateway/);
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});
