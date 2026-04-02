# Zorvyn Finance API

A REST API backend for a multi-user personal finance dashboard. Users track income and expense records and query aggregated analytics. Access is enforced through a three-tier role-based access control system.

---

## Problem Statement

Build a backend service where authenticated users can manage financial records and view dashboard analytics scoped to their own data. Admin users have elevated access across all records and can manage the user base. The system must enforce data isolation between users, validate all inputs, handle errors consistently, and serve analytics with acceptable latency through caching.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js ≥ 20 | LTS, native ESM support |
| Language | TypeScript 5 (strict) | Full type safety, self-documenting contracts |
| Framework | Express 4 | Minimal, well-understood, predictable |
| Database | PostgreSQL | ACID, native DECIMAL type for financial amounts |
| ORM | Prisma 5 | Type-safe queries, migration management |
| Validation | Zod | Schema-first, co-located DTOs, precise error messages |
| Auth | JWT (access + refresh) | Stateless, short-lived access tokens |
| Hashing | bcryptjs, 12 rounds | Industry standard for password storage |
| Logging | Winston + Morgan | Structured logging, HTTP request tracing |
| Caching | In-process TTL Map | Zero-dependency, sufficient for single-process scope |

---

## Architecture

The project uses a **module-per-domain** layout. Each domain (auth, users, records, analytics) is self-contained with four files following a strict pattern:

```
*.routes.ts     — route definitions, middleware chain
*.controller.ts — receives req/res, calls service, forwards errors to next()
*.service.ts    — all business logic, DB access, cache interaction
*.validator.ts  — Zod schemas + inferred TypeScript DTOs
```

Cross-cutting concerns live outside modules:

```
src/
├── index.ts              server bootstrap, graceful shutdown, process signal handling
├── app.ts                Express factory: security headers, CORS, body parsing, routes
├── config/
│   ├── env.ts            Zod-validated environment variables, fail-fast on startup
│   ├── logger.ts         Winston logger (dev: colorized, prod: JSON)
│   └── database.ts       Prisma singleton, connect/disconnect helpers
├── middleware/
│   ├── authenticate.ts   JWT verification, attaches req.user
│   ├── authorize.ts      Role guard factory, returns 403 on mismatch
│   ├── validate.ts       Zod schema runner, parses body+params+query atomically
│   ├── errorHandler.ts   Central error mapping to HTTP responses
│   ├── notFound.ts       Catch-all 404 handler
│   └── requestLogger.ts  Morgan HTTP access log (skips /health)
├── modules/
│   ├── auth/             register, login, token refresh, /me
│   ├── users/            admin CRUD for users and roles
│   ├── records/          financial record CRUD (role-scoped)
│   └── analytics/        summary, breakdown, trends, recent activity
├── routes/               API router, health check endpoint
├── types/                shared interfaces, Express Request augmentation
└── utils/
    ├── AppError.ts        typed error class with status codes and error codes
    ├── response.ts        sendSuccess / sendError envelope helpers
    ├── token.ts           JWT sign/verify helpers
    └── cache.ts           TtlCache class, buildCacheKey, TTL constants
prisma/
├── schema.prisma         canonical schema definition
├── seed.ts               seeds three default roles (idempotent)
└── migrations/           committed migration history
```

---

## Role Model and Access Control

Roles are stored as database rows, not a Postgres enum. This allows adding new roles without a schema migration. The application checks `role.name` at runtime.

| Role | Records | Users | Analytics |
|---|---|---|---|
| `viewer` | Read own | — | Read own |
| `analyst` | Read + Write own | — | Read own |
| `admin` | Read + Write all | Full CRUD | Read all |

**Scoping:** Non-admin queries always include `WHERE created_by = :actorId`. Admins receive an empty filter, seeing all records. This is enforced inside `buildRecordWhere()` in the records service and reused by the analytics service — the logic is defined once and applied consistently.

**Middleware chain:** `authenticate` → `authorize(...roles)` → `validate(schema)` → controller. Every protected route applies this chain. `authenticate` rejects on missing or expired tokens (401). `authorize` rejects on role mismatch (403).

**Self-registration:** `POST /auth/register` always assigns the `viewer` role. Role elevation requires admin access via `PATCH /users/:id`.

---

## API Overview

**Base path:** `/api/v1`

**Response envelope:**
```json
{ "success": true,  "message": "...", "data": { ... } }
{ "success": false, "message": "...", "code": "ERROR_CODE", "errors": { ... } }
```
Every endpoint — success or failure — returns this structure. Error codes are machine-readable uppercase strings.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Returns status, timestamp, environment, version |

### Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | None | Create account → assigned `viewer` role |
| POST | `/login` | None | Authenticate → returns `accessToken` + `refreshToken` |
| POST | `/refresh` | None | Exchange refresh token → new access token |
| GET | `/me` | Any | Returns authenticated user's profile |

### Users — `/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | admin | List users (paginated, filter by `status`, `roleId`) |
| POST | `/` | admin | Create user with explicit role assignment |
| GET | `/roles` | admin | List all available roles |
| GET | `/:id` | admin | Get user by ID |
| PATCH | `/:id` | admin | Update `name`, `roleId`, or `status` |
| DELETE | `/:id` | admin | Delete user |

### Records — `/records`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | viewer+ | List records. Filters: `type`, `category`, `from`, `to`, `sortBy`, `sortOrder`, `page`, `limit` |
| POST | `/` | analyst+ | Create record |
| GET | `/:id` | viewer+ | Get single record (ownership enforced) |
| PATCH | `/:id` | analyst+ | Partial update (at least one field required) |
| DELETE | `/:id` | analyst+ | Delete record (ownership enforced) |

### Analytics — `/analytics`

All analytics endpoints accept optional `from`, `to`, `type`, `category` filters. Non-admins see only their own data.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/summary` | viewer+ | Totals (income, expenses, balance) + record count for the date window |
| GET | `/breakdown` | viewer+ | Totals grouped by category and type, ordered by amount |
| GET | `/trends` | viewer+ | Time-series buckets by `period=month` (default) or `period=week` |
| GET | `/recent` | viewer+ | Most recent N records (`limit`, default 10, max 50) |

---

## Validation and Error Handling

**Input validation:** Every route applies a Zod schema via the `validate` middleware before the controller is reached. The schema validates `{ body, params, query }` as a single object, coerces types (e.g. string→number, string→Date), and replaces the raw request properties with the typed result. Invalid input returns `422 VALIDATION_ERROR` with per-field error detail.

**Error class:** `AppError` carries `statusCode`, a machine-readable `code`, and `isOperational`. Operational errors are user-facing (wrong input, missing resource). Non-operational errors indicate bugs and are logged at `error` level before returning a generic 500.

**Central error handler** processes in priority order:

| Error type | HTTP | Code |
|---|---|---|
| `AppError` | as set | as set |
| `ZodError` | 422 | `VALIDATION_ERROR` |
| `TokenExpiredError` | 401 | `TOKEN_EXPIRED` |
| `JsonWebTokenError` | 401 | `INVALID_TOKEN` |
| Prisma P2002 | 409 | `CONFLICT` |
| Prisma P2025 | 404 | `NOT_FOUND` |
| Prisma P2003 | 422 | `FOREIGN_KEY_VIOLATION` |
| Unhandled | 500 | `INTERNAL_ERROR` |

In production, unhandled error messages are replaced with `"Internal server error"` to prevent stack trace leakage.

---

## Caching Strategy

Analytics queries are served from an in-process TTL cache to avoid repeated aggregate computations on unchanged data.

**Implementation:** `TtlCache` is a typed wrapper around a `Map<string, { value, expiresAt }>`. Expired entries are evicted lazily on read.

**Cache key design:** Keys encode `prefix:actorId:actorRole:...queryParams`. This guarantees user isolation — two users with identical query parameters never share a cache entry.

**TTL values:**

| Endpoint | TTL |
|---|---|
| `GET /analytics/summary` | 60 s |
| `GET /analytics/breakdown` | 60 s |
| `GET /analytics/trends` | 120 s |
| `GET /analytics/recent` | 30 s |

**Cache consistency (invalidation):** Any mutation — `POST`, `PATCH`, or `DELETE` on `/records` — calls `invalidateAnalyticsCache(actorId)`, which uses `invalidatePrefix` to delete all cache entries whose key begins with `summary:actorId`, `breakdown:actorId`, `trends:actorId`, or `recent:actorId`. The cache is never stale after a write by the same user. Admin reads across all users are cached per admin's identity and are also invalidated when the admin mutates a record.

**Tradeoff acknowledged:** This is a single-process, in-memory cache. In a horizontally scaled deployment, each instance would maintain its own independent cache, causing inconsistency after writes. The correct fix is a shared cache layer (Redis). This is called out in Future Improvements.

---

## Database Design

**Engine:** PostgreSQL. **ORM:** Prisma with committed migrations.

**Schema decisions:**

| Decision | Rationale |
|---|---|
| `Role` as a table row | Roles can be added without a schema migration. Application enforces role logic at runtime. |
| `UserStatus` as enum | ACTIVE/INACTIVE are a fixed, closed set — enum is appropriate and self-documenting |
| `amount` as `DECIMAL(12,2)` | Floating-point types lose precision on financial values. NUMERIC(12,2) is exact to the cent up to 9,999,999,999.99 |
| `date` as `DATE` (no time) | Transactions are calendar-day events. Storing only the date avoids timezone ambiguity |
| `FinancialRecord.createdBy` | Denormalized FK string for ownership checks without a join. Records are immutable in ownership — the creator never changes |

**Indexes on `financial_records`:**

| Index name | Columns | Query pattern |
|---|---|---|
| `idx_records_user_date` | `(created_by, date)` | Date-range aggregations in summary/trends |
| `idx_records_user_type` | `(created_by, type)` | Income vs expense split |
| `idx_records_user_category` | `(created_by, category)` | Category breakdown grouping |

---

## Security Considerations

- **Password storage:** bcrypt with cost factor 12. The password hash is never selected in any query that returns data to the API caller.
- **Timing-safe login:** If a user is not found, bcrypt still runs against a dummy hash before returning the error. This prevents username enumeration via response timing differences.
- **JWT:** Access tokens expire in 7 days (configurable). Refresh tokens expire in 30 days. Both secrets require a minimum of 16 characters, enforced at startup by Zod.
- **Token validation:** `authenticate` distinguishes between `TOKEN_EXPIRED` and `INVALID_TOKEN` error codes, allowing clients to handle refresh flows correctly.
- **Error masking:** In production, `err.message` on unhandled exceptions is replaced with a generic message to prevent internal detail leakage.
- **Input validation:** All external input — body, params, and query string — is validated and coerced through Zod before reaching service logic. No raw `req.body` access occurs after the validate middleware.
- **Raw SQL safety:** The trends endpoint uses `$queryRawUnsafe`. The only interpolated values are ISO-8601 date strings (from validated `Date` objects) and a `created_by` condition built from the authenticated `req.user.id` (from a verified JWT — not user input). No user-supplied strings are interpolated.
- **Security headers:** `helmet()` applies a full set of HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) on every response.
- **CORS:** Allowed origins are explicitly configured via environment variable. Requests from unlisted origins are rejected.

---

## Production Considerations

- **Refresh token revocation:** Currently refresh tokens are stateless JWTs. A token revocation list or database-backed token store would be needed to support logout-everywhere or compromised token scenarios.
- **Rate limiting:** No rate limiting is applied. `express-rate-limit` should be added for auth endpoints and API-wide limits for untrusted clients.
- **Horizontal scaling:** The in-process cache must be replaced with Redis before deploying more than one instance. The rest of the application is stateless and scales horizontally without changes.
- **Database connection pooling:** Prisma manages a connection pool internally. For high-concurrency workloads, PgBouncer in transaction mode is the standard addition.
- **Graceful shutdown:** The server waits for in-flight requests to complete before disconnecting from the database. A hard 10-second timeout forces exit if drain stalls.
- **Structured logging:** In production, Winston emits JSON log lines. These are compatible with log aggregation systems (Datadog, CloudWatch, Loki) without any adapter.
- **Environment validation:** All required environment variables are validated at process startup via Zod. The process exits immediately with a formatted error if any variable is missing or malformed — no silent failures.

---

## Assumptions and Tradeoffs

| Decision | Rationale |
|---|---|
| In-process cache, no Redis | Acceptable for single-process scope. Documented as a known limitation. |
| Stateless refresh tokens | Simpler implementation. Revocation would require a blocklist or DB-backed store. |
| Raw SQL for trends bucketing | Prisma does not support `TO_CHAR` or ISO-week grouping. The raw SQL is constrained and safe. |
| Self-registration → viewer | Prevents privilege escalation. Admin must explicitly elevate roles. |
| No rate limiting | Out of scope. Documented as a production concern. |
| `Decimal` → `.toString()` in DTOs | Prisma's `Decimal` type is not JSON-serializable. String representation preserves full precision. |
| ON DELETE RESTRICT on FK | Deleting a user with records fails. Records must be deleted first, or a cascade policy must be added. This is intentional — preventing silent data loss. |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |
| `PORT` | No | `3000` | HTTP listen port |
| `API_PREFIX` | No | `/api/v1` | URL prefix for all routes |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | ≥16 chars. Signs access tokens. |
| `JWT_EXPIRES_IN` | No | `7d` | Access token expiry |
| `JWT_REFRESH_SECRET` | **Yes** | — | ≥16 chars. Signs refresh tokens. |
| `JWT_REFRESH_EXPIRES_IN` | No | `30d` | Refresh token expiry |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed CORS origins |
| `LOG_LEVEL` | No | `info` | `error` \| `warn` \| `info` \| `http` \| `debug` |

---

## Setup

### Prerequisites

- Node.js ≥ 20
- PostgreSQL (local or remote)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET

# 3. Apply database migrations
npx prisma migrate dev

# 4. Seed default roles
npm run db:seed

# 5. Start development server
npm run dev
```

