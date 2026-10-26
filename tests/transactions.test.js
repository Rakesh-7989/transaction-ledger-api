import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, applySchema } from './helpers/index.js';

await applySchema();

async function seedAccount(name = 'Tx Account') {
  const { body } = await request(app)
    .post('/accounts')
    .send({ name })
    .expect(201);
  return body.id;
}

test('credit increases the balance exactly once', async () => {
  const accountId = await seedAccount('Credit User');

  const res = await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'credit',
      amount: '100.00',
      description: 'Initial deposit',
      reference_id: 'PAY-001',
    })
    .expect(201);

  assert.match(res.body.id, /^[0-9a-f-]{36}$/);
  assert.strictEqual(res.body.type, 'credit');
  assert.strictEqual(res.body.amount, '100.00');
  assert.strictEqual(res.body.reference_id, 'PAY-001');

  const bal = await request(app)
    .get(`/accounts/${accountId}/balance`)
    .expect(200);
  assert.strictEqual(bal.body.balance, '100.00');
});

test('debit decreases the balance exactly once', async () => {
  const accountId = await seedAccount('Debit User');
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'credit',
      amount: '100.00',
      description: 'seed',
      reference_id: 'SEED-1',
    })
    .expect(201);

  const res = await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'debit',
      amount: '30.00',
      description: 'Purchase',
      reference_id: 'PAY-002',
    })
    .expect(201);

  assert.strictEqual(res.body.type, 'debit');
  assert.strictEqual(res.body.amount, '30.00');

  const bal = await request(app)
    .get(`/accounts/${accountId}/balance`)
    .expect(200);
  assert.strictEqual(bal.body.balance, '70.00');
});

test('debit above available balance is rejected without mutation (422)', async () => {
  const accountId = await seedAccount('Insufficient User');
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'credit',
      amount: '50.00',
      description: 'seed',
      reference_id: 'SEED-1',
    })
    .expect(201);

  const res = await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'debit',
      amount: '80.00',
      description: 'too much',
      reference_id: 'PAY-001',
    })
    .expect(422);
  assert.strictEqual(res.body.error.code, 'INSUFFICIENT_BALANCE');

  // Balance must be unchanged.
  const bal = await request(app)
    .get(`/accounts/${accountId}/balance`)
    .expect(200);
  assert.strictEqual(bal.body.balance, '50.00');

  // No transaction record should be left behind.
  const hist = await request(app)
    .get(`/accounts/${accountId}/transactions`)
    .expect(200);
  assert.strictEqual(hist.body.pagination.total_records, 1);
});

test('zero amount is rejected (400)', async () => {
  const accountId = await seedAccount('Zero User');
  const res = await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'credit',
      amount: '0.00',
      description: 'z',
      reference_id: 'PAY-001',
    })
    .expect(400);
  assert.match(res.body.error.code, /VALIDATION_ERROR/);
});

test('negative amount is rejected (400)', async () => {
  const accountId = await seedAccount('Neg User');
  const res = await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'credit',
      amount: '-10.00',
      description: 'z',
      reference_id: 'PAY-001',
    })
    .expect(400);
  assert.match(res.body.error.code, /VALIDATION_ERROR/);
});

test('malformed amount is rejected (400)', async () => {
  const accountId = await seedAccount('Malformed User');
  const res = await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'credit',
      amount: 'abc',
      description: 'z',
      reference_id: 'PAY-001',
    })
    .expect(400);
  assert.match(res.body.error.code, /VALIDATION_ERROR/);
});

test('unsupported type is rejected (400)', async () => {
  const accountId = await seedAccount('BadType User');
  const res = await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'reversal',
      amount: '10.00',
      description: 'z',
      reference_id: 'PAY-001',
    })
    .expect(400);
  assert.match(res.body.error.code, /VALIDATION_ERROR/);
});

test('duplicate reference for the same account returns conflict and does not change balance', async () => {
  const accountId = await seedAccount('Dup User');
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'credit',
      amount: '100.00',
      description: 'first',
      reference_id: 'PAY-001',
    })
    .expect(201);

  const res = await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'credit',
      amount: '50.00',
      description: 'second',
      reference_id: 'PAY-001',
    })
    .expect(409);
  assert.strictEqual(res.body.error.code, 'DUPLICATE_TRANSACTION');

  const bal = await request(app)
    .get(`/accounts/${accountId}/balance`)
    .expect(200);
  assert.strictEqual(bal.body.balance, '100.00');
});

test('the same reference_id is accepted for different accounts', async () => {
  const a = await seedAccount('Account A');
  const b = await seedAccount('Account B');

  const r1 = await request(app)
    .post(`/accounts/${a}/transactions`)
    .send({
      type: 'credit',
      amount: '10.00',
      description: 'x',
      reference_id: 'PAY-001',
    })
    .expect(201);
  assert.strictEqual(r1.body.reference_id, 'PAY-001');

  const r2 = await request(app)
    .post(`/accounts/${b}/transactions`)
    .send({
      type: 'credit',
      amount: '10.00',
      description: 'x',
      reference_id: 'PAY-001',
    })
    .expect(201);
  assert.strictEqual(r2.body.reference_id, 'PAY-001');
});

test('missing required fields are rejected (400)', async () => {
  const accountId = await seedAccount('MissingFields User');
  const res = await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({ type: 'credit' })
    .expect(400);
  assert.match(res.body.error.code, /VALIDATION_ERROR/);
});
