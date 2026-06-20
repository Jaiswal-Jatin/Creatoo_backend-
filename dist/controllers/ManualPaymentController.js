"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const ManualPayment_1 = __importDefault(require("../models/ManualPayment"));
const User_1 = __importDefault(require("../models/User"));
const Business_1 = __importDefault(require("../models/Business"));
const CreatorPointsTransaction_1 = __importDefault(require("../models/CreatorPointsTransaction"));
const NewUserNotification_1 = __importDefault(require("../models/NewUserNotification"));
const sendPushNotification_1 = require("../services/sendPushNotification");
const points_service_1 = __importDefault(require("../services/points.service"));
const Card_1 = __importDefault(require("../models/Card"));
const Visit_1 = __importDefault(require("../models/Visit"));
const BusinessAssociate_1 = __importDefault(require("../models/BusinessAssociate"));
class ManualPaymentController {
    async calculatePayment(req, res) {
        try {
            const { business_id, bill_amount, points_redeemed } = req.body;
            const user_id = req.user?.id;
            if (!user_id || !business_id || !bill_amount) {
                return res.status(400).json({ status: false, message: "Missing required fields" });
            }
            const business = await Business_1.default.findByPk(business_id, {
                attributes: ["set_first_time_discount", "set_regular_discount", "upi_id", "business_name"],
            });
            if (!business) {
                return res.status(404).json({ status: false, message: "Business not found" });
            }
            const previousPayments = await ManualPayment_1.default.count({
                where: { user_id, business_id, status: "CONFIRMED" },
            });
            const isFirstVisit = previousPayments === 0;
            const discountPercentage = isFirstVisit
                ? (business.set_first_time_discount || 0)
                : (business.set_regular_discount || 0);
            const billAmt = parseFloat(bill_amount);
            const discountAmount = Math.floor(billAmt * (discountPercentage / 100));
            const afterDiscount = billAmt - discountAmount;
            const activeCredits = await CreatorPointsTransaction_1.default.findAll({
                where: {
                    user_id,
                    business_id,
                    credit_debit_remaining_status: "credit",
                    remaining_points: {
                        [sequelize_1.Op.gt]: 0
                    }
                }
            });
            const now = new Date();
            const balanceForBusiness = activeCredits.reduce((sum, t) => sum + points_service_1.default.getActivePointsForTransaction(t, now), 0);
            const maxRedeemablePoints = Math.floor(balanceForBusiness * 0.60);
            const ptsRequested = parseInt(points_redeemed || "0");
            const pts = Math.min(ptsRequested, maxRedeemablePoints);
            const finalAmount = Math.max(0, afterDiscount - pts);
            return res.json({
                status: true,
                data: {
                    is_first_visit: isFirstVisit,
                    discount_percentage: discountPercentage,
                    discount_amount: discountAmount,
                    bill_amount: billAmt,
                    points_redeemed: pts,
                    final_amount: finalAmount,
                    upi_id: business.upi_id || "",
                    business_name: business.business_name,
                },
            });
        }
        catch (err) {
            console.error("calculatePayment error:", err);
            return res.status(500).json({ status: false, message: err.message });
        }
    }
    async submitPayment(req, res) {
        try {
            const { business_id, bill_amount, points_redeemed, points_value, final_amount, discount_percentage, discount_amount } = req.body;
            const user_id = req.user?.id;
            if (!user_id || !business_id || !bill_amount || final_amount == null) {
                return res.status(400).json({ status: false, message: "Missing required fields" });
            }
            const activeCredits = await CreatorPointsTransaction_1.default.findAll({
                where: {
                    user_id,
                    business_id,
                    credit_debit_remaining_status: "credit",
                    remaining_points: {
                        [sequelize_1.Op.gt]: 0
                    }
                }
            });
            const now = new Date();
            const balanceForBusiness = activeCredits.reduce((sum, t) => sum + points_service_1.default.getActivePointsForTransaction(t, now), 0);
            const maxRedeemablePoints = Math.floor(balanceForBusiness * 0.60);
            const requestedPts = parseInt(points_redeemed || "0");
            if (requestedPts > maxRedeemablePoints) {
                return res.status(400).json({
                    status: false,
                    message: `You can only redeem up to 60% of your total Creatoo points. Max redeemable for this payment is ${maxRedeemablePoints} points.`
                });
            }
            const payment = await ManualPayment_1.default.create({
                user_id,
                business_id,
                bill_amount: parseFloat(bill_amount),
                points_redeemed: parseInt(points_redeemed || "0"),
                points_value: parseFloat(points_value || "0"),
                final_amount: parseFloat(final_amount),
                discount_percentage: discount_percentage != null ? parseFloat(discount_percentage) : null,
                discount_amount: discount_amount != null ? parseFloat(discount_amount) : null,
                status: "PENDING",
                payment_method: "MANUAL",
            });
            return res.status(201).json({ status: true, message: "Payment submitted", data: payment });
        }
        catch (err) {
            console.error("submitPayment error:", err);
            return res.status(500).json({ status: false, message: err.message });
        }
    }
    async confirmPayment(req, res) {
        try {
            const { payment_id } = req.body;
            const business_id = req.user?.id;
            if (!payment_id) {
                return res.status(400).json({ status: false, message: "payment_id is required" });
            }
            const payment = await ManualPayment_1.default.findByPk(payment_id);
            if (!payment) {
                return res.status(404).json({ status: false, message: "Payment not found" });
            }
            if (payment.business_id !== business_id) {
                return res.status(403).json({ status: false, message: "Unauthorized" });
            }
            if (payment.status !== "PENDING") {
                return res.status(400).json({ status: false, message: "Payment already processed" });
            }
            payment.status = "CONFIRMED";
            payment.confirmed_at = new Date();
            await payment.save();
            // Deduct redeemed points if any
            if (payment.points_redeemed > 0) {
                await points_service_1.default.deductPoints(payment.user_id, payment.business_id, payment.points_redeemed, payment_id.toString());
            }
            // 1) Find the associate network IDs for this business
            const visited = new Set();
            const toProcess = [payment.business_id];
            while (toProcess.length > 0) {
                const currentId = toProcess.shift();
                if (visited.has(currentId))
                    continue;
                visited.add(currentId);
                // Get all direct associates (where current is parent)
                const associates = await BusinessAssociate_1.default.findAll({
                    where: { parent_business_id: currentId },
                    attributes: ['associate_business_id']
                });
                // Get all parent businesses (where current is associate)
                const parents = await BusinessAssociate_1.default.findAll({
                    where: { associate_business_id: currentId },
                    attributes: ['parent_business_id']
                });
                // Add to processing queue
                associates.forEach((a) => {
                    if (!visited.has(a.associate_business_id)) {
                        toProcess.push(a.associate_business_id);
                    }
                });
                parents.forEach((p) => {
                    if (!visited.has(p.parent_business_id)) {
                        toProcess.push(p.parent_business_id);
                    }
                });
            }
            const networkIds = Array.from(visited);
            // 2) Find all cards for this user
            const userCards = await Card_1.default.findAll({ where: { user_id: payment.user_id } });
            const cardNumbers = userCards.map((c) => c.number);
            // 3) Find the last visit for this user/card in the network
            const lastVisit = await Visit_1.default.findOne({
                where: {
                    [sequelize_1.Op.or]: [
                        { user_id: payment.user_id },
                        { card_number: { [sequelize_1.Op.in]: cardNumbers } }
                    ],
                    business_id: { [sequelize_1.Op.in]: networkIds }
                },
                order: [["time", "DESC"]],
            });
            // 4) Determine active tier based on last visit's stored tier across network
            let activeTier = "new";
            if (lastVisit) {
                activeTier = lastVisit.tier;
            }
            // 5) Apply tier-based multiplier
            let pointsMultiplier = 1.0;
            if (activeTier === "premium") {
                pointsMultiplier = 2.0;
            }
            else if (activeTier === "elite") {
                pointsMultiplier = 1.5;
            }
            const basePoints = Math.round(payment.final_amount * 0.1);
            const pointsEarned = Math.round(basePoints * pointsMultiplier);
            if (pointsEarned > 0) {
                await CreatorPointsTransaction_1.default.create({
                    user_id: payment.user_id,
                    business_id: payment.business_id,
                    points: pointsEarned,
                    credit_debit_remaining_status: "credit",
                    total_bill: payment.bill_amount,
                    final_bill: payment.final_amount,
                    remaining_points: pointsEarned,
                });
            }
            // Send "Points Earned" notification to the user
            try {
                const userRecord = await User_1.default.findByPk(payment.user_id, {
                    attributes: ["name", "remember_token"],
                });
                const receiptName = userRecord?.name ?? "Unknown User";
                const businessRecord = await User_1.default.findByPk(payment.business_id, {
                    attributes: ["business_name"],
                });
                const bName = businessRecord?.business_name ?? "Business";
                let tierNote = "";
                if (activeTier === "premium") {
                    tierNote = ` Because you are a Premium visitor, your points were doubled (2x)!`;
                }
                else if (activeTier === "elite") {
                    tierNote = ` Because you are an Elite visitor, your points were multiplied by 1.5x!`;
                }
                else if (activeTier === "core") {
                    tierNote = ` Because you are a Core visitor, you earned standard 1x points.`;
                }
                const creator_subject = "🎉 You've Earned Points!";
                const creator_text = `Hey ${receiptName}, you just scored ${pointsEarned} Creatoo Points for your payment at ${bName}.${tierNote} Keep earning and stack them up for exciting rewards!`;
                await NewUserNotification_1.default.create({
                    user_id: payment.user_id,
                    order_id: null,
                    notification_subject: "Points Earned!",
                    notification_text: creator_text,
                    is_redeemed: "CreatorView",
                    business_id: payment.business_id,
                });
                if (userRecord?.remember_token) {
                    await (0, sendPushNotification_1.sendPushNotification)({
                        title: creator_subject,
                        description: creator_text,
                    }, [userRecord.remember_token]);
                }
            }
            catch (notifErr) {
                console.error("Error sending earn points notification:", notifErr);
            }
            return res.json({ status: true, message: "Payment confirmed", points_earned: pointsEarned, data: payment });
        }
        catch (err) {
            console.error("confirmPayment error:", err);
            return res.status(500).json({ status: false, message: err.message });
        }
    }
    async setPaymentPaidAt(req, res) {
        try {
            const { payment_id } = req.body;
            const user_id = req.user?.id;
            if (!payment_id) {
                return res.status(400).json({ status: false, message: "payment_id is required" });
            }
            const payment = await ManualPayment_1.default.findByPk(payment_id);
            if (!payment) {
                return res.status(404).json({ status: false, message: "Payment not found" });
            }
            if (payment.user_id !== user_id) {
                return res.status(403).json({ status: false, message: "Unauthorized" });
            }
            payment.paid_at = new Date();
            await payment.save();
            return res.json({ status: true, message: "Paid at updated", data: payment });
        }
        catch (err) {
            console.error("setPaymentPaidAt error:", err);
            return res.status(500).json({ status: false, message: err.message });
        }
    }
    async cancelPayment(req, res) {
        try {
            const { payment_id } = req.body;
            const business_id = req.user?.id;
            if (!payment_id) {
                return res.status(400).json({ status: false, message: "payment_id is required" });
            }
            const payment = await ManualPayment_1.default.findByPk(payment_id);
            if (!payment) {
                return res.status(404).json({ status: false, message: "Payment not found" });
            }
            if (payment.business_id !== business_id) {
                return res.status(403).json({ status: false, message: "Unauthorized" });
            }
            if (payment.status !== "PENDING") {
                return res.status(400).json({ status: false, message: "Payment already processed" });
            }
            payment.status = "CANCELLED";
            await payment.save();
            return res.json({ status: true, message: "Payment cancelled", data: payment });
        }
        catch (err) {
            console.error("cancelPayment error:", err);
            return res.status(500).json({ status: false, message: err.message });
        }
    }
    async getBusinessPayments(req, res) {
        try {
            const business_id = req.user?.id;
            const { status: filterStatus } = req.body;
            const where = { business_id };
            if (filterStatus)
                where.status = filterStatus;
            const payments = await ManualPayment_1.default.findAll({
                where,
                order: [["created_at", "DESC"]],
                include: [{ model: User_1.default, as: "user", attributes: ["id", "name", "mobile", "user_image"] }],
            });
            return res.json({ status: true, data: payments });
        }
        catch (err) {
            console.error("getBusinessPayments error:", err);
            return res.status(500).json({ status: false, message: err.message });
        }
    }
    async getUserPayments(req, res) {
        try {
            const user_id = req.user?.id;
            const payments = await ManualPayment_1.default.findAll({
                where: { user_id },
                order: [["created_at", "DESC"]],
                include: [{ model: Business_1.default, as: "business", attributes: ["id", "business_name", "business_image"] }],
            });
            return res.json({ status: true, data: payments });
        }
        catch (err) {
            console.error("getUserPayments error:", err);
            return res.status(500).json({ status: false, message: err.message });
        }
    }
    async getBusinessPaymentStats(req, res) {
        try {
            const business_id = req.user?.id;
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfDay = new Date(startOfDay.getTime() + 86400000);
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const dailyTotal = await ManualPayment_1.default.sum("final_amount", {
                where: { business_id, status: "CONFIRMED", created_at: { [sequelize_1.Op.gte]: startOfDay, [sequelize_1.Op.lt]: endOfDay } },
            });
            const monthlyTotal = await ManualPayment_1.default.sum("final_amount", {
                where: { business_id, status: "CONFIRMED", created_at: { [sequelize_1.Op.gte]: startOfMonth, [sequelize_1.Op.lt]: endOfMonth } },
            });
            const recentPayments = await ManualPayment_1.default.findAll({
                where: { business_id },
                order: [["created_at", "DESC"]],
                limit: 5,
                include: [{ model: User_1.default, as: "user", attributes: ["id", "name", "mobile", "user_image"] }],
            });
            return res.json({
                status: true,
                data: {
                    daily_total: dailyTotal || 0,
                    monthly_total: monthlyTotal || 0,
                    recent_payments: recentPayments,
                },
            });
        }
        catch (err) {
            console.error("getBusinessPaymentStats error:", err);
            return res.status(500).json({ status: false, message: err.message });
        }
    }
    async getBusinessWalletPayments(req, res) {
        try {
            const business_id = req.user?.id;
            const { month } = req.body;
            if (!month)
                return res.status(400).json({ status: false, message: "month is required (YYYY-MM)" });
            const [yearStr, monthStr] = month.split("-");
            const year = parseInt(yearStr);
            const mon = parseInt(monthStr);
            const startOfMonth = new Date(year, mon - 1, 1);
            const endOfMonth = new Date(year, mon, 1);
            const monthlyTotal = await ManualPayment_1.default.sum("final_amount", {
                where: { business_id, status: "CONFIRMED", created_at: { [sequelize_1.Op.gte]: startOfMonth, [sequelize_1.Op.lt]: endOfMonth } },
            });
            const payments = await ManualPayment_1.default.findAll({
                where: { business_id, created_at: { [sequelize_1.Op.gte]: startOfMonth, [sequelize_1.Op.lt]: endOfMonth } },
                order: [["created_at", "DESC"]],
                include: [{ model: User_1.default, as: "user", attributes: ["id", "name", "mobile", "user_image"] }],
            });
            return res.json({
                status: true,
                data: { monthly_total: monthlyTotal || 0, payments },
            });
        }
        catch (err) {
            console.error("getBusinessWalletPayments error:", err);
            return res.status(500).json({ status: false, message: err.message });
        }
    }
}
exports.default = new ManualPaymentController();
