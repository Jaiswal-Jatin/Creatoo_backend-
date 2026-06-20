"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postReportRequest = exports.postInterest = exports.getPostInterests = void 0;
const sequelize_1 = require("sequelize");
const PostInterest_1 = __importDefault(require("../models/PostInterest"));
const User_1 = __importDefault(require("../models/User"));
const Post_1 = __importDefault(require("../models/Post"));
const PostReport_1 = __importDefault(require("../models/PostReport")); // make sure this model exists
const sequelize_2 = __importDefault(require("../db/sequelize"));
// import { sendPushNotification } from "../services/notification.service"; // OLD: Using legacy FCM HTTP API
const sendPushNotification_1 = require("../services/sendPushNotification"); // NEW: Using Firebase Admin SDK
/**
 * GET /api/post/interests/:id
 * Returns list of interests for a given post_id
 */
const getPostInterests = async (req, res) => {
    try {
        const { id } = req.params; // post_id
        if (!id) {
            return res.status(400).json({
                status: false,
                message: "post id is required",
            });
        }
        const interests = await PostInterest_1.default.findAll({
            where: { post_id: Number(id) },
            include: [
                {
                    model: User_1.default,
                    as: "creator",
                    attributes: ["id", "name", "mobile", "email"],
                },
                {
                    model: Post_1.default,
                    as: "post",
                    attributes: ["id", "name", "description"],
                },
            ],
            order: [["created_at", "DESC"]],
        });
        return res.json(interests);
    }
    catch (error) {
        console.error("getPostInterests error:", error);
        return res
            .status(500)
            .json({ status: false, message: "Internal server error" });
    }
};
exports.getPostInterests = getPostInterests;
/**
 * POST /api/post/postInterest
 * Laravel: postInterest
 */
const postInterest = async (req, res) => {
    try {
        const { user_id, post_id } = req.body;
        // validate post_id presence
        if (!post_id) {
            return res.status(400).json({
                status: false,
                message: "Post ID is missing or invalid.",
            });
        }
        const userIdNum = Number(user_id);
        const postIdNum = Number(post_id);
        if (Number.isNaN(userIdNum) || Number.isNaN(postIdNum)) {
            return res.status(400).json({
                status: false,
                message: "user_id and post_id must be numeric.",
            });
        }
        const validUser = await User_1.default.findOne({
            where: { id: userIdNum, is_insta_verified: "1" },
        });
        if (!validUser) {
            return res.status(200).json({
                status: true,
                message: "Please verify your account to apply the post",
            });
        }
        const minFollowerPost = await Post_1.default.findByPk(postIdNum);
        if (!minFollowerPost) {
            return res.status(404).json({
                status: false,
                message: "Post not found.",
            });
        }
        const followerCount = validUser.follower_count || 0;
        const followersRequired = minFollowerPost.followers_required || 0;
        if (followerCount < followersRequired) {
            return res.status(200).json({
                status: true,
                message: "Follower criteria is not fulfilled.",
            });
        }
        // has user already applied?
        const existingInterest = await PostInterest_1.default.findOne({
            where: { creator_id: userIdNum, post_id: postIdNum },
        });
        if (existingInterest) {
            return res.status(200).json({
                status: false,
                message: "You have already applied for this post",
            });
        }
        // create interest
        await PostInterest_1.default.create({
            creator_id: userIdNum,
            post_id: postIdNum,
        });
        // notify the business user who owns the post
        const businessUserId = minFollowerPost.user_id;
        if (businessUserId) {
            try {
                // insert into user_notifications table
                const title = "New Interest in Your Post";
                const postName = minFollowerPost.name;
                const description = "A creator has shown interest in your post with ID: " + postIdNum;
                await sequelize_2.default.query(`
          INSERT INTO user_notifications (user_id, title, description, created_at, updated_at)
          VALUES (:user_id, :title, :description, NOW(), NOW())
        `, {
                    replacements: {
                        user_id: businessUserId,
                        title,
                        description,
                    },
                    type: sequelize_1.QueryTypes.INSERT,
                });
                const businessUser = await User_1.default.findByPk(businessUserId, {
                    attributes: ["remember_token"],
                });
                const rememberToken = businessUser?.remember_token;
                if (rememberToken) {
                    const notification = {
                        title,
                        description: "A creator has shown interest in your post: " + postName,
                    };
                    await (0, sendPushNotification_1.sendPushNotification)(notification, [rememberToken]);
                }
            }
            catch (err) {
                console.error("postInterest notification error:", err);
                // Interest registered, but notification failed
                return res.status(200).json({
                    status: true,
                    message: "User interest registered successfully, but failed to send notification.",
                });
            }
        }
        return res.status(200).json({
            status: true,
            message: "You have successfully applied for the post.",
        });
    }
    catch (e) {
        console.error("postInterest error:", e);
        return res.status(500).json({
            status: false,
            message: "Failed to register user interest",
        });
    }
};
exports.postInterest = postInterest;
/**
 * POST /api/post/postReportRequest
 * Laravel: postReportRequest
 */
const postReportRequest = async (req, res) => {
    try {
        const { post_id, user_id, description } = req.body;
        // Validation like $request->validate
        const missing = [];
        if (!post_id)
            missing.push("post_id");
        if (!user_id)
            missing.push("user_id");
        if (!description)
            missing.push("description");
        if (missing.length) {
            return res.status(422).json({
                status: false,
                message: `Missing required fields: ${missing.join(", ")}`,
            });
        }
        const postIdNum = Number(post_id);
        const userIdNum = Number(user_id);
        if (Number.isNaN(postIdNum) || Number.isNaN(userIdNum)) {
            return res.status(422).json({
                status: false,
                message: "post_id and user_id must be numeric",
            });
        }
        const validUser = await User_1.default.findOne({
            where: { id: userIdNum, is_insta_verified: "1" },
        });
        if (!validUser) {
            return res.status(200).json({
                status: true,
                message: "Please verify your account to report the post",
            });
        }
        const existingReport = await PostReport_1.default.findOne({
            where: { post_id: postIdNum, user_id: userIdNum },
        });
        if (existingReport) {
            return res.status(200).json({
                status: true,
                message: "You already reported this post",
            });
        }
        const postReport = await PostReport_1.default.create({
            post_id: postIdNum,
            user_id: userIdNum,
            description,
        });
        if (postReport) {
            return res.status(201).json({
                status: true,
                message: "Post reported successfully",
            });
        }
        else {
            return res.status(500).json({
                status: false,
                message: "Failed to report post",
            });
        }
    }
    catch (e) {
        console.error("postReportRequest error:", e);
        return res.status(500).json({
            status: false,
            message: "Failed to report post",
        });
    }
};
exports.postReportRequest = postReportRequest;
