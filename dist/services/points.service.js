"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pointsService = void 0;
/**
 * Module: Backend (API Server)
 * File Purpose: Points Service. Manages the loyalty points lifecycle, including validation, expiry, and redemptions.
 * Used By: PointsController, HomeController, StatsController
 * Database Model: User, CreatorPointsTransaction, CreatooRequest
 * Critical: Yes (Financial/Loyalty)
 * Notes: Implements complex point expiry logic and atomic point transfers.
 */
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../db/sequelize"));
const User_1 = __importDefault(require("../models/User"));
const Business_1 = __importDefault(require("../models/Business"));
const CreatorPointsTransaction_1 = __importDefault(require("../models/CreatorPointsTransaction"));
const CreatooRequest_1 = __importDefault(require("../models/CreatooRequest"));
const sendPushNotification_1 = require("./sendPushNotification");
const NewUserNotification_1 = __importDefault(require("../models/NewUserNotification"));
class PointsService {
    /**
     * Calculates active points in real-time for any credit transaction row by subtracting expired portions
     */
    getActivePointsForTransaction(t, now = new Date()) {
        if (t.credit_debit_remaining_status !== "credit")
            return 0;
        const createdAt = new Date(t.createdAt || t.created_at);
        const elapsedMs = now.getTime() - createdAt.getTime();
        const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
        const P = Number(t.points);
        const R = Number(t.remaining_points);
        let maxActive = P;
        if (elapsedDays >= 60) {
            maxActive = 0;
        }
        else if (elapsedDays >= 30) {
            maxActive = P * 0.50;
        }
        else if (elapsedDays >= 15) {
            maxActive = P * 0.75;
        }
        return Math.max(0, Math.min(R, maxActive));
    }
    /**
     * Laravel: creatooPointsTransaction
     */
    async getCreatorPointsTransaction(userId) {
        const allTransactions = await CreatorPointsTransaction_1.default.findAll({
            where: { user_id: userId },
            order: [["created_at", "DESC"]],
        });
        const transactions = allTransactions.filter((t) => Number(t.points) !== 0);
        if (!transactions.length) {
            return {
                creatoo_points: 0,
                businessTransactions: [],
            };
        }
        const now = new Date();
        const total_balance = transactions
            .filter((t) => t.credit_debit_remaining_status === "credit")
            .reduce((sum, t) => sum + this.getActivePointsForTransaction(t, now), 0);
        // group by business_id (skip nulls)
        const byBusiness = new Map();
        for (const t of transactions) {
            if (t.business_id == null)
                continue; // 🔧 avoid number | null
            const businessId = t.business_id;
            const arr = byBusiness.get(businessId) || [];
            arr.push(t);
            byBusiness.set(businessId, arr);
        }
        const businessTransactions = [];
        for (const [businessId, group] of byBusiness.entries()) {
            const business = await Business_1.default.findOne({
                where: { id: businessId },
                attributes: ["id", "business_name"],
            });
            if (!business)
                continue;
            const balanceForBusiness = group
                .filter((t) => t.credit_debit_remaining_status === "credit")
                .reduce((sum, t) => sum + this.getActivePointsForTransaction(t, now), 0);
            if (balanceForBusiness <= 0)
                continue;
            const transactionsWithExpiryStatus = group.map((t) => {
                const json = t.toJSON();
                const active = this.getActivePointsForTransaction(t, now);
                const isExpired = active === 0 && Number(json.remaining_points) > 0 && (now.getTime() - new Date(json.created_at).getTime()) / (1000 * 60 * 60 * 24) >= 60;
                let status = json.credit_debit_remaining_status;
                if (json.points < 0 && (json.order_id === "EXPIRED" || json.receipt_name === "EXPIRED")) {
                    status = "expired";
                }
                return {
                    ...json,
                    credit_debit_remaining_status: status,
                    is_expired: isExpired,
                    active_points: active,
                    expired_points: json.credit_debit_remaining_status === "credit" ? Math.max(0, Number(json.remaining_points) - active) : 0,
                };
            });
            businessTransactions.push({
                business_id: business.id,
                business_name: business.business_name,
                total_points: Number(balanceForBusiness),
                transactions: transactionsWithExpiryStatus,
            });
        }
        return {
            creatoo_points: total_balance,
            businessTransactions,
        };
    }
    /**
     * Laravel: businessPointsTransaction
     */
    async getBusinessPointsTransaction(businessId, fromDate, toDate) {
        const user = await Business_1.default.findByPk(businessId);
        if (!user) {
            return { userExists: false };
        }
        const from = new Date(fromDate);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        const pointsAdded = await CreatooRequest_1.default.sum("points_received", {
            where: {
                business_id: businessId,
                status: "3",
                created_at: {
                    [sequelize_1.Op.between]: [from, to],
                },
            },
        });
        const userCreatooPoints = Number(pointsAdded || 0);
        const transactions = await CreatooRequest_1.default.findAll({
            where: {
                business_id: businessId,
                status: "3",
                created_at: { [sequelize_1.Op.between]: [from, to] },
            },
            include: [
                {
                    model: User_1.default,
                    as: "creator",
                    attributes: ["instagram_username", "name"],
                },
            ],
            order: [["created_at", "DESC"]],
        });
        const formatted = transactions.map((t) => {
            const json = t.toJSON();
            const creator = json.creator || {};
            return {
                id: json.id,
                points: Number(json.points_received),
                instagram_username: creator.instagram_username,
                creator_name: creator.name,
                status: json.status === "1" ? "Debited" : "Credited",
                created_at: new Date(json.created_at)
                    .toISOString()
                    .replace("T", " ")
                    .slice(0, 19),
            };
        });
        return {
            userExists: true,
            userCreatooPoints,
            transactions: formatted,
        };
    }
    /**
     * Laravel: validateCreatooPoints
     */
    async validateCreatooPoints(params) {
        const { business_id, creator_id, points } = params;
        const creatorActivePoints = await CreatooRequest_1.default.sum("active_points", {
            where: {
                creator_id,
                business_id,
            },
        });
        // business set_expiry / max_redemption
        const business = await Business_1.default.findByPk(business_id, {
            attributes: ["set_expiry", "max_redemption"],
        });
        if (!business) {
            return {
                status: false,
                code: 404,
                message: "Business setting expiry not found.",
                data: null,
            };
        }
        const max_redemption = business.max_redemption ?? 0;
        const redeemed_count = await CreatooRequest_1.default.count({
            where: {
                business_id,
                creator_id,
                status: "3",
            },
        });
        if (max_redemption < redeemed_count) {
            return {
                status: false,
                code: 400,
                message: "You have exceeded redemption limit.",
                flag: 0,
                data: creatorActivePoints || 0,
            };
        }
        // businessTransactions + creatooPoints logic
        const creatooRequests = await CreatooRequest_1.default.findAll({
            where: { creator_id },
            order: [["created_at", "DESC"]],
        });
        const businessTransactions = {};
        for (const req of creatooRequests) {
            const businessId = req.business_id;
            if (businessId == null)
                continue; // 🔧 guard against null
            const pointsReceived = Number(req.points_received);
            let statusLabel;
            const statusVal = String(req.status);
            switch (statusVal) {
                case "0":
                    statusLabel = "pending";
                    break;
                case "1":
                    statusLabel = "credit";
                    break;
                case "3":
                    statusLabel = "redeemed";
                    break;
                case "2":
                default:
                    statusLabel = "rejected";
                    break;
            }
            const businessUser = await Business_1.default.findOne({
                where: { id: businessId },
                attributes: ["id", "business_name", "set_expiry"],
            });
            if (!businessUser)
                continue;
            const createdAt = new Date(req.created_at || new Date());
            const updatedAt = new Date(req.updated_at || new Date());
            const transactionData = {
                points_received: pointsReceived,
                updated_at: updatedAt.toISOString().replace("T", " ").slice(0, 19),
                credit_debit: statusLabel,
                expiry: null,
            };
            if (statusVal === "1") {
                const expiryDays = businessUser.set_expiry ?? 0;
                const diffDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = diffDays > expiryDays ? "Expired" : "Active";
                transactionData.expiry = isExpired;
                if (isExpired === "Active") {
                    transactionData.remaining_days = expiryDays - diffDays;
                }
            }
            if (!businessTransactions[businessId]) {
                businessTransactions[businessId] = {
                    business_id: businessUser.id,
                    business_name: businessUser.business_name,
                    transactions: [],
                    total_points: 0,
                };
            }
            businessTransactions[businessId].transactions.push(transactionData);
            if (statusVal === "1" && transactionData.expiry === "Active") {
                businessTransactions[businessId].total_points += pointsReceived;
            }
            else if (statusVal === "3") {
                businessTransactions[businessId].total_points -= pointsReceived;
            }
        }
        const creatooPoints = Object.values(businessTransactions).reduce((carry, transaction) => transaction.total_points > 0
            ? carry + transaction.total_points
            : carry, 0);
        const maxRedeemable = Math.floor((creatorActivePoints || 0) * 0.60);
        if (points > maxRedeemable) {
            return {
                status: false,
                code: 400,
                message: `You can only redeem up to 60% of your total Creatoo points. Max redeemable for this payment is ${maxRedeemable} points.`,
                flag: 0,
                data: creatorActivePoints || 0,
            };
        }
        if (points <= Number(creatorActivePoints || 0)) {
            return {
                status: true,
                code: 200,
                message: "Valid points.",
                flag: 1,
                data: creatorActivePoints || 0,
            };
        }
        else {
            return {
                status: false,
                code: 400,
                message: "Insufficient active points.",
                flag: 0,
                data: creatorActivePoints || 0,
            };
        }
    }
    /**
     * Laravel: transferCreatooPoints
     */
    async transferCreatooPoints(params) {
        const { business_id, creator_id, points } = params;
        return await sequelize_2.default.transaction(async (t) => {
            const business = await Business_1.default.findByPk(business_id, {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            const creator = await User_1.default.findByPk(creator_id, {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (!business || !creator) {
                return {
                    status: false,
                    code: 404,
                    message: "Business or creator not found.",
                };
            }
            const activePointsRecords = await CreatooRequest_1.default.findAll({
                where: {
                    creator_id,
                    business_id,
                    active_points: {
                        [sequelize_1.Op.gt]: 0,
                    },
                },
                order: [["created_at", "ASC"]],
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            const totalActivePoints = activePointsRecords.reduce((sum, r) => sum + Number(r.active_points), 0);
            const maxRedeemable = Math.floor(totalActivePoints * 0.60);
            if (points > maxRedeemable) {
                return {
                    status: false,
                    code: 400,
                    message: `You can only redeem up to 60% of your total Creatoo points. Max redeemable for this payment is ${maxRedeemable} points.`,
                };
            }
            if (totalActivePoints < points) {
                return {
                    status: false,
                    code: 400,
                    message: "Creator does not have enough active points.",
                };
            }
            let remainingPoints = points;
            for (const record of activePointsRecords) {
                if (remainingPoints <= 0)
                    break;
                const ap = Number(record.active_points);
                if (ap <= remainingPoints) {
                    remainingPoints -= ap;
                    record.active_points = 0;
                    await record.save({ transaction: t });
                }
                else {
                    record.active_points = ap - remainingPoints;
                    await record.save({ transaction: t });
                    remainingPoints = 0;
                }
            }
            // update user_creatoo_points
            const businessPoints = Number(business.user_creatoo_points || 0);
            const creatorPoints = Number(creator.user_creatoo_points || 0);
            await business.update({ user_creatoo_points: businessPoints + points }, { transaction: t });
            await creator.update({ user_creatoo_points: creatorPoints - points }, { transaction: t });
            const transactionId = `${business_id}${creator_id}${Date.now()}`;
            await CreatooRequest_1.default.create({
                business_id,
                creator_id,
                points_received: points,
                transaction_id: transactionId,
                status: "3",
            }, { transaction: t });
            // 1. Notify Creator (User)
            try {
                if (creator.remember_token) {
                    await (0, sendPushNotification_1.sendPushNotification)({
                        title: "Points Transferred",
                        description: `You have successfully transferred ${points} points to ${business.business_name || "Business"}.`,
                    }, [creator.remember_token]);
                }
                await NewUserNotification_1.default.create({
                    user_id: creator_id,
                    notification_subject: "Points Transferred",
                    notification_text: `You have successfully transferred ${points} points to ${business.business_name || "Business"}.`,
                    business_id: business_id,
                    is_redeemed: "CreatorView",
                });
            }
            catch (creatorNotifErr) {
                console.error("Error creating creator transfer notification:", creatorNotifErr);
            }
            // 2. Notify Business
            try {
                const rememberToken = business.remember_token;
                if (rememberToken) {
                    await (0, sendPushNotification_1.sendPushNotification)({
                        title: "Redeem Points Received",
                        description: `You have successfully received ${points} points from ${creator.name || "Customer"}.`,
                    }, [rememberToken]);
                }
                await NewUserNotification_1.default.create({
                    user_id: business_id,
                    notification_subject: "Redeem Points Received",
                    notification_text: `You have successfully received ${points} points from ${creator.name || "Customer"}.`,
                    business_id: business_id,
                    is_redeemed: "BusinessView",
                });
            }
            catch (businessNotifErr) {
                console.error("Error creating business transfer notification:", businessNotifErr);
            }
            return {
                status: true,
                code: 200,
                message: "Creatoo points transferred successfully.",
                data: {
                    transaction_id: transactionId,
                    transferred_points: points,
                },
            };
        });
    }
    /**
     * Deducts loyalty points using FIFO from the oldest active credit batches of a specific business
     */
    async deductPoints(userId, businessId, pointsToDeduct, orderId, transaction) {
        if (pointsToDeduct <= 0)
            return;
        const activeCredits = await CreatorPointsTransaction_1.default.findAll({
            where: {
                user_id: userId,
                business_id: businessId,
                credit_debit_remaining_status: "credit",
                remaining_points: {
                    [sequelize_1.Op.gt]: 0
                }
            },
            order: [["created_at", "ASC"]],
            transaction
        });
        let remainingToDeduct = pointsToDeduct;
        for (const t of activeCredits) {
            if (remainingToDeduct <= 0)
                break;
            const activePoints = this.getActivePointsForTransaction(t);
            if (activePoints <= 0)
                continue;
            if (activePoints <= remainingToDeduct) {
                remainingToDeduct -= activePoints;
                t.remaining_points = Math.max(0, Number(t.remaining_points) - activePoints);
                await t.save({ transaction });
            }
            else {
                t.remaining_points = Math.max(0, Number(t.remaining_points) - remainingToDeduct);
                await t.save({ transaction });
                remainingToDeduct = 0;
            }
        }
        // Create a DEBIT transaction record to show redemption in history
        await CreatorPointsTransaction_1.default.create({
            user_id: userId,
            business_id: businessId,
            points: -pointsToDeduct,
            credit_debit_remaining_status: "debit",
            remaining_points: 0,
            order_id: orderId,
            business_name: activeCredits[0]?.business_name || null,
            receipt_name: activeCredits[0]?.receipt_name || null,
        }, { transaction });
    }
    /**
     * Daily job to process tiered loyalty points expiry and notify users
     */
    async runDailyExpiryJob() {
        console.log("⏰ Running Daily Loyalty Points Expiry Job...");
        const now = new Date();
        // 1. Bulk update all active credit transactions older than 62 days to 0 remaining points
        // This handles any ancient legacy data instantly in a single query to avoid blocking startup
        const sixtyTwoDaysAgo = new Date();
        sixtyTwoDaysAgo.setDate(sixtyTwoDaysAgo.getDate() - 62);
        try {
            const [updatedCount] = await CreatorPointsTransaction_1.default.update({ remaining_points: 0 }, {
                where: {
                    credit_debit_remaining_status: "credit",
                    remaining_points: {
                        [sequelize_1.Op.gt]: 0
                    },
                    createdAt: {
                        [sequelize_1.Op.lt]: sixtyTwoDaysAgo
                    }
                }
            });
            if (updatedCount > 0) {
                console.log(`🧹 Cleaned up ${updatedCount} ancient legacy transactions (older than 62 days) in bulk.`);
            }
        }
        catch (bulkErr) {
            console.error("Error bulk-expiring legacy points:", bulkErr);
        }
        // 2. Fetch only recent active transactions (created within the last 62 days) to process in-memory
        const activeTransactions = await CreatorPointsTransaction_1.default.findAll({
            where: {
                credit_debit_remaining_status: "credit",
                remaining_points: {
                    [sequelize_1.Op.gt]: 0
                },
                createdAt: {
                    [sequelize_1.Op.gte]: sixtyTwoDaysAgo
                }
            }
        });
        console.log(`⏰ Processing ${activeTransactions.length} recent transactions for tiered expiry...`);
        for (const t of activeTransactions) {
            const R = Number(t.remaining_points);
            const activeNow = this.getActivePointsForTransaction(t, now);
            if (activeNow < R) {
                const expiredAmount = R - activeNow;
                // Update remaining points in database
                t.remaining_points = activeNow;
                await t.save();
                // Log "EXPIRED" transaction in CreatorPointsTransaction (negative points)
                await CreatorPointsTransaction_1.default.create({
                    user_id: t.user_id,
                    business_id: t.business_id,
                    points: -expiredAmount,
                    credit_debit_remaining_status: "debit",
                    remaining_points: 0,
                    order_id: "EXPIRED",
                    business_name: t.business_name,
                    receipt_name: "EXPIRED",
                });
                // Send Push Notification & Save Notification Log
                try {
                    const user = await User_1.default.findByPk(t.user_id, { attributes: ["remember_token", "name"] });
                    const message = `⚠️ ${expiredAmount} loyalty points expired from ${t.business_name || 'Business'}`;
                    if (user?.remember_token) {
                        await (0, sendPushNotification_1.sendPushNotification)({
                            title: "❌ Points Expired",
                            description: message
                        }, [user.remember_token]);
                    }
                    await NewUserNotification_1.default.create({
                        user_id: t.user_id,
                        notification_subject: "Points Expired",
                        notification_text: message,
                        business_id: t.business_id,
                        is_redeemed: "CreatorView"
                    });
                }
                catch (notifErr) {
                    console.error("Error sending expiry notification:", notifErr);
                }
            }
        }
        console.log("✅ Daily Loyalty Points Expiry Job Completed.");
    }
}
exports.pointsService = new PointsService();
exports.default = exports.pointsService;
