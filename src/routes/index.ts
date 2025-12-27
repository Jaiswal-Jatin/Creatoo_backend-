import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: true, message: 'Creatoo API is running 🚀' });
});

router.use('/auth', authRoutes);

export default router;
