# Phase 3: Inventory Management (Products, Food Items, Amenities)

**Goal:** Client requirement #2 — track Products, Food Items (restaurant), and Amenities as stock. Support purchase-in, auto-deduction on sale/consumption, low-stock alerts, and cost feeding the accounts system.

**Depends on:** Phase 0 (foundation), Phase 2 (restaurant order → food-item consumption). Ledger cost postings land with Phase 4.

**Decision applied:** **Full stock tracking with auto-deduct.** Restaurant orders and day-long bookings consume linked inventory; purchases add stock and create expenses.

**Effort:** ~6-7 days

---

## Categories (client asked to organize these)

| Inventory category | Examples | Consumed by |
|--------------------|----------|-------------|
| `FOOD_ITEM` | rice, chicken, oil, drinks | Restaurant orders (via recipe/direct link) |
| `AMENITY` | towels, toiletries, bed linen, slippers | Rooms / housekeeping issue |
| `PRODUCT` | resale goods, merchandise | Direct sale / day-long packages |
| `SUPPLY` | cleaning, office, maintenance consumables | Manual issue |
| `ASSET` | furniture, equipment (non-consumable) | Register only (links to fixed-asset account) |

---

## Schema

```prisma
enum InventoryCategory {
  FOOD_ITEM
  AMENITY
  PRODUCT
  SUPPLY
  ASSET
}

enum StockMoveType {
  PURCHASE      // stock in (buy)
  SALE          // stock out (sold directly)
  CONSUMPTION   // stock out (used by restaurant order / day-long)
  ISSUE         // stock out (housekeeping/amenity issue to room)
  ADJUSTMENT    // manual +/- (correction, wastage, spoilage)
  RETURN        // stock in (return from issue/supplier reversal)
}

model InventoryItem {
  id            String            @id @default(uuid())
  sku           String?           @unique
  name          String
  category      InventoryCategory
  unit          String            // "kg", "pcs", "litre", "box"
  currentStock  Float             @default(0)
  reorderLevel  Float             @default(0)   // low-stock threshold
  costPrice     Float             @default(0)   // last purchase unit cost
  sellPrice     Float?            // for PRODUCT direct sale
  supplierId    String?
  supplier      Supplier?         @relation(fields: [supplierId], references: [id])
  expenseAccountCode String?      // which EXPENSE/ASSET account a purchase hits (default by category)
  isActive      Boolean           @default(true)
  notes         String?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  movements     StockMovement[]
  menuLinks     MenuItemIngredient[]

  @@index([category])
  @@index([isActive])
  @@index([currentStock])
}

model Supplier {
  id        String   @id @default(uuid())
  name      String
  phone     String?
  email     String?
  address   String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items     InventoryItem[]
  purchases StockMovement[]

  @@index([isActive])
}

model StockMovement {
  id            String        @id @default(uuid())
  itemId        String
  item          InventoryItem @relation(fields: [itemId], references: [id])
  type          StockMoveType
  quantity      Float         // always positive; sign implied by type
  unitCost      Float?        // for PURCHASE
  totalCost     Float?        // quantity * unitCost
  balanceAfter  Float         // currentStock snapshot after this move
  supplierId    String?
  supplier      Supplier?     @relation(fields: [supplierId], references: [id])
  referenceType String?       // "RESTAURANT_ORDER" | "DAY_LONG_BOOKING" | "PURCHASE" | "MANUAL"
  referenceId   String?
  expenseId     String?       // link to created Expense (for PURCHASE)
  notes         String?
  createdById   String?
  createdBy     User?         @relation(fields: [createdById], references: [id])
  createdAt     DateTime      @default(now())

  @@index([itemId])
  @@index([type])
  @@index([referenceType, referenceId])
  @@index([createdAt])
}

// Recipe link: a menu item consumes N units of an inventory food-item
model MenuItemIngredient {
  id          String        @id @default(uuid())
  menuItemId  String
  menuItem    RestaurantMenu @relation(fields: [menuItemId], references: [id])
  itemId      String
  item        InventoryItem @relation(fields: [itemId], references: [id])
  quantity    Float         // units consumed per 1 menu item sold
  createdAt   DateTime      @default(now())

  @@unique([menuItemId, itemId])
  @@index([menuItemId])
}
```

---

## Stock Math (one rule, mirrors the ledger)

```
IN  types  (PURCHASE, RETURN)                → currentStock += quantity
OUT types  (SALE, CONSUMPTION, ISSUE)        → currentStock -= quantity
ADJUSTMENT → signed quantity (can be + or -)
Every movement records balanceAfter for a full audit trail.
```

All movements + stock update happen inside one `prisma.$transaction`. OUT moves validate `currentStock >= quantity` (configurable: block vs allow-negative with warning).

---

## Auto-Deduction Hooks

