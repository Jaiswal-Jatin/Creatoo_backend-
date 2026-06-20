// src/controllers/ReviewController.ts
import { Request, Response } from "express";
import { QueryTypes } from "sequelize";
import User from "../models/User";
import Review from "../models/Review";
import Order from "../models/Order"; // ✅ your Order model
import CreatorPointsTransaction from "../models/CreatorPointsTransaction";
import NewUserNotification from "../models/NewUserNotification";
import Business from "../models/Business";
import sequelize from "../db/sequelize";
// import { sendPushNotification } from "../services/notification.service"; // OLD: Using legacy FCM HTTP API
import { sendPushNotification } from "../services/sendPushNotification"; // NEW: Using Firebase Admin SDK

class ReviewController {
    // POST /api/review/reviewSubmit  (Laravel: reviewSubmit)
    async reviewSubmit(req: Request, res: Response) {
        try {
            const {
                user_id,
                business_id,
                experience,
                expectation,
                recommend,
                fair_money,
                interaction,
                review_text,
                role_id,
                order_id,
            } = req.body as {
                user_id?: number | string;
                business_id?: number | string;
                experience?: number | string;
                expectation?: number | string;
                recommend?: number | string;
                fair_money?: number | string;
                interaction?: number | string;
                review_text?: string;
                role_id?: number | string;
                order_id?: string;
            };

            // ---------- Validation ----------
            const errors: Record<string, string[]> = {};

            if (!user_id) errors.user_id = ["user_id is required"];
            if (!business_id) errors.business_id = ["business_id is required"];
            if (!experience) errors.experience = ["experience is required"];
            if (!role_id) errors.role_id = ["role_id is required"];

            const userIdNum = Number(user_id);
            const businessIdNum = Number(business_id);
            const experienceNum = Number(experience);
            const expectationNum = Number(expectation || 0);
            const recommendNum = Number(recommend || 0);
            const fairMoneyNum = Number(fair_money || 0);
            const interactionNum = Number(interaction || 0);
            const roleIdNum = Number(role_id);

            if (Number.isNaN(userIdNum)) {
                errors.user_id = [...(errors.user_id || []), "user_id must be integer"];
            }
            if (Number.isNaN(businessIdNum)) {
                errors.business_id = [
                    ...(errors.business_id || []),
                    "business_id must be integer",
                ];
            }

            [
                ["experience", experienceNum],
            ].forEach(([field, value]) => {
                if (Number.isNaN(value)) {
                    errors[field as string] = [
                        ...((errors as any)[field] || []),
                        `${field} must be integer`,
                    ];
                }
            });

            if (Number.isNaN(roleIdNum)) {
                errors.role_id = [
                    ...(errors.role_id || []),
                    "role_id must be integer",
                ];
            }

            if (Object.keys(errors).length > 0) {
                return res.status(422).json({
                    status: false,
                    message: "Validation failed",
                    errors,
                });
            }

            // ---------- Fetch User & Business ----------
            const user = await User.findByPk(userIdNum);
            if (!user) {
                return res.status(422).json({
                    status: false,
                    message: "User not found for the given user_id",
                });
            }
            const receiptName = user.name ?? "Unknown User";

            const business = await Business.findByPk(businessIdNum) || await User.findByPk(businessIdNum);
            if (!business) {
                return res.status(422).json({
                    status: false,
                    message: "Business not found for the given business_id",
                });
            }
            const businessName = (business as any).business_name ?? "Unknown Business";

            // ---------- Fetch Order by order_id (string column) ----------
            const hasOrderId = order_id && order_id.trim() !== "";
            let order = null;
            if (hasOrderId) {
                order = await Order.findOne({
                    where: { order_id: order_id as string },
                });
            }

            // ---------- role / is_redeemed ----------
            let is_redeemed: string | null = null;
            if (roleIdNum === 3) {
                is_redeemed = "CreatorView";
            } else if (roleIdNum === 2 || roleIdNum === 4) {
                is_redeemed = "BusinessView";
            }

            // ---------- Loyalty & expiry ----------
            const days = business.set_expiry ?? 30;
            const loyaltyPointsEarned = order ? (order.loyalty_points_earned ?? 0) : 0;

            // ---------- Create Review ----------
            const review = await Review.create({
                user_id: userIdNum,
                business_id: businessIdNum,
                experience: experienceNum,
                expectation: expectationNum,
                recommend: recommendNum,
                fair_money: fairMoneyNum,
                interaction: interactionNum,
                review_text: review_text || null,
                order_id: hasOrderId ? order_id : null, // string order code, same as Laravel
            } as any);

            // ---------- CreatorPointsTransaction ----------
            const transactionData = {
                user_id: userIdNum,
                business_id: businessIdNum,
                order_id: hasOrderId ? order_id : null, // string (same as Laravel)
                points: loyaltyPointsEarned,                  // ✅ required
                expiry_date: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
                credit_debit_remaining_status: "credit",
                business_name: businessName ?? null,
                total_bill: order ? (order.original_bill_amount ? Number(order.original_bill_amount) : null) : null,
                settlement_amount: order ? (order.settlement_amount ? Number(order.settlement_amount) : null) : null,
                discount_percentage: order ? (order.discount_percentage ? Number(order.discount_percentage) : null) : null,
                final_bill: order ? (order.final_bill_amount ? Number(order.final_bill_amount) : null) : null,
                receipt_name: receiptName,
                remaining_points: loyaltyPointsEarned,        // ✅ required, non-null
                reverse_gateway_charges: order ? (order.reverse_gateway_charges ? Number(order.reverse_gateway_charges) : null) : null,
            };

            if (loyaltyPointsEarned > 0) {
                await CreatorPointsTransaction.create(transactionData as any);
            }

            // ---------- Update Order review_status + loyalty_points_earned ----------
            if (order) {
                await order.update({
                    loyalty_points_earned: loyaltyPointsEarned,
                    review_status: "Completed",
                } as any);
            }

            return res.status(200).json({
                status: true,
                message: `Thanks for your feedback! You’ve earned ${loyaltyPointsEarned} Creatoo Points. Keep sharing your thoughts!`,
                data: review,
                points_earnerd: loyaltyPointsEarned,
            });
        } catch (e: any) {
            console.error("reviewSubmit error:", e);
            return res.status(500).json({
                status: false,
                message:
                    "An error occurred while submitting review: " +
                    (e?.message || "Unknown error"),
            });
        }
    }

