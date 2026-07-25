import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const getRevenueReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {
      status: 'COMPLETED',
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        booking: {
          include: {
            room: true,
          },
        },
      },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalBookings = new Set(
      payments.map((p) => p.bookingId)
    ).size;

    // Group by date
    const revenueByDate: Record<string, number> = {};
    payments.forEach((p) => {
      const date = p.createdAt.toISOString().split('T')[0];
      revenueByDate[date] = (revenueByDate[date] || 0) + p.amount;
    });

    // Group by room type
    const revenueByRoomType: Record<string, number> = {};
    payments.forEach((p) => {
      const type = p.booking?.room?.type;
      if (!type) return;
      revenueByRoomType[type] =
        (revenueByRoomType[type] || 0) + p.amount;
    });

    res.json({
      success: true,
      totalRevenue,
      totalBookings,
      revenueByDate,
      revenueByRoomType,
    });
  } catch (error) {
    next(error);
  }
};

export const getOccupancyReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    const totalRooms = await prisma.room.count();

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        ...(startDate || endDate
          ? {
              OR: [
                {
                  AND: [
                    { checkInDate: { lte: endDate ? new Date(endDate as string) : new Date() } },
                    { checkOutDate: { gte: startDate ? new Date(startDate as string) : new Date() } },
                  ],
                },
              ],
          }
          : {}),
      },
    });

    const occupiedRoomNights = bookings.reduce((sum, booking) => {
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return sum + nights;
    }, 0);

    const totalDays = startDate && endDate
      ? Math.ceil(
          (new Date(endDate as string).getTime() -
            new Date(startDate as string).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 30;

    const totalRoomNights = totalRooms * totalDays;
    const occupancyRate =
      totalRoomNights > 0
        ? (occupiedRoomNights / totalRoomNights) * 100
        : 0;

    res.json({
      success: true,
      totalRooms,
      occupiedRoomNights,
      totalRoomNights,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = { status: 'PAID' };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const expensesByDate: Record<string, number> = {};
    expenses.forEach((e) => {
      const date = e.date.toISOString().split('T')[0];
      expensesByDate[date] = (expensesByDate[date] || 0) + e.amount;
    });

    const expensesByCategory: Record<string, number> = {};
    expenses.forEach((e) => {
      const name = e.category?.name || 'Uncategorized';
      expensesByCategory[name] = (expensesByCategory[name] || 0) + e.amount;
    });

    res.json({
      success: true,
      totalExpenses,
      totalCount: expenses.length,
      expensesByDate,
      expensesByCategory,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const bookings = await prisma.booking.findMany({
      where,
    });

    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(
      (b) => b.status === 'CONFIRMED'
    ).length;
    const checkedInBookings = bookings.filter(
      (b) => b.status === 'CHECKED_IN'
    ).length;
    const checkedOutBookings = bookings.filter(
      (b) => b.status === 'CHECKED_OUT'
    ).length;
    const cancelledBookings = bookings.filter(
      (b) => b.status === 'CANCELLED'
    ).length;

    res.json({
      success: true,
      totalBookings,
      confirmedBookings,
      checkedInBookings,
      checkedOutBookings,
      cancelledBookings,
    });
  } catch (error) {
    next(error);
  }
};

// ── Phase 7: financial reports (signed cashbook) ────────────────────────────

function dateRange(q: any) {
  const start = q.startDate ? new Date(String(q.startDate)) : undefined;
  let end: Date | undefined;
  if (q.endDate) { end = new Date(String(q.endDate)); end.setHours(23, 59, 59, 999); }
  return { start, end };
}

// Sum an account's net movement (IN - OUT) within a window, from transactions.
function netFromTxns(txns: { direction: string; amount: number }[]): number {
  return txns.reduce((s, t) => s + (t.direction === 'IN' ? t.amount : -t.amount), 0);
}

// Profit & Loss — income vs expense account tallies, plus revenue by business line.
export const getProfitLoss = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = dateRange(req.query);
    const txnWhere: any = {};
    if (start || end) {
      txnWhere.transactionDate = {};
      if (start) txnWhere.transactionDate.gte = start;
      if (end) txnWhere.transactionDate.lte = end;
    }

    const [incomeAccts, expenseAccts] = await Promise.all([
      prisma.account.findMany({ where: { type: 'INCOME', isActive: true } }),
      prisma.account.findMany({ where: { type: 'EXPENSE', isActive: true } }),
    ]);

    const incomeByAccount: { accountName: string; amount: number }[] = [];
    for (const acc of incomeAccts) {
      const txns = await prisma.accountTransaction.findMany({ where: { ...txnWhere, accountId: acc.id }, select: { direction: true, amount: true } });
      const amount = netFromTxns(txns);
      if (amount !== 0) incomeByAccount.push({ accountName: acc.name, amount });
    }
    const expenseByAccount: { accountName: string; amount: number }[] = [];
    for (const acc of expenseAccts) {
      const txns = await prisma.accountTransaction.findMany({ where: { ...txnWhere, accountId: acc.id }, select: { direction: true, amount: true } });
      const amount = netFromTxns(txns);
      if (amount !== 0) expenseByAccount.push({ accountName: acc.name, amount });
    }

    // Revenue by business line — grouped from tagged income transactions.
    const lineTxns = await prisma.accountTransaction.groupBy({
      by: ['businessLine'],
      where: { ...txnWhere, businessLine: { not: null }, account: { type: 'INCOME' } },
      _sum: { amount: true },
    });
    const byLine: Record<string, number> = { ROOM: 0, RESTAURANT: 0, DAY_LONG: 0 };
    lineTxns.forEach((t) => { if (t.businessLine) byLine[t.businessLine] = t._sum.amount ?? 0; });

    const incomeTotal = incomeByAccount.reduce((s, a) => s + a.amount, 0);
    const expenseTotal = expenseByAccount.reduce((s, a) => s + a.amount, 0);
    const netProfit = incomeTotal - expenseTotal;

    res.json({
      success: true,
      period: { start: start ?? null, end: end ?? null },
      income: { total: incomeTotal, byLine, byAccount: incomeByAccount },
      expenses: { total: expenseTotal, byAccount: expenseByAccount },
      netProfit,
      profitMargin: incomeTotal > 0 ? Math.round((netProfit / incomeTotal) * 10000) / 100 : 0,
    });
  } catch (error) { next(error); }
};

// Balance Sheet — from current account balances (an estimate; signed cashbook).
export const getBalanceSheet = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await prisma.account.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
    const pick = (types: string[]) =>
      accounts.filter((a) => types.includes(a.type)).map((a) => ({ name: a.name, code: a.code, balance: a.currentBalance }));

    const currentAssets = pick(['CASH', 'BANK', 'MOBILE_BANKING', 'RECEIVABLE']);
    const fixedAssets = pick(['ASSET']);
    const liabilities = pick(['PAYABLE', 'LIABILITY']);
    const equity = pick(['EQUITY']);
    const income = pick(['INCOME']);
    const expense = pick(['EXPENSE']);

    const sum = (rows: { balance: number }[]) => rows.reduce((s, r) => s + r.balance, 0);
    const assetsTotal = sum(currentAssets) + sum(fixedAssets);
    // Retained earnings this period = income - expense (not yet closed to equity).
    const retained = sum(income) - sum(expense);
    const liabTotal = sum(liabilities);
    const equityTotal = sum(equity) + retained;

    res.json({
      success: true,
      asOfDate: new Date(),
      assets: {
        total: assetsTotal,
        currentAssets: { total: sum(currentAssets), accounts: currentAssets },
        fixedAssets: { total: sum(fixedAssets), accounts: fixedAssets },
      },
      liabilities: { total: liabTotal, accounts: liabilities },
      equity: { total: equityTotal, accounts: equity, retainedEarnings: retained },
      liabilitiesEquityTotal: liabTotal + equityTotal,
      // Signed cashbook: may not tie exactly. Surface the gap instead of forcing it.
      unreconciled: Math.round((assetsTotal - (liabTotal + equityTotal)) * 100) / 100,
    });
  } catch (error) { next(error); }
};

