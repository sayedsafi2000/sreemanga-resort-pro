# Testing Strategy

## Framework Selection

| Layer | Tool | Why |
|-------|------|-----|
| **Server** (Express) | **Vitest** + **Supertest** | Fast, ESM-native, watch mode, works with tsx |
| **Admin** (React/Vite) | **Vitest** + **React Testing Library** | Same runner as server, Vite-native, component + hook tests |
| **Web** (Next.js) | **Vitest** + **React Testing Library** | Consistent with admin |
| **E2E** | **Playwright** (optional, later) | Full browser tests for critical booking flows |

### Installation (root-level or per-app)

```bash
# Server
cd apps/server && npm install -D vitest supertest @types/supertest

# Admin
cd apps/admin && npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# Web
cd apps/web && npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

---

## Test File Convention

Every source file gets a `*.test.ts` (or `*.test.tsx`) next to it:

```
controllers/
  bookingController.ts
  bookingController.test.ts    ← tests here

routes/
  bookingRoutes.ts
  bookingRoutes.test.ts       ← route integration tests

utils/
  accountLedger.ts
  accountLedger.test.ts       ← unit tests
```

---

## Server Testing Setup

### vitest.config.ts (apps/server/)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
```

### Test Database Setup

```typescript
// src/__tests__/setup.ts
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Use a test database
dotenv.config({ path: '.env.test' });

const prisma = new PrismaClient();

beforeAll(async () => {
  // Ensure test DB is clean
  await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
  await prisma.$executeRawUnsafe('CREATE SCHEMA public');
  await prisma.$executeRawUnsafe('GRANT ALL ON SCHEMA public TO postgres');
  await prisma.$executeRawUnsafe('GRANT ALL ON SCHEMA public TO public');
  // Run migrations
  const { execSync } = await import('child_process');
  execSync('npx prisma db push --force-reset', { stdio: 'pipe' });
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
```

### .env.test

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sreemanga_test
JWT_SECRET=test-jwt-secret
NODE_ENV=test
```

### Test Helper Utilities

```typescript
// src/__tests__/helpers.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

// Create a test Express app with all routes mounted
export function createTestApp() {
  const app = express();
  app.use(express.json());
  // Mount all routes here (same as index.ts but without listen)
  // ...
  return app;
}

