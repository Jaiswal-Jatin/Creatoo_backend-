"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const points_service_1 = __importDefault(require("../services/points.service"));
class PointsController {
    // POST /points/creatooPointsTransaction
    async creatooPointsTransaction(req, res) {
        try {
            const { user_id } = req.body;
            if (!user_id || isNaN(Number(user_id))) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid user ID",
                });
            }
            const result = await points_service_1.default.getCreatorPointsTransaction(Number(user_id));
            return res.status(200).json({
                status: true,
                message: "Data found successfully",
                data: {
                    creatoo_points: result.creatoo_points,
                    businessTransactions: result.businessTransactions,
                },
            });
        }
        catch (e) {
            console.error("creatooPointsTransaction error:", e);
            return res.status(500).json({
                status: false,
                message: "Failed to fetch transaction details",
            });
        }
    }
    // POST /points/businessPointsTransaction
    async businessPointsTransaction(req, res) {
        try {
            const { business_id, from_date, to_date } = req.body;
            if (!from_date || !to_date) {
                return res.status(400).json({
                    status: false,
                    Message: "Both from_date and to_date are required",
                    data: [],
                });
            }
            if (!business_id || isNaN(Number(business_id))) {
                return res.status(400).json({
                    status: false,
                    Message: "business_id is required and must be numeric",
                    data: [],
                });
            }
            const result = await points_service_1.default.getBusinessPointsTransaction(Number(business_id), from_date, to_date);
            if (!result.userExists) {
                return res.status(404).json({
                    status: false,
                    Message: "User not found",
                    data: [],
                });
            }
            return res.status(200).json({
                status: true,
                Message: "Data Found Successfully",
                data: {
                    user_creatoo_points: result.userCreatooPoints,
                    transactions: result.transactions,
                },
            });
        }
        catch (e) {
            console.error("businessPointsTransaction error:", e);
            return res.status(500).json({
                status: false,
                Message: "Failed to fetch data",
                data: [],
            });
        }
    }
    // POST /points/validateCreatooPoints
    async validateCreatooPoints(req, res) {
        try {
            const { business_id, creator_id, points } = req.body;
            if (!business_id ||
                !creator_id ||
                points === undefined ||
                isNaN(Number(business_id)) ||
                isNaN(Number(creator_id)) ||
                isNaN(Number(points))) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid Input",
                });
            }
            const result = await points_service_1.default.validateCreatooPoints({
                business_id: Number(business_id),
                creator_id: Number(creator_id),
                points: Number(points),
            });
            return res.status(result.code).json({
                status: result.status,
                message: result.message,
                flag: result.flag,
                data: result.data,
            });
        }
        catch (e) {
            console.error("validateCreatooPoints error:", e);
            return res.status(500).json({
                status: false,
                message: "Failed to validate points",
            });
        }
    }
    // POST /points/transferCreatooPoints
    async transferCreatooPoints(req, res) {
        try {
            const { business_id, creator_id, points } = req.body;
            if (!business_id ||
                !creator_id ||
                points === undefined ||
                isNaN(Number(business_id)) ||
                isNaN(Number(creator_id)) ||
                isNaN(Number(points))) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid input data",
                });
            }
            const result = await points_service_1.default.transferCreatooPoints({
                business_id: Number(business_id),
                creator_id: Number(creator_id),
                points: Number(points),
            });
            return res.status(result.code).json({
                status: result.status,
                message: result.message,
                data: result.data,
            });
        }
        catch (e) {
            console.error("transferCreatooPoints error:", e);
            return res.status(500).json({
                status: false,
                message: "Failed to transfer creatoo points.",
            });
        }
    }
}
exports.default = new PointsController();
