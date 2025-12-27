// src/routes/admin.routes.ts
import { Router } from 'express';
import AdminController from '../controllers/AdminController';
import { authJwt } from '../middleware/authJwt';

const router = Router();

router.post('/login', AdminController.login);
router.post('/change-password', authJwt, AdminController.changePassword);
router.get('/me', authJwt, AdminController.me); 

export default router;
