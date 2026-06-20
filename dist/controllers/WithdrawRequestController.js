"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeStatusToRejected = exports.updateTransaction = exports.getAllWithdrawRequest = exports.getWithdrawRequest = exports.addWithdrawRequest = void 0;
const sequelize_1 = require("sequelize");
const WithdrawRequest_1 = __importDefault(require("../models/WithdrawRequest"));
const User_1 = __importDefault(require("../models/User"));
const sequelize_2 = __importDefault(require("../db/sequelize"));
// ---------------------------------------------------------------------
// POST /api/withdrawRequest/addWithdrawRequest
// (Laravel: Route::post('addWithdrawRequest', ...))
// ---------------------------------------------------------------------
const addWithdrawRequest = async (req, res) => {
    try {
        const { creator_id, amount } = req.body;
        if (!creator_id || !amount) {
            return res.status(422).json({
                status: false,
                message: "creator_id and amount are required",
            });
        }
        const withdrawRequest = await WithdrawRequest_1.default.create({
            creator_id: Number(creator_id), // FIXED
            amount: Number(amount), // FIXED
        });
        return res.status(201).json({
            status: true,
            message: "Withdraw Request added successfully",
            data: withdrawRequest,
        });
    }
    catch (error) {
        console.error("addWithdrawRequest error:", error);
        return res
            .status(500)
            .json({ status: false, message: "Internal server error" });
    }
};
exports.addWithdrawRequest = addWithdrawRequest;
// ---------------------------------------------------------------------
// GET /api/withdrawRequest/list
// (Equivalent of Laravel getWithdrawRequest())
// ---------------------------------------------------------------------
const getWithdrawRequest = async (req, res) => {
    try {
        const withdrawRequests = await WithdrawRequest_1.default.findAll({
            attributes: ["id", "creator_id", "amount", "transaction_id", "status"],
            include: [
                {
                    model: User_1.default,
                    as: "user",
                    attributes: ["id", "name"],
                },
            ],
        });
        const formatted = withdrawRequests.map((wr) => ({
            id: wr.id,
            creator_name: wr.user ? wr.user.name : null,
            amount: wr.amount,
            transaction_id: wr.transaction_id,
            status: wr.status,
        }));
        return res.json({
            status: true,
            data: formatted,
        });
    }
    catch (error) {
        console.error("getWithdrawRequest error:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};
exports.getWithdrawRequest = getWithdrawRequest;
// ---------------------------------------------------------------------
// GET /api/withdrawRequest/all
// ---------------------------------------------------------------------
const getAllWithdrawRequest = async (req, res) => {
    try {
        const { from_date, to_date } = req.query;
        const where = {};
        if (from_date && to_date) {
            const from = new Date(from_date);
            const to = new Date(to_date);
            to.setHours(23, 59, 59, 999);
            where.created_at = { [sequelize_1.Op.between]: [from, to] };
        }
        const records = await WithdrawRequest_1.default.findAll({
            where,
            include: [
                {
                    model: User_1.default,
                    as: "user",
                    attributes: ["name", "mobile"],
                },
            ],
            order: [["created_at", "DESC"]],
        });
        // If later you want DataTables: return res.json({ data: records })
        return res.json(records);
    }
    catch (error) {
        console.error("getAllWithdrawRequest error:", error);
        return res
            .status(500)
            .json({ status: false, message: "Internal server error" });
    }
};
exports.getAllWithdrawRequest = getAllWithdrawRequest;
// ---------------------------------------------------------------------
// POST /api/withdrawRequest/update-transaction
// ---------------------------------------------------------------------
const updateTransaction = async (req, res) => {
    const { creator_id, transaction_id } = req.body;
    // Basic validation (Laravel equivalent)
    if (!creator_id || !transaction_id) {
        return res.status(400).json({
            success: false,
            message: "creator_id and transaction_id are required",
        });
    }
    const t = await sequelize_2.default.transaction();
    try {
        const [updatedCount] = await WithdrawRequest_1.default.update({
            transaction_id,
            status: 1, // same as Laravel: '1' -> completed
        }, {
            where: { creator_id },
            transaction: t,
        });
        await t.commit();
        if (updatedCount === 0) {
            return res
                .status(404)
                .json({ success: false, message: "No withdraw request found" });
        }
        return res.json({ success: true });
    }
    catch (error) {
        await t.rollback();
        console.error("updateTransaction error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
};
exports.updateTransaction = updateTransaction;
// ---------------------------------------------------------------------
// POST /api/withdrawRequest/changeStatusToRejected
// ---------------------------------------------------------------------
const changeStatusToRejected = async (req, res) => {
    try {
        const { id, status } = req.body;
        if (!id || typeof status === "undefined") {
            return res
                .status(400)
                .json({ status: "error", message: "Invalid Data" });
        }
        const [affectedRows] = await WithdrawRequest_1.default.update({ status }, { where: { id } });
        if (affectedRows === 0) {
            return res
                .status(404)
                .json({ status: "error", message: "Invalid Data" });
        }
        let message = "Status changed successfully";
        if (status === 2) {
            message = "Request has been rejected successfully";
        }
        return res.json({ status: "success", message });
    }
    catch (error) {
        console.error("changeStatusToRejected error:", error);
        return res
            .status(500)
            .json({ status: "error", message: "Internal server error" });
    }
};
exports.changeStatusToRejected = changeStatusToRejected;
