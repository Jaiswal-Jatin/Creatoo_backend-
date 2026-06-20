"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Post Service. Handles business logic for post creation, status management, and persistence.
 * Used By: PostController
 * Database Model: Post
 * Critical: Yes
 */
const sequelize_1 = require("sequelize");
const Post_1 = __importDefault(require("../models/Post"));
class PostService {
    findById(id) {
        return Post_1.default.findByPk(id);
    }
    /**
     * Create a new post
     */
    async create(data) {
        const payload = {
            user_id: data.user_id,
            name: data.name,
            description: data.description,
            budget: data.budget,
            duration: data.duration,
            deliverable: data.deliverable,
            followers_required: data.followers_required,
            work_mode: data.work_mode,
            creator_required: data.creator_required,
            per_creator_amount: data.per_creator_amount,
            transaction_d: data.transaction_d ?? null,
            total_amount: data.total_amount,
            status: data.status ?? "0",
            is_reported: data.is_reported ?? "0",
            is_active: data.is_active ?? 0,
            order_id: data.order_id ?? null,
            counts: data.counts ?? null,
            post_status: data.post_status,
            payment_status: data.payment_status ?? "0", // ✅ default to "0"
            payment_status_response: data.payment_status_response ?? null,
            post_expiry_date: data.post_expiry_date ?? null,
        };
        return Post_1.default.create(payload);
    }
    /**
     * Fetch posts with optional date filter (inclusive)
     */
    async fetchRecord(opts) {
        const where = {};
        if (opts?.from_date && opts?.to_date) {
            const from = new Date(opts.from_date);
            const to = new Date(opts.to_date);
            to.setHours(23, 59, 59, 999);
            where.createdAt = {
                [sequelize_1.Op.between]: [from, to],
            };
        }
        return Post_1.default.findAll({
            where,
            order: [["id", "DESC"]],
        });
    }
    /**
     * Edit an existing post
     */
    async editPost(id, updateData) {
        const post = await Post_1.default.findByPk(id);
        if (!post)
            return null;
        Object.assign(post, updateData);
        await post.save();
        return post;
    }
    /**
     * Delete a post
     */
    async delete(id) {
        const rec = await Post_1.default.findByPk(id);
        if (!rec)
            return null;
        await rec.destroy();
        return rec;
    }
    /**
     * Change active status (0 = inactive, 1 = active)
     */
    changeStatus(id, status) {
        const isActive = status === 1 ? 1 : 0; // number, not boolean
        return Post_1.default.update({ is_active: isActive }, {
            where: { id },
        });
    }
}
exports.default = PostService;
