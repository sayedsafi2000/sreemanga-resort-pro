# Phase 8: Cross-Cutting Improvements & Bug Fixes

**Goal:** Production hardening — audit trail, granular permissions, rate limiting, cloud storage, API documentation.

**Depends on:** Phase 0 (foundation)

**Effort:** ~5-6 days (can run in parallel with phases 1-4)

---

## Task 6.1: Granular RBAC with Permissions

### Current State
- Route-level access only: `roleCheck(['SUPER_ADMIN', 'MANAGER'])`
- No per-action permissions (e.g., a MANAGER can delete expenses)
- SHAREHOLDER role needs limited access

### Solution: Permission-based Access Control

```prisma
model Permission {
  id          String   @id @default(uuid())
  name        String   @unique  // e.g., "bookings.create", "bookings.delete", "expenses.edit"
  description String?
  module      String   // "BOOKINGS", "EXPENSES", "ACCOUNTS", etc.
  createdAt   DateTime @default(now())

  rolePermissions RolePermission[]
}

model RolePermission {
  id           String     @id @default(uuid())
  role         Role
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id])
  createdAt    DateTime   @default(now())

  @@unique([role, permissionId])
}

// Seed default permissions for each role
```

### Permission Check Middleware

```typescript
// middleware/permission.ts
export const requirePermission = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    // SUPER_ADMIN bypasses all permission checks
    if (user.role === 'SUPER_ADMIN') return next();

    const hasPermission = await prisma.rolePermission.findFirst({
      where: {
        role: user.role,
        permission: { name: permissionName },
      },
    });

    if (!hasPermission) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};
```

### Permission Naming Convention
```
{module}.{action}
  module: bookings, rooms, guests, payments, expenses, accounts, shareholders, staff, attendance, leaves, reports, settings, users
  action: create, read, update, delete, approve, export

Examples:
  bookings.create, bookings.read, bookings.update, bookings.delete
  expenses.create, expenses.read, expenses.update, expenses.delete
  accounts.read, accounts.transfer
  leaves.approve, leaves.reject
  reports.export
```

---

## Task 6.2: Audit Trail / Activity Log

### Schema
```prisma
model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  user       User?    @relation(fields: [userId], references: [id])
  action     String   // 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'APPROVE' | 'REJECT'
  entity     String   // 'Booking' | 'Payment' | 'Expense' | 'Account' | 'Shareholder' | etc.
  entityId   String?
  before     Json?    // Previous state (for UPDATE/DELETE)
  after      Json?    // New state (for CREATE/UPDATE)
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([entity, entityId])
  @@index([userId])
  @@index([createdAt])
  @@index([action, entity])
}
```

### Middleware Approach

```typescript
// middleware/audit.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export function audit(action: string, entity: string, getEntityId?: (req: Request) => string | undefined) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    
    let statusCode = 200;
    res.status = (code: number) => {
      statusCode = code;
      return originalStatus(code);
    };

    res.json = async (body: any) => {
      // Only log successful mutations
      if (statusCode >= 200 && statusCode < 300 && req.method !== 'GET') {
        const entityId = getEntityId ? getEntityId(req) : req.params?.id;
        
        // Don't await — fire and forget
        prisma.auditLog.create({
          data: {
            userId: (req as any).user?.id,
            action,
            entity,
            entityId,
            after: body,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        }).catch(err => console.error('[AuditLog] Failed to record:', err));
      }
      
      return originalSend(body);
    };

    next();
  };
}

// Usage in routes:
// router.post('/bookings', audit('CREATE', 'Booking', (req) => req.body?.id), createBooking);
```

### Admin UI: `/audit-log`
- Table with filters: entity type, action, date range, user
- Expand row: show JSON diff (before vs after)
- Export to CSV

---

## Task 6.3: Rate Limiting

```bash
npm install express-rate-limit
```

```typescript
// middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window
  message: { success: false, message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,                   // 3 OTP requests per window
  message: { success: false, message: 'Too many OTP requests. Please try again later.' },
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,                 // 100 requests per minute
});
```

### Apply
```typescript
// in index.ts
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/public/otp/send', otpLimiter);
app.use('/api', apiLimiter);
```

---

## Task 6.4: Cloud Image Uploads

### Current Problem
- All images stored as data URLs in PostgreSQL
- 10mb Express limit, bloats database, slow page loads

