"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCounts = void 0;
const sequelize_1 = require("sequelize");
const User_1 = __importDefault(require("../models/User"));
const Post_1 = __importDefault(require("../models/Post"));
const PostReport_1 = __importDefault(require("../models/PostReport"));
const Order_1 = __importDefault(require("../models/Order"));
const WalletTransaction_1 = __importDefault(require("../models/WalletTransaction"));
const getCounts = async (_req, res) => {
    try {
        // Count creators (role_id = 3)
        const creatorCount = await User_1.default.count({
            where: { role_id: 3 },
        });
        // Count businesses (role_id = 2)
        const businessCount = await User_1.default.count({
            where: { role_id: 2 },
        });
        // Pending withdraw requests: credit_debit is NULL
        const pendingWithdrawRequestCount = await WalletTransaction_1.default.count({
            where: { credit_debit: null },
        });
        // All post report rows
        const allReports = await PostReport_1.default.findAll({
            attributes: ["post_id"],
        });
        const postIds = allReports.map((item) => item.post_id);
        // Posts that are in the reported list AND is_reported = 0
        const creatorReportedPostsCount = await Post_1.default.count({
            where: {
                id: postIds.length > 0 ? postIds : [0], // avoids empty IN error
                is_reported: "0",
            },
        });
        // Pending posts
        const pendingPostCount = await Post_1.default.count({
            where: { post_status: "0" },
        });
        // TOTAL orders
        const totalOrders = await Order_1.default.count();
        // TODAY orders (same as Laravel: whereDate(created_at, today))
        const todayOrders = await Order_1.default.count({
            where: (0, sequelize_1.literal)(`DATE(created_at) = CURDATE()`),
        });
        return res.json({
            creatorCount,
            businessCount,
            pendingWithdrawRequestCount,
            creatorReportedPostsCount,
            pendingPostCount,
            totalOrders,
            todayOrders,
        });
    }
    catch (error) {
        console.error("Dashboard getCounts error:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};
exports.getCounts = getCounts;
