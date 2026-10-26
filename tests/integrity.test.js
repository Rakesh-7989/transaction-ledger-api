import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, applySchema } from './helpers/index.js';

await applySchema();

async function seedAccount(name = 'Integrity User') {
  const { body } = await request(app)
    .post('/accounts')
    .send({ name })
    .expect(201);
  return body.id;
}

test('stored balance equals credits minus debits after a mixed sequence', async () => {
  const accountId = await seedAccount('BalanceCheck');

  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({ type: 'credit', amount: '100.00', description: 'c1', reference_id: 'R1' })
    .expect(201);
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({ type: 'credit', amount: '50.00', description: 'c2', reference_id: 'R2' })
    .expect(201);
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({ type: 'debit', amount: '30.00', description: 'd1', reference_id: 'R3' })
    .expect(201);
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({ type: 'debit', amount: '20.00', description: 'd2', reference_id: 'R4' })
    .expect(201);

  const bal = await request(app).get(`/accounts/${accountId}/balance`).expect(200);
  // 100 + 50 - 30 - 20 = 100
  assert.strictEqual(bal.body.balance, '100.00');

  // Independently recompute from the ledger rows.
  const hist = await request(app)
    .get(`/accounts/${accountId}/transactions`)
    .expect(200);
  let computed = 0;
  for (const t of hist.body.data) {
    computed += t.type === 'credit' ? Number(t.amount) : -Number(t.amount);
  }
  assert.strictEqual(computed.toFixed(2), bal.body.balance);
});

test('transaction updates are unavailable (no update endpoint)', async () => {
  const accountId = await seedAccount('NoUpdate');
  const { body: tx } = await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({ type: 'credit', amount: '10.00', description: 'x', reference_id: 'R1' })
    .expect(201);

  const res = await request(app)
    .put(`/accounts/${accountId}/transactions/${tx.id}`)
    .send({ amount: '999.00' })
    .expect(404);
  assert.match(res.body.error.code, /NOT_FOUND/);
});

test('transaction deletes are unavailable (no delete endpoint)', async () => {
  const accountId = await seedAccount('NoDelete');
  const { body: tx } = await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({ type: 'credit', amount: '10.00', description: 'x', reference_id: 'R1' })
    .expect(201);

  const res = await request(app)
    .delete(`/accounts/${accountId}/transactions/${tx.id}`)
    .expect(404);
  assert.match(res.body.error.code, /NOT_FOUND/);
});

test('concurrent debits cannot cause a negative balance', async () => {
  const accountId = await seedAccount('Concurrent');

  // Seed with 100.00.
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({ type: 'credit', amount: '100.00', description: 'seed', reference_id: 'SEED-1' })
    .expect(201);

  // Two simultaneous debits of 80.00 each.
  const results = await Promise.all([
    request(app)
      .post(`/accounts/${accountId}/transactions`)
      .send({
        type: 'debit',
        amount: '80.00',
        description: 'a',
        reference_id: 'DEBIT-A',
      }),
    request(app)
      .post(`/accounts/${accountId}/transactions`)
      .send({
        type: 'debit',
        amount: '80.00',
        description: 'b',
        reference_id: 'DEBIT-B',
      }),
  ]);

  const statuses = results.map((r) => r.status);
  assert.strictEqual(
    statuses.filter((s) => s === 201).length,
    1,
    'exactly one debit should succeed'
  );
  assert.strictEqual(
    statuses.filter((s) => s === 422).length,
    1,
    'exactly one debit should be rejected for insufficient funds'
  );

  const bal = await request(app).get(`/accounts/${accountId}/balance`).expect(200);
  assert.strictEqual(bal.body.balance, '20.00', 'final balance must be 20.00');

  const debits = await request(app)
    .get(`/accounts/${accountId}/transactions?type=debit`)
    .expect(200);
  assert.strictEqual(
    debits.body.pagination.total_records,
    1,
    'exactly one debit transaction should be committed'
  );
});
