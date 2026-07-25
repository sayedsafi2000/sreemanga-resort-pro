import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { applyMovement } from '../utils/inventory';
import { recordExpense } from '../utils/accountLedger';
import {
  inventoryItemSchema,
  supplierSchema,
  adjustmentSchema,
  issueSchema,
  purchaseSchema,
  recipeSchema,
} from '../validators/inventoryValidator';

// ── Items ──────────────────────────────────────────────────────────────────
export const listItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, active, lowStock, search } = req.query;
    const where: any = {};
    if (category) where.category = category;
    if (active === 'true') where.isActive = true;
    if (search) where.name = { contains: String(search), mode: 'insensitive' };
    let items = await prisma.inventoryItem.findMany({
      where,
      include: { supplier: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    if (lowStock === 'true') items = items.filter((i) => i.currentStock <= i.reorderLevel);
    res.json({ success: true, items });
  } catch (error) { next(error); }
};

export const getItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
      include: { supplier: true, movements: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!item) throw new AppError('Inventory item not found', 404);
    res.json({ success: true, item });
  } catch (error) { next(error); }
};

export const createItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = inventoryItemSchema.parse(req.body);
    const initialStock = data.currentStock ?? 0;
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({
        data: {
          sku: data.sku ?? null,
          name: data.name,
          category: data.category,
          unit: data.unit,
          currentStock: 0,
          reorderLevel: data.reorderLevel ?? 0,
          costPrice: data.costPrice ?? 0,
          sellPrice: data.sellPrice ?? null,
          supplierId: data.supplierId ?? null,
          expenseAccountCode: data.expenseAccountCode ?? null,
          isActive: data.isActive ?? true,
          notes: data.notes ?? null,
        },
      });
      // Record opening stock as an adjustment so history is complete.
      if (initialStock > 0) {
        await applyMovement(tx, {
          itemId: created.id,
          type: 'ADJUSTMENT',
          quantity: initialStock,
          unitCost: data.costPrice ?? null,
          notes: 'Opening stock',
          createdById: req.user?.id,
        });
      }
      return tx.inventoryItem.findUnique({ where: { id: created.id }, include: { supplier: true } });
    });
    res.status(201).json({ success: true, item });
  } catch (error) { next(error); }
};

export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = inventoryItemSchema.partial().parse(req.body);
    const existing = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Inventory item not found', 404);
    // currentStock is NOT editable here — it only moves via movements.
    const { currentStock, ...rest } = data as any;
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: rest,
      include: { supplier: true },
    });
    res.json({ success: true, item });
  } catch (error) { next(error); }
};

export const deleteItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Inventory item not found', 404);
    const moves = await prisma.stockMovement.count({ where: { itemId: req.params.id } });
    if (moves > 0) {
      await prisma.inventoryItem.update({ where: { id: req.params.id }, data: { isActive: false } });
      res.json({ success: true, message: 'Item has movement history; deactivated instead of deleted.' });
      return;
    }
    await prisma.inventoryItem.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Inventory item deleted' });
  } catch (error) { next(error); }
};

// ── Movements ──────────────────────────────────────────────────────────────
export const listMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId, type, from, to } = req.query;
    const where: any = {};
    if (itemId) where.itemId = itemId;
    if (type) where.type = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) { const e = new Date(String(to)); e.setHours(23,59,59,999); where.createdAt.lte = e; }
    }
    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        item: true,
        supplier: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    res.json({ success: true, movements });
  } catch (error) { next(error); }
};

export const createAdjustment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = adjustmentSchema.parse(req.body);
    const movement = await prisma.$transaction((tx) =>
      applyMovement(tx, {
        itemId: data.itemId,
        type: 'ADJUSTMENT',
        quantity: data.quantity,
        notes: data.notes ?? null,
        referenceType: 'MANUAL',
        createdById: req.user?.id,
      })
    );
    res.status(201).json({ success: true, movement });
  } catch (error) { next(error); }
};

export const createIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = issueSchema.parse(req.body);
    const movement = await prisma.$transaction((tx) =>
      applyMovement(tx, {
        itemId: data.itemId,
        type: 'ISSUE',
        quantity: data.quantity,
        referenceType: data.referenceType ?? 'MANUAL',
        referenceId: data.referenceId ?? null,
        notes: data.notes ?? null,
        createdById: req.user?.id,
      })
    );
    res.status(201).json({ success: true, movement });
  } catch (error) { next(error); }
};

