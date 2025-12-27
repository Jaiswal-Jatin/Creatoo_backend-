// src/routes/payment.ts
import { Router } from "express";
import PaymentController from "../controllers/PaymentController";
import { authJwt } from "../middleware/authJwt";

const router = Router();


router.post(
  "/postPaymentStatusFailed",
  authJwt,
  (req, res) => PaymentController.postPaymentStatusFailed(req, res)
);

router.post(
  "/paymentReleaseToCreator",
  authJwt,
  (req, res) => PaymentController.paymentReleaseToCreator(req, res)
);

router.post(
  "/paymentDetails",
  authJwt,
  (req, res) => PaymentController.paymentDetails(req, res)
);

router.post(
  "/getPaymentDetail",
  authJwt,
  (req, res) => PaymentController.getPaymentDetail(req, res)
);

router.post(
  "/fetchPaymentStatus",
  authJwt,
  (req, res) => PaymentController.fetchPaymentStatus(req, res)
);

router.post(
  "/processPayment",
  authJwt,
  (req, res) => PaymentController.processPayment(req, res)
);

router.post(
  "/paymentSuccess",
  authJwt,
  (req, res) => PaymentController.paymentSuccess(req, res)
);

export default router;
