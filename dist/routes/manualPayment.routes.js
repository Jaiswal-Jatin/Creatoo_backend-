"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ManualPaymentController_1 = __importDefault(require("../controllers/ManualPaymentController"));
const authJwt_1 = require("../middleware/authJwt");
const router = (0, express_1.Router)();
router.post("/calculatePayment", authJwt_1.authJwt, (req, res) => ManualPaymentController_1.default.calculatePayment(req, res));
router.post("/submitPayment", authJwt_1.authJwt, (req, res) => ManualPaymentController_1.default.submitPayment(req, res));
router.post("/confirmPayment", authJwt_1.authJwt, (req, res) => ManualPaymentController_1.default.confirmPayment(req, res));
router.post("/cancelPayment", authJwt_1.authJwt, (req, res) => ManualPaymentController_1.default.cancelPayment(req, res));
router.post("/businessPayments", authJwt_1.authJwt, (req, res) => ManualPaymentController_1.default.getBusinessPayments(req, res));
router.post("/businessPaymentStats", authJwt_1.authJwt, (req, res) => ManualPaymentController_1.default.getBusinessPaymentStats(req, res));
router.post("/businessWalletPayments", authJwt_1.authJwt, (req, res) => ManualPaymentController_1.default.getBusinessWalletPayments(req, res));
router.post("/userPayments", authJwt_1.authJwt, (req, res) => ManualPaymentController_1.default.getUserPayments(req, res));
router.post("/setPaymentPaidAt", authJwt_1.authJwt, (req, res) => ManualPaymentController_1.default.setPaymentPaidAt(req, res));
exports.default = router;
