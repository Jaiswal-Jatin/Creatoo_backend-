// src/controllers/OpportunityController.ts
import { Request, Response } from "express";
import { Op, literal } from "sequelize";
import Post from "../models/Post";
import PostInterest from "../models/PostInterest";
import PostReport from "../models/PostReport";
import User from "../models/User";

class OpportunityController {
    // POST /api/opportunity/getOpportunityDetails
    // Laravel: getOpportunityDetails
    // POST /api/opportunity/getOpportunityDetails
    // Laravel: getOpportunityDetails
    async getOpportunityDetails(req: Request, res: Response) {
        try {
            const { user_id, post_id } = req.body as {
                user_id?: number | string;
                post_id?: number | string;
            };

            const errors: Record<string, string[]> = {};
            if (!user_id) errors.user_id = ["user_id is required"];
            if (!post_id) errors.post_id = ["post_id is required"];

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
            const post = await Post.findByPk(postIdNum);

            if (!post) {
                return res.status(200).json({
                    status: true,
                    message: "Post not found",
                });
            }

            // 🔹 Get business details separately (similar to Laravel with `with('business')`)
            let business = null;
            const postJson = post.toJSON() as any;

            if (postJson.business_id) {
                business = await User.findByPk(postJson.business_id, {
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
            const alreadyApplied = await PostInterest.findOne({
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
        } catch (e: any) {
            console.error("getOpportunityDetails error:", e);
            return res.status(500).json({
                status: false,
                message: "Failed to fetch post details",
            });
        }
    }


    // POST /api/opportunity/getAllOpportunities
    // Laravel: getAllOpportunities
    async getAllOpportunities(req: Request, res: Response) {
        try {
            const { user_id, search_key } = req.body as {
                user_id?: number | string;
                search_key?: string;
            };

            const errors: Record<string, string[]> = {};
            if (!user_id) errors.user_id = ["user_id is required"];
            if (!search_key) errors.search_key = ["search_key is required"];

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
            const reportedPostRows = await PostReport.findAll({
                attributes: ["post_id"],
                raw: true,
            });
            const reportedPostIds = reportedPostRows.map(
                (r: any) => r.post_id as number
            );

            // reportedIds = PostReport::where('user_id', $userId)->pluck('post_id')
            const userReportedRows = await PostReport.findAll({
                where: { user_id: userIdNum },
                attributes: ["post_id"],
                raw: true,
            });
            const reportedIds = userReportedRows.map((r: any) => r.post_id as number);

            let opportunities: any[] = [];
            let reportedOpportunitiesIds: number[] = [];

            // For expiry date: STR_TO_DATE(post_expiry_date, "%d/%m/%Y") >= currentDate
            const currentDate = new Date();
            const y = currentDate.getFullYear();
            const m = (currentDate.getMonth() + 1).toString().padStart(2, "0");
            const d = currentDate.getDate().toString().padStart(2, "0");
            const currentDateStr = `${y}-${m}-${d}`;

            const expiryCondition = literal(
                `STR_TO_DATE(post_expiry_date, '%d/%m/%Y') >= '${currentDateStr}'`
            );

            if (key === "all") {
                // postIdsApplied = PostInterest::where(creator_id)->pluck('post_id')
                const appliedRows = await PostInterest.findAll({
                    where: { creator_id: userIdNum },
                    attributes: ["post_id"],
                    raw: true,
                });
                const postIdsApplied = appliedRows.map(
                    (r: any) => r.post_id as number
                );

                // opportunities
                opportunities = await Post.findAll({
                    where: {
                        post_status: "1",
                        payment_status: "1",
                        id: {
                            [Op.notIn]: [...postIdsApplied, ...reportedIds],
                        },
                        is_reported: {
                            [Op.ne]: "1",
                        },
                        post_expiry_date: {
                            [Op.ne]: null,
                        },
                        [Op.and]: expiryCondition,
                    } as any,
                    order: [["created_at", "DESC"]],
                });

                // reported opportunities set for flag
                const reportedList = await Post.findAll({
                    where: {
                        post_status: "1",
                        payment_status: "1",
                        id: {
                            [Op.notIn]: postIdsApplied,
                            [Op.in]: reportedPostIds,
                        },
                        post_expiry_date: {
                            [Op.ne]: null,
                        },
                        [Op.and]: expiryCondition,
                    } as any,
                    order: [["created_at", "DESC"]],
                    attributes: ["id"],
                    raw: true,
                });
                reportedOpportunitiesIds = reportedList.map(
                    (r: any) => r.id as number
                );
            } else if (key === "applied") {
                const postIdsRows = await PostInterest.findAll({
                    where: { creator_id: userIdNum },
                    attributes: ["post_id"],
                    raw: true,
                });
                const postIds = postIdsRows.map((r: any) => r.post_id as number);

                // main opportunities: applied by user, not reported by user
                opportunities = await Post.findAll({
                    where: {
                        post_status: "1",
                        payment_status: "1",
                        id: {
                            [Op.in]: postIds,
                            [Op.notIn]: reportedIds,
                        },
                    },
                    order: [["created_at", "DESC"]],
                });

                // intersection: ids that are BOTH in postIds AND in reportedPostIds
                const appliedReportedIds = postIds.filter((id) =>
                    reportedPostIds.includes(id)
                );

                const reportedList = await Post.findAll({
                    where: {
                        post_status: "1",
                        payment_status: "1",
                        id: {
                            [Op.in]: appliedReportedIds,
                        },
                    },
                    order: [["created_at", "DESC"]],
                    attributes: ["id"],
                    raw: true,
                });
                reportedOpportunitiesIds = reportedList.map(
                    (r: any) => r.id as number
                );
            } else if (key === "ongoing") {
                const postIdsRows = await PostInterest.findAll({
                    where: {
                        creator_id: userIdNum,
                        is_shortlist: 1,
                        is_payment_done: 0,
                    },
                    attributes: ["post_id"],
                    raw: true,
                });
                const postIds = postIdsRows.map((r: any) => r.post_id as number);

                opportunities = await Post.findAll({
                    where: {
                        post_status: "2",
                        payment_status: "1",
                        id: {
                            [Op.in]: postIds,
                            [Op.notIn]: reportedIds,
                        },
                    },
                    order: [["created_at", "DESC"]],
                });

                const ongoingReportedIds = postIds.filter((id) =>
                    reportedPostIds.includes(id)
                );

                const reportedList = await Post.findAll({
                    where: {
                        post_status: "2",
                        payment_status: "1",
                        id: {
                            [Op.in]: ongoingReportedIds,
                        },
                    },
                    order: [["created_at", "DESC"]],
                    attributes: ["id"],
                    raw: true,
                });
                reportedOpportunitiesIds = reportedList.map(
                    (r: any) => r.id as number
                );
            } else if (key === "completed") {
                const postIdsRows = await PostInterest.findAll({
                    where: {
                        creator_id: userIdNum,
                        is_shortlist: 1,
                        is_payment_done: 1,
                    },
                    attributes: ["post_id"],
                    raw: true,
                });
                const postIds = postIdsRows.map((r: any) => r.post_id as number);

                opportunities = await Post.findAll({
                    where: {
                        post_status: "3",
                        payment_status: "1",
                        id: {
                            [Op.in]: postIds,
                            [Op.notIn]: reportedIds,
                        },
                    },
                    order: [["created_at", "DESC"]],
                });

                const completedReportedIds = postIds.filter((id) =>
                    reportedPostIds.includes(id)
                );

                const reportedList = await Post.findAll({
                    where: {
                        post_status: "3",
                        payment_status: "1",
                        id: {
                            [Op.in]: completedReportedIds,
                        },
                    },
                    order: [["created_at", "DESC"]],
                    attributes: ["id"],
                    raw: true,
                });
                reportedOpportunitiesIds = reportedList.map(
                    (r: any) => r.id as number
                );
            } else {
                // unknown search_key
                return res.status(400).json({
                    status: false,
                    message:
                        "Invalid search_key. Allowed values: all, applied, ongoing, completed",
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
            const data = opportunities.map((opp: any) => {
                const json = opp.toJSON ? opp.toJSON() : opp;
                json.flag = reportedOpportunitiesIds.includes(json.id) ? 1 : 0;
                return json;
            });

            return res.status(200).json({
                status: true,
                message: "Successfully found all opportunities",
                data,
            });
        } catch (e: any) {
            console.error("getAllOpportunities error:", e);
            return res.status(500).json({
                status: false,
                message: "An error occurred while fetching opportunities",
            });
        }
    }
}

export default new OpportunityController();
