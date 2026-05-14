import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import {
  expenditureCategorySchema,
  expenditureSchema,
  expenditureListQuerySchema,
} from '../validators/expenditureValidator';

const directPrisma = new PrismaClient();

async function assertCategoryExists(categoryId: string): Promise<void> {
  const exists = await directPrisma.expenseCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!exists) {
    throw new AppError('Category not found', 404);
  }
}

export const getExpenditureCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await directPrisma.expenseCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { expenses: true } } },
    });
    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

export const createExpenditureCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = expenditureCategorySchema.parse(req.body);
    const trimmedName = data.name.trim();
    if (trimmedName === 'Staff Salary') {
      const exists = await directPrisma.expenseCategory.findFirst({
        where: { name: 'Staff Salary' },
        select: { id: true },
      });
      if (exists) {
        throw new AppError('Staff Salary category already exists.', 400);
      }
    }
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const agg = await directPrisma.expenseCategory.aggregate({ _max: { sortOrder: true } });
      sortOrder = (agg._max.sortOrder ?? 0) + 1;
    }
    const category = await directPrisma.expenseCategory.create({
      data: {
        name: trimmedName,
        isActive: data.isActive ?? true,
        sortOrder,
        fields: data.fields ?? [],
      },
    });
    res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const updateExpenditureCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await directPrisma.expenseCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Category not found', 404);
    }
    const data = expenditureCategorySchema.partial().parse(req.body);
    if (existing.name === 'Staff Salary' && data.name !== undefined && data.name !== 'Staff Salary') {
      throw new AppError(
        'Staff Salary category name cannot be changed; payroll sync looks up this category by name.',
        400
      );
    }
    if (existing.name !== 'Staff Salary' && data.name === 'Staff Salary') {
      throw new AppError('A Staff Salary category already exists. Choose another name.', 400);
    }
    const category = await directPrisma.expenseCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.fields !== undefined && { fields: data.fields }),
      },
    });
    res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const deleteExpenditureCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await directPrisma.expenseCategory.findUnique({ where: { id } });
    if (existing?.name === 'Staff Salary') {
      throw new AppError(
        'Staff Salary category is used for payroll sync and cannot be deleted.',
        400
      );
    }
    const expenseCount = await directPrisma.expense.count({ where: { categoryId: id } });
    if (expenseCount > 0) {
      throw new AppError(
        `Category has ${expenseCount} expense${expenseCount === 1 ? '' : 's'}; reassign or delete those first.`,
        409
      );
    }
    await directPrisma.expenseCategory.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getExpenditures = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId, status, from, to, search } = expenditureListQuerySchema.parse(req.query);
    const where: any = {};

    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { paidTo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const expenditures = await directPrisma.expense.findMany({
      where,
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, expenditures });
  } catch (error) {
    next(error);
  }
};

export const getExpenditureById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const expenditure = await directPrisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });
    if (!expenditure) {
      throw new AppError('Expenditure not found', 404);
    }
    res.json({ success: true, expenditure });
  } catch (error) {
    next(error);
  }
};

export const createExpenditure = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = expenditureSchema.parse(req.body);
    await assertCategoryExists(data.categoryId);
    const userId = (req as any).user?.id;
    const expenditure = await directPrisma.expense.create({
      data: { ...data, createdById: userId },
    });
    res.json({ success: true, expenditure });
  } catch (error) {
    next(error);
  }
};

export const updateExpenditure = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = expenditureSchema.partial().parse(req.body);
    if (data.categoryId) {
      await assertCategoryExists(data.categoryId);
    }
    const expenditure = await directPrisma.expense.update({
      where: { id },
      data,
    });
    res.json({ success: true, expenditure });
  } catch (error) {
    next(error);
  }
};

export const deleteExpenditure = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await directPrisma.expense.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getExpenditureStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fromRaw = req.query.from as string | undefined;
    const toRaw = req.query.to as string | undefined;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const rangeStart = fromRaw
      ? new Date(fromRaw)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    const rangeEnd = toRaw
      ? (() => {
          const d = new Date(toRaw);
          d.setHours(23, 59, 59, 999);
          return d;
        })()
      : new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const [todayTotal, rangeTotal, categoryBreakdown] = await Promise.all([
      directPrisma.expense.aggregate({
        where: { date: { gte: today, lt: tomorrow }, status: 'PAID' },
        _sum: { amount: true },
      }),
      directPrisma.expense.aggregate({
        where: { date: { gte: rangeStart, lte: rangeEnd }, status: 'PAID' },
        _sum: { amount: true },
      }),
      directPrisma.expense.groupBy({
        by: ['categoryId'],
        _sum: { amount: true },
        where: { date: { gte: rangeStart, lte: rangeEnd }, status: 'PAID' },
      }),
    ]);

    const categories = await directPrisma.expenseCategory.findMany({
      where: { id: { in: categoryBreakdown.map((c) => c.categoryId) } },
    });

    const breakdown = categoryBreakdown.map((c) => ({
      categoryId: c.categoryId,
      categoryName: categories.find((cat) => cat.id === c.categoryId)?.name || 'Unknown',
      total: c._sum.amount || 0,
    }));

    res.json({
      success: true,
      stats: {
        todayTotal: todayTotal._sum.amount || 0,
        // Backwards-compat alias kept for existing UI consumers.
        monthTotal: rangeTotal._sum.amount || 0,
        rangeTotal: rangeTotal._sum.amount || 0,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        categoryBreakdown: breakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};
