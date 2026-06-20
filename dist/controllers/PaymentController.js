"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const sequelize_1 = require("sequelize");
const User_1 = __importDefault(require("../models/User"));
const Post_1 = __importDefault(require("../models/Post"));
const PostInterest_1 = __importDefault(require("../models/PostInterest"));
const Payment_1 = __importDefault(require("../models/Payment"));
const UserNotification_1 = __importDefault(require("../models/UserNotification"));
const TemporaryOrder_1 = __importDefault(require("../models/TemporaryOrder"));
const Order_1 = __importDefault(require("../models/Order"));
const WalletTransaction_1 = __importDefault(require("../models/WalletTransaction"));
const points_service_1 = __importDefault(require("../services/points.service"));
const sendPushNotification_1 = require("../services/sendPushNotification");
const NewUserNotification_1 = __importDefault(require("../models/NewUserNotification"));
const Business_1 = __importDefault(require("../models/Business"));
const BusinessAssociate_1 = __importDefault(require("../models/BusinessAssociate"));
const Card_1 = __importDefault(require("../models/Card"));
const Visit_1 = __importDefault(require("../models/Visit"));
class PaymentController {
    // =======================================
    // 1) PAYMENT FAILED: postPaymentStatusFailed
    // =======================================
    async postPaymentStatusFailed(req, res) {
        try {
            const { user_id, post_id, razorpay_order_id, reason, response_json } = req.body;
            if (!user_id) {
                return res.status(400).json({
                    status: false,
                    message: "user_id is required",
                });
            }
            await Payment_1.default.create({
                user_id: Number(user_id),
                post_id: post_id ?? null,
                razorpay_order_id: razorpay_order_id ?? null,
                status: "failed",
                response: response_json ?? { reason },
            });
            return res.status(200).json({
                status: true,
                message: "Payment failure logged successfully",
            });
        }
        catch (error) {
            console.error("postPaymentStatusFailed error:", error);
            return res.status(500).json({
                status: false,
                message: "Failed to log payment failure",
            });
        }
    }
    // =====================================================
    // 2) RELEASE PAYMENT TO CREATOR(S)
    // =====================================================
    async paymentReleaseToCreator(req, res) {
        try {
            const { post_id } = req.body;
            if (!post_id || isNaN(Number(post_id))) {
                return res.status(400).json({
                    status: false,
                    message: "post_id is required and must be numeric",
                });
            }
            const postId = Number(post_id);
            const interests = await PostInterest_1.default.findAll({
                where: { post_id: postId, is_shortlist: 1 },
                attributes: ["creator_id"],
            });
            const creatorIds = interests.map((i) => i.creator_id);
            if (!creatorIds.length) {
                return res.status(200).json({
                    status: true,
                    message: "No creators found or none are shortlisted for this post",
                });
            }
            const post = await Post_1.default.findByPk(postId, {
                attributes: ["per_creator_amount", "user_id", "name"],
            });
            if (!post) {
                return res.status(400).json({
                    status: false,
                    message: "Post not found",
                });
            }
            const perCreatorAmount = Number(post.per_creator_amount || 0);
            const totalAmount = perCreatorAmount * creatorIds.length;
            const businessUserId = post.user_id;
            const businessUser = await User_1.default.findByPk(businessUserId);
            if (!businessUser) {
                return res.status(200).json({
                    status: true,
                    message: "Business user not found",
                });
            }
            if (Number(businessUser.wallet || 0) < totalAmount) {
                return res.status(200).json({
                    status: true,
                    message: "Insufficient funds in business user's wallet",
                });
            }
            // Call internal API to add creator wallet transaction
            for (const creatorId of creatorIds) {
                try {
                    await axios_1.default.post(`${process.env.INTERNAL_API_BASE_URL}/wallet/addCreatorWalletTransaction`, {
                        creator_ids: [creatorId],
                        amount: perCreatorAmount,
                        post_id: postId,
                    });
                }
                catch (error) {
                    console.error("addCreatorWalletTransaction error:", error?.response?.data || error);
                    return res.status(500).json({
                        status: false,
                        message: "Failed to update creator wallet transaction record: " +
                            (error.response?.data?.message || error.message),
                    });
                }
            }
            const now = new Date();
            const notifications = [];
            for (const creatorId of creatorIds) {
                await PostInterest_1.default.update({ is_payment_done: 1 }, { where: { post_id: postId, creator_id: creatorId } });
                const creator = await User_1.default.findByPk(creatorId, {
                    attributes: ["remember_token"],
                });
                if (creator && creator.remember_token) {
                    const token = creator.remember_token;
                    // TODO: send push notification using token
                }
                notifications.push({
                    user_id: creatorId,
                    title: "Payment Release Creator",
                    description: `Payment for your interest in post ID ${postId} has been marked as done.`,
                    createdAt: now,
                    updatedAt: now,
                });
            }
            if (notifications.length) {
                await UserNotification_1.default.bulkCreate(notifications);
            }
            await Post_1.default.update({ post_status: "3" }, { where: { id: postId } });
            businessUser.wallet =
                Number(businessUser.wallet || 0) - totalAmount;
            await businessUser.save();
            try {
                await axios_1.default.post(`${process.env.INTERNAL_API_BASE_URL}/wallet/addBusinessWalletTransaction`, {
                    user_id: businessUserId,
                    amount: totalAmount,
                    credit_debit: "debit",
                    post_id: postId,
                });
            }
            catch (error) {
                console.error("addBusinessWalletTransaction error:", error?.response?.data || error);
                return res.status(500).json({
                    status: false,
                    message: "Failed to update business wallet transaction record: " +
                        (error.response?.data?.message || error.message),
                });
            }
            return res.status(200).json({
                status: true,
                message: "Payment released to creators successfully",
                data: {
                    post_id: postId,
                    creator_ids: creatorIds,
                    per_creator_amount: perCreatorAmount,
                    business_user_id: businessUserId,
                },
            });
        }
        catch (error) {
            console.error("paymentReleaseToCreator error:", error);
            return res.status(500).json({
                status: false,
                message: "An unexpected error occurred while releasing payment to creators",
            });
        }
    }
    // ===============================================
    // 3) UPDATE USER PAYMENT DETAILS
    // ===============================================
    async paymentDetails(req, res) {
        try {
            const { user_id, payment_mobile_number, upi_id, bank_account_number, IFSC, bank_name, branch_name, default_method, } = req.body;
            if (!user_id) {
                return res.status(400).json({
                    status: false,
                    message: "user_id is required",
                });
            }
            const user = await User_1.default.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: "User not found",
                });
            }
            if (payment_mobile_number)
                user.payment_mobile_number = payment_mobile_number;
            if (upi_id)
                user.upi_id = upi_id;
            if (bank_account_number)
                user.bank_account_number = bank_account_number;
            if (IFSC)
                user.ifsc = IFSC;
            if (bank_name)
                user.bank_name = bank_name;
            if (branch_name)
                user.branch_name = branch_name;
            if (default_method)
                user.default_method = default_method;
            await user.save();
            return res.status(200).json({
                status: true,
                message: "Payment details updated successfully",
                data: user,
            });
        }
        catch (error) {
            console.error("paymentDetails error:", error);
            return res.status(500).json({
                status: false,
                message: "Failed to update payment details",
            });
        }
    }
    // ==========================================
    // 4) GET USER PAYMENT DETAILS
    // ==========================================
    async getPaymentDetail(req, res) {
        try {
            const { user_id } = req.body;
            if (!user_id) {
                return res.status(400).json({
                    status: false,
                    message: "user_id is required",
                });
            }
            const user = await User_1.default.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: "User not found",
                });
            }
            const paymentDetails = {
                payment_mobile_number: user.payment_mobile_number ?? null,
                upi_id: user.upi_id ?? null,
                bank_account_number: user.bank_account_number ?? null,
                IFSC: user.ifsc ?? null,
                bank_name: user.bank_name ?? null,
                branch_name: user.branch_name ?? null,
                default_method: user.default_method ?? null,
            };
            const hasAnyValue = Object.values(paymentDetails).some((v) => v !== null && v !== "");
            if (!hasAnyValue) {
                return res.status(200).json({
                    status: true,
                    message: "No payment details found for this user",
                });
            }
            return res.status(200).json({
                status: true,
                message: "Payment details retrieved successfully",
                data: paymentDetails,
            });
        }
        catch (error) {
            console.error("getPaymentDetail error:", error);
            return res.status(500).json({
                status: false,
                message: "Failed to retrieve payment details",
            });
        }
    }
    // ==========================================
    // 5) FETCH PAYMENT STATUS FROM RAZORPAY
    // ==========================================
    async fetchPaymentStatus(req, res) {
        try {
            const { user_id } = req.body;
            if (!user_id) {
                return res.status(400).json({
                    status: false,
                    message: "user_id is required",
                });
            }
            const user = await User_1.default.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: "User not found",
                });
            }
            const orderId = user.last_order_id;
            if (!orderId) {
                return res.status(404).json({
                    status: false,
                    message: "No orders found for the given user ID.",
                    data: null,
                });
            }
            const keyId = process.env.RAZORPAY_KEY_ID;
            const keySecret = process.env.RAZORPAY_KEY_SECRET;
            if (!keyId || !keySecret) {
                return res.status(500).json({
                    status: false,
                    message: "Business razorpay details not configured.",
                });
            }
            const response = await axios_1.default.get(`https://api.razorpay.com/v1/orders/${orderId}/payments`, {
                headers: {
                    Authorization: "Basic " +
                        Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
                    "Content-Type": "application/json",
                },
            });
            const paymentStatus = response.data;
            await Payment_1.default.create({
                user_id: Number(user_id),
                razorpay_order_id: orderId,
                status: "fetched",
                response: paymentStatus,
            });
            return res.status(200).json({
                status: true,
                message: "Payment status fetched successfully",
                data: paymentStatus,
            });
        }
        catch (error) {
            console.error("fetchPaymentStatus error:", error?.response?.data || error);
            return res.status(500).json({
                status: false,
                message: "Failed to fetch payment status: " +
                    (error.response?.data?.error?.description || error.message),
                data: null,
            });
        }
    }
    // ==========================================
    // 6) PROCESS PAYMENT  (mark temp order as processing)
    // ==========================================
    async processPayment(req, res) {
        try {
            const { order_id } = req.body;
            if (!order_id) {
                return res.status(400).json({
                    status: false,
                    message: "order_id is required",
                });
            }
            const tempOrder = await TemporaryOrder_1.default.findOne({ where: { order_id } });
            if (!tempOrder) {
                return res.status(404).json({
                    status: false,
                    message: "Temp Order not found",
                });
            }
            tempOrder.status = "processing";
            await tempOrder.save();
            return res.status(200).json({
                status: true,
                message: "Temp Order has been marked as Processing",
                data: null,
            });
        }
        catch (error) {
            console.error("processPayment error:", error);
            return res.status(500).json({
                status: false,
                message: "Failed to process payment",
            });
        }
    }
    // ==========================================
    // 7) PAYMENT SUCCESS / FAILED (from frontend callback)
    // ==========================================
    async paymentSuccess(req, res) {
        try {
            const { order_id, user_id, payment_status } = req.body;
            if (!order_id || !user_id || !payment_status) {
                return res.status(400).json({
                    status: false,
                    message: "order_id, user_id & payment_status are required",
                });
            }
            const tempOrder = await TemporaryOrder_1.default.findOne({ where: { order_id } });
            if (!tempOrder) {
                return res.status(404).json({
                    status: false,
                    message: "Temp Order not found",
                });
            }
            // SUCCESS
            if (payment_status === "SUCCESS") {
                const responseData = await this.saveOrder(String(order_id), Number(tempOrder.business_id), Number(user_id));
                return res.status(200).json({
                    status: true,
                    message: "Payment success retrieved successfully",
                    data: responseData,
                });
            }
            // FAILED
            tempOrder.status = "failed";
            await tempOrder.save();
            // Also log in payments table
            await Payment_1.default.create({
                user_id: Number(user_id),
                razorpay_order_id: String(order_id),
                status: "failed",
                response: { source: "paymentSuccess", message: "Payment failed" },
            });
            return res.status(200).json({
                status: true,
                message: "Failed Payment",
                data: null,
            });
        }
        catch (error) {
            console.error("paymentSuccess error:", error);
            return res.status(500).json({
                status: false,
                message: "Failed to handle payment success",
            });
        }
    }
    // ==========================================
    // 8) SAVE ORDER (creates record in orders table)
    // ==========================================
    async saveOrder(orderId, businessId, userId) {
        const round2 = (val) => Number.isFinite(Number(val))
            ? Math.round(Number(val) * 100) / 100
            : 0;
        // 1) If payment already recorded, just return details based on temp order
        const existingPayment = await Payment_1.default.findOne({
            where: { razorpay_order_id: orderId, user_id: userId },
        });
        const tempOrder = await TemporaryOrder_1.default.findOne({
            where: { order_id: orderId },
        });
        if (!tempOrder) {
            throw new Error("Temporary order not found");
        }
        // names
        const business = await User_1.default.findByPk(businessId);
        const user = await User_1.default.findByPk(userId);
        const businessName = business?.business_name ?? "Unknown Business";
        const receiptName = user?.name ?? "Unknown User";
        const originalBill = round2(tempOrder.original_bill_amount ??
            tempOrder.bill_amount);
        const finalBill = round2(tempOrder.final_bill_amount);
        // mark temp order as success (like Laravel)
        tempOrder.status = "success";
        await tempOrder.save();
        // 2) Ensure Payment row is success
        let payment = existingPayment;
        if (!payment) {
            payment = await Payment_1.default.create({
                user_id: userId,
                post_id: null, // no post_id in temporary_orders table
                razorpay_order_id: orderId,
                status: "success",
                amount: finalBill,
                response: {
                    source: "saveOrder",
                    temporary_order_id: tempOrder.id,
                    original_bill_amount: tempOrder.original_bill_amount,
                    discounted_bill: tempOrder.discounted_bill,
                    final_bill_amount: tempOrder.final_bill_amount,
                    platform_fee: tempOrder.platform_fee,
                    gateway_charges: tempOrder.gateway_charges,
                    settlement_amount: tempOrder.settlement_amount,
                    loyalty_points_used_discount_amount: tempOrder.loyalty_points_used_discount_amount,
                    loyalty_points_will_earn: tempOrder.loyalty_points_will_earn,
                    referrer_id: tempOrder.referrer_id,
                },
            });
        }
        else if (payment.status !== "success") {
            payment.status = "success";
            payment.amount = finalBill;
            await payment.save();
        }
        // created_at from temporary_orders table
        const createdAtRaw = tempOrder.created_at ||
            tempOrder.createdAt ||
            new Date();
        const created_at = createdAtRaw
            .toISOString()
            .slice(0, 19)
            .replace("T", " "); // Y-m-d H:i:s
        // 3) CREATE / UPDATE RECORD IN `orders` TABLE
        const orderDefaults = {
            user_id: userId,
            business_id: businessId,
            referrer_id: tempOrder.referrer_id ?? null,
            order_id: orderId,
            original_bill_amount: tempOrder.original_bill_amount,
            discounted_bill: tempOrder.discounted_bill,
            discount_percentage: tempOrder.discount_percentage ?? null,
            loyalty_points_used_discount_amount: tempOrder.loyalty_points_used_discount_amount,
            platform_fee: tempOrder.platform_fee,
            gateway_charges: tempOrder.gateway_charges,
            reverse_gateway_charges: tempOrder.reverse_gateway_charges,
            settlement_amount: tempOrder.settlement_amount,
            final_bill_amount: tempOrder.final_bill_amount,
            loyalty_points_earned: tempOrder.loyalty_points_will_earn ?? null,
            transaction_response: null, // or JSON.stringify(payment) if you want
            expiry_date: tempOrder.expiry_date ?? null,
            review_status: tempOrder.review_status ?? null,
            status: "success",
            created_at: createdAtRaw,
            updated_at: createdAtRaw,
        };
        const [order, created] = await Order_1.default.findOrCreate({
            where: {
                order_id: orderId,
                user_id: userId,
            },
            defaults: orderDefaults,
        });
        if (!created) {
            await order.update(orderDefaults);
        }
        // 4) Update user's last_order_id (used in fetchPaymentStatus)
        if (user) {
            user.last_order_id = orderId;
            await user.save();
        }
        // Deduct loyalty points if used during checkout
        const loyaltyPointsUsed = Number(tempOrder.loyalty_points_used_discount_amount) || 0;
        if (loyaltyPointsUsed > 0) {
            try {
                console.log(`🪙 Deducting ${loyaltyPointsUsed} points for User ${userId} at Business ${businessId}...`);
                await points_service_1.default.deductPoints(userId, businessId, loyaltyPointsUsed, orderId);
                // Send Redemption Push Notification to Creator
                const message = `🛍️ You redeemed ${loyaltyPointsUsed} loyalty points at ${businessName}`;
                if (user?.remember_token) {
                    await (0, sendPushNotification_1.sendPushNotification)({
                        title: "Points Redeemed",
                        description: message
                    }, [user.remember_token]);
                }
                // Log Notification inside database for Creator
                await NewUserNotification_1.default.create({
                    user_id: userId,
                    notification_subject: "Points Redeemed",
                    notification_text: message,
                    business_id: businessId,
                    is_redeemed: "CreatorView"
                });
                // Send Redemption Push Notification to Business
                const businessMessage = `🛍️ ${receiptName} redeemed ${loyaltyPointsUsed} loyalty points at your business.`;
                const businessRecord = await Business_1.default.findByPk(businessId);
                if (businessRecord?.remember_token) {
                    await (0, sendPushNotification_1.sendPushNotification)({
                        title: "Points Redeemed by Customer",
                        description: businessMessage
                    }, [businessRecord.remember_token]);
                }
                // Log Notification inside database for Business
                await NewUserNotification_1.default.create({
                    user_id: businessId,
                    notification_subject: "Points Redeemed by Customer",
                    notification_text: businessMessage,
                    business_id: businessId,
                    is_redeemed: "BusinessView"
                });
            }
            catch (deductErr) {
                console.error("❌ Error during points deduction / notification:", deductErr);
            }
        }
        // 5) CREATE WALLET TRANSACTION FOR BUSINESS OWNER
        // Automatically store order payment in wallet_transactions table for business owner
        try {
            const originalAmount = Number(tempOrder.original_bill_amount) || 0;
            const platformFee = Number(tempOrder.platform_fee) || 0; // Fixed amount in ₹
            const gatewayCharges = Number(tempOrder.gateway_charges) || 0; // Percentage value
            const reverseGatewayCharges = Number(tempOrder.reverse_gateway_charges) || 0; // Percentage value
            const settlementAmount = Number(tempOrder.settlement_amount) || 0;
            // Apply reverse calculator using the same formula as WebApiController
            // Net Amount = Final Bill Amount - (Final Bill Amount * reverse_gateway_charges / 100) - platform_fee
            const finalBillAmount = Number(tempOrder.final_bill_amount) || 0;
            const netAmountReceived = finalBillAmount - (finalBillAmount * reverseGatewayCharges / 100) - platformFee;
            const finalSettlementAmount = settlementAmount > 0 ? settlementAmount : netAmountReceived;
            // Check if wallet transaction already exists for this order
            const existingWalletTransaction = await WalletTransaction_1.default.findOne({
                where: {
                    user_id: businessId,
                    remark: {
                        [sequelize_1.Op.like]: `%Order ${orderId}%`
                    }
                }
            });
            // Create wallet transaction only if it doesn't exist
            if (!existingWalletTransaction) {
                await WalletTransaction_1.default.create({
                    user_id: businessId,
                    from_user_id: userId,
                    amount: finalSettlementAmount,
                    credit_debit: "credit",
                    remark: `Payment received for Order ${orderId}`,
                    is_withdraw_request: "0",
                    via: "order_payment",
                    source_type: "order_payment",
                    settlement_status: "pending",
                    created_at: createdAtRaw,
                    updated_at: createdAtRaw
                });
                console.log(`Auto-created wallet transaction for Order ${orderId}: ₹${finalSettlementAmount}`);
                console.log(`Fee breakdown - Original: ₹${originalAmount}, Platform: ₹${platformFee}, Gateway: ${gatewayCharges}%, Reverse Gateway: ${reverseGatewayCharges}%, Net: ₹${finalSettlementAmount}`);
            }
        }
        catch (walletError) {
            console.error("Error creating wallet transaction for order:", walletError);
            // Continue with response even if wallet transaction creation fails
        }
        // ---------- Payment Success Notifications ----------
        try {
            console.log(`🔔 Triggering Payment Success notifications for Order ${orderId}...`);
            // 1. Notify Creator/User
            const pointsEarned = Number(tempOrder.loyalty_points_will_earn) || 0;
            let tierNote = "";
            if (pointsEarned > 0) {
                // Resolve network and tier
                try {
                    const visited = new Set();
                    const toProcess = [businessId];
                    while (toProcess.length > 0) {
                        const currentId = toProcess.shift();
                        if (visited.has(currentId))
                            continue;
                        visited.add(currentId);
                        const associates = await BusinessAssociate_1.default.findAll({
                            where: { parent_business_id: currentId },
                            attributes: ['associate_business_id']
                        });
                        const parents = await BusinessAssociate_1.default.findAll({
                            where: { associate_business_id: currentId },
                            attributes: ['parent_business_id']
                        });
                        associates.forEach((a) => {
                            if (!visited.has(a.associate_business_id))
                                toProcess.push(a.associate_business_id);
                        });
                        parents.forEach((p) => {
                            if (!visited.has(p.parent_business_id))
                                toProcess.push(p.parent_business_id);
                        });
                    }
                    const networkIds = Array.from(visited);
                    const userCards = await Card_1.default.findAll({ where: { user_id: userId } });
                    const cardNumbers = userCards.map((c) => c.number);
                    const lastVisit = await Visit_1.default.findOne({
                        where: {
                            [sequelize_1.Op.or]: [
                                { user_id: userId },
                                { card_number: { [sequelize_1.Op.in]: cardNumbers } }
                            ],
                            business_id: { [sequelize_1.Op.in]: networkIds }
                        },
                        order: [["time", "DESC"]],
                    });
                    let activeTier = "new";
                    if (lastVisit) {
                        activeTier = lastVisit.tier;
                    }
                    if (activeTier === "premium") {
                        tierNote = ` You earned ${pointsEarned} Creatoo Points (2x Premium Visitor Bonus)!`;
                    }
                    else if (activeTier === "elite") {
                        tierNote = ` You earned ${pointsEarned} Creatoo Points (1.5x Elite Visitor Bonus)!`;
                    }
                    else {
                        tierNote = ` You earned ${pointsEarned} Creatoo Points!`;
                    }
                }
                catch (tierErr) {
                    console.error("Error resolving active tier for payment notification:", tierErr);
                    tierNote = ` You earned ${pointsEarned} Creatoo Points!`;
                }
            }
            const creator_subject = "💸 Payment Successful!";
            const creator_text = `Your payment of ₹${finalBill} to ${businessName} has been confirmed.${tierNote} Thank you!`;
            await NewUserNotification_1.default.create({
                user_id: userId,
                notification_subject: creator_subject,
                notification_text: creator_text,
                business_id: businessId,
                is_redeemed: "CreatorView",
                order_id: orderId
            });
            if (user?.remember_token) {
                await (0, sendPushNotification_1.sendPushNotification)({
                    title: creator_subject,
                    description: creator_text
                }, [user.remember_token]);
            }
            // 2. Notify Business
            const business_subject = "💰 Payment Received!";
            const business_text = `You received a payment of ₹${finalBill} from ${receiptName} for Order ${orderId}.`;
            await NewUserNotification_1.default.create({
                user_id: businessId,
                notification_subject: business_subject,
                notification_text: business_text,
                business_id: businessId,
                is_redeemed: "BusinessView",
                order_id: orderId
            });
            const businessRecord = await Business_1.default.findByPk(businessId);
            if (businessRecord?.remember_token) {
                await (0, sendPushNotification_1.sendPushNotification)({
                    title: business_subject,
                    description: business_text
                }, [businessRecord.remember_token]);
            }
        }
        catch (notifErr) {
            console.error("❌ Error during payment success notifications:", notifErr);
        }
        // 6) Response matching your Laravel $responseData structure
        return {
            business_id: businessId,
            business_name: businessName,
            total_bill: originalBill,
            final_bill: finalBill,
            created_at,
            receipt_name: receiptName,
            order_id: order.id ?? null,
            razorpay_order_id: orderId,
        };
    }
}
exports.default = new PaymentController();
