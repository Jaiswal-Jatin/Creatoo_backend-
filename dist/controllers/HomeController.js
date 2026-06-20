"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../db/sequelize"));
const User_1 = __importDefault(require("../models/User"));
const Business_1 = __importDefault(require("../models/Business"));
const Banner_1 = __importDefault(require("../models/Banner"));
const Order_1 = __importDefault(require("../models/Order"));
const Post_1 = __importDefault(require("../models/Post"));
const PostInterest_1 = __importDefault(require("../models/PostInterest"));
const PostReport_1 = __importDefault(require("../models/PostReport"));
const TemporaryOrder_1 = __importDefault(require("../models/TemporaryOrder"));
class HomeController {
    // ----------------------------
    // POST /api/getHomeData
    // Laravel: getHomeData
    // ----------------------------
    async getHomeData(req, res) {
        try {
            const { user_id, business_category } = req.body;
            // validation
            const errors = {};
            if (!user_id)
                errors.user_id = ["user_id is required"];
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
            let user = null;
            const authUser = req.user;
            if (authUser && authUser.role_id === 2) {
                // Authenticated as business: userIdNum is the business ID.
                // Let's find the business record first to get the correct mobile number.
                const business = await Business_1.default.findByPk(userIdNum);
                if (business) {
                    const businessMobile = business.business_mobile || business.mobile;
                    if (businessMobile) {
                        user = await User_1.default.findOne({
                            where: {
                                [sequelize_1.Op.or]: [
                                    { mobile: businessMobile },
                                    { business_mobile: businessMobile }
                                ]
                            }
                        });
                    }
                }
            }
            // If not resolved via business login, try direct lookup in users table
            if (!user) {
                user = await User_1.default.findByPk(userIdNum);
            }
            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: "User not found",
                });
            }
            // Banners (max 5)
            const banners = await Banner_1.default.findAll({
                attributes: ["id", "image", "link", "is_active"],
                where: { is_active: 1 },
                limit: 5,
                order: [["id", "DESC"]],
            });
            // Top reviews (only for role_id == 3)
            // Top reviews (only for role_id == 3)
            let topReviews = [];
            if (user.role_id === 3 || user.role_id === 2) {
                topReviews = await this.getTotalCountReview();
            }
            // Top creators
            const topCreator = await User_1.default.findAll({
                attributes: [
                    "id",
                    "name",
                    "email",
                    "mobile",
                    "address",
                    "instagram_link",
                    "instagram_username",
                    "user_image",
                    "is_top",
                    "is_active",
                ],
                where: {
                    is_top: 1,
                    role_id: 3,
                },
                order: [["created_at", "DESC"]],
                limit: 5,
            });
            // Top business - dynamic based on popularity (orders, visits, reviews)
            let topBusiness = [];
            try {
                const popularityQuery = `
          SELECT b.id,
            (COALESCE(o.order_count, 0) * 2 + COALESCE(v.visit_count, 0) * 1 + COALESCE(r.review_count, 0) * 3) as popularity_score
          FROM businesses b
          LEFT JOIN (
            SELECT business_id, COUNT(*) as order_count
            FROM orders
            GROUP BY business_id
          ) o ON b.id = o.business_id
          LEFT JOIN (
            SELECT business_id, COUNT(DISTINCT user_id) as visit_count
            FROM visits
            GROUP BY business_id
          ) v ON b.id = v.business_id
          LEFT JOIN (
            SELECT business_id, COUNT(*) as review_count
            FROM reviews
            GROUP BY business_id
          ) r ON b.id = r.business_id
          WHERE b.role_id = 2 AND (b.is_active = 1 OR b.is_active = true)
          ${business_category && ['restaurant', 'salon', 'turf'].includes(business_category.toLowerCase())
                    ? "AND b.business_category = :business_category"
                    : ""}
          ORDER BY popularity_score DESC
          LIMIT 10
        `;
                const replacements = {};
                if (business_category && ['restaurant', 'salon', 'turf'].includes(business_category.toLowerCase())) {
                    replacements.business_category = business_category.toLowerCase();
                }
                const popularBusinessRows = await sequelize_2.default.query(popularityQuery, {
                    replacements,
                    type: sequelize_1.QueryTypes.SELECT,
                });
                console.log(`[getHomeData] Popular business query returned ${popularBusinessRows.length} rows`);
                if (popularBusinessRows.length > 0) {
                    const ids = popularBusinessRows.map((row) => row.id);
                    const topBusinessRaw = await Business_1.default.findAll({
                        attributes: [
                            "id",
                            "business_fullname",
                            "business_name",
                            "business_email",
                            "business_mobile",
                            "business_site_url",
                            "business_image",
                            "is_top",
                            "is_active",
                            "business_address",
                            "business_area",
                            "set_first_time_discount",
                            "set_regular_discount",
                            "business_category",
                            "category_attributes",
                        ],
                        where: { id: { [sequelize_1.Op.in]: ids } },
                    });
                    // Maintain order from popularity query
                    const idOrder = ids.reduce((acc, id, index) => {
                        acc[id] = index;
                        return acc;
                    }, {});
                    topBusinessRaw.sort((a, b) => (idOrder[a.id] ?? 0) - (idOrder[b.id] ?? 0));
                    topBusiness = await Promise.all(topBusinessRaw.map(async (business) => {
                        const hasVisitedBefore = await this.hasUserVisitedBusinessBefore(user.id, business.id);
                        return await this.applyAppropriateDiscount(business, hasVisitedBefore);
                    }));
                }
            }
            catch (popularityError) {
                console.error("[getHomeData] Popularity query failed, using fallback:", popularityError);
            }
            // Fallback: if popularity query returned nothing, get active businesses directly
            if (topBusiness.length === 0) {
                console.log("[getHomeData] Using fallback - fetching recent active businesses");
                const fallbackWhere = {
                    role_id: 2,
                    is_active: true,
                };
                if (business_category && ['restaurant', 'salon', 'turf'].includes(business_category.toLowerCase())) {
                    fallbackWhere.business_category = business_category.toLowerCase();
                }
                const fallbackBusinesses = await Business_1.default.findAll({
                    attributes: [
                        "id",
                        "business_fullname",
                        "business_name",
                        "business_email",
                        "business_mobile",
                        "business_site_url",
                        "business_image",
                        "is_top",
                        "is_active",
                        "business_address",
                        "business_area",
                        "set_first_time_discount",
                        "set_regular_discount",
                        "business_category",
                        "category_attributes",
                    ],
                    where: fallbackWhere,
                    order: [["created_at", "DESC"]],
                    limit: 10,
                });
                topBusiness = await Promise.all(fallbackBusinesses.map(async (business) => {
                    const hasVisitedBefore = await this.hasUserVisitedBusinessBefore(user.id, business.id);
                    return await this.applyAppropriateDiscount(business, hasVisitedBefore);
                }));
            }
            console.log(`[getHomeData] Returning ${topBusiness.length} top businesses`);
            // New creators – you ended up sending [] in Laravel, so we mirror that
            const newCreator = [];
            // New business (excluding current user)
            const newBusinessWhere = {
                role_id: 2,
                id: { [sequelize_1.Op.ne]: userIdNum },
            };
            // Apply category filter if provided
            if (business_category && ['restaurant', 'salon', 'turf'].includes(business_category.toLowerCase())) {
                newBusinessWhere.business_category = business_category.toLowerCase();
            }
            const newBusinessRaw = await Business_1.default.findAll({
                attributes: [
                    "id",
                    "business_fullname",
                    "business_name",
                    "business_email",
                    "business_mobile",
                    "business_site_url",
                    "business_image",
                    "is_active",
                    "business_area",
                    "set_first_time_discount",
                    "set_regular_discount",
                    "business_category",
                    "category_attributes",
                ],
                where: newBusinessWhere,
                order: [["created_at", "DESC"]],
                limit: 5,
            });
            // Apply appropriate discount logic for new businesses
            const newBusiness = await Promise.all(newBusinessRaw.map(async (business) => {
                const hasVisitedBefore = await this.hasUserVisitedBusinessBefore(user.id, business.id);
                return await this.applyAppropriateDiscount(business, hasVisitedBefore);
            }));
            // last_order_id from users
            const lastOrderId = user.last_order_id ?? null;
            let paymentStatusData = null;
            if (lastOrderId) {
                // Laravel: Post::where('order_id', $lastOrder)->where('transaction_d', null)->where('payment_status', '0')->where('user_id', $user_id)
                const post = await Post_1.default.findOne({
                    where: {
                        order_id: String(lastOrderId),
                        transaction_d: null,
                        payment_status: "0",
                        user_id: user.id,
                    },
                });
                if (post) {
                    // fetch payment status (stubbed)
                    paymentStatusData = await this.fetchPaymentStatus(user.id);
                    const status = paymentStatusData?.data?.items?.[0]?.status;
                    if (status === "failed") {
                        post.payment_status_response = JSON.stringify(paymentStatusData.data);
                        post.payment_status = "2";
                        await post.save();
                        await User_1.default.update({ last_order_id: null }, { where: { id: user.id } });
                    }
                    else if (status === "captured") {
                        const upiTransactionId = paymentStatusData?.data?.items?.[0]?.acquirer_data
                            ?.upi_transaction_id;
                        await this.updateStatus(user.id, post.id, JSON.stringify(paymentStatusData.data), status);
                        await User_1.default.update({ last_order_id: null }, { where: { id: user.id } });
                    }
                }
            }
            // Attach average ratings from reviews to all businesses
            const allBusinessesForRating = [...topBusiness, ...newBusiness].filter(b => b && b.id);
            if (allBusinessesForRating.length > 0) {
                const ratingRows = await sequelize_2.default.query(`
          SELECT business_id, ROUND(AVG(experience), 1) as average_rating
          FROM reviews
          WHERE business_id IN (:ids)
          GROUP BY business_id
        `, {
                    replacements: { ids: allBusinessesForRating.map(b => b.id) },
                    type: sequelize_1.QueryTypes.SELECT,
                });
                const ratingMap = new Map(ratingRows.map(r => [r.business_id, Number(r.average_rating)]));
                for (const b of allBusinessesForRating) {
                    b.average_rating = ratingMap.get(b.id) ?? 0;
                }
            }
            // Role specific data
            let roleSpecificData = null;
            if (user.role_id === 2) {
                // BUSINESS SIDE
                // QR code placeholder path – in Laravel you generated and stored it
                const qrCodePath = `qr_image/${user.id}_qr_code.png`;
                // (If you want real QR, generate and save file in a service.)
                // Today's settlement_amount sum
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                const todayWalletPoints = await Order_1.default.sum("settlement_amount", {
                    where: {
                        business_id: userIdNum,
                        created_at: {
                            [sequelize_1.Op.gte]: startOfDay,
                            [sequelize_1.Op.lte]: endOfDay,
                        },
                    },
                });
                // You were using Orders to derive "total_balance" from expiry_date + remaining_points.
                // We'll mirror that, treating the model rows as any for remaining_points.
                const orders = (await Order_1.default.findAll({
                    where: { business_id: userIdNum },
                    order: [["created_at", "DESC"]],
                }));
                const nowDate = new Date();
                const total_balance = orders.reduce((sum, o) => {
                    const expiry = o.expiry_date ? new Date(o.expiry_date) : null;
                    if (expiry && expiry >= nowDate) {
                        const remainingPoints = Number(o.remaining_points ?? 0);
                        return sum + remainingPoints;
                    }
                    return sum;
                }, 0);
                // Profile completion logic
                let profileCompletion = 0;
                if (user.business_name &&
                    user.business_mobile &&
                    user.business_address &&
                    user.business_area) {
                    profileCompletion = 1;
                }
                if (profileCompletion >= 1 &&
                    user.time_from &&
                    user.time_to &&
                    user.pricing_range_text &&
                    (user.business_image_1 ||
                        user.business_image_2 ||
                        user.business_image_3)) {
                    profileCompletion = 2;
                }
                if (profileCompletion >= 2 &&
                    user.set_first_time_discount != null &&
                    user.set_regular_discount != null &&
                    user.min_order != null &&
                    user.set_expiry != null) {
                    profileCompletion = 3;
                }
                roleSpecificData = {
                    qr_code: qrCodePath,
                    today_wallet_points: Number(todayWalletPoints || 0),
                    user_creatoo_points: Number(total_balance || 0),
                    profile_completion_status: profileCompletion,
                };
            }
            else if (user.role_id === 3) {
                // CREATOR SIDE – Creatoo points directly from users table
                roleSpecificData = {
                    user_creatoo_points: Number(user.user_creatoo_points || 0),
                };
            }
            // pending review flag via orders + users
            const pendingReviewRows = (await sequelize_2.default.query(`
        SELECT 
          COALESCE(businesses.business_name, users.business_name) AS business_name,
          orders.business_id,
          orders.order_id
        FROM orders
        LEFT JOIN businesses ON orders.business_id = businesses.id
        LEFT JOIN users ON orders.business_id = users.id
        WHERE orders.user_id = :userId
          AND orders.review_status = 'pending'
        LIMIT 1
      `, {
                replacements: { userId: user.id },
                type: sequelize_1.QueryTypes.SELECT,
            }));
            const is_pending_review_flag = pendingReviewRows.length > 0 ? pendingReviewRows[0] : null;
            // latest TemporaryOrder for earned_point
            const latestOrder = await TemporaryOrder_1.default.findOne({
                where: { user_id: user.id },
                order: [["id", "DESC"]],
            });
            const earned_point = latestOrder
                ? Number(latestOrder.loyalty_points_will_earn || 0)
                : 0;
            // if there's a temp order in "processing" but real order not yet created,
            // send its order_id
            let order_id = null;
            const tempOrder = await TemporaryOrder_1.default.findOne({
                where: { user_id: user.id, status: "processing" },
                order: [["created_at", "DESC"]],
            });
            if (tempOrder) {
                const tempOrderId = tempOrder.order_id;
                const existingOrder = await Order_1.default.findOne({
                    where: { order_id: tempOrderId },
                });
                if (!existingOrder) {
                    order_id = tempOrderId;
                }
            }
            // Category summary: count of businesses per category
            const categoryCounts = await User_1.default.findAll({
                attributes: [
                    'business_category',
                    [(0, sequelize_1.literal)('COUNT(*)'), 'count'],
                ],
                where: { role_id: 2, is_active: true },
                group: ['business_category'],
                raw: true,
            });
            const categories_summary = {
                restaurant: 0,
                salon: 0,
                turf: 0,
            };
            categoryCounts.forEach((row) => {
                const cat = row.business_category;
                if (cat && cat in categories_summary) {
                    categories_summary[cat] = Number(row.count) || 0;
                }
            });
            const data = {
                banners,
                top_reviews: topReviews,
                topCreator,
                topBusiness,
                newCreator,
                newBusiness,
                paymentStatus: paymentStatusData?.data ?? null,
                role_specific_data: roleSpecificData,
                is_pending_review_flag,
                earned_point,
                order_id,
                categories_summary,
                applied_category_filter: business_category || null,
            };
            return res.status(200).json({
                status: true,
                message: "Data found successfully.",
                data,
            });
        }
        catch (e) {
            console.error("getHomeData error:", e);
            return res.status(500).json({
                status: false,
                message: "Failed to process getHomeData",
            });
        }
    }
    // ----------------------------
    // POST /api/getCreatorHome
    // Laravel: getCreatorHome
    // ----------------------------
    async getCreatorHome(req, res) {
        try {
            const { user_id } = req.body;
            const errors = {};
            if (!user_id)
                errors.user_id = ["user_id is required"];
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
            // reported post IDs for this user
            const userReportedRows = await PostReport_1.default.findAll({
                where: { user_id: userIdNum },
                attributes: ["post_id"],
                raw: true,
            });
            const reportedIds = userReportedRows.map((r) => r.post_id);
            // postIdsApplied
            let postIdsAppliedRows = await PostInterest_1.default.findAll({
                where: { creator_id: userIdNum },
                attributes: ["post_id"],
                raw: true,
            });
            let postIdsApplied = postIdsAppliedRows.map((r) => r.post_id);
            const currentDate = new Date();
            const y = currentDate.getFullYear();
            const m = (currentDate.getMonth() + 1).toString().padStart(2, "0");
            const d = currentDate.getDate().toString().padStart(2, "0");
            const currentDateStr = `${y}-${m}-${d}`;
            const expiryCondition = (0, sequelize_1.literal)(`STR_TO_DATE(post_expiry_date, '%d/%m/%Y') >= '${currentDateStr}'`);
            // opportunities = open posts not applied & not reported
            const opportunitiesList = await Post_1.default.findAll({
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
            });
            const opportunitiesCount = opportunitiesList.length;
            // recompute applied IDs
            postIdsAppliedRows = await PostInterest_1.default.findAll({
                where: { creator_id: userIdNum },
                attributes: ["post_id"],
                raw: true,
            });
            postIdsApplied = postIdsAppliedRows.map((r) => r.post_id);
            // postsWithStatus1 (applied & status=1)
            const postsWithStatus1Rows = await Post_1.default.findAll({
                where: {
                    id: { [sequelize_1.Op.in]: postIdsApplied, [sequelize_1.Op.notIn]: reportedIds },
                    post_status: "1",
                    payment_status: "1",
                    is_reported: { [sequelize_1.Op.ne]: "1" },
                },
                attributes: ["id"],
                raw: true,
            });
            const postsWithStatus1Ids = postsWithStatus1Rows.map((r) => r.id);
            const appliedCount = postsWithStatus1Ids.length;
            // onGoingDeals: post_status = 2
            const postIdsForOnRows = await PostInterest_1.default.findAll({
                where: { creator_id: userIdNum },
                attributes: ["post_id"],
                raw: true,
            });
            const postIdsForOn = postIdsForOnRows.map((r) => r.post_id);
            const onGoingIdsRows = await Post_1.default.findAll({
                where: {
                    id: { [sequelize_1.Op.in]: postIdsForOn, [sequelize_1.Op.notIn]: reportedIds },
                    post_status: "2",
                    payment_status: "1",
                    is_reported: { [sequelize_1.Op.ne]: "1" },
                },
                attributes: ["id"],
                raw: true,
            });
            const onGoingDeals = onGoingIdsRows.length;
            // successfulDeals: shortlisted + paid + post_status 3
            const postIdsDealRows = await PostInterest_1.default.findAll({
                where: {
                    creator_id: userIdNum,
                    is_payment_done: 1,
                    is_shortlist: 1,
                },
                attributes: ["post_id"],
                raw: true,
            });
            const postIdsDeal = postIdsDealRows.map((r) => r.post_id);
            const successfulDealsRows = await Post_1.default.findAll({
                where: {
                    id: { [sequelize_1.Op.in]: postIdsDeal, [sequelize_1.Op.notIn]: reportedIds },
                    post_status: "3",
                    payment_status: "1",
                },
                attributes: ["id"],
                raw: true,
            });
            const successfulDeals = successfulDealsRows.length;
            const data = {
                opportunities: opportunitiesCount,
                applied: appliedCount,
                onGoingDeals,
                successfulDeals,
            };
            return res.status(200).json({
                status: true,
                message: "Request processed successfully",
                data,
            });
        }
        catch (e) {
            console.error("getCreatorHome error:", e);
            return res.status(500).json({
                status: false,
                message: "Failed to process the request",
            });
        }
    }
    // ----------------------------
    // POST /api/getCreatorContact
    // Laravel: getCreatorContact
    // ----------------------------
    async getCreatorContact(req, res) {
        try {
            const { post_id } = req.body;
            const errors = {};
            if (!post_id)
                errors.post_id = ["post_id is required"];
            const postIdNum = Number(post_id);
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
            const creatorRows = await PostInterest_1.default.findAll({
                where: { post_id: postIdNum },
                attributes: ["creator_id"],
                raw: true,
            });
            const creatorIds = creatorRows.map((r) => r.creator_id);
            if (creatorIds.length === 0) {
                return res.status(200).json({
                    status: true,
                    message: "Data found Successfully",
                    data: [],
                });
            }
            const contactDetails = await User_1.default.findAll({
                attributes: [
                    "name",
                    "mobile",
                    "email",
                    "instagram_username",
                    "address",
                ],
                where: {
                    id: { [sequelize_1.Op.in]: creatorIds },
                },
            });
            return res.status(200).json({
                status: true,
                message: "Data found Successfully",
                data: contactDetails,
            });
        }
        catch (e) {
            console.error("getCreatorContact error:", e);
            return res.status(500).json({
                status: false,
                message: "Failed to fetch creator contact",
            });
        }
    }
    // ---------------------------------------------------
    // 🔹 Helpers
    // ---------------------------------------------------
    /**
     * Check if user has previous completed orders with a business
     * @param userId - Current user ID
     * @param businessId - Business ID to check
     * @returns true if user has previous paid orders, false otherwise
     */
    async hasUserVisitedBusinessBefore(userId, businessId) {
        const previousOrder = await Order_1.default.findOne({
            where: {
                user_id: userId,
                business_id: businessId,
                status: 'success', // successful payment indicates user has visited before
            },
        });
        return previousOrder !== null;
    }
    /**
     * Apply appropriate discount based on user's visit history
     * @param business - Business object with discount fields
     * @param hasVisitedBefore - Whether user has visited before
     * @returns Business object with appropriate discount applied
     */
    async applyAppropriateDiscount(business, hasVisitedBefore) {
        const businessData = business.toJSON ? business.toJSON() : { ...business };
        if (hasVisitedBefore) {
            // User has visited before - show regular discount
            businessData.applicable_discount = businessData.set_regular_discount;
            businessData.discount_type = 'regular';
        }
        else {
            // First time visitor - show first time discount
            businessData.applicable_discount = businessData.set_first_time_discount;
            businessData.discount_type = 'first_time';
        }
        // Fallback logic for category_attributes in lists/feeds
        const hasNoCategoryAttrs = !businessData.category_attributes ||
            businessData.category_attributes === 'null' ||
            businessData.category_attributes === '""' ||
            businessData.category_attributes === '' ||
            (typeof businessData.category_attributes === 'object' && Object.keys(businessData.category_attributes).length === 0) ||
            (typeof businessData.category_attributes === 'string' && (businessData.category_attributes.trim() === '{}' || businessData.category_attributes.trim() === 'null'));
        if (businessData.role_id === 2 && (hasNoCategoryAttrs || !businessData.business_category)) {
            const businessMobile = businessData.business_mobile || businessData.mobile;
            if (businessMobile) {
                try {
                    const userFallback = await User_1.default.findOne({
                        where: {
                            [sequelize_1.Op.or]: [
                                { mobile: businessMobile },
                                { business_mobile: businessMobile }
                            ]
                        },
                        attributes: ["business_category", "category_attributes"],
                    });
                    if (userFallback) {
                        const fb = userFallback.toJSON();
                        if (fb.category_attributes && typeof fb.category_attributes === 'string') {
                            try {
                                fb.category_attributes = JSON.parse(fb.category_attributes);
                            }
                            catch (_) { }
                        }
                        if (!businessData.category_attributes || hasNoCategoryAttrs)
                            businessData.category_attributes = fb.category_attributes;
                        if (!businessData.business_category)
                            businessData.business_category = fb.business_category;
                    }
                }
                catch (_) { }
            }
        }
        // Explicitly parse category_attributes if it is a JSON string
        if (businessData.category_attributes && typeof businessData.category_attributes === 'string') {
            try {
                businessData.category_attributes = JSON.parse(businessData.category_attributes);
            }
            catch (_) { }
        }
        return businessData;
    }
    async getTotalCountReview() {
        const topUsers = (await sequelize_2.default.query(`
      SELECT 
        users.id,
        users.name,
        users.user_image,
        COUNT(reviews.id) AS total_reviews
      FROM reviews
      JOIN users ON reviews.user_id = users.id
      GROUP BY users.id, users.name, users.user_image
      ORDER BY total_reviews DESC
      LIMIT 10
    `, {
            type: sequelize_1.QueryTypes.SELECT,
        }));
        return topUsers;
    }
    async fetchPaymentStatus(userId) {
        // TODO: integrate with payment gateway API (Razorpay etc.)
        // Should return shape similar to:
        // { data: { items: [ { status: 'failed' | 'captured', acquirer_data: { upi_transaction_id } } ] } }
        return null;
    }
    async updateStatus(userId, postId, paymentResponseJson, status) {
        // TODO: implement your Laravel updateStatus logic here
        return;
    }
}
exports.default = new HomeController();
