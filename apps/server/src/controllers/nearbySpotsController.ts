import { Request, Response, NextFunction } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const listSelect = {
  id: true,
  slug: true,
  title: true,
  emoji: true,
  badge: true,
  distance: true,
  bullets: true,
  bestFor: true,
  imageUrl: true,
  imageAlt: true,
  sortOrder: true,
} as const;

const createSchema = z.object({
  slug: z.string().min(1).max(96).regex(slugRegex, 'Slug: lowercase letters, numbers, hyphens only'),
  title: z.string().min(1).max(200),
  emoji: z.string().max(16).optional(),
  badge: z.string().max(80).optional(),
  distance: z.string().max(120).optional(),
  bullets: z.array(z.string().max(500)).max(20).optional(),
  bestFor: z.string().max(300).optional(),
  imageUrl: z.string().min(1),
  imageAlt: z.string().max(300).optional(),
  body: z.string().max(50000).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial().extend({
  slug: z.string().min(1).max(96).regex(slugRegex).optional(),
});

function normalizeBullets(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((s) => String(s).trim()).filter(Boolean).slice(0, 20);
  }
  return [];
}

export const getPublicNearbyExplore = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [settingRows, spots] = await Promise.all([
      prisma.setting.findMany({
        where: {
          key: {
            in: [
              'nearbySectionEyebrow',
              'nearbySectionTitle',
              'nearbySectionSubtitle',
              'nearbySectionFootnote',
            ],
          },
        },
      }),
      prisma.siteNearbySpot.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        select: listSelect,
      }),
    ]);
    const map = Object.fromEntries(settingRows.map((r) => [r.key, r.value]));
    res.json({
      success: true,
      section: {
        eyebrow: map.nearbySectionEyebrow ?? '',
        title: map.nearbySectionTitle ?? '',
        subtitle: map.nearbySectionSubtitle ?? '',
        footnote: map.nearbySectionFootnote ?? '',
      },
      spots,
    });
  } catch (e) {
    next(e);
  }
};

export const getPublicNearbySpotBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slugRegex.test(slug)) throw new AppError('Invalid slug', 400);
    const row = await prisma.siteNearbySpot.findFirst({
      where: { slug, isActive: true },
    });
    if (!row) throw new AppError('Spot not found', 404);
    res.json({
      success: true,
      spot: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        emoji: row.emoji,
        badge: row.badge,
        distance: row.distance,
        bullets: row.bullets,
        bestFor: row.bestFor,
        imageUrl: row.imageUrl,
        imageAlt: row.imageAlt,
        body: row.body,
        sortOrder: row.sortOrder,
      },
    });
  } catch (e) {
    next(e);
  }
};

export const listNearbySpotsAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.siteNearbySpot.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    res.json({ success: true, items });
  } catch (e) {
    next(e);
  }
};

export const createNearbySpot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createSchema.parse(req.body);
    const bullets = normalizeBullets(body.bullets);
    const row = await prisma.siteNearbySpot.create({
      data: {
        slug: body.slug.trim().toLowerCase(),
        title: body.title.trim(),
        emoji: (body.emoji ?? '').trim(),
        badge: (body.badge ?? '').trim(),
        distance: (body.distance ?? '').trim(),
        bullets,
        bestFor: (body.bestFor ?? '').trim(),
        imageUrl: body.imageUrl.trim(),
        imageAlt: (body.imageAlt ?? '').trim(),
        body: (body.body ?? '').trim(),
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
    });
    res.status(201).json({ success: true, item: row });
  } catch (e: any) {
    if (e?.code === 'P2002') return next(new AppError('Slug already in use', 409));
    next(e);
  }
};

export const updateNearbySpot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = updateSchema.parse(req.body);
    const existing = await prisma.siteNearbySpot.findUnique({ where: { id } });
    if (!existing) throw new AppError('Spot not found', 404);

    const data: Prisma.SiteNearbySpotUpdateInput = {};
    if (body.slug !== undefined) data.slug = body.slug.trim().toLowerCase();
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.emoji !== undefined) data.emoji = body.emoji.trim();
    if (body.badge !== undefined) data.badge = body.badge.trim();
    if (body.distance !== undefined) data.distance = body.distance.trim();
    if (body.bullets !== undefined) data.bullets = normalizeBullets(body.bullets);
    if (body.bestFor !== undefined) data.bestFor = body.bestFor.trim();
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl.trim();
    if (body.imageAlt !== undefined) data.imageAlt = body.imageAlt.trim();
    if (body.body !== undefined) data.body = body.body.trim();
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    if (Object.keys(data).length === 0) throw new AppError('No fields to update', 400);

    const row = await prisma.siteNearbySpot.update({ where: { id }, data });
    res.json({ success: true, item: row });
  } catch (e: any) {
    if (e?.code === 'P2002') return next(new AppError('Slug already in use', 409));
    next(e);
  }
};

export const deleteNearbySpot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.siteNearbySpot.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    if (e?.code === 'P2025') return next(new AppError('Spot not found', 404));
    next(e);
  }
};