API is available at `http://localhost:3000/api/v1`.

**Production:**
```bash
npm run build
npm start
```

**Useful scripts:**

| Script | Description |
|---|---|
| `npm run dev` | Start with hot reload (nodemon + ts-node) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start compiled output |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | ESLint (zero warnings enforced) |
| `npm run db:seed` | Seed default roles |
| `npm run prisma:migrate` | Run Prisma migrations |
| `npm run prisma:generate` | Regenerate Prisma client after schema changes |
| `npm run prisma:studio` | Open Prisma Studio |

---

## Sample Requests

**Register**
```http
POST /api/v1/auth/register
Content-Type: application/json

{ "name": "Alice", "email": "alice@example.com", "password": "password123" }
```
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": { "id": "cuid...", "name": "Alice", "email": "alice@example.com", "roleName": "viewer" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Login**
```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "alice@example.com", "password": "password123" }
```

**Create a record** (analyst or admin)
```http
POST /api/v1/records
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "amount": 1250.00, "type": "INCOME", "category": "Salary", "date": "2025-03-01" }
```

**Dashboard summary**
```http
GET /api/v1/analytics/summary?from=2025-03-01&to=2025-03-31
Authorization: Bearer <accessToken>
```
```json
{
  "success": true,
  "message": "Summary retrieved successfully",
  "data": {
    "totalIncome": "1250.00",
    "totalExpenses": "300.00",
    "balance": "950.00",
    "recordCount": 2,
    "period": { "from": "2025-03-01", "to": "2025-03-31" }
  }
}
```