    // POST /api/review/ListOfAllReview  (Laravel: ListOfAllReview)
    async listOfAllReview(req: Request, res: Response) {
        try {
            const { user_id } = req.body as { user_id?: number | string };
            const errors: Record<string, string[]> = {};

            if (!user_id) errors.user_id = ["user_id is required"];
            const userIdNum = Number(user_id);
            if (Number.isNaN(userIdNum)) {
                errors.user_id = [...(errors.user_id || []), "user_id must be integer"];
            }

            if (Object.keys(errors).length > 0) {
                return res.status(422).json({
                    status: false,
                    message: "Validation failed",
                    errors,
                });
            }

            const user = await User.findByPk(userIdNum);
            if (!user) {
                return res.status(422).json({
                    status: false,
                    message: "User not found for the given user_id",
                });
            }

            // ⚠ Laravel join:
            // ->leftJoin('orders', 'reviews.order_id', '=', 'orders.id')
            // That means reviews.order_id stores orders.id (PK), **not** the order_id string.
            // We mirror the same here:
            const rows = (await sequelize.query(
                `
        SELECT
          reviews.user_id,
          reviews.order_id,
          COALESCE(businesses.business_name, business_user.business_name, users.business_name) AS business_name,
          COALESCE(businesses.business_image, business_user.business_image, users.business_image) AS business_image,
          reviews.experience,
          reviews.review_text,
          reviews.created_at,
          COALESCE(businesses.id, business_user.id) AS business_id
        FROM reviews
        LEFT JOIN orders ON reviews.order_id = orders.id
        LEFT JOIN users AS users ON orders.business_id = users.id
        LEFT JOIN businesses ON reviews.business_id = businesses.id
        LEFT JOIN users AS business_user ON reviews.business_id = business_user.id
        WHERE reviews.user_id = :userId
        ORDER BY reviews.created_at DESC
      `,
                {
                    replacements: { userId: userIdNum },
                    type: QueryTypes.SELECT,
                }
            )) as any[];

            if (!rows || rows.length === 0) {
                return res.status(200).json({
                    status: true,
                    message: "No reviews found for this user.",
                    data: [],
                });
            }

            const now = Date.now();
            const data = rows.map((r) => {
                const createdAt = new Date(r.created_at);
                const diffMs = now - createdAt.getTime();
                const days_ago = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                return {
                    business_id: r.business_id,
                    business_name: r.business_name || "Unknown",
                    business_image: r.business_image || null,
                    experience: r.experience,
                    review_text: r.review_text,
                    days_ago,
                };
            });

            return res.status(200).json({
                status: true,
                message: "Reviews fetched successfully.",
                data,
            });
        } catch (e: any) {
            console.error("listOfAllReview error:", e);
            return res.status(500).json({
                status: false,
                message:
                    "An error occurred while fetching reviews: " +
                    (e?.message || "Unknown error"),
            });
        }
    }

