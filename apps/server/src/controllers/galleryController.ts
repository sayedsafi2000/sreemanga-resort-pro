import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const createSchema = z.object({
  imageUrl: z.string().min(1, 'Image is required'),
  alt: z.string().optional(),
  category: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  imageUrl: z.string().min(1).optional(),
  alt: z.string().optional(),
  category: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const getPublicGallery = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.siteGalleryItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({
      success: true,
      items: items.map((r) => ({
        id: r.id,
        imageUrl: r.imageUrl,
        alt: r.alt,
        category: r.category,
        sortOrder: r.sortOrder,
      })),
    });
  } catch (e) {
    next(e);
  }
};

export const listGalleryAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.siteGalleryItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, items });
  } catch (e) {
    next(e);
  }
};

export const createGalleryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createSchema.parse(req.body);
    const row = await prisma.siteGalleryItem.create({
      data: {
        imageUrl: body.imageUrl,
        alt: (body.alt ?? '').trim(),
        category: (body.category ?? 'General').trim() || 'General',
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
    });
    res.status(201).json({ success: true, item: row });
  } catch (e) {
    next(e);
  }
};

export const updateGalleryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = updateSchema.parse(req.body);
    const existing = await prisma.siteGalleryItem.findUnique({ where: { id } });
    if (!existing) throw new AppError('Gallery item not found', 404);
    const data: {
      imageUrl?: string;
      alt?: string;
      category?: string;
      sortOrder?: number;
      isActive?: boolean;
    } = {};
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
    if (body.alt !== undefined) data.alt = body.alt.trim();
    if (body.category !== undefined) data.category = String(body.category).trim() || 'General';
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (Object.keys(data).length === 0) throw new AppError('No fields to update', 400);
    const row = await prisma.siteGalleryItem.update({ where: { id }, data });
    res.json({ success: true, item: row });
  } catch (e) {
    next(e);
  }
};

export const deleteGalleryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.siteGalleryItem.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    if (e?.code === 'P2025') return next(new AppError('Gallery item not found', 404));
    next(e);
  }
};

export const listGalleryCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.siteGalleryItem.groupBy({
      by: ['category'],
      _count: { _all: true },
    });
    const categories = rows.map((r) => r.category).sort((a, b) => a.localeCompare(b));
    res.json({ success: true, categories });
  } catch (e) {
    next(e);
  }
};
