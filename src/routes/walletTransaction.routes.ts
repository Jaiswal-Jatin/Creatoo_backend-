// src/routes/walletTransaction.routes.ts
import { Router } from 'express';
import walletTransactionController from '../controllers/WalletTransactionController';
import { authJwt } from '../middleware/authJwt';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

router.get(
  '/allCreator',
  authJwt,
  adminOnly,
  (req, res) =>
    walletTransactionController.getAllCreatorWalletTransactionService(req, res)
);

router.get(
  '/allWalletRequest',
  authJwt,
  adminOnly,
  (req, res) =>
    walletTransactionController.getAllRequestWalletTransactionService(req, res)
);

router.get(
  '/allBusiness',
  authJwt,
  adminOnly,
  (req, res) =>
    walletTransactionController.getAllBusinessWalletTransactionService(req, res)
);

router.post(
  '/change-request-submit',
  authJwt,
  adminOnly,
  (req, res) =>
    walletTransactionController.submitChangeRequest(req, res)
);

router.get(
  '/check-balance',
  authJwt,
  adminOnly,
  (req, res) =>
    walletTransactionController.checkBalance(req, res)
);

router.post(
  '/businessWalletTransaction',
  authJwt,
  (req, res) =>
    walletTransactionController.businessWalletTransaction(req, res)
);

router.post(
  '/creatorWalletTransaction',
  authJwt,
  (req, res) =>
    walletTransactionController.creatorWalletTransaction(req, res)
);

router.post(
  '/addBusinessWalletTransaction',
  authJwt, // keep it protected
  (req, res) =>
    walletTransactionController.addBusinessWalletTransaction(req, res)
);

router.post(
  '/checkTransactionStatus',
  authJwt,
  (req, res) =>
    walletTransactionController.checkTransactionStatus(req, res)
);

export default router;
