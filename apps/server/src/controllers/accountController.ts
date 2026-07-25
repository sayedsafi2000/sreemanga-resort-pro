import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { recordTransfer, recordManualEntry, recordRevenue } from '../utils/accountLedger';
import {
  accountSchema,
  accountUpdateSchema,
  manualTxnSchema,
  transferSchema,
  receivableSchema,
  receivableCollectSchema,
} from '../validators/accountValidator';

// ── Accounts ───────────────────────────────────────────────────────────────
// Returns a flat list; the UI builds the tree from parentId. Also returns a
// nested tree for convenience.
export const listAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, active } = req.query;
    const where: any = {};
    if (type) where.type = type;
    if (active === 'true') where.isActive = true;
    const accounts = await prisma.account.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    res.json({ success: true, accounts });
  } catch (error) { next(error); }
};

export const getAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.params.id },
      include: { parent: true, children: true },
    });
    if (!account) throw new AppError('Account not found', 404);
    res.json({ success: true, account });
  } catch (error) { next(error); }
};

export const createAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = accountSchema.parse(req.body);
    const dup = await prisma.account.findUnique({ where: { code: data.code } });
    if (dup) throw new AppError(`Account code ${data.code} already exists`, 409);
    const opening = data.openingBalance ?? 0;
    const account = await prisma.account.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        parentId: data.parentId ?? null,
        description: data.description ?? null,
        openingBalance: opening,
        currentBalance: opening, // start at opening balance
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    res.status(201).json({ success: true, account });
  } catch (error) { next(error); }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = accountUpdateSchema.parse(req.body);
    const existing = await prisma.account.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Account not found', 404);
    // Adjust currentBalance by the delta if openingBalance is edited.
    let currentBalance: number | undefined;
    if (data.openingBalance !== undefined) {
      currentBalance = existing.currentBalance + (data.openingBalance - existing.openingBalance);
    }
    const account = await prisma.account.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.openingBalance !== undefined ? { openingBalance: data.openingBalance } : {}),
        ...(currentBalance !== undefined ? { currentBalance } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
    res.json({ success: true, account });
  } catch (error) { next(error); }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.account.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Account not found', 404);
    const txns = await prisma.accountTransaction.count({ where: { accountId: req.params.id } });
    if (txns > 0) {
      await prisma.account.update({ where: { id: req.params.id }, data: { isActive: false } });
      res.json({ success: true, message: 'Account has transactions; deactivated instead of deleted.' });
      return;
    }
    await prisma.account.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) { next(error); }
};

// ── Transactions ───────────────────────────────────────────────────────────
export const getAccountTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query;
    const where: any = { accountId: req.params.id };
    if (from || to) {
      where.transactionDate = {};
      if (from) where.transactionDate.gte = new Date(String(from));
      if (to) { const e = new Date(String(to)); e.setHours(23,59,59,999); where.transactionDate.lte = e; }
    }
    const transactions = await prisma.accountTransaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      take: 500,
    });
    res.json({ success: true, transactions });
  } catch (error) { next(error); }
};

export const addManualTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await prisma.account.findUnique({ where: { id: req.params.id } });
    if (!account) throw new AppError('Account not found', 404);
    const data = manualTxnSchema.parse(req.body);
    await prisma.$transaction((tx) =>
      recordManualEntry(tx, {
        accountId: account.id,
        direction: data.direction,
        amount: data.amount,
        description: data.description ?? undefined,
        createdById: (req as any).user?.id,
      })
    );
    const updated = await prisma.account.findUnique({ where: { id: account.id } });
    res.status(201).json({ success: true, account: updated });
  } catch (error) { next(error); }
};

export const transfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = transferSchema.parse(req.body);
    if (data.fromAccountId === data.toAccountId) throw new AppError('Cannot transfer to the same account', 400);
    const [from, to] = await Promise.all([
      prisma.account.findUnique({ where: { id: data.fromAccountId } }),
      prisma.account.findUnique({ where: { id: data.toAccountId } }),
    ]);
    if (!from || !to) throw new AppError('Account not found', 404);
    await prisma.$transaction((tx) =>
      recordTransfer(tx, {
        fromAccountId: from.id,
        toAccountId: to.id,
        amount: data.amount,
        description: data.description ?? `Transfer ${from.name} → ${to.name}`,
        createdById: (req as any).user?.id,
      })
    );
    res.json({ success: true, message: 'Transfer complete' });
  } catch (error) { next(error); }
};

// ── Receivables ────────────────────────────────────────────────────────────
export const listReceivables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;
    const receivables = await prisma.receivable.findMany({
      where,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, receivables });
  } catch (error) { next(error); }
};

export const createReceivable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = receivableSchema.parse(req.body);
    const receivable = await prisma.receivable.create({
      data: {
        customerName: data.customerName,
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        referenceType: data.referenceType ?? null,
        referenceId: data.referenceId ?? null,
        notes: data.notes ?? null,
        createdById: (req as any).user?.id,
      },
    });
    res.status(201).json({ success: true, receivable });
  } catch (error) { next(error); }
};

// Record a collection against a receivable → cash IN (+ income if it maps to a line).
export const collectReceivable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = receivableCollectSchema.parse(req.body);
    const result = await prisma.$transaction(async (tx) => {
      const rec = await tx.receivable.findUnique({ where: { id: req.params.id } });
      if (!rec) throw new AppError('Receivable not found', 404);
      if (rec.status === 'CANCELLED') throw new AppError('Receivable is cancelled', 400);
      const balance = rec.amount - rec.collectedAmount;
      if (data.amount > balance + 0.001) throw new AppError(`Collection exceeds balance (৳${balance.toFixed(2)})`, 400);

      const collectedAmount = rec.collectedAmount + data.amount;
      const status = collectedAmount >= rec.amount ? 'COLLECTED' : 'PARTIAL';
      const updated = await tx.receivable.update({
        where: { id: rec.id },
        data: { collectedAmount, status },
      });

      // Cash IN. If linked to a business line, also tally income.
      const lineMap: Record<string, string> = { BOOKING: 'ROOM', RESTAURANT_ORDER: 'RESTAURANT', DAY_LONG_BOOKING: 'DAY_LONG' };
      const businessLine = rec.referenceType ? lineMap[rec.referenceType] : undefined;
      if (businessLine) {
        await recordRevenue(tx, {
          amount: data.amount,
          method: data.method,
          businessLine,
          referenceType: 'INVOICE',
          referenceId: rec.id,
          createdById: (req as any).user?.id,
        });
      } else {
        const cashAcct = await tx.account.findUnique({ where: { code: methodCode(data.method) } });
        if (cashAcct) {
          await recordManualEntry(tx, {
            accountId: cashAcct.id,
            direction: 'IN',
            amount: data.amount,
            description: `Receivable collected - ${rec.customerName}`,
            createdById: (req as any).user?.id,
          });
        }
      }
      return updated;
    });
    res.json({ success: true, receivable: result });
  } catch (error) { next(error); }
};

function methodCode(method: string): string {
  const map: Record<string, string> = { CASH: '1001', BKASH: '1003', NAGAD: '1003', MOBILE_BANKING: '1003', CARD: '1002', BANK_TRANSFER: '1002' };
  return map[method] || '1001';
}
