"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Wallet Transaction Routes. Handles all credit/debit and withdrawal request endpoints.
 * Used By: Admin Panel, User Mobile App, Business Admin App
 * API Connected: /api/walletTransaction/*
 * Database Model: WalletTransaction
 * Critical: Yes
 */
const express_1 = require("express");
const WalletTransactionController_1 = __importDefault(require("../controllers/WalletTransactionController"));
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
/**
 * Route: GET /api/walletTransaction/allCreator
 * Role: Admin
 * Description: Retrieves all wallet transactions for creators.
 */
router.get('/allCreator', authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => WalletTransactionController_1.default.getAllCreatorWalletTransactionService(req, res));
/**
 * Route: GET /api/walletTransaction/allWalletRequest
 * Role: Admin
 * Description: Retrieves all pending withdrawal requests.
 */
router.get('/allWalletRequest', authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => WalletTransactionController_1.default.getAllRequestWalletTransactionService(req, res));
/**
 * Route: GET /api/walletTransaction/allBusiness
 * Role: Admin
 * Description: Retrieves all wallet transactions for businesses.
 */
router.get('/allBusiness', authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => WalletTransactionController_1.default.getAllBusinessWalletTransactionService(req, res));
/**
 * Route: POST /api/walletTransaction/change-request-submit
 * Role: Admin
 * Description: Submits a withdrawal request for processing (debits wallet).
 */
router.post('/change-request-submit', authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => WalletTransactionController_1.default.submitChangeRequest(req, res));
/**
 * Route: GET /api/walletTransaction/check-balance
 * Role: Shared
 * Description: Checks if a user has sufficient balance for a transaction.
 */
router.get('/check-balance', authJwt_1.authJwt, 
// adminOnly,
(req, res) => WalletTransactionController_1.default.checkBalance(req, res));
/**
 * Route: POST /api/walletTransaction/businessWalletTransaction
 * Role: Business Admin
 * Description: Retrieves wallet history with related order settlement logic.
 */
router.post('/businessWalletTransaction', authJwt_1.authJwt, (req, res) => WalletTransactionController_1.default.businessWalletTransaction(req, res));
/**
 * Route: POST /api/walletTransaction/creatorWalletTransaction
 * Role: Creator
 * Description: Retrieves wallet transaction history for creators.
 */
router.post('/creatorWalletTransaction', authJwt_1.authJwt, (req, res) => WalletTransactionController_1.default.creatorWalletTransaction(req, res));
/**
 * Route: POST /api/walletTransaction/addBusinessWalletTransaction
 * Role: Business Admin
 * Description: Adds a manual or automated credit/debit to a business wallet.
 */
router.post('/addBusinessWalletTransaction', authJwt_1.authJwt, // keep it protected
(req, res) => WalletTransactionController_1.default.addBusinessWalletTransaction(req, res));
/**
 * Route: POST /api/walletTransaction/checkTransactionStatus
 * Role: Shared
 * Description: Verifies the status of a specific wallet transaction.
 */
router.post('/checkTransactionStatus', authJwt_1.authJwt, (req, res) => WalletTransactionController_1.default.checkTransactionStatus(req, res));
exports.default = router;