// Generate a JWT token for a test user
export function generateToken(user: { id: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

// Create a test user with specified role
export async function createTestUser(overrides: Partial<any> = {}) {
  return prisma.user.create({
    data: {
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: '$2a$10$...', // hashed "password123"
      role: 'RECEPTIONIST',
      ...overrides,
    },
  });
}

// Auth header helper
export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
```

---

## Test Categories and What to Test

### 1. Unit Tests — Utility Functions

**What:** Pure logic functions, validators, helpers

**Example:** `utils/bookingPayment.ts`
```typescript
// utils/__tests__/bookingPayment.test.ts
import { describe, it, expect } from 'vitest';
import { mapBookingPaymentMethod, buildPaymentNotesFromBooking } from '../bookingPayment';

describe('mapBookingPaymentMethod', () => {
  it('maps BANK_TRANSFER to BANK_TRANSFER', () => {
    expect(mapBookingPaymentMethod('BANK_TRANSFER')).toBe('BANK_TRANSFER');
  });

  it('maps BKASH to MOBILE_BANKING', () => {
    expect(mapBookingPaymentMethod('BKASH')).toBe('MOBILE_BANKING');
  });

  it('defaults to CASH for unknown methods', () => {
    expect(mapBookingPaymentMethod('UNKNOWN')).toBe('CASH');
  });

  it('defaults to CASH when null', () => {
    expect(mapBookingPaymentMethod(null)).toBe('CASH');
  });
});

describe('buildPaymentNotesFromBooking', () => {
  it('returns undefined when no payment info', () => {
    const result = buildPaymentNotesFromBooking({
      id: '1', totalAmount: 100,
      preferredPaymentTiming: null,
      preferredPaymentMethod: null,
      paymentTransactionId: null,
      paymentProofImage: null,
    });
    expect(result).toBeUndefined();
  });

  it('includes instant payment note', () => {
    const result = buildPaymentNotesFromBooking({
      id: '1', totalAmount: 100,
      preferredPaymentTiming: 'INSTANT',
      preferredPaymentMethod: 'BKASH',
      paymentTransactionId: 'TXN123',
      paymentProofImage: null,
    });
    expect(result).toContain('instant payment');
  });
});
```

**Example:** Phase 2 — `utils/accountLedger.ts`
```typescript
// utils/__tests__/accountLedger.test.ts
import { describe, it, expect } from 'vitest';

describe('getAccountForPaymentMethod', () => {
  it('returns Cash in Hand for CASH', () => {
    // Test mapping logic
  });

  it('returns Mobile Banking for BKASH', () => {
    // ...
  });
});

describe('getIncomeAccount', () => {
  it('returns Room Revenue for ROOM business line', () => {
    // ...
  });

  it('returns Day Long Revenue for DAY_LONG', () => {
    // ...
  });
});
```

---

### 2. Integration Tests — Controllers + Routes

**What:** Full request → response cycle for each endpoint. Tests auth, validation, business logic, and DB state.

**Structure:** One test file per route module.

```typescript
// routes/__tests__/authRoutes.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, generateToken } from '../../__tests__/helpers';

const app = createTestApp();

describe('POST /api/auth/login', () => {
  it('returns 200 + token for valid credentials', async () => {
    const user = await createTestUser({ email: 'login@test.com' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('login@test.com');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noone@test.com', password: 'anything' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/register', () => {
  it('creates user with RECEPTIONIST role by default', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New', email: 'new@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('RECEPTIONIST');
  });
});
```

```typescript
// routes/__tests__/bookingRoutes.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, generateToken } from '../../__tests__/helpers';
import prisma from '../../utils/prisma';

const app = createTestApp();

describe('GET /api/bookings', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(401);
  });

  it('returns bookings for authenticated user', async () => {
    const user = await createTestUser({ role: 'RECEPTIONIST' });
    const token = generateToken(user);

    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.bookings)).toBe(true);
  });

  it('filters bookings by status', async () => {
    const user = await createTestUser({ role: 'RECEPTIONIST' });
    const token = generateToken(user);

    const res = await request(app)
      .get('/api/bookings?status=CONFIRMED')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    res.body.bookings.forEach((b: any) => {
      expect(b.status).toBe('CONFIRMED');
    });
  });
});

describe('POST /api/bookings', () => {
  it('creates a booking with valid data', async () => {
    const user = await createTestUser({ role: 'RECEPTIONIST' });
    const token = generateToken(user);

    const room = await prisma.room.create({
      data: { name: 'Test Room', type: 'STANDARD', price: 1000, capacity: 2 },
    });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room.id,
        guestName: 'John Doe',
        guestPhone: '01712345678',
        checkInDate: '2026-08-01',
        checkOutDate: '2026-08-03',
        adults: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.booking.totalAmount).toBe(2000); // 1000 * 2 nights
  });

  it('rejects booking when room is unavailable', async () => {
    // Create overlapping booking first, then try again
    // ...
  });
});
```

**Example:** Phase 1 — Day Long Routes
```typescript
// routes/__tests__/dayLongRoutes.test.ts
describe('POST /api/day-long-bookings', () => {
  it('calculates price with per-person charge', async () => {
    // Create product with basePrice=1000, pricePerPerson=500
    // Book 2 adults → total = 1000 + (500 * 2) = 2000
    // ...
  });

  it('prevents double-booking same slot', async () => {
    // ...
  });
});
```

**Example:** Phase 2 — Account Transaction Auto-Creation
```typescript
// routes/__tests__/accountTransaction.test.ts
describe('Payment creates account transactions', () => {
  it('creates DEBIT on Cash and CREDIT on Income when payment is recorded', async () => {
    // 1. Create a booking
    // 2. Record a payment
    // 3. Verify AccountTransaction created:
    //    - DEBIT on Cash in Hand
    //    - CREDIT on Room Revenue
    // 4. Verify balances updated
  });
});
```

---

### 3. Validator Tests

```typescript
// validators/__tests__/bookingValidator.test.ts
import { describe, it, expect } from 'vitest';
import { bookingSchema } from '../bookingValidator';

describe('bookingSchema', () => {
  it('accepts valid booking data', () => {
    const data = {
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      guestName: 'John',
      guestPhone: '01712345678',
      checkInDate: '2026-08-01',
      checkOutDate: '2026-08-03',
      adults: 2,
    };
    const result = bookingSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects check-out before check-in', () => {
    const data = {
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      guestName: 'John',
      guestPhone: '01712345678',
      checkInDate: '2026-08-03',
      checkOutDate: '2026-08-01',
      adults: 2,
    };
    const result = bookingSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    // ...
  });
});
```

---

### 4. Middleware Tests

```typescript
// middleware/__tests__/auth.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authenticateToken } from '../auth';

const app = express();
app.use(express.json());
app.get('/test', authenticateToken, (req, res) => res.json({ ok: true }));

describe('authenticateToken', () => {
  it('rejects request without Authorization header', async () => {
    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
  });

  it('rejects malformed token', async () => {
    const res = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });
});
```

```typescript
// middleware/__tests__/roleCheck.test.ts
import { describe, it, expect } from 'vitest';
import { roleCheck } from '../roleCheck';