**Monthly trends**
```http
GET /api/v1/analytics/trends?period=month
Authorization: Bearer <accessToken>
```

**Refresh access token**
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJ..." }
```

---

## Quick Verification Guide

### RBAC

1. Register a user → gets `viewer` role automatically
2. As admin, call `GET /api/v1/users` → `200 OK`
3. As viewer, call `GET /api/v1/users` → `403 FORBIDDEN` code `FORBIDDEN`
4. As viewer, call `POST /api/v1/records` → `403 FORBIDDEN` (viewers cannot write)
5. Elevate the user to `analyst` via `PATCH /api/v1/users/:id` → `{ "roleId": "<analystId>" }`
6. As analyst, call `POST /api/v1/records` → `201 Created`

### Caching

1. Call `GET /api/v1/analytics/summary` → first call queries DB
2. Call same endpoint again immediately → response is served from cache (observe in logs if `LOG_LEVEL=debug`)
3. Create a record via `POST /api/v1/records`
4. Call `GET /api/v1/analytics/summary` again → cache was invalidated, DB is queried with fresh data

### Analytics data isolation

1. Log in as User A (analyst), create a record
2. Log in as User B (analyst), create a different record
3. Each user's `GET /api/v1/analytics/summary` reflects only their own data
4. Admin's `GET /api/v1/analytics/summary` aggregates across all users
5. Admin's `GET /api/v1/records` lists all records; each analyst sees only their own

---

## Future Improvements

- **Refresh token persistence:** Store tokens in DB with revocation support (logout-everywhere, compromised token flow)
- **Distributed cache:** Replace in-process Map with Redis for multi-instance correctness
- **Rate limiting:** Add `express-rate-limit` on auth endpoints and a global API budget
- **End-to-end tests:** Vitest + Supertest against a dedicated test database
- **OpenAPI spec:** Auto-generate from Zod schemas using `zod-to-openapi` or `@anatine/zod-nestjs`
- **Soft deletes:** Add `deletedAt` to records for audit trail retention
- **Email verification:** Send confirmation email on registration before activating account
- **Analytics pagination:** Breakdown endpoint returns unbounded results; add pagination for large category sets
