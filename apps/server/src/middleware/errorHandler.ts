import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err.stack);

  // Validation errors come back as 400 with the offending field names so the
  // client can show a useful message instead of a generic 'Internal server error'.
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const path = first?.path?.join('.') || 'request';
    res.status(400).json({
      success: false,
      message: `Invalid ${path}: ${first?.message || 'invalid value'}`,
      issues: err.issues,
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}