describe('roleCheck', () => {
  it('allows access for matching role', () => {
    const middleware = roleCheck(['SUPER_ADMIN', 'MANAGER']);
    const req = { user: { role: 'MANAGER' } } as any;
    const res = { status: () => ({ json: () => {} }) } as any;
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
  });

  it('blocks access for non-matching role', () => {
    const middleware = roleCheck(['SUPER_ADMIN']);
    const req = { user: { role: 'RECEPTIONIST' } } as any;
    let statusCode = 0;
    const res = { status: (code: number) => { statusCode = code; return { json: () => {} }; } } as any;
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    expect(statusCode).toBe(403);
    expect(nextCalled).toBe(false);
  });
});
```

---

### 5. Admin Frontend Tests

```typescript
// vitest.config.ts (apps/admin/)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    css: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-dom';
```

**Component Example:**
```typescript
// src/components/__tests__/StatCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatCard } from '@/components/ui/stat-card';
import { BedDouble } from 'lucide-react';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(
      <StatCard
        label="Total Rooms"
        value="12"
        icon={BedDouble}
        accent="blue"
      />
    );
    expect(screen.getByText('Total Rooms')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
```

**API Hook Example:**
```typescript
// src/lib/__tests__/api.test.ts
// Mock axios and test that interceptors work
```

**Page Integration Example:**
```typescript
// src/pages/__tests__/Login.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from '@/pages/Login/Login';

// Mock api
vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { success: true, token: 'abc', user: {} } }),
  },
}));