### Implementation

```bash
npm install multer @aws-sdk/client-s3
```

### Upload Endpoint
```typescript
// controllers/uploadController.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import crypto from 'crypto';

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,  // e.g., Cloudflare R2 endpoint
  region: 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

export const uploadFile = async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw new AppError('No file uploaded', 400);

  const ext = file.originalname.split('.').pop();
  const key = `uploads/${crypto.randomUUID()}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  const url = `${process.env.S3_PUBLIC_URL}/${key}`;
  res.json({ success: true, url, key });
};
```

### Frontend Hook
```typescript
// hooks/useImageUpload.ts
export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.url;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}
```

### Migration Script
- Iterate all models with image fields (Room, RestaurantMenu, Gallery, Blogs, NearbySpots, Expenses)
- Decode data URL → upload to S3 → replace with URL
- One-time script, run via `npx ts-node scripts/migrate-images.ts`

---

## Task 6.5: API Documentation (Swagger/OpenAPI)

```bash
npm install swagger-jsdoc swagger-ui-express
```

```typescript
// utils/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sreemanga Resort Management API',
      version: '2.0.0',
      description: 'API for managing resort operations including rooms, restaurant, day-long bookings, accounts, shareholders, and staff HR.',
    },
    servers: [
      { url: 'http://localhost:8000', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
```

```typescript
// in index.ts
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './utils/swagger';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

Add JSDoc annotations to route files:
```typescript
/**
 * @openapi
 * /api/bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: Get all bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by booking status
 *     responses:
 *       200:
 *         description: List of bookings
 */
```

---

## Task 6.6: Seed Data Update

Update `prisma/seed.ts` to include:
- Default Chart of Accounts (all accounts from Phase 0)
- Default Departments + Designations
- Default Shifts (Morning, Evening, Night, General)
- Sample Day Long Products (Pool Access, Day Cottage, Conference Room)
- Sample Shareholder
- Expanded demo staff with StaffProfiles

---

## Task 6.7: Fix BANK_TRANSFER Mapping

### Current (bug)
```typescript
// bookingPayment.ts:20
case 'BANK_TRANSFER':
  return 'CARD';  // WRONG! BANK_TRANSFER is not CARD
```

### Fix
```typescript
// After Phase 0 adds BANK_TRANSFER to enum
function mapBookingPaymentMethod(method?: string | null): PaymentMethod {
  switch (method) {
    case 'BKASH':
    case 'NAGAD':
      return 'MOBILE_BANKING';
    case 'BANK_TRANSFER':
      return 'BANK_TRANSFER';
    case 'STRIPE':
      return 'STRIPE';
    case 'CARD':
      return 'CARD';
    case 'CASH':
    default:
      return 'CASH';
  }
}
```

---

## Task 6.8: Environment & Config Improvements

- Move hardcoded CORS origins to env
- Add `SHAREHOLDER_URL` for shareholder portal base URL
- Add attendance auto-marking cron config
- Document all new env vars in `.env.example`

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/server/src/middleware/permission.ts` | Granular permission middleware |
| `apps/server/src/middleware/audit.ts` | Audit logging middleware |
| `apps/server/src/middleware/rateLimiter.ts` | Rate limit middleware |
| `apps/server/src/controllers/uploadController.ts` | File upload endpoint |
| `apps/server/src/routes/uploadRoutes.ts` | Upload routes |
| `apps/server/src/utils/swagger.ts` | Swagger configuration |
| `apps/admin/src/hooks/useImageUpload.ts` | Image upload hook |
| `apps/admin/src/pages/AuditLog/AuditLog.tsx` | Audit log viewer |
| `apps/server/scripts/migrate-images.ts` | Data URL to S3 migration |

## Files to Modify

| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Add AuditLog, Permission, RolePermission models |
| `apps/server/prisma/seed.ts` | Seed permissions, default data |
| `apps/server/src/index.ts` | Mount rate limiters, Swagger, upload routes, audit log route |
| `apps/server/src/utils/bookingPayment.ts` | Fix BANK_TRANSFER mapping |
| `apps/admin/src/config/rbac.ts` | Add Audit Log route |
| `apps/admin/src/App.tsx` | Add audit log route |
| `.env.example` (create if missing) | Add all new env vars |
