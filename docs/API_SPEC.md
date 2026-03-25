# Sri Vinayaka Tenders - REST API Specification

All endpoints are prefixed with `/api`. The backend must implement JWT-based authentication.

## Authentication

All requests (except login/signup) require:
- `Authorization: Bearer <JWT_TOKEN>` header

---

## Endpoints

### Auth

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| `POST` | `/auth/login` | `{ email, password }` | `{ token, user: { id, username } }` | Login and get JWT |
| `POST` | `/auth/signup` | `{ email, password, displayName? }` | `{ message }` | Register new user |
| `GET` | `/auth/me` | — | `{ user: { id, username } }` | Verify token, return user |

### Admin

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| `POST` | `/admin/create` | `{ email, password }` | `{ message, user }` | Create new admin (requires auth) |
| `PUT` | `/admin/change-password` | `{ oldPassword, newPassword }` | `{ message }` | Change current user password |
| `GET` | `/admin/login-history` | — | `LoginHistoryEntry[]` | Get last 50 login records |

### Loans

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| `GET` | `/loans` | — | `Loan[]` | Get all loans for current user (with transactions) |
| `POST` | `/loans` | `Partial<Loan>` | `Loan` | Create a new loan |
| `PUT` | `/loans/:id` | `Partial<Loan>` | `Loan` | Update a loan |
| `POST` | `/loans/delete-multiple` | `{ ids: string[] }` | `204` | Delete multiple loans |

### Transactions

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| `POST` | `/loans/:loanId/transactions` | `{ amount, payment_date }` | `Transaction` | Add transaction to loan |
| `PUT` | `/loans/:loanId/transactions/:txnId` | `{ amount?, payment_date? }` | `Transaction` | Update transaction |
| `DELETE` | `/loans/:loanId/transactions/:txnId` | — | `204` | Delete transaction |

### Investors

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| `GET` | `/investors` | — | `Investor[]` | Get all investors for current user (with payments) |
| `POST` | `/investors` | `Partial<Investor>` | `Investor` | Create investor |
| `PUT` | `/investors/:id` | `Partial<Investor>` | `Investor` | Update investor |
| `DELETE` | `/investors/:id` | — | `204` | Delete investor |

### Investor Payments

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| `POST` | `/investors/:investorId/payments` | `{ amount, payment_date, payment_type, remarks? }` | `InvestorPayment` | Add payment |
| `PUT` | `/investors/:investorId/payments/:payId` | `{ amount?, payment_date?, payment_type?, remarks? }` | `Investor` | Update payment |
| `DELETE` | `/investors/:investorId/payments/:payId` | — | `204` | Delete payment |

### Notifications

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| `GET` | `/notifications` | Query: `?is_read=true/false` | `Notification[]` | Get notifications |
| `POST` | `/notifications` | `Notification[]` (without id/created_at/user_id) | `201` | Create notifications |
| `PUT` | `/notifications/:id/read` | — | `204` | Mark single as read |
| `PUT` | `/notifications/read-all` | — | `204` | Mark all as read |

### Backup

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| `POST` | `/backup/mongodb` | `{ loans, investors, exportedAt }` | `{ message }` | Save backup to MongoDB Atlas |
| `POST` | `/admin/restore` | `{ loans, investors, ... }` | `{ message }` | Restore from backup JSON |

### Security

This API uses bearer JWT authentication via the `Authorization` header. CSRF tokens are not used.

---

## Data Types

### Loan (returned by GET /loans)
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "customerName": "string",
  "phone": "string",
  "loanType": "Finance | Tender | InterestRate",
  "loanAmount": 0,
  "givenAmount": 0,
  "interestRate": null,
  "durationValue": null,
  "durationUnit": "Months | Weeks | Days | null",
  "durationInMonths": null,
  "durationInDays": null,
  "startDate": "YYYY-MM-DD",
  "status": "Active | Completed | Overdue",
  "transactions": [],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Transaction
```json
{
  "id": "uuid",
  "loan_id": "uuid",
  "user_id": "uuid",
  "amount": 0,
  "payment_date": "YYYY-MM-DD",
  "created_at": "ISO8601"
}
```

### Investor (returned by GET /investors)
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "investmentAmount": 0,
  "investmentType": "Finance | Tender | InterestRatePlan",
  "profitRate": 0,
  "startDate": "YYYY-MM-DD",
  "status": "On Track | Delayed | Closed",
  "payments": [],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### InvestorPayment
```json
{
  "id": "uuid",
  "investor_id": "uuid",
  "user_id": "uuid",
  "amount": 0,
  "payment_date": "YYYY-MM-DD",
  "payment_type": "Principal | Profit | Interest",
  "remarks": "string | null",
  "created_at": "ISO8601"
}
```

### Notification
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "loan_id": "uuid | null",
  "title": "string",
  "message": "string",
  "is_read": false,
  "created_at": "ISO8601"
}
```

### LoginHistoryEntry
```json
{
  "id": "uuid",
  "email": "string",
  "ip_address": "string",
  "user_agent": "string",
  "created_at": "ISO8601"
}
```

---

## Notes for Backend Team

1. **JWT**: Use `jsonwebtoken` with a secret. Token payload: `{ id, email }`. Expiry: 7 days recommended.
2. **Password Hashing**: Use `bcrypt` with 12 rounds.
3. **CORS**: Configure for your frontend domain.
4. **MongoDB Atlas Backup**: Connect to `mongodb+srv://srivinayakatender_db_user:<password>@srivinayakatenders.xudvbid.mongodb.net/` and store backups in a `backups` collection.
5. **GET /loans** and **GET /investors**: The backend must join transactions/payments and return them nested inside each loan/investor object using the camelCase field names shown above.
6. **POST /loans** and **POST /investors**: Accept camelCase field names from the frontend, map to snake_case columns in PostgreSQL.
7. **User Isolation**: All queries must filter by the authenticated user's ID (`WHERE user_id = $userId`).
