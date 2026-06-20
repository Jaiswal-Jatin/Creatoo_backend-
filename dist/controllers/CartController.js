"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const PostInterest_1 = __importDefault(require("../models/PostInterest"));
const Post_1 = __importDefault(require("../models/Post"));
const User_1 = __importDefault(require("../models/User"));
const sequelize_2 = __importDefault(require("../db/sequelize"));
// import { sendPushNotification } from "../services/notification.service"; // OLD: Using legacy FCM HTTP API
const sendPushNotification_1 = require("../services/sendPushNotification"); // NEW: Using Firebase Admin SDK
class CartController {
    // POST /api/cart/addCart  (Laravel: addCart)
    async addCart(req, res) {
        try {
            const { creator_id, post_id } = req.body;
            // ✅ validation like $request->validate
            if (!creator_id || !post_id) {
                return res.status(422).json({
                    status: false,
                    message: "creator_id and post_id are required",
                });
            }
            const creatorIdNum = Number(creator_id);
            const postIdNum = Number(post_id);
            if (Number.isNaN(creatorIdNum) || Number.isNaN(postIdNum)) {
                return res.status(422).json({
                    status: false,
                    message: "creator_id and post_id must be numeric",
                });
            }
            // 🔎 find post_interests row
            const postInterest = await PostInterest_1.default.findOne({
                where: {
                    creator_id: creatorIdNum,
                    post_id: postIdNum,
                },
            });
            if (!postInterest) {
                return res.status(400).json({
                    status: false,
                    message: "Record not found",
                });
            }
            const currentCart = Number(postInterest.is_cart ?? 0);
            const newCartValue = currentCart === 1 ? 0 : 1;
            // toggle is_cart
            await postInterest.update({ is_cart: newCartValue });
            // count how many in cart for this post
            const cartCount = await PostInterest_1.default.count({
                where: {
                    post_id: postIdNum,
                    is_cart: 1,
                },
            });
            // get creator_required from Post
            const post = await Post_1.default.findByPk(postIdNum, {
                attributes: ["creator_required"],
            });
            const creatorRequired = Number(post?.creator_required ?? 0);
            if (cartCount > creatorRequired) {
                // ⚠️ same behavior as Laravel: no rollback even if over limit
                return res.status(400).json({
                    status: false,
                    message: "Can't select more than the creator's requirement",
                });
            }
            // post_status logic is commented in Laravel, so we keep it commented
            // const postStatusValue = cartCount > 0 ? "1" : "0";
            // await post?.update({ post_status: postStatusValue } as any);
            const message = newCartValue === 1
                ? "Record added to cart"
                : "Record removed from cart";
            return res.status(200).json({
                status: true,
                message,
            });
        }
        catch (e) {
            console.error("addCart error:", e);
            return res.status(500).json({
                status: false,
                message: "Failed to update cart: " + (e?.message || "Unknown error"),
            });
        }
    }
    // POST /api/cart/addShortlist  (Laravel: addShortlist)
    async addShortlist(req, res) {
        try {
            const { post_id, creator_ids } = req.body;
            // ✅ Validation like Laravel
            if (!post_id) {
                return res.status(422).json({
                    status: false,
                    message: "post_id is required",
                });
            }
            if (!creator_ids || !Array.isArray(creator_ids) || creator_ids.length === 0) {
                return res.status(422).json({
                    status: false,
                    message: "creator_ids is required and must be a non-empty array",
                });
            }
            const postIdNum = Number(post_id);
            if (Number.isNaN(postIdNum)) {
                return res.status(422).json({
                    status: false,
                    message: "post_id must be numeric",
                });
            }
            const creatorIdNums = creator_ids.map(Number);
            if (creatorIdNums.some((n) => Number.isNaN(n))) {
                return res.status(422).json({
                    status: false,
                    message: "All creator_ids must be numeric",
                });
            }
            // 🔎 ensure post exists
            const post = await Post_1.default.findByPk(postIdNum);
            if (!post) {
                return res.status(404).json({
                    status: false,
                    message: "Post not found",
                });
            }
            // (optional) ensure all creators exist
            const creatorsCount = await User_1.default.count({
                where: {
                    id: { [sequelize_1.Op.in]: creatorIdNums },
                },
            });
            if (creatorsCount !== creatorIdNums.length) {
                return res.status(422).json({
                    status: false,
                    message: "One or more creator_ids are invalid",
                });
            }
            const postName = post.name ?? `#${postIdNum}`;
            const notifications = [];
            // Shortlist those who are already in cart
            for (const creatorId of creatorIdNums) {
                const pi = await PostInterest_1.default.findOne({
                    where: {
                        creator_id: creatorId,
                        post_id: postIdNum,
                        is_cart: 1,
                    },
                });
                if (pi) {
                    pi.is_shortlist = 1;
                    await pi.save();
                    notifications.push({
                        user_id: creatorId,
                        title: "SHORTLISTED",
                        description: `You have been shortlisted for post ID: ${postIdNum}`,
                        created_at: new Date(),
                        updated_at: new Date(),
                    });
                    const user = await User_1.default.findByPk(creatorId, {
                        attributes: ["remember_token"],
                    });
                    const rememberToken = user?.remember_token;
                    if (rememberToken) {
                        const notificationPayload = {
                            title: "SHORTLISTED",
                            description: `You have been shortlisted for post: ${postName}`,
                        };
                        await (0, sendPushNotification_1.sendPushNotification)(notificationPayload, [rememberToken]);
                    }
                }
            }
            // Insert "shortlisted" notifications into user_notifications
            if (notifications.length > 0) {
                try {
                    await sequelize_2.default.getQueryInterface().bulkInsert("user_notifications", notifications);
                }
                catch (e) {
                    console.error("Error inserting shortlist notifications:", e);
                    return res.status(500).json({
                        error: "An error occurred while sending notifications",
                    });
                }
            }
            // Non-shortlisted creators (is_cart = 0 AND is_shortlist = 0)
            const nonShortlisted = await PostInterest_1.default.findAll({
                where: {
                    post_id: postIdNum,
                    is_cart: 0,
                    is_shortlist: 0,
                },
                attributes: ["creator_id"],
            });
            const nonShortlistedIds = nonShortlisted.map((r) => r.creator_id);
            if (nonShortlistedIds.length > 0) {
                const nonShortlistedNotifications = nonShortlistedIds.map((creatorId) => ({
                    user_id: creatorId,
                    title: "Better Luck Next Time",
                    description: `Unfortunately, you were not shortlisted for post ID: ${postIdNum}`,
                    created_at: new Date(),
                    updated_at: new Date(),
                }));
                try {
                    await sequelize_2.default
                        .getQueryInterface()
                        .bulkInsert("user_notifications", nonShortlistedNotifications);
                    // Push notification to non-shortlisted creators
                    const tokenUsers = await User_1.default.findAll({
                        where: {
                            id: { [sequelize_1.Op.in]: nonShortlistedIds },
                        },
                        attributes: ["remember_token"],
                    });
                    const tokens = tokenUsers
                        .map((u) => u.remember_token)
                        .filter(Boolean);
                    for (const token of tokens) {
                        const notificationPayload = {
                            title: "Better Luck Next Time",
                            description: `Unfortunately, you were not shortlisted for post: ${postName}`,
                        };
                        await (0, sendPushNotification_1.sendPushNotification)(notificationPayload, [token]);
                    }
                }
                catch (e) {
                    console.error("Error inserting non-shortlisted notifications:", e);
                    return res.status(500).json({
                        error: "An error occurred while sending non-shortlisted notifications",
                    });
                }
            }
            // Update post_status = '2'
            await post.update({ post_status: "2" });
            return res.json({
                status: true,
                message: "Shortlist updated successfully",
            });
        }
        catch (e) {
            console.error("addShortlist error:", e);
            return res.status(500).json({
                status: false,
                message: "An error occurred while updating shortlist: " +
                    (e?.message || "Unknown error"),
            });
        }
    }
}
exports.default = new CartController();
