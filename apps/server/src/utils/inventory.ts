import { Prisma, StockMoveType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

// IN types add stock; OUT types subtract. ADJUSTMENT uses a signed quantity.
const IN_TYPES: StockMoveType[] = ['PURCHASE', 'RETURN'];
const OUT_TYPES: StockMoveType[] = ['SALE', 'CONSUMPTION', 'ISSUE'];

/**
 * Apply one stock movement inside a transaction. Updates currentStock and
 * records the movement with a balanceAfter snapshot. Single source of truth
 * for stock math — mirrors the account ledger's one-rule approach.
 *
 * For ADJUSTMENT, `signedQuantity` may be negative; `quantity` stored is abs.
 */
export async function applyMovement(
  tx: Prisma.TransactionClient,
  m: {
    itemId: string;
    type: StockMoveType;
    quantity: number; // signed only meaningful for ADJUSTMENT; else positive
    unitCost?: number | null;
    supplierId?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
    expenseId?: string | null;
    notes?: string | null;
    createdById?: string | null;
    allowNegative?: boolean;
  }
) {
  const item = await tx.inventoryItem.findUnique({ where: { id: m.itemId } });
  if (!item) throw new AppError(`Inventory item ${m.itemId} not found`, 404);

  let delta: number;
  if (m.type === 'ADJUSTMENT') {
    delta = m.quantity; // signed
  } else if (IN_TYPES.includes(m.type)) {
    delta = Math.abs(m.quantity);
  } else if (OUT_TYPES.includes(m.type)) {
    delta = -Math.abs(m.quantity);
  } else {
    delta = 0;
  }

  const balanceAfter = item.currentStock + delta;
  if (balanceAfter < 0 && !m.allowNegative) {
    throw new AppError(
      `Insufficient stock for "${item.name}": have ${item.currentStock} ${item.unit}, need ${Math.abs(delta)}`,
      409
    );
  }

  const qtyStored = Math.abs(m.quantity);
  const unitCost = m.unitCost ?? null;
  const totalCost = unitCost != null ? unitCost * qtyStored : null;

  const movement = await tx.stockMovement.create({
    data: {
      itemId: m.itemId,
      type: m.type,
      quantity: qtyStored,
      unitCost,
      totalCost,
      balanceAfter,
      supplierId: m.supplierId ?? null,
      referenceType: m.referenceType ?? null,
      referenceId: m.referenceId ?? null,
      expenseId: m.expenseId ?? null,
      notes: m.notes ?? null,
      createdById: m.createdById ?? null,
    },
  });

  await tx.inventoryItem.update({
    where: { id: m.itemId },
    data: {
      currentStock: balanceAfter,
      // Refresh last cost on purchase.
      ...(m.type === 'PURCHASE' && unitCost != null ? { costPrice: unitCost } : {}),
    },
  });

  return movement;
}

/**
 * Deduct inventory consumed by a restaurant order via recipe links.
 * order.items entries look like { menuId, qty }. For each menu item with
 * MenuItemIngredient links, consume qty * ingredient.quantity.
 * Idempotency guard: skip if CONSUMPTION already recorded for this order.
 */
export async function consumeForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  items: Array<{ menuId?: string; qty?: number }>,
  createdById?: string
): Promise<number> {
  const already = await tx.stockMovement.findFirst({
    where: { referenceType: 'RESTAURANT_ORDER', referenceId: orderId, type: 'CONSUMPTION' },
    select: { id: true },
  });
  if (already) return 0;

  let consumed = 0;
  for (const line of items) {
    if (!line.menuId || !line.qty) continue;
    const links = await tx.menuItemIngredient.findMany({ where: { menuItemId: line.menuId } });
    for (const link of links) {
      await applyMovement(tx, {
        itemId: link.itemId,
        type: 'CONSUMPTION',
        quantity: link.quantity * line.qty,
        referenceType: 'RESTAURANT_ORDER',
        referenceId: orderId,
        createdById,
        allowNegative: true, // don't block a paid order on stock count
      });
      consumed += 1;
    }
  }
  return consumed;
}
