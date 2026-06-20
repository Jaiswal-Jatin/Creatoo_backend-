"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Post_1 = __importDefault(require("../models/Post"));
const PostInterest_1 = __importDefault(require("../models/PostInterest"));
const PostReport_1 = __importDefault(require("../models/PostReport"));
const User_1 = __importDefault(require("../models/User"));
class OpportunityController {
    // POST /api/opportunity/getOpportunityDetails
    // Laravel: getOpportunityDetails
    // POST /api/opportunity/getOpportunityDetails
    // Laravel: getOpportunityDetails
    async getOpportunityDetails(req, res) {
        try {
            const { user_id, post_id } = req.body;
            const errors = {};
            if (!user_id)
                errors.user_id = ["user_id is required"];
            if (!post_id)
                errors.post_id = ["post_id is required"];
            const userIdNum = Number(user_id);
            const postIdNum = Number(post_id);
            if (Number.isNaN(userIdNum)) {
                errors.user_id = [...(errors.user_id || []), "user_id must be numeric"];
            }
            if (Number.isNaN(postIdNum)) {
                errors.post_id = [...(errors.post_id || []), "post_id must be numeric"];
            }
            if (Object.keys(errors).length > 0) {
                return res.status(422).json({
                    status: false,
                    message: "Validation failed",
                    errors,
                });
            }
            // 🔹 Fetch post WITHOUT include (to avoid association errors)
            const post = await Post_1.default.findByPk(postIdNum);
            if (!post) {
                return res.status(200).json({
                    status: true,
                    message: "Post not found",
                });
            }
            // 🔹 Get business details separately (similar to Laravel with `with('business')`)
            let business = null;
            const postJson = post.toJSON();
            if (postJson.business_id) {
                business = await User_1.default.findByPk(postJson.business_id, {
                    attributes: [
                        "id",
                        "business_name",
                        "business_fullname",
                        "business_mobile",
                        "business_email",
                        "business_address",
                    ],
                });
            }
            // 🔹 Check whether user already applied
            const alreadyApplied = await PostInterest_1.default.findOne({
                where: {
                    creator_id: userIdNum,
                    post_id: postIdNum,
                },
            });
            const applicationStatus = alreadyApplied ? 1 : 0;
            // attach extra fields like Laravel does
            postJson.application_user_interest_status = applicationStatus;
            postJson.business = business ? business.toJSON() : null;
            return res.status(200).json({
                status: true,
                message: "Post details retrieved successfully",
                data: postJson,
            });
        }
        catch (e) {
            console.error("getOpportunityDetails error:", e);
            return res.status(500).json({
                status: false,
                message: "Failed to fetch post details",
            });
        }
    }
    // POST /api/opportunity/getAllOpportunities
    // Laravel: getAllOpportunities
    async getAllOpportunities(req, res) {
        try {
            const { user_id, search_key } = req.body;
            const errors = {};
            if (!user_id)
                errors.user_id = ["user_id is required"];
            if (!search_key)
                errors.search_key = ["search_key is required"];
            const userIdNum = Number(user_id);
            if (Number.isNaN(userIdNum)) {
                errors.user_id = [...(errors.user_id || []), "user_id must be numeric"];
            }
            if (Object.keys(errors).length > 0) {
                return res.status(422).json({
                    status: false,
                    message: "Validation failed",
                    errors,
                });
            }
            const key = (search_key || "").toLowerCase();
            // reportedPostIds = PostReport::pluck('post_id')
            const reportedPostRows = await PostReport_1.default.findAll({
                attributes: ["post_id"],
                raw: true,
            });
            const reportedPostIds = reportedPostRows.map((r) => r.post_id);
            // reportedIds = PostReport::where('user_id', $userId)->pluck('post_id')
            const userReportedRows = await PostReport_1.default.findAll({
                where: { user_id: userIdNum },
                attributes: ["post_id"],
                raw: true,
            });
            const reportedIds = userReportedRows.map((r) => r.post_id);
            let opportunities = [];
            let reportedOpportunitiesIds = [];
            // For expiry date: STR_TO_DATE(post_expiry_date, "%d/%m/%Y") >= currentDate
            const currentDate = new Date();
            const y = currentDate.getFullYear();
            const m = (currentDate.getMonth() + 1).toString().padStart(2, "0");
            const d = currentDate.getDate().toString().padStart(2, "0");
            const currentDateStr = `${y}-${m}-${d}`;
            const expiryCondition = (0, sequelize_1.literal)(`STR_TO_DATE(post_expiry_date, '%d/%m/%Y') >= '${currentDateStr}'`);
            if (key === "all") {
                // postIdsApplied = PostInterest::where(creator_id)->pluck('post_id')
                const appliedRows = await PostInterest_1.default.findAll({
                    where: { creator_id: userIdNum },
                    attributes: ["post_id"],
                    raw: true,
                });
                const postIdsApplied = appliedRows.map((r) => r.post_id);
                // opportunities
                opportunities = await Post_1.default.findAll({
                    where: {
                        post_status: "1",
                        payment_status: "1",
                        id: {
                            [sequelize_1.Op.notIn]: [...postIdsApplied, ...reportedIds],
                        },
                        is_reported: {
                            [sequelize_1.Op.ne]: "1",
                        },
                        post_expiry_date: {
                            [sequelize_1.Op.ne]: null,
                        },
                        [sequelize_1.Op.and]: expiryCondition,
                    },
                    order: [["created_at", "DESC"]],
                });
                // reported opportunities set for flag
                const reportedList = await Post_1.default.findAll({
                    where: {
                        post_status: "1",
                        payment_status: "1",
                        id: {
                            [sequelize_1.Op.notIn]: postIdsApplied,
                            [sequelize_1.Op.in]: reportedPostIds,
                        },
                        post_expiry_date: {
                            [sequelize_1.Op.ne]: null,
                        },
                        [sequelize_1.Op.and]: expiryCondition,
                    },
                    order: [["created_at", "DESC"]],
                    attributes: ["id"],
                    raw: true,
                });
                reportedOpportunitiesIds = reportedList.map((r) => r.id);
            }
            else if (key === "applied") {
                const postIdsRows = await PostInterest_1.default.findAll({
                    where: { creator_id: userIdNum },
                    attributes: ["post_id"],
                    raw: true,
                });
                const postIds = postIdsRows.map((r) => r.post_id);
                // main opportunities: applied by user, not reported by user
                opportunities = await Post_1.default.findAll({
                    where: {
                        post_status: "1",
                        payment_status: "1",
                        id: {
                            [sequelize_1.Op.in]: postIds,
                            [sequelize_1.Op.notIn]: reportedIds,
                        },
                    },
                    order: [["created_at", "DESC"]],
                });
                // intersection: ids that are BOTH in postIds AND in reportedPostIds
                const appliedReportedIds = postIds.filter((id) => reportedPostIds.includes(id));
                const reportedList = await Post_1.default.findAll({
                    where: {
                        post_status: "1",
                        payment_status: "1",
                        id: {
                            [sequelize_1.Op.in]: appliedReportedIds,
                        },
                    },
                    order: [["created_at", "DESC"]],
                    attributes: ["id"],
                    raw: true,
                });
                reportedOpportunitiesIds = reportedList.map((r) => r.id);
            }
            else if (key === "ongoing") {
                const postIdsRows = await PostInterest_1.default.findAll({
                    where: {
                        creator_id: userIdNum,
                        is_shortlist: 1,
                        is_payment_done: 0,
                    },
                    attributes: ["post_id"],
                    raw: true,
                });
                const postIds = postIdsRows.map((r) => r.post_id);
                opportunities = await Post_1.default.findAll({
                    where: {
                        post_status: "2",
                        payment_status: "1",
                        id: {
                            [sequelize_1.Op.in]: postIds,
                            [sequelize_1.Op.notIn]: reportedIds,
                        },
                    },
                    order: [["created_at", "DESC"]],
                });
                const ongoingReportedIds = postIds.filter((id) => reportedPostIds.includes(id));
                const reportedList = await Post_1.default.findAll({
                    where: {
                        post_status: "2",
                        payment_status: "1",
                        id: {
                            [sequelize_1.Op.in]: ongoingReportedIds,
                        },
                    },
                    order: [["created_at", "DESC"]],
                    attributes: ["id"],
                    raw: true,
                });
                reportedOpportunitiesIds = reportedList.map((r) => r.id);
            }
            else if (key === "completed") {
                const postIdsRows = await PostInterest_1.default.findAll({
                    where: {
                        creator_id: userIdNum,
                        is_shortlist: 1,
                        is_payment_done: 1,
                    },
                    attributes: ["post_id"],
                    raw: true,
                });
                const postIds = postIdsRows.map((r) => r.post_id);
                opportunities = await Post_1.default.findAll({
                    where: {
                        post_status: "3",
                        payment_status: "1",
                        id: {
                            [sequelize_1.Op.in]: postIds,
                            [sequelize_1.Op.notIn]: reportedIds,
                        },
                    },
                    order: [["created_at", "DESC"]],
                });
                const completedReportedIds = postIds.filter((id) => reportedPostIds.includes(id));
                const reportedList = await Post_1.default.findAll({
                    where: {
                        post_status: "3",
                        payment_status: "1",
                        id: {
                            [sequelize_1.Op.in]: completedReportedIds,
                        },
                    },
                    order: [["created_at", "DESC"]],
                    attributes: ["id"],
                    raw: true,
                });
                reportedOpportunitiesIds = reportedList.map((r) => r.id);
            }
            else {
                // unknown search_key
                return res.status(400).json({
                    status: false,
                    message: "Invalid search_key. Allowed values: all, applied, ongoing, completed",
                });
            }
            if (!opportunities || opportunities.length === 0) {
                return res.status(200).json({
                    status: true,
                    message: "No opportunities found",
                    data: [],
                });
            }
            // Add flag property like Laravel
            const data = opportunities.map((opp) => {
                const json = opp.toJSON ? opp.toJSON() : opp;
                json.flag = reportedOpportunitiesIds.includes(json.id) ? 1 : 0;
                return json;
            });
            return res.status(200).json({
                status: true,
                message: "Successfully found all opportunities",
                data,
            });
        }
        catch (e) {
            console.error("getAllOpportunities error:", e);
            return res.status(500).json({
                status: false,
                message: "An error occurred while fetching opportunities",
            });
        }
    }
}
exports.default = new OpportunityController();
