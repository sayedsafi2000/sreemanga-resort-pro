# Phase 1: Day Long Booking Module

**Goal:** Add day-use booking for pool, cottage, conference room, event space, picnic area.

**Depends on:** Phase 0 (BusinessLine enum)

**Effort:** ~5-6 days

---

## Schema

```prisma
enum DayLongCategory {
  POOL
  COTTAGE
  CONFERENCE
  EVENT
  PICNIC
}

enum DayLongBookingStatus {
  PENDING
  CONFIRMED
  CHECKED_IN
  CHECKED_OUT
  CANCELLED
}

model DayLongProduct {
  id            String          @id @default(uuid())
  name          String          // e.g., "Swimming Pool Access", "Day Cottage"
  category      DayLongCategory
  description   String?
  images        String[]
  basePrice     Float           // Per-slot or base rate
  pricePerPerson Float?         // Per-person charge (nullable)
  maxCapacity   Int?            // Maximum persons
  minCapacity   Int?            // Minimum persons
  facilities    Json?           // ["Shower", "Changing Room", "WiFi"]
  availableSlots Json?          // [{ start: "09:00", end: "17:00", label: "Full Day" }, ...]
  duration      Int?            // Default duration in hours
  bookingRules  Json?           // Cancellation policy, advance booking days
  isActive      Boolean         @default(true)
  sortOrder     Int             @default(0)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  bookings      DayLongBooking[]

  @@index([category])
  @@index([isActive, sortOrder])
}

model DayLongBooking {
  id            String               @id @default(uuid())
  productId     String
  product       DayLongProduct       @relation(fields: [productId], references: [id])
  guestName     String
  guestPhone    String
  guestEmail    String?
  guestNid      String?
  guestAddress  String?
  bookingDate   DateTime             // Date of the day-use
  slotStart     String               // "09:00"
  slotEnd       String               // "17:00"
  adults        Int                  @default(1)
  children      Int                  @default(0)
  totalAmount   Float
  status        DayLongBookingStatus @default(PENDING)
  notes         String?
  preferredPaymentTiming String?     // INSTANT / LATER
  preferredPaymentMethod String?
  paymentTransactionId String?
  paymentProofImage String?
  createdById   String?
  createdBy     User?                @relation(fields: [createdById], references: [id])
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt

  payments      Payment[]            // Link to Payment table (polymorphic via referenceType + referenceId)

  @@index([productId])
  @@index([bookingDate])
  @@index([status])
  @@index([bookingDate, status])
}
```

### Payment Link (Polymorphic)

Add to `Payment` model:
```prisma
model Payment {
  // ... existing fields ...
  referenceType String?   // "BOOKING" | "RESTAURANT_ORDER" | "DAY_LONG_BOOKING"
  referenceId   String?   // UUID of the referenced booking/order
  businessLine  BusinessLine?  // ROOM | RESTAURANT | DAY_LONG
}
```

---

## API Endpoints

### Admin Routes (`/api/day-long-products`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/day-long-products` | Any auth | List all products |
| GET | `/api/day-long-products/:id` | Any auth | Get product detail |
| POST | `/api/day-long-products` | SUPER_ADMIN, MANAGER | Create product |
| PATCH | `/api/day-long-products/:id` | SUPER_ADMIN, MANAGER | Update product |
| DELETE | `/api/day-long-products/:id` | SUPER_ADMIN | Delete product |

### Admin Routes (`/api/day-long-bookings`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/day-long-bookings` | Any auth | List bookings (filter by date, status, product) |
| GET | `/api/day-long-bookings/:id` | Any auth | Get booking detail |
| POST | `/api/day-long-bookings` | RECEPTIONIST, MANAGER, SUPER_ADMIN | Create manual booking |
| PATCH | `/api/day-long-bookings/:id` | Any auth | Update booking status |
| DELETE | `/api/day-long-bookings/:id` | SUPER_ADMIN | Cancel booking |

### Public Routes (`/api/public/day-long`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/day-long/products` | List active products with availability |
| GET | `/api/public/day-long/products/:id` | Product detail |
| GET | `/api/public/day-long/availability` | Check availability by date |
| POST | `/api/public/day-long/bookings` | Create booking (requires OTP verified) |

---

## Pricing Calculation Logic

```typescript
function calculateDayLongTotal(
  product: DayLongProduct,
  adults: number,
  children: number,
  slotStart: string,
  slotEnd: string
): number {
  // Calculate hours
  const start = parseTime(slotStart);
  const end = parseTime(slotEnd);
  const hours = (end - start) / (1000 * 60 * 60);

  // Base price (per slot or hourly)
  let total = product.basePrice;

  // Per-person charges
  if (product.pricePerPerson) {
    total += product.pricePerPerson * (adults + children);
  }

  // Duration multiplier if base is per-hour
  // (depends on configuration)

  return total;
}
```

---

## Admin UI Pages

### DayLongProducts.tsx
- Table: name, category, basePrice, capacity, status
- Filters: by category, status
- CRUD dialog with fields: name, category (dropdown), description, base price, per-person price, capacity, facilities (tag input), slots (time range editor), images
- Sortable list

### DayLongBookings.tsx
- Calendar view (default) + Table view toggle
- Calendar: date picker → shows all bookings for that day, color-coded by product category
- Table: date, product, guest, slot, amount, status, actions
- Quick status update: Confirm, Check-in, Check-out, Cancel
- Create booking dialog (for walk-in guests)

---

## Public Web Pages

### `/day-long` page
- Hero section
- Category tabs (Pool, Cottage, Conference, Event, Picnic)
- Product cards: image, name, price, capacity, facilities
- "Book Now" button

### `/day-long/[id]` / booking flow
- Product detail with images, amenities, pricing
- Date picker (day selection)
- Slot/time picker
- Guest info form (name, phone, email)
- OTP verification
- Confirmation + payment (instant or pay later)

---

## Revenue Integration

- Day Long bookings create `Payment` records with `businessLine: DAY_LONG`
- Payments appear in Accounts system as revenue under `Day Long Revenue` account
- Day Long revenue shows separately in P&L reports

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/server/src/controllers/dayLongController.ts` | CRUD + availability + pricing logic |
| `apps/server/src/routes/dayLongRoutes.ts` | Route definitions |
| `apps/server/src/validators/dayLongValidator.ts` | Zod schemas |
| `apps/admin/src/pages/DayLong/DayLongProducts.tsx` | Product management UI |
| `apps/admin/src/pages/DayLong/DayLongBookings.tsx` | Booking management UI |
| `apps/web/src/app/day-long/page.tsx` | Public products listing |
| `apps/web/src/app/day-long/[id]/page.tsx` | Product detail + booking form |

## Files to Modify

| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Add DayLongProduct, DayLongBooking models, update Payment |
| `apps/server/src/index.ts` | Mount day-long routes |
| `apps/server/src/utils/bookingPayment.ts` | Support DayLong references |
| `apps/admin/src/config/rbac.ts` | Add Day Long sidebar items |
| `apps/admin/src/App.tsx` | Add day-long routes |
| `apps/web/src/lib/api.ts` | Add day-long API calls |
