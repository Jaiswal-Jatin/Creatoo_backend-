"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const sequelize_1 = require("sequelize");
const User_1 = __importDefault(require("../models/User"));
const Business_1 = __importDefault(require("../models/Business"));
const BusinessAssociate_1 = __importDefault(require("../models/BusinessAssociate"));
const Order_1 = __importDefault(require("../models/Order"));
const user_service_1 = require("../services/user.service");
const sequelize_2 = __importDefault(require("../db/sequelize"));
class UserController {
    // GET single user (used by mobile, similar to User(Request $request))
    async getUser(req, res) {
        const { receiver } = req.body;
        const user = await User_1.default.findByPk(receiver);
        return res.json({
            status: true,
            message: "User details",
            result: { user },
        });
    }
    // GET /business/all and /creator/all
    async getAllUsers(req, res, role) {
        try {
            const { from_date, to_date } = req.query;
            const record = await user_service_1.userService.fetchRecord(role, from_date, to_date);
            return res.json({
                status: true,
                message: "Users list",
                role,
                data: record,
            });
        }
        catch (e) {
            console.error(e);
            return res.status(500).json({
                status: false,
                message: "Something went wrong",
            });
        }
    }
    // 🔍 POST /api/users/search  (Laravel: searchUser)
    async searchUser(req, res) {
        try {
            const { role_id, per_page, business_category } = req.body;
            // Basic validation (like Laravel $request->validate)
            if (role_id === undefined ||
                role_id === null ||
                isNaN(Number(role_id))) {
                return res.status(400).json({
                    status: false,
                    message: "role_id is required and must be numeric",
                });
            }
            const roleIdNum = Number(role_id);
            const perPage = per_page ? Number(per_page) : 10;
            const page = req.body.page ? Number(req.body.page) : 1;
            if (perPage < 1) {
                return res.status(400).json({
                    status: false,
                    message: "per_page must be at least 1",
                });
            }
            let attributes = [];
            if (roleIdNum === 2) {
                // BUSINESS
                attributes = [
                    "id",
                    "business_fullname",
                    "business_name",
                    "business_email",
                    "business_mobile",
                    "business_area",
                    "business_site_url",
                    "business_image",
                    "is_active",
                    "role_id",
                    "pricing_range_text",
                    "set_first_time_discount",
                    "set_regular_discount",
                    "business_category",
                    "category_attributes",
                ];
            }
            else if (roleIdNum === 3) {
                // CREATOR
                attributes = [
                    "id",
                    "name",
                    "email",
                    "mobile",
                    "instagram_link",
                    "instagram_username",
                    "user_image",
                    "bio",
                    "is_insta_verified",
                    "is_active",
                    "role_id",
                ];
            }
            else {
                // same as Laravel: no users for other roles
                return res.status(200).json({
                    status: true,
                    message: "No users found with this role ID",
                    data: [],
                });
            }
            const offset = (page - 1) * perPage;
            const where = { role_id: roleIdNum };
            if (roleIdNum === 2 && business_category && ['restaurant', 'salon', 'turf'].includes(business_category.toLowerCase())) {
                where.business_category = business_category.toLowerCase();
            }
            const targetModel = roleIdNum === 2 ? Business_1.default : User_1.default;
            const { rows, count } = await targetModel.findAndCountAll({
                where,
                attributes,
                limit: perPage,
                offset,
                order: [["id", "DESC"]],
            });
            if (count === 0) {
                return res.status(200).json({
                    status: true,
                    message: "No users found with this role ID",
                    data: [],
                });
            }
            // Add avg_experience from reviews table (like Laravel DB::table('reviews')...)
            // Apply appropriate discount logic for businesses (role_id = 2)
            const usersWithRatingsAndDiscounts = await Promise.all(rows.map(async (user) => {
                const [ratingResult] = await sequelize_2.default.query(`
            SELECT ROUND(AVG(experience), 1) as avg_experience
            FROM reviews
            WHERE business_id = :businessId
          `, {
                    replacements: { businessId: user.id },
                    type: sequelize_1.QueryTypes.SELECT,
                });
                const avg_experience = ratingResult && ratingResult.avg_experience !== null
                    ? Number(ratingResult.avg_experience)
                    : null;
                let userData = {
                    ...user.toJSON(),
                    avg_experience,
                };
                // Apply discount logic only for businesses (role_id = 2)
                if (roleIdNum === 2) {
                    // Check if user has visited this business before
                    const userId = req.body.user_id ? Number(req.body.user_id) : null;
                    console.log(`Checking discount for business ${user.id}, user ${userId}`);
                    const hasVisitedBefore = await this.hasUserVisitedBusinessBefore(userId, user.id);
                    console.log(`Has visited before: ${hasVisitedBefore}`);
                    userData = await this.applyAppropriateDiscount(userData, hasVisitedBefore);
                    console.log(`Applied discount: ${userData.applicable_discount}, type: ${userData.discount_type}`);
                }
                return userData;
            }));
            const lastPage = Math.ceil(count / perPage);
            return res.status(200).json({
                status: true,
                message: "Search results retrieved successfully",
                data: usersWithRatingsAndDiscounts,
                pagination: {
                    current_page: page,
                    last_page: lastPage,
                    per_page: perPage,
                    total: count,
                },
            });
        }
        catch (e) {
            console.error("searchUser error:", e);
            return res.status(500).json({
                status: false,
                message: "Something went wrong",
            });
        }
    }
    // 🔍 POST /api/users/searchBusinessAndCreator (Laravel: searchBusinessAndCreator)
    async searchBusinessAndCreator(req, res) {
        try {
            const { key, role_id, page, business_category } = req.body;
            const searchKey = key?.trim();
            const roleIdRaw = role_id;
            const currentPage = page ? Number(page) : 1;
            const perPage = 10;
            if (!searchKey || !roleIdRaw) {
                return res.status(400).json({
                    status: false,
                    message: "Search key and role ID are required",
                });
            }
            const roleId = Number(roleIdRaw);
            if (Number.isNaN(roleId)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid role ID",
                });
            }
            let attributes = [];
            let where = {
                role_id: roleId,
            };
            if (roleId === 2) {
                // BUSINESS
                attributes = [
                    "id",
                    "business_fullname",
                    "business_name",
                    "business_email",
                    "business_mobile",
                    "business_area",
                    "business_site_url",
                    "business_image",
                    "is_active",
                    "role_id",
                    "pricing_range_text",
                    "set_first_time_discount",
                    "set_regular_discount",
                    "business_category",
                    "category_attributes",
                ];
                where = {
                    ...where,
                    [sequelize_1.Op.or]: [
                        { name: { [sequelize_1.Op.like]: `%${searchKey}%` } },
                        { business_name: { [sequelize_1.Op.like]: `%${searchKey}%` } },
                        { business_fullname: { [sequelize_1.Op.like]: `%${searchKey}%` } },
                    ],
                };
                // Apply category filter if provided
                if (business_category && ['restaurant', 'salon', 'turf'].includes(business_category.toLowerCase())) {
                    where.business_category = business_category.toLowerCase();
                }
            }
            else if (roleId === 3) {
                // CREATOR
                attributes = [
                    "id",
                    "name",
                    "email",
                    "mobile",
                    "instagram_link",
                    "instagram_username",
                    "user_image",
                    "bio",
                    "is_active",
                    "role_id",
                ];
                where = {
                    ...where,
                    [sequelize_1.Op.or]: [
                        { name: { [sequelize_1.Op.like]: `%${searchKey}%` } },
                        { instagram_username: { [sequelize_1.Op.like]: `%${searchKey}%` } },
                    ],
                };
            }
            else {
                return res.status(400).json({
                    status: false,
                    message: "Invalid role ID",
                });
            }
            const offset = (currentPage - 1) * perPage;
            const targetModel = roleId === 2 ? Business_1.default : User_1.default;
            const { rows, count } = await targetModel.findAndCountAll({
                where,
                attributes,
                limit: perPage,
                offset,
                order: [["id", "DESC"]],
            });
            if (count === 0) {
                return res.status(200).json({
                    status: true,
                    message: "No results found for the provided search key",
                    data: [],
                });
            }
            // Global average experience (like your Laravel code)
            const [ratingRow] = await sequelize_2.default.query(`SELECT ROUND(AVG(experience), 1) as avg_experience FROM reviews`, { type: sequelize_1.QueryTypes.SELECT });
            const avgExperience = ratingRow && ratingRow.avg_experience !== null
                ? Number(ratingRow.avg_experience)
                : null;
            // Attach avg_experience to each result and apply robust fallback/parsing
            const updatedResults = await Promise.all(rows.map(async (user) => {
                const plain = user.toJSON();
                plain.avg_experience = avgExperience;
                // Fallback for search results
                const hasNoCategoryAttrs = !plain.category_attributes ||
                    plain.category_attributes === 'null' ||
                    plain.category_attributes === '""' ||
                    plain.category_attributes === '' ||
                    (typeof plain.category_attributes === 'object' && Object.keys(plain.category_attributes).length === 0) ||
                    (typeof plain.category_attributes === 'string' && (plain.category_attributes.trim() === '{}' || plain.category_attributes.trim() === 'null'));
                if (plain.role_id === 2 && (hasNoCategoryAttrs || !plain.business_category)) {
                    const businessMobile = plain.business_mobile || plain.mobile;
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
                                if (!plain.category_attributes || hasNoCategoryAttrs)
                                    plain.category_attributes = fb.category_attributes;
                                if (!plain.business_category)
                                    plain.business_category = fb.business_category;
                            }
                        }
                        catch (_) { }
                    }
                }
                if (plain.category_attributes && typeof plain.category_attributes === 'string') {
                    try {
                        plain.category_attributes = JSON.parse(plain.category_attributes);
                    }
                    catch (_) { }
                }
                return plain;
            }));
            const lastPage = Math.ceil(count / perPage);
            return res.status(200).json({
                status: true,
                message: "Search results retrieved successfully",
                data: updatedResults,
                pagination: {
                    current_page: currentPage,
                    last_page: lastPage,
                    per_page: perPage,
                    total: count,
                },
            });
        }
        catch (e) {
            console.error("searchBusinessAndCreator error:", e);
            return res.status(500).json({
                status: false,
                message: "Something went wrong",
            });
        }
    }
    // POST /api/auth/viewProfile   (Laravel: viewProfile)
    async viewProfile(req, res) {
        try {
            const { role_id, id, callInstaApi } = req.body;
            // validation
            if (role_id === undefined ||
                role_id === null ||
                isNaN(Number(role_id)) ||
                id === undefined ||
                id === null) {
                return res.status(400).json({
                    status: false,
                    message: "role_id and id are required",
                    data: [],
                });
            }
            const roleId = Number(role_id);
            const userId = Number(id);
            const flag = callInstaApi ? Number(callInstaApi) : 0;
            let attributes = [];
            let userRecord = null;
            if (roleId === 2) {
                // BUSINESS PROFILE
                attributes = [
                    "id",
                    "business_fullname",
                    "business_name",
                    "business_email",
                    "business_mobile",
                    "business_address",
                    "business_area",
                    "business_site_url",
                    "business_image",
                    "gst_number",
                    "business_category",
                    "category_attributes",
                    "business_designation",
                    "upi_id",
                    "is_active",
                    "role_id",
                    "time_from",
                    "time_to",
                    "pricing_range_text",
                    "menu_card_1",
                    "menu_card_2",
                    "menu_card_3",
                    "menu_card_4",
                    "menu_card_5",
                    "business_image_1",
                    "business_image_2",
                    "business_image_3",
                    "business_image_4",
                    "business_image_5",
                    "set_first_time_discount",
                    "set_regular_discount",
                    "min_order",
                    "set_expiry",
                ];
                userRecord = await Business_1.default.findOne({
                    where: { role_id: roleId, id: userId },
                    attributes,
                });
            }
            else if (roleId === 3) {
                // CREATOR PROFILE
                attributes = [
                    "id",
                    "name",
                    "email",
                    "mobile",
                    "address",
                    "instagram_link",
                    "instagram_username",
                    "user_image",
                    "is_active",
                    "role_id",
                    "instagram_fullname",
                    "follower_count",
                    "following_count",
                    "media_count",
                    "bio",
                    "engagement_rate",
                    "avg_likes",
                    "avg_comments",
                    "avg_activity",
                    "is_insta_verified",
                    "verification_note",
                    "updatedAt",
                ];
                userRecord = await User_1.default.findOne({
                    where: { role_id: roleId, id: userId },
                    attributes,
                });
            }
            else {
                return res.status(400).json({
                    status: false,
                    message: "Invalid role ID",
                    data: [],
                });
            }
            if (!userRecord) {
                return res.status(200).json({
                    status: true,
                    message: "No users found with this role ID",
                    data: [],
                });
            }
            let user = userRecord.toJSON();
            // Fallback: if Business table has null/empty category_attributes, try User table by mobile
            const hasNoCategoryAttrs = !user.category_attributes ||
                user.category_attributes === 'null' ||
                user.category_attributes === '""' ||
                user.category_attributes === '' ||
                (typeof user.category_attributes === 'object' && Object.keys(user.category_attributes).length === 0) ||
                (typeof user.category_attributes === 'string' && (user.category_attributes.trim() === '{}' || user.category_attributes.trim() === 'null'));
            if (roleId === 2 && (hasNoCategoryAttrs || !user.business_category)) {
                const businessMobile = user.business_mobile || user.mobile;
                if (businessMobile) {
                    try {
                        const userFallback = await User_1.default.findOne({
                            where: {
                                [sequelize_1.Op.or]: [
                                    { mobile: businessMobile },
                                    { business_mobile: businessMobile }
                                ]
                            },
                            attributes: ["business_category", "category_attributes", "menu_card_1", "menu_card_2", "menu_card_3", "menu_card_4", "menu_card_5"],
                        });
                        if (userFallback) {
                            const fb = userFallback.toJSON();
                            if (fb.category_attributes && typeof fb.category_attributes === 'string') {
                                try {
                                    fb.category_attributes = JSON.parse(fb.category_attributes);
                                }
                                catch (_) { }
                            }
                            if (!user.category_attributes || hasNoCategoryAttrs)
                                user.category_attributes = fb.category_attributes;
                            if (!user.business_category)
                                user.business_category = fb.business_category;
                            if (user.menu_card_1 == null)
                                user.menu_card_1 = fb.menu_card_1;
                            if (user.menu_card_2 == null)
                                user.menu_card_2 = fb.menu_card_2;
                            if (user.menu_card_3 == null)
                                user.menu_card_3 = fb.menu_card_3;
                            if (user.menu_card_4 == null)
                                user.menu_card_4 = fb.menu_card_4;
                            if (user.menu_card_5 == null)
                                user.menu_card_5 = fb.menu_card_5;
                        }
                    }
                    catch (_) { }
                }
            }
            // Explicitly parse category_attributes if it is a JSON string
            if (user.category_attributes && typeof user.category_attributes === 'string') {
                try {
                    user.category_attributes = JSON.parse(user.category_attributes);
                }
                catch (_) { }
            }
            // Extra data for BUSINESS (role_id = 2)
            if (roleId === 2) {
                const [countRow] = await sequelize_2.default.query(`
          SELECT COUNT(*) AS total_reviews
          FROM reviews
          WHERE business_id = :businessId
        `, {
                    replacements: { businessId: userId },
                    type: sequelize_1.QueryTypes.SELECT,
                });
                const totalReviews = countRow?.total_reviews
                    ? Number(countRow.total_reviews)
                    : 0;
                let averageRatingsData = null;
                if (totalReviews > 0) {
                    const [avgRow] = await sequelize_2.default.query(`
            SELECT ROUND(AVG(experience), 1) AS avg_experience
            FROM reviews
            WHERE business_id = :businessId
          `, {
                        replacements: { businessId: userId },
                        type: sequelize_1.QueryTypes.SELECT,
                    });
                    averageRatingsData = {
                        avg_experience: avgRow && avgRow.avg_experience !== null
                            ? Number(avgRow.avg_experience)
                            : null,
                    };
                }
                const reviewRows = (await sequelize_2.default.query(`
          SELECT experience, expectation, recommend, fair_money, interaction, review_text
          FROM reviews
          WHERE business_id = :businessId
          ORDER BY id DESC
        `, {
                    replacements: { businessId: userId },
                    type: sequelize_1.QueryTypes.SELECT,
                }));
                const reviews = reviewRows.map((r) => ({
                    experience: r.experience,
                    expectation: r.expectation,
                    recommend: r.recommend,
                    fair_money: r.fair_money,
                    interaction: r.interaction,
                    review_text: r.review_text || ''
                }));
                // Get business associates using raw query
                // This includes:
                // 1. Child associates (where this business is parent)
                // 2. Parent business (if this business is an associate)
                // 3. Sibling associates (other associates of the same parent)
                const associatesRows = (await sequelize_2.default.query(`
          SELECT DISTINCT
            u.id,
            u.business_name,
            u.business_fullname,
            u.business_email,
            u.business_mobile,
            u.business_image,
            u.business_area,
            u.pricing_range_text
          FROM users u
          WHERE u.role_id = 2
            AND u.is_active = true
            AND (
              -- Case 1: Child associates (where current business is parent)
              u.id IN (
                SELECT ba.associate_business_id
                FROM business_associates ba
                WHERE ba.parent_business_id = :businessId
              )
              -- Case 2: Parent business (if current business is an associate)
              OR u.id IN (
                SELECT ba.parent_business_id
                FROM business_associates ba
                WHERE ba.associate_business_id = :businessId
              )
              -- Case 3: Sibling associates (other associates with same parent)
              OR u.id IN (
                SELECT ba2.associate_business_id
                FROM business_associates ba2
                WHERE ba2.parent_business_id IN (
                  SELECT ba1.parent_business_id
                  FROM business_associates ba1
                  WHERE ba1.associate_business_id = :businessId
                )
                AND ba2.associate_business_id != :businessId
              )
            )
        `, {
                    replacements: { businessId: userId },
                    type: sequelize_1.QueryTypes.SELECT,
                }));
                // Check if this business is a main business (has child associates)
                const parentAssociateCount = await BusinessAssociate_1.default.count({
                    where: { parent_business_id: userId }
                });
                const isMainBusiness = parentAssociateCount > 0;
                user = {
                    ...user,
                    average_ratings: averageRatingsData,
                    total_reviews: totalReviews,
                    reviews,
                    associates: associatesRows,
                    is_main_business: isMainBusiness
                };
            }
            // Optional Instagram refresh for creator
            if (roleId === 3 &&
                flag === 1 &&
                user.instagram_username &&
                user.id) {
                // Here you could call a service to refresh Instagram data if you want.
                // Example (implement in userService if needed):
                // await userService.updateInstagramDataForUser(user.instagram_username, user.id);
                const updated = await User_1.default.findOne({
                    where: { role_id: roleId, id: userId },
                    attributes: [
                        "id",
                        "name",
                        "email",
                        "mobile",
                        "address",
                        "instagram_link",
                        "instagram_username",
                        "user_image",
                        "is_active",
                        "role_id",
                        "instagram_fullname",
                        "follower_count",
                        "following_count",
                        "media_count",
                        "bio",
                        "engagement_rate",
                        "avg_likes",
                        "avg_comments",
                        "avg_activity",
                        "is_insta_verified",
                        "verification_note",
                        "updatedAt",
                    ],
                });
                if (updated) {
                    user = updated.toJSON();
                }
            }
            return res.json({
                status: true,
                message: "User profile found successfully.",
                data: user,
            });
        }
        catch (e) {
            console.error("viewProfile error:", e);
            return res.status(500).json({
                status: false,
                message: "Something went wrong",
                data: [],
            });
        }
    }
    // POST /update-is-top
    async updateIsTop(req, res) {
        const { id, is_top } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "id required" });
        }
        const success = await user_service_1.userService.updateIsTop(Number(id), Boolean(Number(is_top)));
        if (success)
            return res.json({ success: true });
        return res.status(400).json({ success: false });
    }
    // POST business/change-status & creator/change-status
    async changeStatus(req, res) {
        const { id, status } = req.body;
        if (!id || status === undefined) {
            return res
                .status(400)
                .json({ status: "error", message: "Invalid Data" });
        }
        const success = await user_service_1.userService.changeStatus(Number(id), Number(status));
        if (!success) {
            return res
                .status(400)
                .json({ status: "error", message: "Invalid Data" });
        }
        const message = Number(status) === 1
            ? "Active status change successfully"
            : "Inactive status change successfully";
        return res.json({ status: "success", message });
    }
    // GET business/edit/:id
    async getEditBusiness(req, res) {
        const { id } = req.params;
        const data = await user_service_1.userService.fetch(Number(id));
        if (!data) {
            return res
                .status(404)
                .json({ status: false, message: "Business not found" });
        }
        return res.json({ status: true, data });
    }
    // POST business/edit/:id
    async updateBusiness(req, res) {
        const { id } = req.params;
        const payload = req.body; // handle file uploads separately using multer
        const success = await user_service_1.userService.updateBusiness(Number(id), payload);
        if (success) {
            return res.json({
                status: true,
                message: "Business details updated successfully.",
            });
        }
        return res
            .status(400)
            .json({ status: false, message: "Failed to update business details." });
    }
    // GET creator/edit/:id
    async getEditCreator(req, res) {
        const { id } = req.params;
        const data = await user_service_1.userService.fetch(Number(id));
        if (!data) {
            return res
                .status(404)
                .json({ status: false, message: "Creator not found" });
        }
        return res.json({ status: true, data });
    }
    // POST creator/edit/:id
    async updateCreator(req, res) {
        const { id } = req.params;
        const payload = req.body; // again, file upload can be handled with multer
        const success = await user_service_1.userService.updateCreator(Number(id), payload);
        if (success) {
            return res.json({
                status: true,
                message: "Creator details updated successfully.",
            });
        }
        return res
            .status(400)
            .json({ status: false, message: "Failed to update creator details." });
    }
    // GET /creator/instagram
    async getInstagramUsers(req, res) {
        try {
            const record = await user_service_1.userService.fetchInstagramRecord();
            return res.json({
                status: true,
                message: "Instagram creators list",
                data: record,
            });
        }
        catch (e) {
            console.error(e);
            return res.status(500).json({
                status: false,
                message: "Something went wrong",
            });
        }
    }
    // GET creator/editInstagram/:id
    async getEditInstagram(req, res) {
        const { id } = req.params;
        const data = await user_service_1.userService.fetch(Number(id));
        if (!data) {
            return res
                .status(404)
                .json({ status: false, message: "Creator not found" });
        }
        return res.json({ status: true, data });
    }
    // POST creator/editInstagram/:id
    // NOTE: this is the simplified version; you can plug in your RapidAPI calls
    async updateInstagram(req, res) {
        const { id } = req.params;
        const { instagram_username, is_insta_verified, verification_note } = req.body;
        if (!instagram_username || is_insta_verified === undefined) {
            return res
                .status(400)
                .json({ status: false, message: "Invalid data provided" });
        }
        const dataToUpdate = {
            instagram_username,
            is_insta_verified,
        };
        if (Number(is_insta_verified) === 2) {
            dataToUpdate.verification_note = verification_note;
        }
        const [updated] = await User_1.default.update(dataToUpdate, {
            where: { id: Number(id) },
        });
        if (updated > 0) {
            return res.json({
                status: true,
                message: "Creator Instagram details updated successfully.",
            });
        }
        return res
            .status(400)
            .json({ status: false, message: "Failed to update Instagram details." });
    }
    // POST /api/users/inactiveUser  (Laravel: inactiveUser)
    async inactiveUser(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    status: false,
                    message: "Unauthorized user",
                });
            }
            const user = await User_1.default.findByPk(userId);
            if (!user) {
                return res.status(400).json({
                    status: false,
                    message: "User not found",
                });
            }
            await user.update({ is_active: false });
            return res.json({
                status: true,
                message: "Your account deleted successfully.",
            });
        }
        catch (error) {
            console.error("inactiveUser error:", error);
            return res.status(500).json({
                status: false,
                message: "Internal server error",
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
        // If no user_id provided, assume first-time visitor
        if (!userId) {
            return false;
        }
        const previousOrder = await Order_1.default.findOne({
            where: {
                user_id: userId,
                business_id: businessId,
                status: {
                    [sequelize_1.Op.in]: ['success', 'completed', 'paid', 'captured'] // check for multiple possible success statuses
                }
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
        // Fallback logic for category_attributes in lists/searches
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
    // 🔍 POST /api/users/getBusinessByUpiId
    async getBusinessByUpiId(req, res) {
        try {
            const { upi_id } = req.body;
            if (!upi_id || upi_id.trim() === "") {
                return res.status(400).json({
                    status: false,
                    message: "UPI ID is required",
                });
            }
            const upiIdTrimmed = upi_id.trim();
            // Find the business matching the UPI ID
            let business = await Business_1.default.findOne({
                where: {
                    upi_id: sequelize_2.default.where(sequelize_2.default.fn('lower', sequelize_2.default.col('upi_id')), upiIdTrimmed.toLowerCase()),
                    role_id: 2
                },
                attributes: ["id", "business_name", "business_image", "business_fullname"]
            });
            if (!business) {
                // Fallback to User table if not found in Business table
                const user = await User_1.default.findOne({
                    where: {
                        upi_id: sequelize_2.default.where(sequelize_2.default.fn('lower', sequelize_2.default.col('upi_id')), upiIdTrimmed.toLowerCase()),
                        role_id: 2
                    },
                    attributes: ["id", "business_name", "business_image", "business_fullname"]
                });
                if (user) {
                    business = user;
                }
            }
            if (!business) {
                return res.status(404).json({
                    status: false,
                    message: "This UPI ID is not registered with any business.",
                });
            }
            return res.status(200).json({
                status: true,
                message: "Business found successfully",
                data: {
                    businessId: business.id,
                    businessName: business.business_name || business.business_fullname || "",
                    businessImage: business.business_image || ""
                }
            });
        }
        catch (e) {
            console.error("getBusinessByUpiId error:", e);
            return res.status(500).json({
                status: false,
                message: "Internal server error: " + e.message,
            });
        }
    }
}
exports.userController = new UserController();
