import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { recordTransfer, recordManualEntry, recordRevenue, applyBalanceDelta } from '../utils/accountLedger';
import { localNoon, nextLocalDay, parseYmdLocal, todayYmd } from '../utils/dateRange';
import { retireLegacyAccounts } from '../utils/financeCategories';
import {
  accountSchema,
  accountUpdateSchema,
  manualTxnSchema,
  txnUpdateSchema,
  transferSchema,
  receivableSchema,
  receivableUpdateSchema,
  receivableCollectSchema,
} from '../validators/accountValidator';

/** 'YYYY-MM-DD' → local noon of that day; 400 on a malformed or future date. */
function entryDate(ymd: string): Date {
  if (parseYmdLocal(ymd) >= nextLocalDay(todayYmd())) throw new AppError('Transaction date cannot be in the future', 400);
  return localNoon(ymd);
}

// Only rows staff typed in themselves may be edited or deleted here. Everything else
// (payments, expenses, refunds, finance entries, …) mirrors another record and is changed there.
const USER_MADE_TYPES = new Set(['MANUAL', 'TRANSFER']);
function assertUserMade(row: { referenceType: string | null }): void {
  if (!row.referenceType || !USER_MADE_TYPES.has(row.referenceType)) {
    throw new AppError('This entry is linked to a payment/expense — change it at the source', 400);
  }
}

// ── Accounts ───────────────────────────────────────────────────────────────
// Returns a flat list; the UI builds the tree from parentId. Also returns a
// nested tree for convenience.
export const listAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await retireLegacyAccounts();
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
    const transactionDate = data.transactionDate ? entryDate(data.transactionDate) : undefined;
    await prisma.$transaction((tx) =>
      recordManualEntry(tx, {
        accountId: account.id,
        direction: data.direction,
        amount: data.amount,
        description: data.description ?? undefined,
        createdById: (req as any).user?.id,
        transactionDate,
      })
    );
    const updated = await prisma.account.findUnique({ where: { id: account.id } });
    res.status(201).json({ success: true, account: updated });
  } catch (error) { next(error); }
};

// Edit a user-made row (MANUAL, or one leg of a TRANSFER). The old delta is reverted and the
// new one applied inside the same transaction; a transfer leg drags its sibling along so the
// two legs always agree (direction is fixed for transfers — only amount/note/date may change).
export const updateTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = txnUpdateSchema.parse(req.body);
    const transactionDate = data.transactionDate ? entryDate(data.transactionDate) : undefined;
    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.accountTransaction.findUnique({ where: { id: req.params.id } });
      if (!row) throw new AppError('Transaction not found', 404);
      assertUserMade(row);
      const isTransfer = row.referenceType === 'TRANSFER';
      if (isTransfer && data.direction && data.direction !== row.direction) {
        throw new AppError('A transfer leg keeps its direction — change the amount, note or date instead', 400);
      }
      const amount = data.amount ?? row.amount;
      const direction = isTransfer ? row.direction : data.direction ?? row.direction;
      const description = data.description === undefined ? row.description : data.description;
      const common = {
        amount,
        description,
        ...(transactionDate ? { transactionDate } : {}),
      };

      await applyBalanceDelta(tx, row.accountId, row.direction, row.amount, -1);
      const transaction = await tx.accountTransaction.update({
        where: { id: row.id },
        data: { ...common, direction },
      });
      await applyBalanceDelta(tx, row.accountId, direction, amount, 1);

      let sibling = null;
      if (isTransfer && row.referenceId) {
        const other = await tx.accountTransaction.findFirst({
          where: { referenceType: 'TRANSFER', referenceId: row.referenceId, id: { not: row.id } },
        });
        if (other) {
          await applyBalanceDelta(tx, other.accountId, other.direction, other.amount, -1);
          sibling = await tx.accountTransaction.update({ where: { id: other.id }, data: common });
          await applyBalanceDelta(tx, other.accountId, other.direction, amount, 1);
        }
      }
      const account = await tx.account.findUnique({ where: { id: row.accountId } });
      return { transaction, sibling, account };
    });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

// Delete a user-made row, reverting its balance effect. A grouped transfer removes both legs;
// a legacy transfer leg without a referenceId is removed on its own.
export const deleteTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.accountTransaction.findUnique({ where: { id: req.params.id } });
      if (!row) throw new AppError('Transaction not found', 404);
      assertUserMade(row);
      const legs = [row];
      if (row.referenceType === 'TRANSFER' && row.referenceId) {
        const others = await tx.accountTransaction.findMany({
          where: { referenceType: 'TRANSFER', referenceId: row.referenceId, id: { not: row.id } },
        });
        legs.push(...others);
      }
      for (const leg of legs) {
        await applyBalanceDelta(tx, leg.accountId, leg.direction, leg.amount, -1);
        await tx.accountTransaction.delete({ where: { id: leg.id } });
      }
      const account = await tx.account.findUnique({ where: { id: row.accountId } });
      return { deleted: legs.map((l) => l.id), account };
    });
    res.json({ success: true, ...result });
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
    const groupId = randomUUID(); // ties the two legs together for later edit/delete
    await prisma.$transaction((tx) =>
      recordTransfer(tx, {
        fromAccountId: from.id,
        toAccountId: to.id,
        amount: data.amount,
        description: data.description ?? `Transfer ${from.name} → ${to.name}`,
        createdById: (req as any).user?.id,
        groupId,
      })
    );
    res.json({ success: true, message: 'Transfer complete', groupId });
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

function receivableStatus(amount: number, collectedAmount: number): 'OPEN' | 'PARTIAL' | 'COLLECTED' {
  if (collectedAmount <= 0) return 'OPEN';
  return collectedAmount >= amount - 0.001 ? 'COLLECTED' : 'PARTIAL';
}

// Edit an outstanding receivable. The amount may not drop below what has already been collected.
export const updateReceivable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = receivableUpdateSchema.parse(req.body);
    const rec = await prisma.receivable.findUnique({ where: { id: req.params.id } });
    if (!rec) throw new AppError('Receivable not found', 404);
    if (rec.status !== 'OPEN' && rec.status !== 'PARTIAL') {
      throw new AppError('Only open or partially collected receivables can be edited', 400);
    }
    const amount = data.amount ?? rec.amount;
    if (amount < rec.collectedAmount - 0.001) {
      throw new AppError(`Amount cannot be less than the ৳${rec.collectedAmount.toFixed(2)} already collected`, 400);
    }
    const receivable = await prisma.receivable.update({
      where: { id: rec.id },
      data: {
        ...(data.customerName !== undefined ? { customerName: data.customerName } : {}),
        amount,
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        status: receivableStatus(amount, rec.collectedAmount),
      },
    });
    res.json({ success: true, receivable });
  } catch (error) { next(error); }
};

// Delete a receivable nothing has been collected against (collections posted cash — cancel instead).
export const deleteReceivable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rec = await prisma.receivable.findUnique({ where: { id: req.params.id } });
    if (!rec) throw new AppError('Receivable not found', 404);
    if (rec.collectedAmount > 0) {
      throw new AppError('Money has already been collected against this receivable — cancel it instead of deleting', 400);
    }
    await prisma.receivable.delete({ where: { id: rec.id } });
    res.json({ success: true, message: 'Receivable deleted' });
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
      const status = receivableStatus(rec.amount, collectedAmount);
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
