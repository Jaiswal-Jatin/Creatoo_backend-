"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Points Routes. Handles loyalty points tracking and transfers.
 * Used By: Admin Panel, User Mobile App, Business Admin App
 * API Connected: /api/points/*
 * Database Model: CreatorPointsTransaction
 * Critical: Yes
 */
const express_1 = require("express");
const PointsController_1 = __importDefault(require("../controllers/PointsController"));
const authJwt_1 = require("../middleware/authJwt");
const router = (0, express_1.Router)();
/**
 * Route: POST /api/points/creatooPointsTransaction
 * Role: Creator
 * Description: Fetches loyalty points transactions for a creator.
 */
router.post("/creatooPointsTransaction", authJwt_1.authJwt, (req, res) => PointsController_1.default.creatooPointsTransaction(req, res));
/**
 * Route: POST /api/points/businessPointsTransaction
 * Role: Business Admin
 * Description: Fetches loyalty points transactions for a specific business.
 */
router.post("/businessPointsTransaction", authJwt_1.authJwt, (req, res) => PointsController_1.default.businessPointsTransaction(req, res));
/**
 * Route: POST /api/points/validateCreatooPoints
 * Role: Shared
 * Description: Validates points before a transaction or transfer.
 */
router.post("/validateCreatooPoints", authJwt_1.authJwt, (req, res) => PointsController_1.default.validateCreatooPoints(req, res));
/**
 * Route: POST /api/points/transferCreatooPoints
 * Role: Business Admin
 * Description: Transfers points from a business to a creator.
 */
router.post("/transferCreatooPoints", authJwt_1.authJwt, (req, res) => PointsController_1.default.transferCreatooPoints(req, res));
exports.default = router;
