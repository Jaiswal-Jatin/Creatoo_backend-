import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import User from '../models/User';
import Business from '../models/Business';

export interface JwtUser {
  id: number;
  role_id?: number;
  role?: string;
}

export const authJwt = async (req: Request, res: Response, next: NextFunction) => {
  const hdr = req.headers.authorization;
  const token = hdr?.startsWith('Bearer ')
    ? hdr.slice(7)
    : (req.body.token as string | undefined);

  if (!token) {
    return res.status(401).json({ status: false, message: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtUser;

    // If token lacks role_id, dynamically look up the user/business to resolve it
    if (decoded.role_id === undefined) {
      // 1. Try finding in users table
      const user = await User.findByPk(decoded.id, { attributes: ['id', 'role_id'] });
      if (user) {
        decoded.role_id = user.role_id || undefined;
      } else {
        // 2. Try finding in businesses table
        const business = await Business.findByPk(decoded.id, { attributes: ['id', 'role_id'] });
        if (business) {
          decoded.role_id = 2; // Business role_id is 2
        }
      }
    }

    if (decoded.role_id === undefined) {
      return res.status(401).json({ status: false, message: 'User or Business not found' });
    }

    (req as any).user = decoded;
    next();
  } catch (err) {
    console.error('authJwt error:', err);
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ status: false, message: 'Token expired' });
    } else if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ status: false, message: 'Invalid token signature' });
    } else {
      return res.status(401).json({ status: false, message: 'Token verification failed' });
    }
  }
};