// Revenue segmented by business line over a window.
export const getRevenueByLine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = dateRange(req.query);
    const where: any = { businessLine: { not: null }, account: { type: 'INCOME' } };
    if (start || end) {
      where.transactionDate = {};
      if (start) where.transactionDate.gte = start;
      if (end) where.transactionDate.lte = end;
    }
    const grouped = await prisma.accountTransaction.groupBy({
      by: ['businessLine'],
      where,
      _sum: { amount: true },
    });
    const byLine: Record<string, number> = { ROOM: 0, RESTAURANT: 0, DAY_LONG: 0 };
    grouped.forEach((g) => { if (g.businessLine) byLine[g.businessLine] = g._sum.amount ?? 0; });
    const total = Object.values(byLine).reduce((s, v) => s + v, 0);
    res.json({ success: true, byLine, total });
  } catch (error) { next(error); }
};

// All accounts with current balances (replaces trial balance).
export const getAccountBalances = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: { code: true, name: true, type: true, currentBalance: true },
    });
    res.json({ success: true, accounts });
  } catch (error) { next(error); }
};

// Daily cash summary — revenue in, expense out, net, from transactions.
export const getDailySummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = dateRange(req.query);
    const where: any = { account: { type: { in: ['CASH', 'BANK', 'MOBILE_BANKING'] } } };
    if (start || end) {
      where.transactionDate = {};
      if (start) where.transactionDate.gte = start;
      if (end) where.transactionDate.lte = end;
    }
    const txns = await prisma.accountTransaction.findMany({
      where,
      select: { direction: true, amount: true, transactionDate: true },
      orderBy: { transactionDate: 'asc' },
    });
    const byDate: Record<string, { in: number; out: number }> = {};
    for (const t of txns) {
      const d = t.transactionDate.toISOString().split('T')[0];
      byDate[d] ||= { in: 0, out: 0 };
      if (t.direction === 'IN') byDate[d].in += t.amount; else byDate[d].out += t.amount;
    }
    const rows = Object.entries(byDate).map(([date, v]) => ({ date, cashIn: v.in, cashOut: v.out, net: v.in - v.out }));
    res.json({ success: true, rows });
  } catch (error) { next(error); }
};