    // POST /api/review/business-reviews
    // Business fetches all reviews received for their business
    async getBusinessReviews(req: Request, res: Response) {
        try {
            const { business_id } = req.body as { business_id?: number | string };
            const authUser = (req as any).user;
            const targetBusinessId = business_id ? Number(business_id) : authUser?.id;

            if (!targetBusinessId) {
                return res.status(422).json({ status: false, message: "Business ID is required." });
            }

            const rows = (await sequelize.query(
                `
        SELECT
          reviews.id,
          reviews.user_id,
          reviews.business_id,
          reviews.experience,
          reviews.expectation,
          reviews.recommend,
          reviews.fair_money,
          reviews.interaction,
          reviews.review_text,
          reviews.created_at,
          u.name AS user_name,
          u.mobile AS user_mobile,
          u.user_image,
          COALESCE(b.business_name, bu.business_name) AS business_name
        FROM reviews
        LEFT JOIN users u ON reviews.user_id = u.id
        LEFT JOIN businesses b ON reviews.business_id = b.id
        LEFT JOIN users bu ON reviews.business_id = bu.id
        WHERE reviews.business_id = :businessId
        ORDER BY reviews.created_at DESC
      `,
                {
                    replacements: { businessId: targetBusinessId },
                    type: QueryTypes.SELECT,
                }
            )) as any[];

            const now = Date.now();
            const data = rows.map((r: any) => ({
                id: r.id,
                user_id: r.user_id,
                business_id: r.business_id,
                user_name: r.user_name || "Unknown",
                user_mobile: r.user_mobile || "",
                user_image: r.user_image || null,
                business_name: r.business_name || "Unknown",
                experience: r.experience,
                expectation: r.expectation,
                recommend: r.recommend,
                fair_money: r.fair_money,
                interaction: r.interaction,
                review_text: r.review_text,
                days_ago: Math.floor((now - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24)),
                created_at: r.created_at,
            }));

            return res.status(200).json({
                status: true,
                message: "Business reviews fetched successfully.",
                total: data.length,
                data,
            });
        } catch (e: any) {
            console.error("getBusinessReviews error:", e);
            return res.status(500).json({
                status: false,
                message: "Error fetching business reviews: " + (e?.message || "Unknown error"),
            });
        }
    }

    // skipReview stays same as before – no change needed for Order model
    async skipReview(req: Request, res: Response) {
        try {
            const { user_id, order_id, is_redeemed } = req.body as {
                user_id?: number | string;
                order_id?: string;
                is_redeemed?: string | number;
            };

            const errors: Record<string, string[]> = {};
            if (!user_id) errors.user_id = ["user_id is required"];
            if (!order_id) errors.order_id = ["order_id is required"];

            const userIdNum = Number(user_id);
            if (Number.isNaN(userIdNum)) {
                errors.user_id = [...(errors.user_id || []), "user_id must be integer"];
            }

            if (Object.keys(errors).length > 0) {
                return res.status(422).json({
                    status: false,
                    message: "Validation failed",
                    errors,
                });
            }

            const user = await User.findByPk(userIdNum);
            if (!user) {
                return res.status(422).json({
                    status: false,
                    message: "User not found for the given user_id",
                });
            }

            const notification_text =
                "You skipped the feedback survey. Complete it now to earn your reward Points!";
            const isRedeemedValue = is_redeemed ?? "0";

            const notificationRow = await NewUserNotification.create({
                user_id: userIdNum,
                order_id,
                notification_text,
                is_redeemed: isRedeemedValue,
            } as any);

            const rememberToken = user.remember_token;
            if (rememberToken) {
                const notificationPayload = {
                    title: "user skip Review",
                    description:
                        "You skipped the feedback survey. Complete it now to earn your reward Points!",
                };

                await sendPushNotification(notificationPayload, [rememberToken]);
            }

            return res.status(200).json({
                status: true,
                message: "Notification created successfully.",
                data: notificationRow,
            });
        } catch (e: any) {
            console.error("skipReview error:", e);
            return res.status(500).json({
                status: false,
                message:
                    "An error occurred while skipping review: " +
                    (e?.message || "Unknown error"),
            });
        }
    }
}

export default new ReviewController();
