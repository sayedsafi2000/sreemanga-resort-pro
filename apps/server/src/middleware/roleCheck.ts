import { Request, Response, NextFunction } from 'express';

export const roleCheck = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: allowedRoles,
        userRole: userRole
      });
    }

    return next();
  };
};