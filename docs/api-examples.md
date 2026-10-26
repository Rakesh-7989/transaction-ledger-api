# API Examples

Base URL (local): `http://localhost:3000`
Base URL (production): Your Vercel deployment URL

All bodies are JSON. Monetary amounts are strings (e.g. `"100.00"`) to preserve decimal precision.

---

## 1. Create an account

**POST /accounts**

```http
POST /accounts
Content-Type: application/json

{
  "name": "Ravi Kumar"
}
```

Response: `201 Created`

```json
{
  "id": "a1b2c3d4-1111-4a90-8f2b-123456789abc",
  "name": "Ravi Kumar",
  "balance": "0.00",
  "created_at": "2026-10-27T08:00:00.000Z"
}
```

The client cannot supply `id`, `created_at`, or `balance` — all are system-generated. Supplying `balance` returns `400`.

---

## 2. Credit an account

**POST /accounts/:accountId/transactions**

```http
POST /accounts/a1b2c3d4-1111-4a90-8f2b-123456789abc/transactions
Content-Type: application/json

{
  "type": "credit",
  "amount": "100.00",
  "description": "Initial deposit",
  "reference_id": "PAY-001"
}
```

Response: `201 Created`

```json
{
  "id": "f4e5d6c7-2222-4b91-9f3c-234567890bcd",
  "account_id": "a1b2c3d4-1111-4a90-8f2b-123456789abc",
  "type": "credit",
  "amount": "100.00",
  "description": "Initial deposit",
  "reference_id": "PAY-001",
  "created_at": "2026-10-27T08:05:00.000Z"
}
```

---

## 3. Debit an account

Same endpoint with `type: "debit"`. If the previous balance is `100.00`, debiting `30.00` leaves `70.00`.

Debit above available balance → `422` with no balance change and no transaction record.

---

## 4. Get the balance

**GET /accounts/:accountId/balance**

Response: `200 OK`

```json
{
  "account_id": "a1b2c3d4-1111-4a90-8f2b-123456789abc",
  "balance": "70.00"
}
```

Unknown account → `404`.

---

## 5. Transaction history

**GET /accounts/:accountId/transactions?type=credit&page=1&limit=10**

Response: `200 OK`

```json
{
  "account_id": "a1b2c3d4-1111-4a90-8f2b-123456789abc",
  "data": [
    {
      "id": "...",
      "account_id": "...",
      "type": "credit",
      "amount": "100.00",
      "description": "Initial deposit",
      "reference_id": "PAY-001",
      "created_at": "2026-10-27T08:05:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total_records": 1,
    "total_pages": 1
  }
}
```

- `type` optional (`credit` or `debit`).
- `page >= 1`, `1 <= limit <= 100`.
- Ordering: `created_at DESC, id DESC`.

---

## Error responses

```json
{
  "error": { "code": "VALIDATION_ERROR", "message": "..." }
}
```

| Situation | Status | Code |
|-----------|--------|------|
| Created | 201 | — |
| Invalid input | 400 | `VALIDATION_ERROR` |
| Account not found | 404 | `ACCOUNT_NOT_FOUND` |
| Duplicate reference | 409 | `DUPLICATE_TRANSACTION` |
| Insufficient balance | 422 | `INSUFFICIENT_BALANCE` |
| Route not found | 404 | `NOT_FOUND` |
| Unexpected error | 500 | `INTERNAL_SERVER_ERROR` |
