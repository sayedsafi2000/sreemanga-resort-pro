import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const listSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  content: true,
  imageUrl: true,
  imageAlt: true,
  category: true,
  authorName: true,
  tags: true,
  sortOrder: true,
  isFeatured: true,
  createdAt: true,
} as const;

const createSchema = z.object({
  slug: z.string().min(1).max(96).regex(slugRegex, 'Slug: lowercase letters, numbers, hyphens only'),
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional(),
  content: z.string().max(50000).optional(),
  imageUrl: z.string().min(1),
  imageAlt: z.string().max(300).optional(),
  category: z.string().max(80).optional(),
  authorName: z.string().max(100).optional(),
  tags: z.array(z.string().max(80)).max(20).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

const updateSchema = createSchema.partial().extend({
  slug: z.string().min(1).max(96).regex(slugRegex).optional(),
});

function normalizeTags(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((s) => String(s).trim()).filter(Boolean).slice(0, 20);
  }
  return [];
}

// Public: Get all active blogs (for listing)
export const getPublicBlogs = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const blogs = await prisma.siteBlog.findMany({
      where: { isActive: true },
      select: listSelect,
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, blogs });
  } catch (error) {
    next(error);
  }
};

// Public: Get single blog by slug
export const getPublicBlogBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const blog = await prisma.siteBlog.findFirst({
      where: { slug, isActive: true },
    });

    if (!blog) {
      throw new AppError('Blog not found', 404);
    }

    // Get related blogs (same category, excluding current)
    const related = await prisma.siteBlog.findMany({
      where: {
        isActive: true,
        category: blog.category,
        id: { not: blog.id },
      },
      select: { id: true, slug: true, title: true, imageUrl: true, summary: true },
      orderBy: { sortOrder: 'asc' },
      take: 3,
    });

    res.json({ success: true, blog, related });
  } catch (error) {
    next(error);
  }
};

// Admin: List all blogs
export const listBlogsAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const blogs = await prisma.siteBlog.findMany({
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, blogs });
  } catch (error) {
    next(error);
  }
};

// Admin: Create blog
export const createBlog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSchema.parse(req.body);
    
    const blog = await prisma.siteBlog.create({
      data: {
        slug: data.slug,
        title: data.title,
        summary: data.summary || '',
        content: data.content || '',
        imageUrl: data.imageUrl,
        imageAlt: data.imageAlt || '',
        category: data.category || 'General',
        authorName: data.authorName || "Nirjon Nature's Hideout",
        tags: normalizeTags(data.tags),
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
      },
    });

    res.status(201).json({ success: true, blog });
  } catch (error) {
    next(error);
  }
};

// Admin: Update blog
export const updateBlog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);

    const existing = await prisma.siteBlog.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Blog not found', 404);
    }

    const updateData: Prisma.SiteBlogUpdateInput = {
      ...(data.slug && { slug: data.slug }),
      ...(data.title && { title: data.title }),
      ...(data.summary !== undefined && { summary: data.summary }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.imageUrl && { imageUrl: data.imageUrl }),
      ...(data.imageAlt !== undefined && { imageAlt: data.imageAlt }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.authorName !== undefined && { authorName: data.authorName }),
      ...(data.tags && { tags: normalizeTags(data.tags) }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
    };

    const blog = await prisma.siteBlog.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, blog });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete blog
export const deleteBlog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.siteBlog.delete({ where: { id } });
    res.json({ success: true, message: 'Blog deleted' });
  } catch (error) {
    next(error);
  }
};