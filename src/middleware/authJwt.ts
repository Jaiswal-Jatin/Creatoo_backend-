// src/middleware/authJwt.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';

export interface JwtUser {
  id: number;
  role?: string; // admin / creator / business / etc
}

export const authJwt = (req: Request, res: Response, next: NextFunction) => {
  const hdr = req.headers.authorization;
  const token = hdr?.startsWith('Bearer ')
    ? hdr.slice(7)
    : (req.body.token as string | undefined);

  if (!token) {
    return res.status(401).json({ status: false, message: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtUser;
    // console.log('🔐 Decoded JWT user:', decoded); // <— check this in console
    (req as any).user = decoded;
    next();
  } catch (err) {
    console.error('authJwt error:', err);
    res.status(401).json({ status: false, message: 'Invalid token' });
  }
};
