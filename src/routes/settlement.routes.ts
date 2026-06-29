import { Router } from 'express';
import SettlementController from '../controllers/SettlementController';
import { authJwt } from '../middleware/authJwt';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

// ============================
// BUSINESS APIs (/api/settlement/business/*)
// ============================

router.get('/business/summary', authJwt, (req, res) => SettlementController.getBusinessWalletSummary(req, res));
router.get('/business/transactions', authJwt, (req, res) => SettlementController.getBusinessTransactions(req, res));
router.get('/business/history', authJwt, (req, res) => SettlementController.getSettlementHistory(req, res));
router.get('/business/advance-payments', authJwt, (req, res) => SettlementController.getAdvancePayments(req, res));

// ============================
// ADMIN APIs (/api/settlement/admin/*)
// ============================

router.get('/admin/businesses', authJwt, adminOnly, (req, res) => SettlementController.getUnsettledBusinesses(req, res));
router.get('/admin/business/:id', authJwt, adminOnly, (req, res) => SettlementController.getBusinessSettlementDetail(req, res));
router.post('/admin/settle', authJwt, adminOnly, (req, res) => SettlementController.settleBusinessPayments(req, res));
router.get('/admin/all-settlements', authJwt, adminOnly, (req, res) => SettlementController.getAllSettlements(req, res));

// ================================================================
// NEW SETTLEMENT SYSTEM (running total per business)
// ================================================================

// BUSINESS
router.get('/business/my-settlement', authJwt, (req, res) => SettlementController.getMySettlement(req, res));
router.get('/business/my-settlement-records', authJwt, (req, res) => SettlementController.getMySettlementRecords(req, res));
router.get('/business/combined-settlement', authJwt, (req, res) => SettlementController.getMyCombinedSettlement(req, res));
router.get('/business/all-records', authJwt, (req, res) => SettlementController.getMyAllRecords(req, res));

// ADMIN
router.get('/admin/unsettled-businesses', authJwt, adminOnly, (req, res) => SettlementController.getAdminUnsettledBusinesses(req, res));
router.get('/admin/settlement-detail/:id', authJwt, adminOnly, (req, res) => SettlementController.getAdminBusinessSettlementDetail(req, res));
router.post('/admin/settle-amount', authJwt, adminOnly, (req, res) => SettlementController.adminSettle(req, res));
router.get('/admin/all-settlement-records', authJwt, adminOnly, (req, res) => SettlementController.getAdminAllSettlementRecords(req, res));

export default router;
