"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const axios_1 = __importDefault(require("axios"));
const User_1 = __importDefault(require("../models/User"));
const Business_1 = __importDefault(require("../models/Business"));
const WalletTransaction_1 = __importDefault(require("../models/WalletTransaction"));
const sequelize_2 = __importDefault(require("../db/sequelize"));
const Post_1 = __importDefault(require("../models/Post"));
const TemporaryOrder_1 = __importDefault(require("../models/TemporaryOrder"));
const Order_1 = __importDefault(require("../models/Order"));
const ManualPayment_1 = __importDefault(require("../models/ManualPayment"));
class WalletTransactionController {
    // GET /walletTransaction/allCreator
    async getAllCreatorWalletTransactionService(req, res) {
        try {
            const { from_date, to_date, user_id } = req.query;
            const where = {
                is_withdraw_request: { [sequelize_1.Op.ne]: "1" },
            };
            // user filter
            if (user_id && user_id !== "null") {
                where.user_id = Number(user_id);
            }
            // date range filter
            if (from_date && to_date) {
                const fromDate = new Date(from_date);
                const toDate = new Date(to_date);
                toDate.setHours(23, 59, 59, 999);
                where.created_at = {
                    [sequelize_1.Op.between]: [fromDate, toDate],
                };
            }
            const transactions = await WalletTransaction_1.default.findAll({
                where,
                include: [
                    {
                        model: User_1.default,
                        as: "user",
                        where: { role_id: 3 }, // creators
                        attributes: ["id", "name"],
                    },
                ],
                order: [["created_at", "DESC"]],
            });
            const data = transactions.map((t) => {
                const json = t.toJSON();
                return {
                    ...json,
                    user_info: json.user?.name ?? "N/A",
                    created_at_formatted: new Date(json.created_at)
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19),
                };
            });
            return res.json({ data });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Server error" });
        }
    }
    // GET /walletTransaction/allBusiness
    async getAllBusinessWalletTransactionService(req, res) {
        try {
            const { from_date, to_date, business_id } = req.query;
            const where = {};
            if (from_date && to_date) {
                const fromDate = new Date(from_date);
                const toDate = new Date(to_date);
                toDate.setHours(23, 59, 59, 999);
                where.created_at = {
                    [sequelize_1.Op.between]: [fromDate, toDate],
                };
            }
            if (business_id && business_id !== "null") {
                where.user_id = Number(business_id);
            }
            const transactions = await WalletTransaction_1.default.findAll({
                where,
                include: [
                    {
                        model: User_1.default,
                        as: "user",
                        attributes: ["id", "business_fullname"],
                        required: false,
                    },
                ],
                order: [["created_at", "DESC"]],
            });
            const data = transactions.map((t) => {
                const json = t.toJSON();
                const rawDate = json.created_at ?? json.createdAt; // handle both just in case
                let created_at_formatted = null;
                if (rawDate) {
                    const d = new Date(rawDate);
                    if (!isNaN(d.getTime())) {
                        created_at_formatted = d.toISOString().replace("T", " ").slice(0, 19);
                    }
                }
                return {
                    ...json,
                    user_info: json.user?.business_fullname || "N/A",
                    created_at_formatted,
                };
            });
            return res.json({ data });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Server error" });
        }
    }
    // GET /walletTransaction/allWalletRequest
    async getAllRequestWalletTransactionService(req, res) {
        try {
            const { from_date, to_date } = req.query;
            const where = {
                is_withdraw_request: "1",
            };
            if (from_date && to_date) {
                const fromDate = new Date(from_date);
                const toDate = new Date(to_date);
                toDate.setHours(23, 59, 59, 999);
                where.created_at = {
                    [sequelize_1.Op.between]: [fromDate, toDate],
                };
            }
            const transactions = await WalletTransaction_1.default.findAll({
                where,
                include: [
                    {
                        model: User_1.default,
                        as: "user",
                        where: { role_id: 3 },
                    },
                ],
                order: [["created_at", "DESC"]],
            });
            const data = transactions.map((t) => {
                const json = t.toJSON();
                const user = json.user;
                let bank_details = "N/A";
                if (user) {
                    switch (user.default_method) {
                        case "phone":
                            bank_details = user.payment_mobile_number ?? "N/A";
                            break;
                        case "upi":
                            bank_details = user.upi_id ?? "N/A";
                            break;
                        case "bank":
                            const parts = [
                                user.bank_account_number &&
                                    `Acc. No : ${user.bank_account_number}`,
                                user.ifsc && `IFSC : ${user.ifsc}`,
                                user.bank_name && `Bank Name : ${user.bank_name}`,
                                user.branch_name && `Branch Name : ${user.branch_name}`,
                            ].filter(Boolean);
                            bank_details = parts.join(", ") || "N/A";
                            break;
                    }
                }
                const action = json.credit_debit === "debit"
                    ? '<span class="text-success">Paid</span>'
                    : `<button class="btn btn-primary change-request" data-id="${json.id}">

                 Change Request

               </button>`;
                return {
                    ...json,
                    user_info: user?.name ?? "N/A",
                    payment_mode: user?.default_method ?? "N/A",
                    bank_details,
                    action,
                    created_at_formatted: new Date(json.created_at)
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19),
                };
            });
            return res.json({ data });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Server error" });
        }
    }
    // POST /walletTransaction/change-request-submit
    async submitChangeRequest(req, res) {
        try {
            const { id } = req.body;
            if (!id) {
                return res
                    .status(400)
                    .json({ success: false, message: "id is required" });
            }
            const transaction = await WalletTransaction_1.default.findByPk(id);
            if (!transaction) {
                return res
                    .status(404)
                    .json({ success: false, message: "Transaction not found" });
            }
            const user = await User_1.default.findByPk(transaction.user_id);
            if (!user) {
                return res
                    .status(404)
                    .json({ success: false, message: "User not found" });
            }
            // @ts-ignore – wallet numeric column on User
            if (Number(user.wallet) < Number(transaction.amount)) {
                return res.status(400).json({
                    success: false,
                    message: "Insufficient wallet balance.",
                });
            }
            transaction.credit_debit = "debit";
            await transaction.save();
            // @ts-ignore
            user.wallet = Number(user.wallet) - Number(transaction.amount);
            await user.save();
            return res.json({
                success: true,
                message: "Request updated successfully.",
            });
        }
        catch (err) {
            console.error(err);
            return res
                .status(500)
                .json({ success: false, message: "Server error" });
        }
    }
    // GET /walletTransaction/check-balance?recordId=123
    async checkBalance(req, res) {
        try {
            const { recordId } = req.query;
            if (!recordId) {
                return res.status(400).json({
                    success: false,
                    message: "recordId is required",
                });
            }
            const transaction = await WalletTransaction_1.default.findByPk(Number(recordId));
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: "Transaction not found",
                });
            }
            const user = await User_1.default.findByPk(transaction.user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            // @ts-ignore
            const wallet = Number(user.wallet);
            const amount = Number(transaction.amount);
            if (wallet < amount) {
                return res.status(200).json({
                    success: false,
                    message: "Insufficient wallet balance.",
                });
            }
            return res.status(200).json({
                success: true,
                wallet_balance: wallet,
                requested_amount: amount,
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    }
    // POST /walletTransaction/businessWalletTransaction
    // Laravel: businessWalletTransaction
    async businessWalletTransaction(req, res) {
        try {
            const userId = req.user?.id;
            const { store_orders_in_wallet = false, from_date, to_date } = req.body;
            if (!userId) {
                return res.status(401).json({
                    status: false,
                    message: "Unauthorized",
                    data: [],
                });
            }
            const user = await Business_1.default.findByPk(userId);
            if (!user) {
                return res.status(403).json({
                    status: false,
                    message: "Access allowed only for business users",
                    data: [],
                });
            }
            // Fetch ALL wallet transactions for this business user
            const allWalletTxns = await WalletTransaction_1.default.findAll({
                where: { user_id: userId },
                order: [["created_at", "DESC"]],
            });
            // Also fetch CONFIRMED manual payments for this business
            const manualPayments = await ManualPayment_1.default.findAll({
                where: {
                    business_id: userId,
                    status: 'CONFIRMED',
                },
                include: [{ model: User_1.default, as: 'user', attributes: ['id', 'name'] }],
                order: [["created_at", "DESC"]],
            });
            // Process ALL transactions with settlement calculations
            const processTransaction = async (wt) => {
                const json = wt.toJSON();
                let orderSettlementAmount = 0;
                if (json.remark && json.remark.includes("Order")) {
                    const orderMatch = json.remark.match(/Order\s+(\w+)/);
                    if (orderMatch) {
                        const orderId = orderMatch[1];
                        try {
                            const relatedOrder = await Order_1.default.findOne({
                                where: { order_id: orderId },
                                attributes: ['settlement_amount', 'original_bill_amount', 'platform_fee', 'reverse_gateway_charges', 'final_bill_amount']
                            });
                            if (relatedOrder) {
                                const orderJson = relatedOrder.toJSON();
                                const settlementAmount = Number(orderJson.settlement_amount) || 0;
                                const platformFee = Number(orderJson.platform_fee) || 0;
                                const reverseGatewayCharges = Number(orderJson.reverse_gateway_charges) || 0;
                                const finalBillAmount = Number(orderJson.final_bill_amount) || 0;
                                const netAmountReceived = finalBillAmount - (finalBillAmount * reverseGatewayCharges / 100) - platformFee;
                                orderSettlementAmount = settlementAmount > 0 ? settlementAmount : netAmountReceived;
                            }
                        }
                        catch (error) {
                            console.error('Error fetching related order:', error);
                        }
                    }
                }
                return {
                    ...json,
                    source: "wallet_table",
                    settlementAmount: orderSettlementAmount || json.settlement_amount || json.amount || 0,
                };
            };
            // Process manual payments as wallet-like entries
            const processManualPayment = (mp) => {
                const json = mp.toJSON();
                return {
                    id: json.id,
                    user_id: json.user_id,
                    amount: json.final_amount,
                    credit_debit: 'credit',
                    remark: `Payment from ${json.user?.name || 'Customer'}`,
                    settlementAmount: Number(json.final_amount) || 0,
                    created_at: json.created_at,
                    source: "upi_payment",
                    totalBill: json.bill_amount?.toString(),
                    receivedFrom: json.user?.name || 'Customer',
                    referenceNumber: `PAY-${json.id}`,
                    discountPercentage: json.discount_percentage,
                };
            };
            const allProcessed = await Promise.all(allWalletTxns.map(processTransaction));
            const manualProcessed = manualPayments.map(processManualPayment);
            // Merge wallet transactions + UPI manual payments
            const merged = [...allProcessed, ...manualProcessed];
            const lifetimeEarnings = merged.reduce((sum, item) => sum + Number(item.settlementAmount || 0), 0);
            // Filter by date range if provided
            let filteredProcessed = merged;
            if (from_date && to_date) {
                const fromDate = new Date(from_date);
                const toDate = new Date(to_date);
                toDate.setHours(23, 59, 59, 999);
                filteredProcessed = merged.filter((t) => {
                    const tDate = new Date(t.created_at);
                    return tDate >= fromDate && tDate <= toDate;
                });
            }
            const allTransactions = filteredProcessed
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((transaction, index) => ({
                ...transaction,
                display_id: index + 1,
            }));
            const totalEarnings = allTransactions
                .reduce((sum, item) => sum + Number(item.settlementAmount || 0), 0);
            const summary = {
                total_transactions: allTransactions.length,
                total_amount_received: allTransactions
                    .filter((t) => t.credit_debit === "credit")
                    .reduce((sum, item) => sum + Number(item.amount || 0), 0),
                wallet_transactions_count: filteredProcessed.length,
                order_transactions_count: 0,
                newly_synced_orders: 0,
                total_earnings: totalEarnings,
            };
            return res.status(200).json({
                status: true,
                message: "Data found successfully",
                data: allTransactions,
                summary,
                lifetime_earnings: lifetimeEarnings,
                meta: {
                    store_orders_in_wallet,
                    existing_wallet_transactions: allWalletTxns.length,
                    orders_found: 0,
                    new_wallet_transactions_created: 0,
                },
            });
        }
        catch (err) {
            console.error("businessWalletTransaction error:", err);
            return res.status(500).json({
                status: false,
                message: "Server error",
                data: [],
            });
        }
    }
    // POST /walletTransaction/creatorWalletTransaction
    // Laravel: creatorWalletTransaction
    async creatorWalletTransaction(req, res) {
        try {
            const { user_id, role_id, search } = req.body;
            if (!user_id || !role_id) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid user ID or role ID",
                });
            }
            // Force creator role (same as Laravel where role_id = '3')
            const user = await User_1.default.findOne({
                where: { id: Number(user_id), role_id: 3 },
            });
            if (!user) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid User",
                });
            }
            const replacements = {
                userId: Number(user_id),
            };
            let searchCondition = "";
            if (search && String(search).trim() !== "") {
                searchCondition =
                    " AND (o.order_id LIKE :search OR COALESCE(b.business_name, u.business_name) LIKE :search)";
                replacements.search = `%${search}%`;
            }
            const sql = `
        SELECT
          COALESCE(b.business_name, u.business_name) AS paid_to,
          COALESCE(b.business_image, u.business_image) AS business_image,
          o.original_bill_amount AS bill_amount,
          o.final_bill_amount,
          o.discount_percentage,
          o.created_at,
          o.id,
          o.order_id
        FROM orders o
        LEFT JOIN businesses b ON o.business_id = b.id
        LEFT JOIN users u ON o.business_id = u.id
        WHERE o.user_id = :userId
        ${searchCondition}
        ORDER BY o.created_at DESC
      `;
            const orders = await sequelize_2.default.query(sql, {
                replacements,
                type: sequelize_1.QueryTypes.SELECT,
            });
            return res.status(200).json({
                status: true,
                message: "Data found successfully",
                data: {
                    transactions: orders,
                },
            });
        }
        catch (err) {
            console.error("creatorWalletTransaction error:", err);
            return res.status(500).json({
                status: false,
                message: "Server error",
            });
        }
    }
    // POST /walletTransaction/addBusinessWalletTransaction
    // Laravel: addBusinessWalletTransaction
    async addBusinessWalletTransaction(req, res) {
        try {
            const { user_id, amount, credit_debit, post_id } = req.body;
            // Basic validation (Laravel-like)
            if (!user_id || isNaN(Number(user_id))) {
                return res.status(400).json({
                    status: false,
                    message: "user_id is required and must be an integer",
                });
            }
            if (!post_id || isNaN(Number(post_id))) {
                return res.status(400).json({
                    status: false,
                    message: "post_id is required and must be an integer",
                });
            }
            if (!amount || isNaN(Number(amount))) {
                return res.status(400).json({
                    status: false,
                    message: "amount is required and must be numeric",
                });
            }
            if (!credit_debit || !["credit", "debit"].includes(credit_debit)) {
                return res.status(400).json({
                    status: false,
                    message: "credit_debit must be either 'credit' or 'debit'",
                });
            }
            const post = await Post_1.default.findByPk(Number(post_id));
            if (!post) {
                return res.status(200).json({
                    status: true,
                    message: "Post not found",
                });
            }
            const user = await User_1.default.findByPk(Number(user_id));
            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: "User not found",
                });
            }
            // In Laravel they call $user->save() without changing anything
            await user.save();
            const numericAmount = Number(amount);
            const remark = `PO${post_id} ${numericAmount} has been ${credit_debit === "credit" ? "credited" : "debited"} in your wallet`;
            const transaction = await WalletTransaction_1.default.create({
                user_id: Number(user_id),
                amount: numericAmount,
                credit_debit,
                remark,
            });
            return res.status(200).json({
                status: true,
                message: "Transaction completed successfully.",
                data: transaction,
            });
        }
        catch (err) {
            console.error("addBusinessWalletTransaction error:", err);
            return res.status(500).json({
                status: false,
                message: "Server error",
            });
        }
    }
    // ------------------------------------------------------------------
    // NEW: POST /walletTransaction/checkTransactionStatus
    // Laravel: checkTransactionStatus
    // ------------------------------------------------------------------
    async checkTransactionStatus(req, res) {
        try {
            // 1. Extract raw values
            const orderIdRaw = req.body.order_id;
            const userIdRaw = req.body.user_id;
            // 2. Validate presence
            const errors = {};
            if (!orderIdRaw)
                errors.order_id = ["order_id is required"];
            if (!userIdRaw)
                errors.user_id = ["user_id is required"];
            const userIdNum = Number(userIdRaw);
            if (userIdRaw != null && Number.isNaN(userIdNum)) {
                errors.user_id = [...(errors.user_id || []), "user_id must be numeric"];
            }
            if (Object.keys(errors).length > 0) {
                return res.status(422).json({
                    status: false,
                    message: "Validation failed",
                    errors,
                });
            }
            // 3. Safe cast
            const orderId = String(orderIdRaw);
            // 4. Fetch TemporaryOrder
            const tempOrder = await TemporaryOrder_1.default.findOne({
                where: { order_id: orderId },
            });
            if (!tempOrder) {
                return res.status(404).json({
                    status: false,
                    message: "Order not found",
                });
            }
            // 5. Razorpay credentials
            const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
            const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
            if (!razorpayKeyId || !razorpayKeySecret) {
                console.error("Missing Razorpay credentials in env");
                return res.status(500).json({
                    status: false,
                    message: "Payment configuration error",
                });
            }
            const razorpayUrl = `https://api.razorpay.com/v1/orders/${orderId}/payments`;
            // 6. Call Razorpay API
            let statusResponse;
            try {
                const resp = await axios_1.default.get(razorpayUrl, {
                    auth: {
                        username: razorpayKeyId,
                        password: razorpayKeySecret,
                    },
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
                statusResponse = resp.data;
            }
            catch (err) {
                console.error("Razorpay API error:", err?.response?.data || err.message);
                return res.status(200).json({
                    status: true,
                    message: "Error fetching payment status from Razorpay",
                    error: err?.response?.data || null,
                });
            }
            console.log("Razorpay status API response:", statusResponse);
            // 7. Handle invalid response
            if (!statusResponse || statusResponse.error) {
                return res.status(200).json({
                    status: true,
                    message: "Error fetching payment status from Razorpay",
                    error: statusResponse.error || null,
                });
            }
            // 8. No payments found yet
            if (!Array.isArray(statusResponse.items) || statusResponse.items.length === 0) {
                if (tempOrder.status === "processing") {
                    tempOrder.status = "failed";
                    await tempOrder.save();
                }
                return res.status(200).json({
                    status: true,
                    message: "No payment found yet. Please check again shortly.",
                });
            }
            // 9. Latest payment
            const latestPayment = statusResponse.items[0];
            const paymentStatus = latestPayment.status;
            if (paymentStatus === "captured") {
                // Payment successful → save order
                const responseData = await this.saveOrder(orderId, tempOrder.business_id, userIdNum);
                tempOrder.status = "completed";
                await tempOrder.save();
                return res.status(200).json({
                    status: true,
                    message: "Payment verified and order saved successfully",
                    data: responseData,
                });
            }
            else if (paymentStatus === "failed") {
                tempOrder.status = "failed";
                await tempOrder.save();
                return res.status(200).json({
                    status: true,
                    message: "Payment failed or cancelled",
                });
            }
            else {
                return res.status(200).json({
                    status: true,
                    message: "Payment is pending or in unknown state",
                    data: null,
                });
            }
        }
        catch (err) {
            console.error("checkTransactionStatus error:", err);
            return res.status(500).json({
                status: false,
                message: "Server error",
            });
        }
    }
    // ------------------------------------------------------------------
    // Helper: saveOrder (Laravel: $this->saveOrder)
    // 👉 Replace this stub with full port of your Laravel saveOrder()
    // ------------------------------------------------------------------
    async saveOrder(orderId, businessId, userId) {
        // TODO: port your actual Laravel saveOrder() logic here
        return {
            order_id: orderId,
            business_id: businessId,
            user_id: userId,
        };
    }
}
exports.default = new WalletTransactionController();
