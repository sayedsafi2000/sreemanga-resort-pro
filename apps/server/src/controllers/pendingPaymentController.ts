import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';
import { recordExpense } from '../utils/accountLedger';

const pendingPaymentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.string().uuid().optional().nullable(),
  dueDate: z.string().transform((s) => new Date(s)),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']).optional().default('PENDING'),
});

const payNowSchema = z.object({
  date: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'BKASH', 'NAGAD', 'CARD']).optional().default('CASH'),
  paidTo: z.string().optional(),
  description: z.string().optional(),
});

export const getPendingPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const where: any = {};
    if (status) where.status = status;

    const payments = await prisma.pendingPayment.findMany({
      where,
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
    res.json({ success: true, payments });
  } catch (error) {
    next(error);
  }
};

export const createPendingPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = pendingPaymentSchema.parse(req.body);
    const userId = (req as any).user?.id;
    const payment = await prisma.pendingPayment.create({
      data: {
        title: data.title,
        amount: data.amount,
        categoryId: data.categoryId ?? null,
        dueDate: data.dueDate,
        notes: data.notes,
        status: data.status ?? 'PENDING',
        createdById: userId,
      },
      include: { category: true },
    });
    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

export const updatePendingPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.pendingPayment.findUnique({ where: { id } });
    if (!existing) throw new AppError('Pending payment not found', 404);
    if (existing.status === 'PAID') {
      throw new AppError('Cannot edit a payment that has already been paid.', 400);
    }
    const data = pendingPaymentSchema.partial().parse(req.body);
    const payment = await prisma.pendingPayment.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...('categoryId' in data && { categoryId: data.categoryId ?? null }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: { category: true },
    });
    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

export const deletePendingPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.pendingPayment.findUnique({ where: { id } });
    if (!existing) throw new AppError('Pending payment not found', 404);
    await prisma.pendingPayment.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/** Mark a pending payment as paid — creates an Expense, posts ledger, links it back. */
export const payNow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const pending = await prisma.pendingPayment.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!pending) throw new AppError('Pending payment not found', 404);
    if (pending.status === 'PAID') throw new AppError('Already paid.', 400);
    if (pending.status === 'CANCELLED') throw new AppError('Cannot pay a cancelled entry.', 400);

    const opts = payNowSchema.parse(req.body);
    const userId = (req as any).user?.id;
    const payDate = opts.date ? new Date(opts.date) : new Date();

    // categoryId may be null — look up or use a fallback "Miscellaneous" category
    let categoryId = pending.categoryId;
    if (!categoryId) {
      let misc = await prisma.expenseCategory.findFirst({ where: { name: 'Miscellaneous' } });
      if (!misc) {
        misc = await prisma.expenseCategory.create({ data: { name: 'Miscellaneous', sortOrder: 99 } });
      }
      categoryId = misc.id;
    }

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          title: pending.title,
          amount: pending.amount,
          categoryId: categoryId!,
          date: payDate,
          paymentMethod: (opts.paymentMethod as any) ?? 'CASH',
          paidTo: opts.paidTo ?? null,
          description: opts.description ?? pending.notes ?? null,
          status: 'PAID',
          createdById: userId,
        },
      });

      const category = await tx.expenseCategory.findUnique({ where: { id: created.categoryId } });
      await recordExpense(tx, {
        amount: created.amount,
        method: created.paymentMethod ?? 'CASH',
        expenseAccountId: category?.accountId ?? undefined,
        title: created.title,
        expenseId: created.id,
        createdById: userId,
      });

      await tx.pendingPayment.update({
        where: { id },
        data: { status: 'PAID', paidExpenseId: created.id },
      });

      return created;
    });

    res.json({ success: true, expense });
  } catch (error) {
    next(error);
  }
};
