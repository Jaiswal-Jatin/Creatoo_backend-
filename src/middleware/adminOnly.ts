// src/middleware/adminOnly.ts
import { Request, Response, NextFunction } from 'express';
import { JwtUser } from './authJwt';
import AdminService from '../services/admin.service';

const adminService = new AdminService();

export const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as JwtUser | undefined;

  if (!user || !user.id) {
    return res.status(401).json({
      status: false,
      message: 'Unauthorized',
    });
  }

  // If token already has role=admin, allow immediately
  if (user.role === 'admin') {
    return next();
  }

  try {
    // Fallback: check if this ID exists in admins table
    const admin = await adminService.findById(user.id);

    if (!admin) {
      return res.status(403).json({
        status: false,
        message: 'Access denied: Admins only',
      });
    }

    // Attach role so downstream handlers know
    (req as any).user = { ...user, role: 'admin' };
    return next();
  } catch (err) {
    console.error('adminOnly error:', err);
    return res.status(500).json({
      status: false,
      message: 'Internal server error',
    });
  }
};
