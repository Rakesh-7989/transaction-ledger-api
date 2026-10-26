import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, applySchema } from './helpers/index.js';

await applySchema();

test('POST /accounts creates an account with a generated ID, zero balance and system timestamp', async () => {
  const res = await request(app)
    .post('/accounts')
    .send({ name: 'Ravi Kumar' })
    .expect('Content-Type', /json/)
    .expect(201);

  assert.match(res.body.id, /^[0-9a-f-]{36}$/, 'id should be a system-generated UUID');
  assert.strictEqual(res.body.name, 'Ravi Kumar');
  assert.strictEqual(res.body.balance, '0.00', 'new account balance must be 0.00');
  assert.ok(res.body.created_at, 'created_at must be system-generated');
  assert.ok(
    !isNaN(Date.parse(res.body.created_at)),
    'created_at must be a valid timestamp'
  );
});

test('POST /accounts rejects missing name with 400', async () => {
  const res = await request(app).post('/accounts').send({}).expect(400);
  assert.match(res.body.error.code, /VALIDATION_ERROR/);
});

test('POST /accounts rejects empty name with 400', async () => {
  const res = await request(app)
    .post('/accounts')
    .send({ name: '   ' })
    .expect(400);
  assert.match(res.body.error.code, /VALIDATION_ERROR/);
});

test('POST /accounts rejects a client-supplied initial balance with 400', async () => {
  const res = await request(app)
    .post('/accounts')
    .send({ name: 'Ravi Kumar', balance: '500.00' })
    .expect(400);
  assert.match(res.body.error.code, /VALIDATION_ERROR/);
});

test('GET /accounts/:accountId/balance returns 404 for an unknown account', async () => {
  const res = await request(app)
    .get('/accounts/00000000-0000-0000-0000-000000000000/balance')
    .expect(404);
  assert.strictEqual(res.body.error.code, 'ACCOUNT_NOT_FOUND');
});

test('GET /accounts/:accountId/transactions returns 404 for an unknown account', async () => {
  const res = await request(app)
    .get('/accounts/00000000-0000-0000-0000-000000000000/transactions')
    .expect(404);
  assert.strictEqual(res.body.error.code, 'ACCOUNT_NOT_FOUND');
});
