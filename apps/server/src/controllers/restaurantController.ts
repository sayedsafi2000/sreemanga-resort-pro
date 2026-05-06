import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';

const menuSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  price: z.number().positive('Price must be positive'),
  category: z.string(),
  description: z.string().optional(),
  /** URL, site path, or data URL — or `null` on update to remove. */
  image: z.union([z.string().max(12_000_000), z.null()]).optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const orderSchema = z.object({
  roomId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  items: z.array(z.any()),
  totalPrice: z.number().positive(),
  notes: z.string().optional(),
});

export const getAllMenuItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { category, available } = req.query;

    const where: any = {};

    if (category) where.category = category;
    if (available === 'true') where.isAvailable = true;

    const menuItems = await prisma.restaurantMenu.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    res.json({ success: true, menuItems });
  } catch (error) {
    next(error);
  }
};

export const getMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const menuItem = await prisma.restaurantMenu.findUnique({
      where: { id },
    });

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    res.json({ success: true, menuItem });
  } catch (error) {
    next(error);
  }
};

export const createMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = menuSchema.parse(req.body);

    const menuItem = await prisma.restaurantMenu.create({
      data: {
        ...data,
        isAvailable: data.isAvailable ?? true,
      },
    });

    res.status(201).json({ success: true, menuItem });
  } catch (error) {
    next(error);
  }
};

export const updateMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = menuSchema.partial().parse(req.body);

    const menuItem = await prisma.restaurantMenu.update({
      where: { id },
      data,
    });

    res.json({ success: true, menuItem });
  } catch (error) {
    next(error);
  }
};

export const deleteMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.restaurantMenu.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = orderSchema.parse(req.body);

    const order = await prisma.restaurantOrder.create({
      data: {
        ...data,
        status: 'PENDING',
      },
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, roomId } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (roomId) where.roomId = roomId;

    const orders = await prisma.restaurantOrder.findMany({
      where,
      include: {
        room: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.restaurantOrder.update({
      where: { id },
      data: { status },
      include: {
        room: true,
        user: true,
      },
    });

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};