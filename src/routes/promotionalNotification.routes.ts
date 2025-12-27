import { Router } from 'express';
import PromotionalNotificationController from '../controllers/PromotionalNotificationController';
import { authJwt } from '../middleware/authJwt';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();


router.get(
  '/promotional/all',
  authJwt,
  adminOnly,
  (req, res) => PromotionalNotificationController.index(req, res)
);

router.get(
  '/send/:id',
  authJwt,
  adminOnly,
  (req, res) => PromotionalNotificationController.sendNotification(req, res)
);

router.get(
  '/dynamic/all',
  authJwt,
  adminOnly,
  (req, res) => PromotionalNotificationController.dynamicNotification(req, res)
);

router.get(
  '/festival/all',
  authJwt,
  adminOnly,
  (req, res) => PromotionalNotificationController.festivalNotification(req, res)
);

router.get(
  '/custom/all',
  authJwt,
  adminOnly,
  (req, res) => PromotionalNotificationController.customNotification(req, res)
);

router.get(
  '/custom/add',
  authJwt,
  adminOnly,
  (req, res) => PromotionalNotificationController.addNotification(req, res)
);

router.post(
  '/custom/store',
  authJwt,
  adminOnly,
  (req, res) => PromotionalNotificationController.storeCustomNotification(req, res)
);

router.get(
  '/custom/edit/:id',
  authJwt,
  adminOnly,
  (req, res) => PromotionalNotificationController.editNotification(req, res)
);

router.post(
  '/custom/update/:id',
  authJwt,
  adminOnly,
  (req, res) => PromotionalNotificationController.updateNotification(req, res)
);

export default router;