### Restaurant order consumption (Phase 2 integration)
On order payment (or DELIVERED — pick one, default: on first payment):
1. For each order item, look up `MenuItemIngredient` links.
2. For each ingredient: create `CONSUMPTION` movement of `qty_ordered * ingredient.quantity`.
3. If a menu item has no ingredient links → skip (not stock-tracked).

### Day-long / amenity issue
- Day-long packages can declare consumed items (e.g., picnic supplies) → `CONSUMPTION` on booking confirm.
- Housekeeping amenity issue → manual `ISSUE` movement against a room.

### Purchase (stock in + expense)
On `POST /api/inventory/purchases`:
1. Create `PURCHASE` movement(s), `currentStock += qty`, update `costPrice`.
2. Create an `Expense` (category = Food Supplies / Inventory) → **Phase 4 ledger** `recordExpense` (DEBIT expense / OUT cash).
3. Link `StockMovement.expenseId`.

---

## API Endpoints

### Items (`/api/inventory/items`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/inventory/items` | Any auth | List (filter: category, low-stock, active) |
| GET | `/api/inventory/items/:id` | Any auth | Item detail + movement history |
| POST | `/api/inventory/items` | SUPER_ADMIN, MANAGER, ACCOUNTANT | Create item |
| PATCH | `/api/inventory/items/:id` | SUPER_ADMIN, MANAGER, ACCOUNTANT | Update |
| DELETE | `/api/inventory/items/:id` | SUPER_ADMIN | Deactivate |

### Movements & Purchases
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/inventory/movements` | Any auth | Movement ledger (filters) |
| POST | `/api/inventory/adjustments` | SUPER_ADMIN, MANAGER | Manual adjustment (+/-) |
| POST | `/api/inventory/issues` | MANAGER, HOUSEKEEPING, RESTAURANT_STAFF | Issue stock (amenity/supply) |
| POST | `/api/inventory/purchases` | SUPER_ADMIN, MANAGER, ACCOUNTANT | Purchase in (creates expense) |

### Suppliers (`/api/inventory/suppliers`) — CRUD, SUPER_ADMIN + MANAGER
### Recipes (`/api/inventory/recipes`) — link menu items to ingredients, SUPER_ADMIN + MANAGER
### Alerts
| GET | `/api/inventory/low-stock` | Any auth | Items at/below reorder level |

---

## Admin UI Pages (`pages/Inventory/`)

### Items.tsx
- Table: name, category, stock (colored if ≤ reorder), unit, cost, sell, supplier, status
- Filters: category tabs, low-stock toggle, search
- CRUD dialog

### StockMovements.tsx
- Ledger table: date, item, type badge, qty, balanceAfter, reference, user
- Filters: item, type, date range; CSV export

### Purchases.tsx
- Purchase entry form (supplier, multi-line items, unit cost) → creates movements + expense
- Purchase history

### Suppliers.tsx — supplier CRUD
### Recipes.tsx — per menu item, add ingredient links (item + qty/unit)
### LowStock.tsx (or dashboard card) — reorder alert list

---

## Reports Integration (Phase 7)

- **Inventory valuation** = Σ(currentStock × costPrice) → shows as a current asset on the Balance Sheet.
- **Consumption report** by business line (food cost for restaurant, supplies for day-long).
- **Purchase report** by supplier / period.
- Low-stock report.

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/server/src/controllers/inventoryController.ts` | Items, movements, adjustments, issues, low-stock |
| `apps/server/src/controllers/purchaseController.ts` | Purchases (stock in + expense) |
| `apps/server/src/controllers/supplierController.ts` | Supplier CRUD |
| `apps/server/src/controllers/recipeController.ts` | Menu ↔ ingredient links |
| `apps/server/src/routes/inventoryRoutes.ts` | Inventory routes |
| `apps/server/src/routes/supplierRoutes.ts` | Supplier routes |
| `apps/server/src/utils/inventory.ts` | `applyMovement`, `consumeForOrder` (transactional stock helpers) |
| `apps/server/src/validators/inventoryValidator.ts` | Zod schemas |
| `apps/admin/src/pages/Inventory/Items.tsx` | Item management |
| `apps/admin/src/pages/Inventory/StockMovements.tsx` | Movement ledger |
| `apps/admin/src/pages/Inventory/Purchases.tsx` | Purchase entry |
| `apps/admin/src/pages/Inventory/Suppliers.tsx` | Supplier management |
| `apps/admin/src/pages/Inventory/Recipes.tsx` | Recipe/ingredient links |

## Files to Modify

| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Add InventoryItem, Supplier, StockMovement, MenuItemIngredient, enums; relation from RestaurantMenu |
| `apps/server/src/index.ts` | Mount inventory + supplier routes |
| `apps/server/src/controllers/restaurantController.ts` | Call `consumeForOrder` on order payment/deliver |
| `apps/server/prisma/seed.ts` | Seed sample items, one supplier, a couple recipes |
| `apps/admin/src/config/rbac.ts` | Add Inventory sidebar items |
| `apps/admin/src/App.tsx` | Add inventory routes |
