"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showDetails = exports.index = void 0;
const sequelize_1 = require("sequelize");
const Order_1 = __importDefault(require("../models/Order"));
const User_1 = __importDefault(require("../models/User"));
const index = async (req, res) => {
    try {
        const { from_date, to_date, business_name, filter, } = req.query;
        const searchValue = req.query["search[value]"] || "";
        // Base WHERE for orders
        const whereOrder = {};
        // Laravel: if filter == 'today'
        if (filter === "today") {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            whereOrder.created_at = { [sequelize_1.Op.between]: [start, end] };
        }
        // Date range filter
        if (from_date && to_date) {
            const start = new Date(from_date);
            const end = new Date(to_date);
            end.setHours(23, 59, 59, 999);
            whereOrder.created_at = { [sequelize_1.Op.between]: [start, end] };
        }
        // WHERE for business user
        const whereBusiness = {};
        if (business_name) {
            whereBusiness.business_name = { [sequelize_1.Op.like]: `%${business_name}%` };
        }
        // global search like Laravel's $searchKeyword
        if (searchValue) {
            whereBusiness.business_name = { [sequelize_1.Op.like]: `%${searchValue}%` };
        }
        // Main query
        const orders = await Order_1.default.findAll({
            where: whereOrder,
            include: [
                {
                    model: User_1.default,
                    as: "business",
                    attributes: ["business_name", "id"],
                    required: false,
                    where: Object.keys(whereBusiness).length ? whereBusiness : undefined,
                },
                {
                    model: User_1.default,
                    as: "referrer",
                    attributes: ["referrer_code"],
                    required: false,
                },
                {
                    model: User_1.default,
                    as: "creator", // 👈 ADD THIS
                    attributes: ["name"],
                    required: false,
                },
            ],
            attributes: [
                "order_id",
                "user_id",
                "original_bill_amount",
                "loyalty_points_used_discount_amount",
                "final_bill_amount",
                "loyalty_points_earned",
                "review_status",
                "referrer_id",
                "discount_percentage",
                "settlement_amount",
                "created_at",
            ],
            order: [["created_at", "DESC"]],
        });
        const totalOrders = orders.length;
        const totalAmount = orders.reduce((sum, order) => {
            const amt = Number(order.settlement_amount || 0);
            return sum + amt;
        }, 0);
        // If you're using DataTables on frontend, this structure works well:
        return res.json({
            data: orders,
            total_orders: totalOrders,
            total_amount: totalAmount.toFixed(2),
            // For full DataTables server-side:
            // draw: Number(req.query.draw || 1),
            // recordsTotal: totalOrders,
            // recordsFiltered: totalOrders,
        });
    }
    catch (error) {
        console.error("OrderController.index error", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.index = index;
const showDetails = async (req, res) => {
    try {
        const { order_id } = req.params;
        const order = await Order_1.default.findOne({
            where: { order_id },
            include: [
                {
                    model: User_1.default,
                    as: "business",
                    attributes: ["business_name"],
                    required: false,
                },
                {
                    model: User_1.default,
                    as: "creator",
                    attributes: ["name"],
                    required: false,
                },
                {
                    model: User_1.default,
                    as: "referrer",
                    attributes: ["referrer_code"],
                    required: false,
                },
            ],
            attributes: [
                "order_id",
                "original_bill_amount",
                "platform_fee",
                "gateway_charges",
                "loyalty_points_used_discount_amount",
                "loyalty_points_earned",
                "review_status",
                "final_bill_amount",
                "referrer_id",
                "discount_percentage",
                "settlement_amount",
                "business_id",
                "user_id",
                "created_at",
            ],
        });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        return res.json(order);
    }
    catch (error) {
        console.error("OrderController.showDetails error", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.showDetails = showDetails;
