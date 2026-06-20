import { Router } from "express";
import ManualPaymentController from "../controllers/ManualPaymentController";
import { authJwt } from "../middleware/authJwt";

const router = Router();

router.post("/calculatePayment", authJwt, (req, res) => ManualPaymentController.calculatePayment(req, res));
router.post("/submitPayment", authJwt, (req, res) => ManualPaymentController.submitPayment(req, res));
router.post("/confirmPayment", authJwt, (req, res) => ManualPaymentController.confirmPayment(req, res));
router.post("/cancelPayment", authJwt, (req, res) => ManualPaymentController.cancelPayment(req, res));
router.post("/businessPayments", authJwt, (req, res) => ManualPaymentController.getBusinessPayments(req, res));
router.post("/businessPaymentStats", authJwt, (req, res) => ManualPaymentController.getBusinessPaymentStats(req, res));
router.post("/businessWalletPayments", authJwt, (req, res) => ManualPaymentController.getBusinessWalletPayments(req, res));
router.post("/userPayments", authJwt, (req, res) => ManualPaymentController.getUserPayments(req, res));
router.post("/setPaymentPaidAt", authJwt, (req, res) => ManualPaymentController.setPaymentPaidAt(req, res));

export default router;
