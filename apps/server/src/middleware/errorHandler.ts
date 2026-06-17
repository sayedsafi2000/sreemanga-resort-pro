import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * True when the underlying TCP socket closed before body-parser could finish
 * reading the request body. raw-body throws `BadRequestError` with
 * `type === 'request.aborted'` in that case. These are client disconnects
 * (slow mobile, navigation, fetch AbortController) and not real server bugs,
 * so we keep them out of the error log to avoid noise.
 */
function isClientAbort(err: any, req: Request): boolean {
  if (!err) return false;
  if (req.aborted) return true;
  if (err.type === 'request.aborted') return true;
  if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') return true;
  if (typeof err.message === 'string' && /request aborted/i.test(err.message)) return true;
  return false;
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Client gave up before we finished reading the request — nothing useful to
  // log, and we usually can't reply because the socket is already gone.
  if (isClientAbort(err, req)) {
    if (!res.headersSent && res.writable) {
      try {
        res.status(400).json({ success: false, message: 'Request aborted' });
      } catch {
        // Socket already closed — ignore.
      }
    }
    return;
  }

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

  // Headers may already be sent if the response was streamed before the error;
  // guard against ERR_HTTP_HEADERS_SENT so the process keeps serving requests.
  if (res.headersSent) {
    return;
  }

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
