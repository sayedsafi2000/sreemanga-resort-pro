import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { localNoon, nextLocalDay, parsePeriod, parseYmdLocal, todayYmd, toYmdLocal } from '../utils/dateRange';
import { buildStatement, type StatementMemo } from '../utils/financialStatement';
import { ensureFinanceCategories } from '../utils/financeCategories';
import { recordFinanceEntry } from '../utils/accountLedger';
import { CASH_MOVING_TYPES, financeEntrySchema } from '../validators/financeValidator';
import { formatInvoiceNo, paidAndDue, round2 } from '../utils/bookingPricing';
import { computeNet } from '../utils/orderPayment';

/**
 * Financial Report (admin /financial-report). Cash-basis statement derived from operational
 * rows — see utils/financialStatement.ts for the arithmetic. Everything dated before the
 * period end is loaded once; the pure builder splits period vs cumulative.
 */

function refundLabel(r: {
  referenceType: string | null;
  payment: { booking: { invoiceNo: number; guest: { name: string } | null } | null } | null;
}): string | null {
  const b = r.payment?.booking;
  if (b) return `${formatInvoiceNo(b.invoiceNo)}${b.guest?.name ? ` · ${b.guest.name}` : ''}`;
  if (r.referenceType === 'RESTAURANT_ORDER') return 'Restaurant order';
  if (r.referenceType === 'DAY_LONG_BOOKING') return 'Day Long booking';
  return null;
}

/** Memo lines: things the sheet deliberately leaves out, measured "now" rather than as-of. */
async function computeMemo(): Promise<StatementMemo> {
  const [bookings, orders, dayLong, items, bills, salaries] = await Promise.all([
    prisma.booking.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { totalAmount: true, payments: { select: { amount: true, status: true, refundedAmount: true } } },
    }),
    prisma.restaurantOrder.findMany({
      where: { status: { not: 'CANCELLED' }, paymentStatus: { not: 'PAID' } },
      select: { totalPrice: true, discount: true, serviceCharge: true, netAmount: true, paidAmount: true },
    }),
    prisma.dayLongBooking.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { totalAmount: true, paidAmount: true },
    }),
    prisma.inventoryItem.findMany({ where: { isActive: true }, select: { currentStock: true, costPrice: true } }),
    prisma.pendingPayment.aggregate({ _sum: { amount: true }, where: { status: 'PENDING' } }),
    prisma.staffSalary.aggregate({ _sum: { amount: true }, where: { status: 'PENDING' } }),
  ]);

  const guestDues = bookings.reduce((s, b) => s + paidAndDue(b.totalAmount, b.payments).due, 0);
  const restaurantDues = orders.reduce((s, o) => {
    const net = o.netAmount ?? computeNet(o.totalPrice, o.discount, o.serviceCharge);
    return s + Math.max(0, net - o.paidAmount);
  }, 0);
  const dayLongDues = dayLong.reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0);
  const stockValue = items.reduce((s, i) => s + Math.max(0, i.currentStock) * (i.costPrice ?? 0), 0);

  return {
    asOf: new Date().toISOString(),
    guestDues: round2(guestDues),
    restaurantDues: round2(restaurantDues),
    dayLongDues: round2(dayLongDues),
    stockValue: round2(stockValue),
    unpaidBills: round2(bills._sum.amount ?? 0),
    unpaidSalaries: round2(salaries._sum.amount ?? 0),
  };
}

