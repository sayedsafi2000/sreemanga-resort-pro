import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { createUserSchema, updateUserSchema, changePasswordSchema } from '../validators/userValidator';
import { AppError } from '../middleware/errorHandler';

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role } = req.query;

    const where: any = {};
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createUserSchema.parse(req.body);

    if (data.role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      throw new AppError('Only SUPER_ADMIN can create SUPER_ADMIN users', 403);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        password: hashedPassword,
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      throw new AppError('User not found', 404);
    }

    if (target.role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      throw new AppError('Only SUPER_ADMIN can modify SUPER_ADMIN accounts', 403);
    }

    if (data.role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      throw new AppError('Only SUPER_ADMIN can assign SUPER_ADMIN role', 403);
    }

    if (data.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new AppError('Email already in use', 400);
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      throw new AppError('Cannot delete your own account', 400);
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      throw new AppError('Only SUPER_ADMIN can delete SUPER_ADMIN accounts', 403);
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    let isAdminResettingOther =
      req.user &&
      ['SUPER_ADMIN', 'MANAGER'].includes(req.user.role) &&
      req.user.id !== id;

    if (isAdminResettingOther && user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      isAdminResettingOther = false;
    }

    if (!isAdminResettingOther && !data.currentPassword) {
      throw new AppError('Current password is required', 400);
    }

    if (!isAdminResettingOther) {
      const isValidPassword = await bcrypt.compare(data.currentPassword!, user.password);
      if (!isValidPassword) {
        throw new AppError('Current password is incorrect', 400);
      }
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};
