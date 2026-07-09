# Phase 3: Shareholder Management System

**Goal:** Allow SUPER_ADMIN to create and manage shareholders, define profit-sharing models, and give shareholders a login portal to view their investments and returns.

**Depends on:** Phase 2 (Accounts for profit calculation)

**Effort:** ~5-6 days

---

## Schema

```prisma
enum ShareType {
  PERCENTAGE     // Shareholder gets X% of total profit
  FIXED          // Shareholder gets fixed amount per distribution
  CUSTOM         // Admin manually sets amount per distribution
}

model Shareholder {
  id              String       @id @default(uuid())
  userId          String?      @unique  // Optional link to User for login
  user            User?        @relation(fields: [userId], references: [id])
  name            String
  phone           String
  email           String?      @unique
  address         String?
  nid             String?
  shareType       ShareType    @default(PERCENTAGE)
  shareValue      Float        @default(0)   // Percentage number OR fixed amount per distribution
  totalShares     Int?         // If share-based (e.g., 100 shares)
  investmentAmount Float?      // Total capital invested
  joinDate        DateTime     @default(now())
  isActive        Boolean      @default(true)
  notes           String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  profitShares    ProfitShare[]

  @@index([email])
  @@index([isActive])
}

model ProfitDistribution {
  id              String        @id @default(uuid())
  periodLabel     String        // e.g., "January 2026", "Q1 2026"
  periodStart     DateTime
  periodEnd       DateTime
  totalProfit     Float         // Total profit being distributed
  totalDistributed Float        // Sum of all shares
  distributionDate DateTime?
  status          DistributionStatus @default(DRAFT)
  notes           String?
  createdById     String?
  createdBy       User?         @relation(fields: [createdById], references: [id])
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  shares          ProfitShare[]

  @@index([status])
  @@index([periodStart, periodEnd])
}

enum DistributionStatus {
  DRAFT           // Calculating, not yet finalized
  APPROVED        // Ready to distribute
  DISTRIBUTED     // Paid out
  CANCELLED
}

model ProfitShare {
  id              String             @id @default(uuid())
  distributionId  String
  distribution    ProfitDistribution @relation(fields: [distributionId], references: [id])
  shareholderId   String
  shareholder     Shareholder        @relation(fields: [shareholderId], references: [id])
  amount          Float              // Amount for this shareholder this period
  status          ProfitShareStatus  @default(PENDING)
  paidDate        DateTime?
  notes           String?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  @@unique([distributionId, shareholderId])
  @@index([shareholderId])
  @@index([status])
}

enum ProfitShareStatus {
  PENDING
  PAID
  CANCELLED
}
```

### Role Addition

```prisma
enum Role {
  SUPER_ADMIN
  MANAGER
  RECEPTIONIST
  HOUSEKEEPING
  RESTAURANT_STAFF
  ACCOUNTANT
  SHAREHOLDER        // NEW
}
```

---

## Profit Calculation Logic

```typescript
function calculateProfitShares(
  distribution: { totalProfit: number },
  shareholders: Shareholder[]
): { shareholderId: string; amount: number }[] {
  const activeShareholders = shareholders.filter(s => s.isActive);

  // Calculate total for percentage-based
  const totalPercentage = activeShareholders
    .filter(s => s.shareType === 'PERCENTAGE')
    .reduce((sum, s) => sum + s.shareValue, 0);

  return activeShareholders.map(s => {
    switch (s.shareType) {
      case 'PERCENTAGE': {
        const effectivePct = s.shareValue / totalPercentage;
        return {
          shareholderId: s.id,
          amount: distribution.totalProfit * effectivePct,
        };
      }
      case 'FIXED':
        return {
          shareholderId: s.id,
          amount: s.shareValue, // Fixed amount per distribution
        };
      case 'CUSTOM':
        return {
          shareholderId: s.id,
          amount: 0, // To be set manually by admin
        };
    }
  });
}
```

---

## API Endpoints

### Shareholder Management (`/api/shareholders`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/shareholders` | SUPER_ADMIN, MANAGER | List all shareholders |
| GET | `/api/shareholders/:id` | SUPER_ADMIN, MANAGER | Shareholder detail |
| POST | `/api/shareholders` | SUPER_ADMIN | Create shareholder (optionally creates User) |
| PATCH | `/api/shareholders/:id` | SUPER_ADMIN | Update shareholder |
| DELETE | `/api/shareholders/:id` | SUPER_ADMIN | Deactivate shareholder |

