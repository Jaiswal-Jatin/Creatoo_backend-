"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SubscriptionController_1 = __importDefault(require("../controllers/SubscriptionController"));
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
// Admin list
router.get("/all", authJwt_1.authJwt, SubscriptionController_1.default.getAllSubscriptionService);
// Admin create
router.post("/add", authJwt_1.authJwt, adminOnly_1.adminOnly, SubscriptionController_1.default.addSubscription);
// Business purchase – plan-based
router.post("/purchase", authJwt_1.authJwt, SubscriptionController_1.default.purchaseForBusiness);
// Get single
router.get("/view/:id", authJwt_1.authJwt, SubscriptionController_1.default.getEditSubscription);
// Update
router.post("/edit/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, SubscriptionController_1.default.updateSubscription);
// Change status
router.post("/change-status", authJwt_1.authJwt, adminOnly_1.adminOnly, SubscriptionController_1.default.changeStatus);
// BUSINESS SIDE API
router.get("/business/current", authJwt_1.authJwt, SubscriptionController_1.default.getMyCurrentSubscription);
router.get("/business/remaining-days", authJwt_1.authJwt, SubscriptionController_1.default.getMyRemainingDays);
router.get("/business/invoices", authJwt_1.authJwt, SubscriptionController_1.default.getMyInvoices);
router.post("/payment-success", SubscriptionController_1.default.paymentSuccess);
exports.default = router;
