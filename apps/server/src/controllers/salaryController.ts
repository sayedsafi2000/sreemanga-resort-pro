import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const directPrisma = new PrismaClient();

export const SALARY_STATUSES = ['PENDING', 'PAID', 'CANCELLED'] as const;

export const salarySchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  status: z.enum(SALARY_STATUSES).optional(),
  paymentDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional(),
});

export const salaryUpdateSchema = z.object({
  status: z.enum(SALARY_STATUSES).optional(),
  paymentDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional(),
  amount: z.number().positive().optional(),
});

function resolvePaymentDate(status: string | undefined, raw: string | null | undefined): Date | null {
  if (raw === null) return null;
  if (raw) return new Date(raw);
  return status === 'PAID' ? new Date() : null;
}

export const getAllStaffSalaries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month, status } = req.query;
    const where: any = {};
    if (year) where.year = parseInt(year as string);
    if (month) where.month = parseInt(month as string);
    if (status) where.status = status;

    const salaries = await directPrisma.staffSalary.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json({ success: true, salaries });
  } catch (error) {
    next(error);
  }
};

export const getStaffSalaryByUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const salaries = await directPrisma.staffSalary.findMany({
      where: { userId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json({ success: true, salaries });
  } catch (error) {
    next(error);
  }
};

export const getAllStaffWithSalaries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month } = req.query;
    const y = year ? parseInt(year as string) : new Date().getFullYear();
    const m = month ? parseInt(month as string) : new Date().getMonth() + 1;

    const staff = await directPrisma.user.findMany({
      where: { role: { not: 'SUPER_ADMIN' } },
      select: { id: true, name: true, role: true },
    });

    const salaries = await directPrisma.staffSalary.findMany({
      where: { year: y, month: m },
    });

    const staffWithSalaries = staff.map(s => {
      const salary = salaries.find(sal => sal.userId === s.id);
      return { ...salary, user: s, isPaid: salary?.status === 'PAID' };
    });

    res.json({ success: true, staff: staffWithSalaries });
  } catch (error) {
    next(error);
  }
};

export const createSalaryPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = salarySchema.parse(req.body);
    const status = data.status || 'PAID';
    const paymentDate = resolvePaymentDate(status, data.paymentDate);
    const salary = await directPrisma.staffSalary.upsert({
      where: {
        userId_month_year: {
          userId: data.userId,
          month: data.month,
          year: data.year,
        },
      },
      update: { amount: data.amount, status, paymentDate, notes: data.notes },
      create: {
        userId: data.userId,
        amount: data.amount,
        month: data.month,
        year: data.year,
        notes: data.notes,
        status,
        paymentDate,
      },
    });
    res.json({ success: true, salary });
  } catch (error) {
    next(error);
  }
};

export const markSalaryPaid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = salaryUpdateSchema.parse(req.body || {});
    const status = data.status || 'PAID';
    const paymentDate = resolvePaymentDate(status, data.paymentDate);
    const salary = await directPrisma.staffSalary.update({
      where: { id },
      data: {
        status,
        paymentDate,
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
      },
    });
    res.json({ success: true, salary });
  } catch (error) {
    next(error);
  }
};

export const deleteSalary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await directPrisma.staffSalary.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getSalaryStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const [totalPending, totalPaid, monthlyStats] = await Promise.all([
      directPrisma.staffSalary.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
      directPrisma.staffSalary.aggregate({
        where: { status: 'PAID', year: currentYear, month: currentMonth },
        _sum: { amount: true },
      }),
      directPrisma.staffSalary.groupBy({
        by: ['year', 'month'],
        _sum: { amount: true },
        where: { status: 'PAID' },
        orderBy: { year: 'desc' },
        take: 12,
      }),
    ]);

    res.json({
      success: true,
      stats: {
        totalPending: totalPending._sum.amount || 0,
        monthPaid: totalPaid._sum.amount || 0,
        monthlyStats,
      },
    });
  } catch (error) {
    next(error);
  }
};