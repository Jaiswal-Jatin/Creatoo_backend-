"use strict";
// src/controllers/WebApiController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const NewUserNotification_1 = __importDefault(require("../models/NewUserNotification"));
const Order_1 = __importDefault(require("../models/Order"));
const TemporaryOrder_1 = __importDefault(require("../models/TemporaryOrder"));
const User_1 = __importDefault(require("../models/User"));
const CreatorPointsTransaction_1 = __importDefault(require("../models/CreatorPointsTransaction"));
const points_service_1 = __importDefault(require("../services/points.service"));
const Card_1 = __importDefault(require("../models/Card"));
const Visit_1 = __importDefault(require("../models/Visit"));
const BusinessAssociate_1 = __importDefault(require("../models/BusinessAssociate"));
class WebApiController {
    // POST /api/web/NewNotificationList  (Laravel: NewNotificationList)
    async newNotificationList(req, res) {
        try {
            const { user_id, role_id, per_page, page, } = req.body;
            // Validation (similar to $request->validate)
            if (!user_id || !role_id) {
                return res.status(422).json({
                    status: false,
                    message: "user_id and role_id are required",
                });
            }
            const userIdNum = Number(user_id);
            const roleIdNum = Number(role_id);
            if (Number.isNaN(userIdNum) || Number.isNaN(roleIdNum)) {
                return res.status(422).json({
                    status: false,
                    message: "user_id and role_id must be numeric",
                });
            }
            const perPageNum = per_page ? Number(per_page) : 8;
            if (Number.isNaN(perPageNum) || perPageNum < 1) {
                return res.status(422).json({
                    status: false,
                    message: "per_page must be a numeric value >= 1",
                });
            }
            const pageNum = page ? Number(page) : 1;
            const offset = (pageNum - 1) * perPageNum;
            let where = { user_id: userIdNum };
            if (roleIdNum === 3) {
                // whereIn('is_redeemed', [0, 'CreatorView'])
                where.is_redeemed = { [sequelize_1.Op.in]: [0, "0", "CreatorView"] };
            }
            else if (roleIdNum === 2 || roleIdNum === 4) {
                // where('is_redeemed', 'BusinessView')
                where.is_redeemed = "BusinessView";
            }
            else {
                // if other roles shouldn't see anything, you can return empty
                return res.status(200).json({
                    status: false,
                    message: "Empty Notification.",
                    data: null,
                });
            }
            console.log(`[DEBUG] Fetching notifications for User: ${userIdNum}, Role: ${roleIdNum}, Where:`, JSON.stringify(where));
            const { rows, count } = await NewUserNotification_1.default.findAndCountAll({
                where,
                order: [["created_at", "DESC"]],
                limit: perPageNum,
                offset,
            });
            if (!rows || rows.length === 0) {
                return res.status(200).json({
                    status: false,
                    message: "Empty Notification.",
                    data: null,
                });
            }
            // approximate Laravel's paginate structure
            const totalPages = Math.ceil(count / perPageNum);
            return res.status(200).json({
                status: true,
                message: "Notifications fetched successfully.",
                data: {
                    data: rows,
                    current_page: pageNum,
                    per_page: perPageNum,
                    total: count,
                    last_page: totalPages,
                },
            });
        }
        catch (e) {
            console.error("newNotificationList error:", e);
            return res.status(500).json({
                status: false,
                message: "Failed to fetch notifications: " + (e?.message || "Unknown error"),
            });
        }
    }
    // POST /api/web/createOrder  (Laravel: createOrder)
    async createOrder(req, res) {
        try {
            const { user_id, business_id, bill_amount, } = req.body;
            // validation
            if (!user_id || !business_id || !bill_amount) {
                return res.status(422).json({
                    status: false,
                    message: "user_id, business_id and bill_amount are required",
                });
            }
            const userIdNum = Number(user_id);
            const businessIdNum = Number(business_id);
            const amountNum = Number(bill_amount);
            if (Number.isNaN(userIdNum) ||
                Number.isNaN(businessIdNum) ||
                Number.isNaN(amountNum)) {
                return res.status(422).json({
                    status: false,
                    message: "user_id, business_id and bill_amount must be numeric",
                });
            }
            if (amountNum < 1) {
                return res.status(422).json({
                    status: false,
                    message: "bill_amount must be at least 1",
                });
            }
            const orderId = "ORD" + crypto_1.default.randomBytes(5).toString("hex").toUpperCase();
            // In Laravel you are using BusinessHelper::getBusinessDetailsByKey.
            // Here we just read from env. If you want DB-based config,
            // implement a helper similar to BusinessHelper.
            const keyId = process.env.RAZORPAY_KEY_ID;
            const keySecret = process.env.RAZORPAY_KEY_SECRET;
            if (!keyId || !keySecret) {
                return res.status(500).json({
                    status: false,
                    message: "Business razorpay details not found.",
                });
            }
            // create local order row
            const order = await Order_1.default.create({
                user_id: userIdNum,
                business_id: businessIdNum,
                bill_amount: amountNum,
                status: "pending",
            });
            // Razorpay order creation
            const razorpayOrderResponse = await axios_1.default.post("https://api.razorpay.com/v1/orders", {
                amount: Math.round(amountNum * 100),
                currency: "INR",
                receipt: orderId,
            }, {
                auth: {
                    username: keyId,
                    password: keySecret,
                },
            });
            const razorpayOrder = razorpayOrderResponse.data;
            const razorpayOrderId = razorpayOrder.id;
            order.order_id = razorpayOrderId;
            await order.save();
            return res.status(201).json({
                status: true,
                message: "Order created successfully.",
                data: {
                    order_id: razorpayOrderId,
                },
            });
        }
        catch (e) {
            console.error("createOrder error:", e?.response?.data || e);
            return res.status(500).json({
                status: false,
                message: "Failed to create order: " +
                    (e?.response?.data?.error?.description || e?.message || "Unknown error"),
            });
        }
    }
    // POST /api/web/applyOffers  (Laravel: applyOffers)
    async applyOffers(req, res) {
        try {
            const { user_id, business_id, bill_amount, referrer_code, } = req.body;
            // Validation
            if (!user_id || !business_id || !bill_amount) {
                return res.status(422).json({
                    status: false,
                    message: "user_id, business_id and bill_amount are required",
                });
            }
            const userIdNum = Number(user_id);
            const businessIdNum = Number(business_id);
            const originalBillAmount = Number(bill_amount);
            if (Number.isNaN(userIdNum) ||
                Number.isNaN(businessIdNum) ||
                Number.isNaN(originalBillAmount)) {
                return res.status(422).json({
                    status: false,
                    message: "user_id, business_id and bill_amount must be valid numeric values",
                });
            }
            const referrerCode = referrer_code || null;
            let referrerId = null;
            // Referral logic
            if (referrerCode) {
                const referrer = await User_1.default.findOne({
                    where: { referrer_code: referrerCode },
                });
                referrerId = referrer ? referrer.id : null;
                if (!referrer) {
                    return res.status(400).json({
                        status: false,
                        message: "Invalid referral code",
                    });
                }
                const alreadyUsedReferral = await Order_1.default.findOne({
                    where: {
                        user_id: userIdNum,
                        business_id: businessIdNum,
                        referrer_id: referrerId,
                    },
                });
                if (alreadyUsedReferral) {
                    return res.status(400).json({
                        status: false,
                        message: "You have already used this referral code for this business.",
                    });
                }
            }
            const business = await User_1.default.findByPk(businessIdNum);
            if (!business) {
                return res.status(404).json({
                    status: false,
                    message: "Business not found",
                });
            }
            // Ensure we have the latest data from database
            await business.reload();
            const firstTimeDiscountPct = Math.max(0, Number(business.set_first_time_discount) || 0);
            const regularDiscountPct = Math.max(0, Number(business.set_regular_discount) || 0);
            // First visit?
            const existingOrder = await Order_1.default.findOne({
                where: {
                    user_id: userIdNum,
                    business_id: businessIdNum,
                },
            });
            const isFirstVisit = !existingOrder;
            // Sum active points for this specific business dynamically in real-time
            const activeCredits = await CreatorPointsTransaction_1.default.findAll({
                where: {
                    user_id: userIdNum,
                    business_id: businessIdNum,
                    credit_debit_remaining_status: "credit",
                    remaining_points: {
                        [sequelize_1.Op.gt]: 0
                    }
                }
            });
            const now = new Date();
            const balanceForBusiness = activeCredits.reduce((sum, t) => sum + points_service_1.default.getActivePointsForTransaction(t, now), 0);
            let discountPercentage;
            let discountAmount;
            let pointsRedeemedHere;
            if (isFirstVisit) {
                discountPercentage = firstTimeDiscountPct;
                discountAmount = (originalBillAmount * discountPercentage) / 100;
                pointsRedeemedHere = 0;
            }
            else {
                // Combine regular discount % + points redemption
                const regularDiscountAmount = (originalBillAmount * regularDiscountPct) / 100;
                const remainingAfterRegular = originalBillAmount - regularDiscountAmount;
                const maxRedeemablePoints = Math.floor(balanceForBusiness * 0.60);
                const pointsToRedeem = Math.min(maxRedeemablePoints, Math.max(0, remainingAfterRegular));
                discountAmount = regularDiscountAmount + pointsToRedeem;
                pointsRedeemedHere = pointsToRedeem;
                discountPercentage = originalBillAmount > 0 ? (discountAmount / originalBillAmount) * 100 : 0;
            }
            const discountedBill = originalBillAmount - discountAmount;
            // Users earn 10% of the bill amount as loyalty points, multiplied by their active network tier status
            // 1) Find the associate network IDs for this business
            const visited = new Set();
            const toProcess = [businessIdNum];
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
            const userCards = await Card_1.default.findAll({ where: { user_id: userIdNum } });
            const cardNumbers = userCards.map((c) => c.number);
            // 3) Find the last visit for this user/card in the network
            const lastVisit = await Visit_1.default.findOne({
                where: {
                    [sequelize_1.Op.or]: [
                        { user_id: userIdNum },
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
            // Users earn 10% of the bill amount as loyalty points, multiplied by active tier pointsMultiplier
            const baseLoyaltyPoints = originalBillAmount * 0.10;
            const loyaltyPointsEarned = Math.round(baseLoyaltyPoints * pointsMultiplier);
            // platform / gateway charges
            // OLD CODE - DEPRECATED (using platform_fee_percent instead of platform_fee_rupees)
            // const businessUser = await User.findByPk(businessIdNum, {
            //   attributes: [
            //     "platform_fee_percent",
            //     "gateway_charges",
            //     "reverse_gateway_charges",
            //   ] as any,
            // });
            // const platformFee =
            //   Number((businessUser as any)?.platform_fee_percent) || 0;
            // Use the already loaded fresh business data instead of making another database call
            const platformFee = Number(business?.platform_fee_rupees) || 0;
            const gatewayCharges = Number(business?.gateway_charges) || 0;
            const reverseGatewayCharges = Number(business?.reverse_gateway_charges) || 0;
            const finalPlatformFee = discountedBill + platformFee;
            const gstOnGateway = (finalPlatformFee * gatewayCharges) / 100;
            const finalBillAmount = finalPlatformFee + gstOnGateway;
            const settlementAmount = finalBillAmount -
                (finalBillAmount * reverseGatewayCharges) / 100 -
                platformFee;
            const orderId = `MT${Date.now().toString(36).toUpperCase()}`;
            pointsRedeemedHere = isFirstVisit ? 0.0 : Number(discountAmount.toFixed(2));
            // Clean previous temp orders in "applyoffers" status
            await TemporaryOrder_1.default.destroy({
                where: {
                    status: "applyoffers",
                    user_id: userIdNum,
                },
            });
            // Razorpay payment init (no SDK) using axios
            const razorpayKey = process.env.RAZORPAY_KEY_ID;
            const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
            if (!razorpayKey || !razorpaySecret) {
                return res.status(500).json({
                    status: false,
                    message: "Razorpay configuration missing",
                });
            }
            const payload = {
                amount: Math.round(Number(finalBillAmount.toFixed(2)) * 100),
                currency: "INR",
                receipt: orderId,
                payment_capture: 1,
            };
            // console.info("Razorpay Request Payload", {
            //   payload,
            //   user_id: userIdNum,
            //   business_id: businessIdNum,
            //   original_bill_amount: originalBillAmount,
            //   discounted_bill: discountedBill,
            //   final_bill_amount: finalBillAmount,
            // });
            let razorpayData = null;
            try {
                const razorpayResponse = await axios_1.default.post("https://api.razorpay.com/v1/orders", payload, {
                    auth: {
                        username: razorpayKey,
                        password: razorpaySecret,
                    },
                });
                razorpayData = razorpayResponse.data;
                console.info("Razorpay Decoded Response", {
                    decoded_response: razorpayData,
                });
            }
            catch (err) {
                console.error("Razorpay Error", err?.response?.data || err);
            }
            const tempOrder = await TemporaryOrder_1.default.create({
                user_id: userIdNum,
                business_id: businessIdNum,
                order_id: razorpayData?.id ?? null,
                original_bill_amount: originalBillAmount,
                discounted_bill: Number(discountedBill.toFixed(2)),
                loyalty_points_used_discount_amount: Number(discountAmount.toFixed(2)),
                platform_fee: platformFee,
                gateway_charges: gatewayCharges,
                reverse_gateway_charges: reverseGatewayCharges,
                settlement_amount: settlementAmount,
                discount_percentage: discountPercentage,
                final_bill_amount: Number(finalBillAmount.toFixed(2)),
                loyalty_points_will_earn: loyaltyPointsEarned,
                referrer_id: referrerId,
                status: "applyoffers",
            });
            // console.info("TemporaryOrder Saved", { order: tempOrder });
            return res.status(200).json({
                status: true,
                message: "Points calculated successfully",
                data: {
                    order_id: tempOrder.order_id,
                    original_bill: originalBillAmount,
                    is_first_visit: isFirstVisit,
                    discount_percentage: Number((Number(discountPercentage) || 0).toFixed(2)),
                    discount_applied: Number(discountAmount.toFixed(2)),
                    discounted_bill: Number(discountedBill.toFixed(2)),
                    platform_fee: platformFee,
                    convenience_fee: gstOnGateway,
                    final_bill_amount: Number(finalBillAmount.toFixed(2)),
                    total_points_for_business: balanceForBusiness,
                    points_redeemed_here: pointsRedeemedHere,
                    points_you_will_earn: loyaltyPointsEarned,
                },
            });
        }
        catch (e) {
            console.error("applyOffers error:", e);
            return res.status(500).json({
                status: false,
                message: "An error occurred while applying offers: " +
                    (e?.message || "Unknown error"),
            });
        }
    }
}
exports.default = new WebApiController();
