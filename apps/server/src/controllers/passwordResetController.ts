import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { emailService } from '../utils/emailService';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Delete any existing reset tokens for this user
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token (valid for 1 hour)
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send reset email
    const resetUrl = `${process.env.ADMIN_URL || 'http://localhost:8001'}/reset-password?token=${resetToken}`;
    
    await emailService.sendPasswordResetEmail(user.email, resetToken, resetUrl)
      .catch(err => console.error('Failed to send password reset email:', err));

    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError('Token and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    // Hash the token to find it in database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    if (resetRecord.used) {
      throw new AppError('This reset token has already been used', 400);
    }

    if (resetRecord.expiresAt < new Date()) {
      throw new AppError('Reset token has expired', 400);
    }

    // Update user password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const verifyResetToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      throw new AppError('Token is required', 400);
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token: hashedToken },
    });

    if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
      return res.json({ valid: false });
    }

    res.json({ valid: true });
  } catch (error) {
    next(error);
  }
};
