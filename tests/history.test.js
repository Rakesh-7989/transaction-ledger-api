import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, applySchema } from './helpers/index.js';

await applySchema();

async function seedWithMix(accountName = 'History User') {
  const { body: acc } = await request(app)
    .post('/accounts')
    .send({ name: accountName })
    .expect(201);
  const accountId = acc.id;

  // Insert 2 credits then 2 debits with distinct references.
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'credit',
      amount: '100.00',
      description: 'c1',
      reference_id: 'REF-C1',
    })
    .expect(201);
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'credit',
      amount: '50.00',
      description: 'c2',
      reference_id: 'REF-C2',
    })
    .expect(201);
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'debit',
      amount: '30.00',
      description: 'd1',
      reference_id: 'REF-D1',
    })
    .expect(201);
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({
      type: 'debit',
      amount: '20.00',
      description: 'd2',
      reference_id: 'REF-D2',
    })
    .expect(201);

  return accountId;
}

test('type=credit filter returns only credit records', async () => {
  const accountId = await seedWithMix('CreditFilter');
  const res = await request(app)
    .get(`/accounts/${accountId}/transactions?type=credit`)
    .expect(200);
  assert.strictEqual(res.body.pagination.total_records, 2);
  assert.ok(res.body.data.every((t) => t.type === 'credit'));
});

test('type=debit filter returns only debit records', async () => {
  const accountId = await seedWithMix('DebitFilter');
  const res = await request(app)
    .get(`/accounts/${accountId}/transactions?type=debit`)
    .expect(200);
  assert.strictEqual(res.body.pagination.total_records, 2);
  assert.ok(res.body.data.every((t) => t.type === 'debit'));
});

test('omitting type returns both credit and debit records', async () => {
  const accountId = await seedWithMix('NoFilter');
  const res = await request(app)
    .get(`/accounts/${accountId}/transactions`)
    .expect(200);
  assert.strictEqual(res.body.pagination.total_records, 4);
  const types = new Set(res.body.data.map((t) => t.type));
  assert.ok(types.has('credit'));
  assert.ok(types.has('debit'));
});

test('pagination metadata and boundaries are correct', async () => {
  const accountId = await seedWithMix('Pager');
  const res = await request(app)
    .get(`/accounts/${accountId}/transactions?page=1&limit=2`)
    .expect(200);
  assert.strictEqual(res.body.pagination.page, 1);
  assert.strictEqual(res.body.pagination.limit, 2);
  assert.strictEqual(res.body.pagination.total_records, 4);
  assert.strictEqual(res.body.pagination.total_pages, 2);
  assert.strictEqual(res.body.data.length, 2);
});

test('page 2 returns the remaining records', async () => {
  const accountId = await seedWithMix('Pager2');
  const res = await request(app)
    .get(`/accounts/${accountId}/transactions?page=2&limit=2`)
    .expect(200);
  assert.strictEqual(res.body.pagination.page, 2);
  assert.strictEqual(res.body.pagination.total_pages, 2);
  assert.strictEqual(res.body.data.length, 2);
});

test('beyond-last page returns empty data with correct metadata', async () => {
  const accountId = await seedWithMix('Pager3');
  const res = await request(app)
    .get(`/accounts/${accountId}/transactions?page=3&limit=2`)
    .expect(200);
  assert.strictEqual(res.body.pagination.total_pages, 2);
  assert.strictEqual(res.body.data.length, 0);
});

test('limit is clamped to a maximum of 100', async () => {
  const accountId = await seedWithMix('LimitMax');
  const res = await request(app)
    .get(`/accounts/${accountId}/transactions?limit=101`)
    .expect(400);
  assert.match(res.body.error.code, /VALIDATION_ERROR/);
});

test('page must be >= 1', async () => {
  const accountId = await seedWithMix('LimitMin');
  const res = await request(app)
    .get(`/accounts/${accountId}/transactions?page=0`)
    .expect(400);
  assert.match(res.body.error.code, /VALIDATION_ERROR/);
});

test('results are latest-first with deterministic tie-breaking', async () => {
  const accountId = await seedWithMix('Order');
  const res = await request(app)
    .get(`/accounts/${accountId}/transactions`)
    .expect(200);
  const ids = res.body.data.map((t) => t.id);
  // Should equal credits+debits, latest first.
  assert.strictEqual(ids.length, 4);
  // created_at DESC, id DESC: verify non-increasing created_at.
  for (let i = 1; i < res.body.data.length; i++) {
    const prev = new Date(res.body.data[i - 1].created_at).getTime();
    const curr = new Date(res.body.data[i].created_at).getTime();
    assert.ok(prev >= curr, 'created_at must be non-increasing');
  }
});
