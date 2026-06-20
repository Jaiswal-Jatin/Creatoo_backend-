"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SettlementController_1 = __importDefault(require("../controllers/SettlementController"));
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
// ============================
// BUSINESS APIs (/api/settlement/business/*)
// ============================
router.get('/business/summary', authJwt_1.authJwt, (req, res) => SettlementController_1.default.getBusinessWalletSummary(req, res));
router.get('/business/transactions', authJwt_1.authJwt, (req, res) => SettlementController_1.default.getBusinessTransactions(req, res));
router.get('/business/history', authJwt_1.authJwt, (req, res) => SettlementController_1.default.getSettlementHistory(req, res));
router.get('/business/advance-payments', authJwt_1.authJwt, (req, res) => SettlementController_1.default.getAdvancePayments(req, res));
// ============================
// ADMIN APIs (/api/settlement/admin/*)
// ============================
router.get('/admin/businesses', authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => SettlementController_1.default.getUnsettledBusinesses(req, res));
router.get('/admin/business/:id', authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => SettlementController_1.default.getBusinessSettlementDetail(req, res));
router.post('/admin/settle', authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => SettlementController_1.default.settleBusinessPayments(req, res));
router.get('/admin/all-settlements', authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => SettlementController_1.default.getAllSettlements(req, res));
exports.default = router;
