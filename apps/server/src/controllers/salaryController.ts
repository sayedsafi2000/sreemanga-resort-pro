import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const directPrisma = new PrismaClient();

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Lazy-resolved category id for "Staff Salary" (seeded). Cached for the process lifetime.
let _staffSalaryCategoryId: string | null = null;

async function getStaffSalaryCategoryId(): Promise<string | null> {
  if (_staffSalaryCategoryId) return _staffSalaryCategoryId;
  const cat = await directPrisma.expenseCategory.findFirst({
    where: { name: 'Staff Salary' },
    select: { id: true },
  });
  if (cat) _staffSalaryCategoryId = cat.id;
  return _staffSalaryCategoryId;
}

/**
 * Mirror a StaffSalary row into the Expense ledger so /expenditures and reports
 * reflect total payroll spend without the user maintaining two parallel lists.
 *
 * Status mapping:
 *   salary.status PAID       -> expense.status PAID  (created or refreshed)
 *   salary.status PENDING    -> expense.status CANCELLED (mirror exists from a prior payment)
 *   salary.status CANCELLED  -> expense.status CANCELLED (preserves audit trail; no hard delete)
 *
 * Idempotent. Safe to call multiple times for the same salary row.
 */
async function syncSalaryExpense(salary: {
  id: string;
  userId: string;
  amount: number;
  month: number;
  year: number;
  status: string;
  paymentDate: Date | null;
  notes?: string | null;
}): Promise<void> {
  const categoryId = await getStaffSalaryCategoryId();
  if (!categoryId) {
    // Seed didn't run, or user renamed the category — silently skip rather than break salary saves.
    return;
  }
  const user = await directPrisma.user.findUnique({
    where: { id: salary.userId },
    select: { name: true },
  });
  const monthName = MONTH_NAMES[salary.month - 1] || String(salary.month);
  const title = `Salary — ${user?.name || 'Staff'} (${monthName} ${salary.year})`;
  const expenseDate = salary.paymentDate || new Date();
  const expenseStatus = salary.status === 'PAID' ? 'PAID' : 'CANCELLED';
  await directPrisma.expense.upsert({
    where: { salaryId: salary.id },
    update: {
      title,
      amount: salary.amount,
      categoryId,
      date: expenseDate,
      paymentMethod: 'CASH',
      paidTo: user?.name || undefined,
      description: salary.notes || `Auto-recorded from /staff-salaries`,
      status: expenseStatus,
    },
    create: {
      title,
      amount: salary.amount,
      categoryId,
      date: expenseDate,
      paymentMethod: 'CASH',
      paidTo: user?.name || undefined,
      description: salary.notes || `Auto-recorded from /staff-salaries`,
      status: expenseStatus,
      salaryId: salary.id,
    },
  });
}

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
    await syncSalaryExpense(salary);
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
    await syncSalaryExpense(salary);
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

export const bulkPaySchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  paymentDate: z.string().datetime().optional().nullable(),
  items: z.array(z.object({
    userId: z.string().uuid(),
    amount: z.number().positive(),
    notes: z.string().optional(),
  })).min(1),
});

export const bulkPaySalaries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = bulkPaySchema.parse(req.body);
    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
    const results = await Promise.all(
      data.items.map((item) =>
        directPrisma.staffSalary.upsert({
          where: {
            userId_month_year: { userId: item.userId, month: data.month, year: data.year },
          },
          update: { amount: item.amount, status: 'PAID', paymentDate, notes: item.notes },
          create: {
            userId: item.userId,
            amount: item.amount,
            month: data.month,
            year: data.year,
            status: 'PAID',
            paymentDate,
            notes: item.notes,
          },
        })
      )
    );
    // Sync each as a mirrored Expense row sequentially so we don't hammer the DB.
    for (const salary of results) {
      await syncSalaryExpense(salary);
    }
    res.json({ success: true, count: results.length, salaries: results });
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