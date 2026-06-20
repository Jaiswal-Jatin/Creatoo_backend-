"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Creatoo Request Service. DAO for managing point requests and redemptions.
 * Used By: CreatooRequestController, PointsService
 * Database Model: CreatooRequest, User
 * Critical: Yes (Loyalty/Data)
 */
const sequelize_1 = require("sequelize");
const CreatooRequest_1 = __importDefault(require("../models/CreatooRequest"));
const User_1 = __importDefault(require("../models/User"));
class CreatooRequestService {
    async fetchRecord(options = {}) {
        return CreatooRequest_1.default.findAll({
            where: {
                // status: 0,1,2  → now stored as strings '0','1','2'
                status: { [sequelize_1.Op.in]: ["0", "1", "2"] },
            },
            include: [
                { model: User_1.default, as: "creator" },
                { model: User_1.default, as: "business" },
            ],
            order: [["created_at", "DESC"]],
            ...options,
        });
    }
    async fetchRedeem(options = {}) {
        return CreatooRequest_1.default.findAll({
            where: {
                // redeemed → status '3'
                status: "3",
            },
            include: [
                { model: User_1.default, as: "creator" },
                { model: User_1.default, as: "business" },
            ],
            order: [["created_at", "DESC"]],
            ...options,
        });
    }
    async fetch(id) {
        return CreatooRequest_1.default.findByPk(id, {
            include: [
                { model: User_1.default, as: "creator" },
                { model: User_1.default, as: "business" },
            ],
        });
    }
}
exports.default = new CreatooRequestService();