### Profit Distribution (`/api/profit-distributions`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/profit-distributions` | SUPER_ADMIN, MANAGER, ACCOUNTANT | List distributions |
| GET | `/api/profit-distributions/:id` | Same | Distribution detail with shares |
| POST | `/api/profit-distributions` | SUPER_ADMIN, MANAGER | Create distribution (auto-calculate shares) |
| POST | `/api/profit-distributions/:id/calculate` | SUPER_ADMIN, MANAGER | Recalculate shares |
| PATCH | `/api/profit-distributions/:id` | SUPER_ADMIN | Update distribution |
| POST | `/api/profit-distributions/:id/approve` | SUPER_ADMIN | Approve distribution |
| POST | `/api/profit-distributions/:id/distribute` | SUPER_ADMIN | Mark all as distributed |
| POST | `/api/profit-distributions/:id/cancel` | SUPER_ADMIN | Cancel distribution |

### Shareholder Portal (auth required — SHAREHOLDER role)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/shareholder/me` | Get own shareholder profile |
| GET | `/api/shareholder/profit-shares` | Get own profit share history |
| GET | `/api/shareholder/summary` | Get dashboard summary (total invested, total received, pending) |

### Auth (for shareholder login)
SHAREHOLDER users login through the existing `/api/auth/login` endpoint.
Create a separate login page that redirects to the shareholder portal.

---

## Admin UI Pages

### Shareholders.tsx
- Table: name, phone, email, share type, share value, investment, status
- Filters: by type, status
- Create/Edit dialog:
  - Basic info (name, phone, email, address, NID)
  - Share settings: Type (PERCENTAGE/FIXED/CUSTOM), Value, Total shares, Investment amount
  - Optional: auto-create User account with SHAREHOLDER role
- Action buttons: Activate/Deactivate, Reset password

### ProfitDistributions.tsx
- Table: period, date, total profit, total distributed, status
- Create dialog:
  - Period label (auto: "January 2026")
  - Period start/end
  - Total profit (manual or auto-calculated from P&L)
- Detail view: shows list of all shareholders and their calculated shares
- Actions: Calculate (auto), Approve, Distribute, Cancel
- For CUSTOM type: allow admin to edit individual amounts
- Export to CSV

### ProfitDistributionDetail.tsx
- Summary cards: Total Profit, Total Distributed, # of Shareholders
- Share table: Shareholder name, Type, Calculated amount, Status, Paid date
- Per-shareholder actions: Mark as paid manually

---

## Shareholder Portal (Public Web)

### `/shareholder/login` page
- Simple login with email + password
- On success → redirect to `/shareholder/dashboard`

### `/shareholder/dashboard` page
- Welcome card: name, share type, share value
- Summary cards: Total investment, Total profit received, Pending distribution
- Recent distributions table: period, amount, status, date
- Overall performance chart (profits over time)

### `/shareholder/history` page
- Full table of all profit shares received
- Export to CSV

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/server/src/controllers/shareholderController.ts` | Shareholder CRUD |
| `apps/server/src/controllers/profitDistributionController.ts` | Distribution CRUD + calculation |
| `apps/server/src/controllers/shareholderPortalController.ts` | Shareholder self-service |
| `apps/server/src/routes/shareholderRoutes.ts` | Admin routes |
| `apps/server/src/routes/shareholderPortalRoutes.ts` | Portal routes (SHAREHOLDER role) |
| `apps/server/src/validators/shareholderValidator.ts` | Zod schemas |
| `apps/admin/src/pages/Shareholders/Shareholders.tsx` | Shareholder list |
| `apps/admin/src/pages/Shareholders/ProfitDistributions.tsx` | Distribution management |
| `apps/admin/src/pages/Shareholders/ProfitDistributionDetail.tsx` | Distribution detail |
| `apps/web/src/app/shareholder/login/page.tsx` | Shareholder login page |
| `apps/web/src/app/shareholder/dashboard/page.tsx` | Shareholder dashboard |
| `apps/web/src/app/shareholder/history/page.tsx` | Shareholder history |

## Files to Modify

| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Add Shareholder, ProfitDistribution, ProfitShare, DistributionStatus, ProfitShareStatus, add SHAREHOLDER to Role enum |
| `apps/server/src/index.ts` | Mount shareholder routes, add SHAREHOLDER to role checks for public |
| `apps/server/src/middleware/auth.ts` | No change needed (JWT already supports all roles) |
| `apps/server/src/middleware/roleCheck.ts` | No change needed |
| `apps/admin/src/config/rbac.ts` | Add Shareholder sidebar, ROUTE_ACCESS |
| `apps/admin/src/App.tsx` | Add shareholder routes |
| `apps/web/src/lib/api.ts` | Add portal API calls |
