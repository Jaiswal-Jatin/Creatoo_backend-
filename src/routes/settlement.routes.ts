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

export default router;