export const getStatement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureFinanceCategories();
    const period = parsePeriod(req.query.from, req.query.to);
    const end = period.endExclusive;

    const [payments, refunds, expenses, sharePayments, holdingRefunds, distributions, entries] = await Promise.all([
      prisma.payment.findMany({
        where: { status: 'COMPLETED', OR: [{ paidAt: { lt: end } }, { paidAt: null, createdAt: { lt: end } }] },
        select: { amount: true, method: true, businessLine: true, bookingId: true, referenceType: true, paidAt: true, createdAt: true },
      }),
      prisma.refund.findMany({
        where: { refundedAt: { lt: end } },
        select: {
          id: true, amount: true, method: true, businessLine: true, referenceType: true, refundedAt: true, reason: true,
          payment: { select: { booking: { select: { invoiceNo: true, guest: { select: { name: true } } } } } },
        },
      }),
      prisma.expense.findMany({
        where: { status: 'PAID', date: { lt: end } },
        select: { amount: true, date: true, paymentMethod: true, categoryId: true, category: { select: { name: true, kind: true } } },
      }),
      prisma.sharePayment.findMany({ where: { paidAt: { lt: end } }, select: { amount: true, method: true, paidAt: true } }),
      prisma.shareHolding.findMany({
        where: { refundedAmount: { gt: 0 }, refundedAt: { lt: end } },
        select: { refundedAmount: true, refundedAt: true },
      }),
      prisma.profitDistribution.findMany({
        where: { status: 'DISTRIBUTED', distributionDate: { lt: end } },
        select: { id: true, periodLabel: true, totalDistributed: true, distributionDate: true },
      }),
      prisma.financeEntry.findMany({ where: { date: { lt: end } }, select: { type: true, amount: true, method: true, date: true } }),
    ]);

    const statement = buildStatement({
      period,
      payments,
      refunds: refunds.map((r) => ({ ...r, label: refundLabel(r) })),
      expenses: expenses.map((e) => ({
        amount: e.amount,
        date: e.date,
        paymentMethod: e.paymentMethod,
        categoryId: e.categoryId,
        categoryName: e.category.name,
        kind: e.category.kind,
      })),
      sharePayments,
      holdingRefunds: holdingRefunds.map((h) => ({ amount: h.refundedAmount, refundedAt: h.refundedAt as Date })),
      distributions: distributions.map((d) => ({ ...d, distributionDate: d.distributionDate as Date })),
      entries,
    });
    const memo = await computeMemo();

    res.json({ success: true, generatedAt: new Date().toISOString(), ...statement, memo });
  } catch (error) {
    next(error);
  }
};

export const listFinanceEntries = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [entries, paidAt, created, expense, share] = await Promise.all([
      prisma.financeEntry.findMany({ orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }),
      prisma.payment.aggregate({ _min: { paidAt: true }, where: { status: 'COMPLETED' } }),
      prisma.payment.aggregate({ _min: { createdAt: true }, where: { status: 'COMPLETED', paidAt: null } }),
      prisma.expense.aggregate({ _min: { date: true }, where: { status: 'PAID' } }),
      prisma.sharePayment.aggregate({ _min: { paidAt: true } }),
    ]);
    // Earliest recorded money movement — the admin dates opening balances before it.
    const firsts = [paidAt._min.paidAt, created._min.createdAt, expense._min.date, share._min.paidAt].filter(
      (d): d is Date => d instanceof Date
    );
    const earliestActivity = firsts.length ? toYmdLocal(new Date(Math.min(...firsts.map((d) => d.getTime())))) : null;
    res.json({ success: true, entries, earliestActivity });
  } catch (error) {
    next(error);
  }
};

export const createFinanceEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = financeEntrySchema.parse(req.body);
    const userId = req.user?.id;
    const cashMoving = (CASH_MOVING_TYPES as readonly string[]).includes(data.type);
    if (parseYmdLocal(data.date) >= nextLocalDay(todayYmd())) throw new AppError('Entry date cannot be in the future', 400);
    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.financeEntry.create({
        data: {
          type: data.type,
          amount: round2(data.amount),
          method: cashMoving ? data.method ?? 'CASH' : null,
          date: localNoon(data.date), // local noon: same calendar day for viewers in other time zones
          description: data.description?.trim() || null,
          createdById: userId,
        },
      });
      await recordFinanceEntry(tx, created, 1, userId);
      return created;
    });
    res.status(201).json({ success: true, entry });
  } catch (error) {
    next(error);
  }
};

export const deleteFinanceEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    await prisma.$transaction(async (tx) => {
      const existing = await tx.financeEntry.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError('Entry not found', 404);
      await recordFinanceEntry(tx, existing, -1, userId); // reverse the ledger postings
      await tx.financeEntry.delete({ where: { id: existing.id } });
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
