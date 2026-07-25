import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { loginSchema, registerSchema } from '../validators/authValidator';
import { AppError } from '../middleware/errorHandler';
const JWT_SECRET = process.env.JWT_SECRET!;

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, audience } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Reject wrong portal before issuing a JWT — no client login-then-logout.
    if (audience === 'staff' && user.role === 'SHAREHOLDER') {
      throw new AppError('Shareholder account — use Shareholder login', 403);
    }
    if (audience === 'shareholder' && user.role !== 'SHAREHOLDER') {
      throw new AppError('Staff account — use Staff login', 403);
    }

    const signOptions: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
    };
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET as Secret,
      signOptions
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('User already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // SECURITY: public self-registration is always RECEPTIONIST. Any `role` in
    // the body is ignored — staff roles (MANAGER/ACCOUNTANT/SUPER_ADMIN/…) are
    // assigned only via the SUPER_ADMIN-gated /api/users endpoint.
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'RECEPTIONIST',
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
};