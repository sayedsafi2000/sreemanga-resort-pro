import { Request, Response, NextFunction } from 'express';

export const roleCheck = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = req.user?.role;
    const userRole =
      raw === undefined || raw === null ? undefined : String(raw).trim();

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: allowedRoles,
        userRole: userRole
      });
    }

    return next();
  };
};