export const getLowStock = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.inventoryItem.findMany({ where: { isActive: true } });
    const low = items.filter((i) => i.currentStock <= i.reorderLevel);
    res.json({ success: true, items: low });
  } catch (error) { next(error); }
};

// ── Purchases (stock in + expense) ─────────────────────────────────────────
export const createPurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = purchaseSchema.parse(req.body);
    const result = await prisma.$transaction(async (tx) => {
      const items = await tx.inventoryItem.findMany({ where: { id: { in: data.lines.map((l) => l.itemId) } } });
      const byId = new Map(items.map((i) => [i.id, i]));
      let total = 0;
      const movements = [];
      for (const line of data.lines) {
        const item = byId.get(line.itemId);
        if (!item) throw new AppError(`Item ${line.itemId} not found`, 404);
        total += line.unitCost * line.quantity;
        const mv = await applyMovement(tx, {
          itemId: line.itemId,
          type: 'PURCHASE',
          quantity: line.quantity,
          unitCost: line.unitCost,
          supplierId: data.supplierId ?? null,
          referenceType: 'PURCHASE',
          notes: data.notes ?? null,
          createdById: req.user?.id,
        });
        movements.push(mv);
      }

      // Create an Expense (category = Food & Kitchen / Supplies) for the purchase.
      const category = await tx.expenseCategory.findFirst({
        where: { OR: [{ name: 'Supplies' }, { name: 'Food & Kitchen' }] },
        orderBy: { sortOrder: 'asc' },
      });
      let expenseId: string | undefined;
      if (category) {
        const expense = await tx.expense.create({
          data: {
            title: `Inventory purchase${data.supplierId ? ' (supplier)' : ''}`,
            amount: total,
            categoryId: category.id,
            date: data.date ? new Date(data.date) : new Date(),
            paymentMethod: 'CASH',
            status: 'PAID',
            description: data.notes ?? undefined,
            createdById: req.user?.id,
          },
        });
        expenseId = expense.id;
        // Link movements to the expense.
        await tx.stockMovement.updateMany({
          where: { id: { in: movements.map((m) => m.id) } },
          data: { expenseId },
        });
        // Ledger (no-op until Phase 4): expense IN + cash OUT.
        await recordExpense(tx, {
          amount: total,
          method: 'CASH',
          expenseAccountId: category.accountId ?? '',
          title: 'Inventory purchase',
          expenseId,
          createdById: req.user?.id,
        });
      }

      return { total, movements: movements.length, expenseId };
    });
    res.status(201).json({ success: true, ...result });
  } catch (error) { next(error); }
};

// ── Suppliers ──────────────────────────────────────────────────────────────
export const listSuppliers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, suppliers });
  } catch (error) { next(error); }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = supplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({ data });
    res.status(201).json({ success: true, supplier });
  } catch (error) { next(error); }
};

export const updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = supplierSchema.partial().parse(req.body);
    const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Supplier not found', 404);
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
    res.json({ success: true, supplier });
  } catch (error) { next(error); }
};

// ── Recipes (menu item ↔ ingredients) ──────────────────────────────────────
export const getRecipe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const links = await prisma.menuItemIngredient.findMany({
      where: { menuItemId: req.params.menuItemId },
      include: { item: true },
    });
    res.json({ success: true, ingredients: links });
  } catch (error) { next(error); }
};

export const setRecipe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = recipeSchema.parse({ ...req.body, menuItemId: req.params.menuItemId });
    await prisma.$transaction(async (tx) => {
      await tx.menuItemIngredient.deleteMany({ where: { menuItemId: data.menuItemId } });
      if (data.ingredients.length > 0) {
        await tx.menuItemIngredient.createMany({
          data: data.ingredients.map((g) => ({
            menuItemId: data.menuItemId,
            itemId: g.itemId,
            quantity: g.quantity,
          })),
        });
      }
    });
    const links = await prisma.menuItemIngredient.findMany({
      where: { menuItemId: data.menuItemId },
      include: { item: true },
    });
    res.json({ success: true, ingredients: links });
  } catch (error) { next(error); }
};
