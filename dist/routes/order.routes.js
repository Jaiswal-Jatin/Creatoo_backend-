"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Order Routes. Endpoints for order transaction management.
 * Used By: Admin Panel
 * API Connected: /api/orders/*
 * Database Model: Order
 * Critical: Yes
 * Notes: Currently restricted to Admin users only.
 */
const express_1 = require("express");
const OrderController = __importStar(require("../controllers/OrderController"));
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
/**
 * Route: GET /api/orders/all
 * Role: Admin
 * Description: Fetches all orders with filtering and summation of total amount.
 */
router.get("/all", authJwt_1.authJwt, adminOnly_1.adminOnly, OrderController.index);
/**
 * Route: GET /api/orders/details/:order_id
 * Role: Admin
 * Description: Retrieves detailed information for a specific order.
 */
router.get("/details/:order_id", authJwt_1.authJwt, adminOnly_1.adminOnly, OrderController.showDetails);
exports.default = router;
