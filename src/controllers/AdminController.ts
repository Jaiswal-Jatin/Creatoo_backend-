// src/controllers/AdminController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import AdminService from '../services/admin.service';
import { JwtUser } from '../middleware/authJwt';

const service = new AdminService();

export default {
  // POST /admin/login
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(422)
          .json({ status: false, message: 'Email and password are required' });
      }

      const admin = await service.findByEmail(email);
      if (!admin) {
        return res.status(401).json({ status: false, message: 'Invalid credentials' });
      }

      const matched = await bcrypt.compare(password, admin.password);
      if (!matched) {
        return res.status(401).json({ status: false, message: 'Invalid credentials' });
      }

      // Generate JWT token WITH ROLE
      const payload: JwtUser = { id: admin.id, role: 'admin' };
      const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1d' });

      return res.json({
        status: true,
        message: 'Login successful',
        token,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
        },
      });
    } catch (err: any) {
      console.error('Admin login error:', err);
      return res.status(500).json({
        status: false,
        message: err.message || 'Something went wrong',
      });
    }
  },

  // POST /admin/change-password  (protected)
  async changePassword(req: Request, res: Response) {
    try {
      const user = (req as any).user as JwtUser | undefined;
      if (!user?.id) {
        return res.status(401).json({ status: false, message: 'Unauthorized' });
      }

      const { current_password, new_password, confirm_password } = req.body;

      if (!current_password || !new_password || !confirm_password) {
        return res.status(422).json({
          status: false,
          message: 'current_password, new_password and confirm_password are required',
        });
      }

      if (new_password !== confirm_password) {
        return res.status(422).json({
          status: false,
          message: 'New password and confirm password do not match',
        });
      }

      const admin = await service.findById(user.id);
      if (!admin) {
        return res.status(404).json({ status: false, message: 'Admin not found' });
      }

      const matched = await bcrypt.compare(current_password, admin.password);
      if (!matched) {
        return res.status(401).json({
          status: false,
          message: 'Current password is incorrect',
        });
      }

      const hashed = await bcrypt.hash(new_password, 10);
      await service.updatePassword(admin.id, hashed);

      return res.json({
        status: true,
        message: 'Password updated successfully',
      });
    } catch (err: any) {
      console.error('Admin changePassword error:', err);
      return res.status(500).json({
        status: false,
        message: err.message || 'Something went wrong',
      });
    }
  },

  // GET /admin/me  (protected)
  async me(req: Request, res: Response) {
    const user = (req as any).user as JwtUser | undefined;
    if (!user?.id) {
      return res.status(401).json({ status: false, message: 'Unauthorized' });
    }

    const admin = await service.findById(user.id);
    if (!admin) {
      return res.status(404).json({ status: false, message: 'Admin not found' });
    }

    return res.json({
      status: true,
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
    });
  },
};
