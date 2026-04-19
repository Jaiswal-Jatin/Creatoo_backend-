/**
 * Module: Backend (API Server)
 * File Purpose: Wallet Transaction Routes. Handles all credit/debit and withdrawal request endpoints.
 * Used By: Admin Panel, User Mobile App, Business Admin App
 * API Connected: /api/walletTransaction/*
 * Database Model: WalletTransaction
 * Critical: Yes
 */
import { Router } from 'express';
import walletTransactionController from '../controllers/WalletTransactionController';
import { authJwt } from '../middleware/authJwt';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

/**
 * Route: GET /api/walletTransaction/allCreator
 * Role: Admin
 * Description: Retrieves all wallet transactions for creators.
 */
router.get(
  '/allCreator',
  authJwt,
  adminOnly,
  (req, res) =>
    walletTransactionController.getAllCreatorWalletTransactionService(req, res)
);

/**
 * Route: GET /api/walletTransaction/allWalletRequest
 * Role: Admin
 * Description: Retrieves all pending withdrawal requests.
 */
router.get(
  '/allWalletRequest',
  authJwt,
  adminOnly,
  (req, res) =>
    walletTransactionController.getAllRequestWalletTransactionService(req, res)
);

/**
 * Route: GET /api/walletTransaction/allBusiness
 * Role: Admin
 * Description: Retrieves all wallet transactions for businesses.
 */
router.get(
  '/allBusiness',
  authJwt,
  adminOnly,
  (req, res) =>
    walletTransactionController.getAllBusinessWalletTransactionService(req, res)
);

/**
 * Route: POST /api/walletTransaction/change-request-submit
 * Role: Admin
 * Description: Submits a withdrawal request for processing (debits wallet).
 */
router.post(
  '/change-request-submit',
  authJwt,
  adminOnly,
  (req, res) =>
    walletTransactionController.submitChangeRequest(req, res)
);

/**
 * Route: GET /api/walletTransaction/check-balance
 * Role: Shared
 * Description: Checks if a user has sufficient balance for a transaction.
 */
router.get(
  '/check-balance',
  authJwt,
  // adminOnly,
  (req, res) =>
    walletTransactionController.checkBalance(req, res)
);

/**
 * Route: POST /api/walletTransaction/businessWalletTransaction
 * Role: Business Admin
 * Description: Retrieves wallet history with related order settlement logic.
 */
router.post(
  '/businessWalletTransaction',
  authJwt,
  (req, res) =>
    walletTransactionController.businessWalletTransaction(req, res)
);

/**
 * Route: POST /api/walletTransaction/creatorWalletTransaction
 * Role: Creator
 * Description: Retrieves wallet transaction history for creators.
 */
router.post(
  '/creatorWalletTransaction',
  authJwt,
  (req, res) =>
    walletTransactionController.creatorWalletTransaction(req, res)
);

/**
 * Route: POST /api/walletTransaction/addBusinessWalletTransaction
 * Role: Business Admin
 * Description: Adds a manual or automated credit/debit to a business wallet.
 */
router.post(
  '/addBusinessWalletTransaction',
  authJwt, // keep it protected
  (req, res) =>
    walletTransactionController.addBusinessWalletTransaction(req, res)
);

/**
 * Route: POST /api/walletTransaction/checkTransactionStatus
 * Role: Shared
 * Description: Verifies the status of a specific wallet transaction.
 */
router.post(
  '/checkTransactionStatus',
  authJwt,
  (req, res) =>
    walletTransactionController.checkTransactionStatus(req, res)
);

export default router;