describe('Login Page', () => {
  it('renders login form', () => {
    render(<BrowserRouter><Login /></BrowserRouter>);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows error on invalid credentials', async () => {
    // ...
  });
});
```

---

## Test Execution

### Package.json Scripts

```json
{
  "scripts": {
    "test": "npm run test:server && npm run test:admin && npm run test:web",
    "test:server": "cd apps/server && npx vitest run",
    "test:server:watch": "cd apps/server && npx vitest",
    "test:admin": "cd apps/admin && npx vitest run",
    "test:admin:watch": "cd apps/admin && npx vitest",
    "test:web": "cd apps/web && npx vitest run",
    "test:web:watch": "cd apps/web && npx vitest",
    "test:coverage": "npm run test:server -- --coverage && npm run test:admin -- --coverage && npm run test:web -- --coverage"
  }
}
```

### CI/Pre-commit Hook

```bash
#!/bin/bash
# .husky/pre-commit or similar
npm run test:server -- --changed
npm run test:admin -- --changed
npm run test:web -- --changed
```

---

## Testing Checklist Per Phase

### Phase 0 — Foundation
| Test | Type | File |
|------|------|------|
| `mapBookingPaymentMethod` maps correctly | Unit | `bookingPayment.test.ts` |
| `buildPaymentNotesFromBooking` formats correctly | Unit | `bookingPayment.test.ts` |
| OTP flow: send → verify → expire → reuse | Integration | `publicRoutes.test.ts` |
| Account model creates with correct defaults | Integration | `accountRoutes.test.ts` |
| BusinessLine enum values exist | Unit | `enums.test.ts` |

### Phase 1 — Day Long
| Test | Type | File |
|------|------|--------|
| Product CRUD (create, read, update, delete) | Integration | `dayLongRoutes.test.ts` |
| Price calculation (base, per-person, combined) | Unit | `dayLongController.test.ts` |
| Date/slot availability check | Integration | `dayLongRoutes.test.ts` |
| Overlapping booking rejection | Integration | `dayLongRoutes.test.ts` |
| Booking status transitions | Integration | `dayLongRoutes.test.ts` |
| Payment + AccountTransaction creation | Integration | `accountTransaction.test.ts` |

### Phase 2 — Restaurant Revenue
| Test | Type | File |
|------|------|--------|
| Record full payment → order PAID | Integration | `restaurantPayment.test.ts` |
| Partial payment → order PARTIAL, balance correct | Integration | `restaurantPayment.test.ts` |
| Overpayment rejected | Integration | `restaurantPayment.test.ts` |
| netAmount = total − discount + service charge | Unit | `restaurantPayment.test.ts` |
| Payment creates ledger revenue (RESTAURANT) | Integration | `accountLedger.test.ts` |

### Phase 3 — Inventory
| Test | Type | File |
|------|------|--------|
| Item CRUD | Integration | `inventoryRoutes.test.ts` |
| PURCHASE increases stock + creates expense | Integration | `inventoryRoutes.test.ts` |
| CONSUMPTION on order deducts recipe qty | Integration | `inventoryRoutes.test.ts` |
| OUT move blocked when stock insufficient | Integration | `inventoryRoutes.test.ts` |
| balanceAfter snapshot correct across moves | Unit | `inventory.test.ts` |
| Low-stock alert at/below reorder level | Integration | `inventoryRoutes.test.ts` |

### Phase 4 — Accounts
| Test | Type | File |
|------|------|--------|
| Account CRUD | Integration | `accountRoutes.test.ts` |
| Create transaction updates balance | Integration | `accountRoutes.test.ts` |
| Transfer between accounts (both sides) | Integration | `accountRoutes.test.ts` |
| IN adds / OUT subtracts (uniform, all types) | Unit | `accountLedger.test.ts` |
| recordRevenue: cash IN + income IN | Integration | `accountLedger.test.ts` |
| recordExpense: expense IN + cash OUT | Integration | `accountLedger.test.ts` |
| Ledger write rolls back with failed payment | Integration | `accountLedger.test.ts` |
| Receivable CRUD + payment | Integration | `receivableRoutes.test.ts` |
| Balance Sheet calculation | Unit | `reportController.test.ts` |
| P&L calculation | Unit | `reportController.test.ts` |

### Phase 5 — Shareholder
| Test | Type | File |
|------|------|--------|
| Shareholder CRUD | Integration | `shareholderRoutes.test.ts` |
| Distribution auto-calculation (percentage) | Unit | `shareholderController.test.ts` |
| Distribution auto-calculation (fixed) | Unit | `shareholderController.test.ts` |
| Distribution auto-calculation (custom) | Unit | `shareholderController.test.ts` |
| Approve → Distribute flow | Integration | `shareholderRoutes.test.ts` |
| Shareholder can only see own data | Integration | `shareholderPortalRoutes.test.ts` |
| Role check: non-admin cannot access admin endpoints | Integration | `shareholderRoutes.test.ts` |

### Phase 6 — Staff HR
| Test | Type | File |
|------|------|--------|
| Department CRUD | Integration | `departmentRoutes.test.ts` |
| Designation CRUD | Integration | `designationRoutes.test.ts` |
| StaffProfile CRUD | Integration | `staffProfileRoutes.test.ts` |
| Shift CRUD | Integration | `shiftRoutes.test.ts` |
| Duty roster: assign, bulk assign, conflict check | Integration | `dutyRosterRoutes.test.ts` |
| Check-in creates attendance record | Integration | `attendanceRoutes.test.ts` |
| Check-out updates attendance record | Integration | `attendanceRoutes.test.ts` |
| Bulk mark attendance | Integration | `attendanceRoutes.test.ts` |
| Leave application + approve + reject flow | Integration | `leaveRoutes.test.ts` |
| Leave balance calculation | Unit | `leaveController.test.ts` |
| Attendance % calculation | Unit | `staffDashboardController.test.ts` |

### Phase 7 — Reports
| Test | Type | File |
|------|------|--------|
| P&L matches revenue − expenses | Integration | `reportRoutes.test.ts` |
| Balance Sheet balances (assets = liabilities + equity) | Integration | `reportRoutes.test.ts` |
| Revenue by business line sums correctly | Integration | `reportRoutes.test.ts` |
| CSV export produces valid CSV | Unit | `reportController.test.ts` |

### Phase 8 — Improvements
| Test | Type | File |
|------|------|--------|
| Permission check blocks/proceeds correctly | Integration | `permission.test.ts` |
| Audit log records mutations | Integration | `audit.test.ts` |
| Rate limiter blocks after N requests | Integration | `rateLimiter.test.ts` |
| File upload validates content type | Integration | `uploadRoutes.test.ts` |
| Role-based access for all new roles | Integration | `roleCheck.test.ts` |

---

## Writing Tests During Development (Workflow)

1. **Before writing feature code:** Write the test first (TDD style for critical logic)
2. **After writing feature code:** Run existing tests to check nothing broke
3. **Before commit:** Run full test suite
4. **For bug fixes:** Write a test that reproduces the bug, then fix

### Database Tests Safety

All integration tests use a **separate test database** (`sreemanga_test`). Never run tests against production or development databases.

The test setup script:
1. Drops and recreates all tables
2. Runs `prisma db push` to apply schema
3. Seeds minimal test data

This ensures:
- Tests are deterministic
- No test pollution between runs
- Schema changes are validated

---

## Adding to Plan

Add to **each phase file** under "Files to Create/Modify":

For Phase 1 (example):
```
| `apps/server/src/controllers/__tests__/dayLongController.test.ts` | Unit: pricing logic |
| `apps/server/src/routes/__tests__/dayLongRoutes.test.ts` | Integration: CRUD, availability |
| `apps/admin/src/pages/DayLong/__tests__/DayLongProducts.test.tsx` | Component render tests |
```

---

## Running Tests

```bash
# From root — run all tests
npm test

# Server only
npm run test:server

# Watch mode (development)
npm run test:server:watch

# With coverage
npm run test:coverage
```
