"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Wallet Transaction Service. Provides data access for financial ledger entries.
 * Used By: WalletTransactionController
 * Database Model: WalletTransaction, User
 * Critical: Yes (Financial)
 */
const WalletTransaction_1 = __importDefault(require("../models/WalletTransaction"));
const User_1 = __importDefault(require("../models/User"));
class WalletTransactionService {
    async findById(id) {
        return WalletTransaction_1.default.findByPk(id, {
            include: [{ model: User_1.default, as: "user" }],
        });
    }
    async fetchRecord(options = {}) {
        return WalletTransaction_1.default.findAll({
            include: [{ model: User_1.default, as: "user" }],
            ...options,
        });
    }
    async fetch(userId) {
        return WalletTransaction_1.default.findOne({
            where: { user_id: userId },
            include: [{ model: User_1.default, as: "user" }],
        });
    }
}
exports.default = new WalletTransactionService();
