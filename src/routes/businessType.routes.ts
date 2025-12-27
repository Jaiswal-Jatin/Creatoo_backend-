// src/routes/businessType.routes.ts
import { Router } from 'express';
import BusinessTypeController from '../controllers/BusinessTypeController';
import { uploadImage } from '../middleware/upload';
import { authJwt } from '../middleware/authJwt';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

router.get('/getBusinessTypes', BusinessTypeController.getBusinessTypes);

router.get('/all', authJwt, adminOnly, BusinessTypeController.getAll);
router.post('/add', authJwt, adminOnly, uploadImage, BusinessTypeController.add);
router.get('/edit/:id', authJwt, adminOnly, BusinessTypeController.getEdit);
router.post('/edit/:id', authJwt, adminOnly, uploadImage, BusinessTypeController.update);
router.get('/delete/:id', authJwt, adminOnly, BusinessTypeController.delete);
router.post('/change-status', authJwt, adminOnly, BusinessTypeController.changeStatus);

export default router;
