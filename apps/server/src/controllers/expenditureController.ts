import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const directPrisma = new PrismaClient();

export const expenditureCategorySchema = z.object({
  name: z.string().min(1),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const expenditureSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  categoryId: z.string().uuid(),
  date: z.string().transform(s => new Date(s)),
  paymentMethod: z.enum(['CASH', 'BKASH', 'NAGAD', 'CARD']).optional(),
  paidTo: z.string().optional(),
  description: z.string().optional(),
  attachment: z.string().optional(),
  status: z.string().optional(),
});

export const getExpenditureCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await directPrisma.expenseCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

export const createExpenditureCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = expenditureCategorySchema.parse(req.body);
    const category = await directPrisma.expenseCategory.create({ data });
    res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const updateExpenditureCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = expenditureCategorySchema.partial().parse(req.body);
    const category = await directPrisma.expenseCategory.update({
      where: { id },
      data,
    });
    res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const deleteExpenditureCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await directPrisma.expenseCategory.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getExpenditures = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId, status, from, to, search } = req.query;
    const where: any = {};

    if (categoryId) where.categoryId = categoryId as string;
    if (status) where.status = status;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from as string);
      if (to) where.date.lte = new Date(to as string);
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const expenditures = await directPrisma.expense.findMany({
      where,
      include: { category: true },
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
      include: { category: true },
    });
    if (!expenditure) {
      return res.status(404).json({ success: false, message: 'Expenditure not found' });
    }
    res.json({ success: true, expenditure });
  } catch (error) {
    next(error);
  }
};

export const createExpenditure = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = expenditureSchema.parse(req.body);
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

export const getExpenditureStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [todayTotal, monthTotal, categoryBreakdown] = await Promise.all([
      directPrisma.expense.aggregate({
        where: { date: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
      }),
      directPrisma.expense.aggregate({
        where: { date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      directPrisma.expense.groupBy({
        by: ['categoryId'],
        _sum: { amount: true },
        where: { date: { gte: startOfMonth, lte: endOfMonth } },
      }),
    ]);

    const categories = await directPrisma.expenseCategory.findMany({
      where: { id: { in: categoryBreakdown.map(c => c.categoryId) } },
    });

    const breakdown = categoryBreakdown.map(c => ({
      categoryId: c.categoryId,
      categoryName: categories.find(cat => cat.id === c.categoryId)?.name || 'Unknown',
      total: c._sum.amount || 0,
    }));

    res.json({
      success: true,
      stats: {
        todayTotal: todayTotal._sum.amount || 0,
        monthTotal: monthTotal._sum.amount || 0,
        categoryBreakdown: breakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};