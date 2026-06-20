"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/payment.ts
const express_1 = require("express");
const PaymentController_1 = __importDefault(require("../controllers/PaymentController"));
const authJwt_1 = require("../middleware/authJwt");
const router = (0, express_1.Router)();
router.post("/postPaymentStatusFailed", authJwt_1.authJwt, (req, res) => PaymentController_1.default.postPaymentStatusFailed(req, res));
router.post("/paymentReleaseToCreator", authJwt_1.authJwt, (req, res) => PaymentController_1.default.paymentReleaseToCreator(req, res));
router.post("/paymentDetails", authJwt_1.authJwt, (req, res) => PaymentController_1.default.paymentDetails(req, res));
router.post("/getPaymentDetail", authJwt_1.authJwt, (req, res) => PaymentController_1.default.getPaymentDetail(req, res));
router.post("/fetchPaymentStatus", authJwt_1.authJwt, (req, res) => PaymentController_1.default.fetchPaymentStatus(req, res));
router.post("/processPayment", authJwt_1.authJwt, (req, res) => PaymentController_1.default.processPayment(req, res));
router.post("/paymentSuccess", authJwt_1.authJwt, (req, res) => PaymentController_1.default.paymentSuccess(req, res));
exports.default = router;
