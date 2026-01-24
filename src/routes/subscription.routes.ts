import { Router } from "express";
import SubscriptionController from "../controllers/SubscriptionController";
import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

// Admin list
router.get("/all", authJwt, SubscriptionController.getAllSubscriptionService);

// Admin create
router.post("/add", authJwt, adminOnly, SubscriptionController.addSubscription);

// Business purchase – plan-based
router.post("/purchase", authJwt, SubscriptionController.purchaseForBusiness);

// Get single
router.get("/view/:id", authJwt, SubscriptionController.getEditSubscription);

// Update
router.post(
  "/edit/:id",
  authJwt,
  adminOnly,
  SubscriptionController.updateSubscription
);

// Change status
router.post(
  "/change-status",
  authJwt,
  adminOnly,
  SubscriptionController.changeStatus
);

// BUSINESS SIDE API
router.get(
  "/business/current",
  authJwt,
  SubscriptionController.getMyCurrentSubscription
);
router.get(
  "/business/remaining-days",
  authJwt,
  SubscriptionController.getMyRemainingDays
);
router.get(
  "/business/invoices",
  authJwt,
  SubscriptionController.getMyInvoices
);

router.post("/payment-success", SubscriptionController.paymentSuccess);

export default router;
