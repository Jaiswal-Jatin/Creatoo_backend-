"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const User_1 = __importDefault(require("../models/User"));
const Business_1 = __importDefault(require("../models/Business"));
const Visit_1 = __importDefault(require("../models/Visit"));
const Card_1 = __importDefault(require("../models/Card"));
const CreatorPointsTransaction_1 = __importDefault(require("../models/CreatorPointsTransaction"));
const BusinessAssociate_1 = __importDefault(require("../models/BusinessAssociate"));
const sequelize_2 = __importDefault(require("../db/sequelize"));
const storage_service_1 = require("../services/storage.service");
// ✅ Your token has: req.user.role === "admin"
const isAdminUser = (req) => {
    const authUser = req.user;
    return authUser?.role === "admin" || authUser?.role_id === 1;
};
/**
 * ✅ ACCESS RULE:
 * - Admin -> can access any business_id (body) OR fallback to token id
 * - Normal user -> can access ONLY their own token id
 *   - if they send business_id and it's different -> return null (FORBIDDEN)
 */
const getTargetBusinessId = (req) => {
    const authUser = req.user;
    if (!authUser?.id)
        return null;
    const tokenBusinessId = Number(authUser.id);
    const bodyBusinessId = req.body.business_id !== undefined && req.body.business_id !== null
        ? Number(req.body.business_id)
        : null;
    const isAdmin = isAdminUser(req);
    // ✅ ADMIN → can target any business_id
    if (isAdmin) {
        if (bodyBusinessId && bodyBusinessId > 0)
            return bodyBusinessId;
        return tokenBusinessId;
    }
    // ✅ NON-ADMIN USER:
    // if no business_id passed → self access
    if (!bodyBusinessId)
        return tokenBusinessId;
    // if business_id passed but not equal to token id → forbidden
    if (bodyBusinessId !== tokenBusinessId)
        return null;
    // if same → allow
    return tokenBusinessId;
};
// Helper: Clean null values from plain JSON object
const cleanNullValues = (obj) => {
    if (obj === null || obj === undefined)
        return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => cleanNullValues(item)).filter(item => item !== null && item !== undefined);
    }
    if (typeof obj === 'object') {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== null && value !== undefined) {
                cleaned[key] = cleanNullValues(value);
            }
        }
        return cleaned;
    }
    return obj;
};
const BusinessController = {
    /**
     * Helper: Get all business IDs in the associate network (parent + associates)
     */
    async getAssociateNetwork(businessId) {
        const networkIds = [businessId];
        // Get all associates
        const associates = await BusinessAssociate_1.default.findAll({
            where: { parent_business_id: businessId },
            attributes: ['associate_business_id']
        });
        // Get all parent businesses
        const parents = await BusinessAssociate_1.default.findAll({
            where: { associate_business_id: businessId },
            attributes: ['parent_business_id']
        });
        associates.forEach(a => networkIds.push(a.associate_business_id));
        parents.forEach(p => networkIds.push(p.parent_business_id));
        return [...new Set(networkIds)]; // Remove duplicates
    },
    /**
     * Helper: Get business details for multiple business IDs
     */
    async getBusinessDetails(businessIds) {
        const businesses = await User_1.default.findAll({
            where: { id: { [sequelize_1.Op.in]: businessIds } },
            attributes: ['id', 'business_name', 'business_fullname']
        });
        const businessMap = new Map();
        businesses.forEach((b) => {
            businessMap.set(b.id, {
                business_name: b.business_name || 'Unknown',
                business_fullname: b.business_fullname || null
            });
        });
        return businessMap;
    },
    // -----------------------------
    // POST /api/business/customerSummary
    // -----------------------------
    /**
     * Function: customerSummary()
     * Role: Business Admin / Admin
     * Description: Generates a summary of all customers who have visited the business, including their spending and points.
     * Params: business_id (optional for business owners, required for admins)
     * Returns: List of customers with visit and spending details.
     */
    async customerSummary(req, res) {
        try {
            const businessId = getTargetBusinessId(req);
            if (!businessId) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: You cannot access this business_id",
                });
            }
            const visitRows = await Visit_1.default.findAll({
                where: { business_id: businessId },
                attributes: ["user_id", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "total_visits"]],
                group: ["user_id"],
            });
            if (!visitRows.length) {
                return res.json({ status: true, data: [] });
            }
            const userIds = visitRows.map((v) => v.user_id);
            const users = await User_1.default.findAll({
                where: { id: { [sequelize_1.Op.in]: userIds } },
                attributes: ["id", "name", "email", "mobile"],
            });
            const userMap = new Map();
            users.forEach((u) => {
                userMap.set(u.id, {
                    name: u.name ?? "Unknown",
                    email: u.email ?? null,
                    mobile: u.mobile ?? null,
                });
            });
            const cards = await Card_1.default.findAll({
                where: {
                    user_id: { [sequelize_1.Op.in]: userIds },
                },
                attributes: ["user_id", [(0, sequelize_1.fn)("MIN", (0, sequelize_1.col)("created_at")), "member_since"]],
                group: ["user_id"],
                raw: true,
            });
            const memberSinceMap = new Map();
            cards.forEach((c) => {
                const uid = Number(c.user_id);
                const ms = c.member_since;
                if (!ms) {
                    memberSinceMap.set(uid, null);
                }
                else {
                    const d = ms instanceof Date ? ms : new Date(ms);
                    memberSinceMap.set(uid, d.toISOString().slice(0, 10));
                }
            });
            const pointsRows = await CreatorPointsTransaction_1.default.findAll({
                where: {
                    business_id: businessId,
                    user_id: { [sequelize_1.Op.in]: userIds },
                },
                attributes: [
                    "user_id",
                    [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("points")), 0), "total_points"],
                    [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("total_bill")), 0), "total_spent"],
                ],
                group: ["user_id"],
            });
            const pointsMap = new Map();
            pointsRows.forEach((p) => {
                pointsMap.set(p.user_id, {
                    total_points: Number(p.get("total_points") ?? 0),
                    total_spent: Number(p.get("total_spent") ?? 0),
                });
            });
            const data = visitRows.map((v) => {
                const userId = Number(v.user_id);
                return {
                    user_id: userId,
                    name: userMap.get(userId)?.name ?? "Unknown",
                    email: userMap.get(userId)?.email ?? null,
                    mobile: userMap.get(userId)?.mobile ?? null,
                    total_visits: Number(v.get("total_visits")) ?? 0,
                    total_spent: pointsMap.get(userId)?.total_spent ?? 0,
                    points: pointsMap.get(userId)?.total_points ?? 0,
                    member_since: memberSinceMap.get(userId) ?? null,
                };
            });
            return res.json({ status: true, data });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({
                status: false,
                message: "Failed to fetch customer summary: " + (err.message || "Unknown"),
            });
        }
    },
    // -----------------------------
    // POST /api/business/setDiscount
    // -----------------------------
    /**
     * Function: setDiscount()
     * Role: Business Admin / Admin
     * Description: Configures discount percentages and minimum order requirements for a business.
     * Params: set_first_time_discount, set_regular_discount, min_order, set_expiry, etc.
     * Returns: Updated business user data.
     */
    async setDiscount(req, res) {
        try {
            const businessId = getTargetBusinessId(req);
            console.log("req.user =>", req.user);
            console.log("req.body =>", req.body);
            console.log("TARGET businessId =>", businessId);
            if (!businessId) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: You cannot access this business_id",
                });
            }
            const { set_first_time_discount, set_regular_discount, platform_fee_rupees, gateway_charges, reverse_gateway_charges, } = req.body;
            const errors = {};
            const firstNum = Number(set_first_time_discount);
            const regularNum = Number(set_regular_discount);
            const platformFeeRupeesNum = platform_fee_rupees !== undefined ? Number(platform_fee_rupees) : undefined;
            const gatewayChargesNum = gateway_charges !== undefined ? Number(gateway_charges) : undefined;
            const reverseGatewayChargesNum = reverse_gateway_charges !== undefined ? Number(reverse_gateway_charges) : undefined;
            if (Number.isNaN(firstNum) || firstNum < 0 || firstNum > 100)
                errors.set_first_time_discount = ["Must be between 0 and 100"];
            if (Number.isNaN(regularNum) || regularNum < 0 || regularNum > 100)
                errors.set_regular_discount = ["Must be between 0 and 100"];
            // Optional fields - only validate if provided
            if (platformFeeRupeesNum !== undefined && (Number.isNaN(platformFeeRupeesNum) || platformFeeRupeesNum < 0))
                errors.platform_fee_rupees = ["Must be at least 0"];
            if (gatewayChargesNum !== undefined && (Number.isNaN(gatewayChargesNum) || gatewayChargesNum < 0 || gatewayChargesNum > 100))
                errors.gateway_charges = ["Must be between 0 and 100"];
            if (reverseGatewayChargesNum !== undefined && (Number.isNaN(reverseGatewayChargesNum) || reverseGatewayChargesNum < 0 || reverseGatewayChargesNum > 100))
                errors.reverse_gateway_charges = ["Must be between 0 and 100"];
            if (Object.keys(errors).length) {
                return res.status(422).json({ status: false, errors });
            }
            const user = await Business_1.default.findByPk(businessId);
            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: "Business not found",
                });
            }
            user.set_first_time_discount = firstNum;
            user.set_regular_discount = regularNum;
            // Set dynamic charges if provided (only allow admins to modify these)
            if (platform_fee_rupees !== undefined)
                user.platform_fee_rupees = platformFeeRupeesNum;
            if (gateway_charges !== undefined)
                user.gateway_charges = gatewayChargesNum;
            if (reverse_gateway_charges !== undefined)
                user.reverse_gateway_charges = reverseGatewayChargesNum;
            await user.save();
            await user.reload();
            return res.json({
                status: true,
                message: "Discount and charges applied successfully",
                data: user,
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({
                status: false,
                message: "Failed to apply discount and charges: " + (err.message || "Unknown"),
            });
        }
    },
    // -----------------------------
    // POST /api/business/businessDescription
    // -----------------------------
    /**
     * Function: businessDescription()
     * Role: Business Admin / Admin
     * Description: Updates business profile information including operating hours, pricing range, and images/menu cards.
     * Params: time_from, time_to, pricing_range_text, business_image, menu_cards, etc.
     * Returns: Updated business details.
     */
    async businessDescription(req, res) {
        try {
            const businessId = getTargetBusinessId(req);
            if (!businessId) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: You cannot access this business_id",
                });
            }
            const user = await Business_1.default.findByPk(businessId);
            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: "Business not found",
                });
            }
            const { time_from, time_to, pricing_range_text } = req.body;
            const files = req.files;
            // business_image
            if (files?.business_image?.[0]) {
                if (user.business_image)
                    (0, storage_service_1.deleteIfExists)(user.business_image);
                const { fileUrl } = await (0, storage_service_1.saveCompressedImage)(files.business_image[0]);
                user.business_image = fileUrl;
            }
            // menu_card_1..5
            for (let i = 1; i <= 5; i++) {
                const field = `menu_card_${i}`;
                if (files?.[field]?.[0]) {
                    if (user[field])
                        (0, storage_service_1.deleteIfExists)(user[field]);
                    const { fileUrl } = await (0, storage_service_1.saveCompressedImage)(files[field][0]);
                    user[field] = fileUrl;
                }
            }
            // business_image_1..5
            for (let i = 1; i <= 5; i++) {
                const field = `business_image_${i}`;
                if (files?.[field]?.[0]) {
                    if (user[field])
                        (0, storage_service_1.deleteIfExists)(user[field]);
                    const { fileUrl } = await (0, storage_service_1.saveCompressedImage)(files[field][0]);
                    user[field] = fileUrl;
                }
            }
            if (time_from)
                user.time_from = time_from;
            if (time_to)
                user.time_to = time_to;
            if (pricing_range_text)
                user.pricing_range_text = pricing_range_text;
            await user.save();
            await user.reload();
            return res.json({
                status: true,
                message: "Business details updated successfully",
                data: user,
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({
                status: false,
                message: "Failed to update business description: " + (err.message || "Unknown"),
            });
        }
    },
    // -----------------------------
    // POST /api/business/getBusinessList
    // -----------------------------
    async getBusinessList(req, res) {
        try {
            const searchKey = (req.body.search_key || "").trim();
            const businessCategory = (req.body.business_category || "").trim();
            if (searchKey.length < 3) {
                return res.status(200).json({
                    status: true,
                    message: "Minimum 3 characters required",
                    data: [],
                });
            }
            const whereClause = {
                role_id: 2,
                business_name: { [sequelize_1.Op.like]: `%${searchKey}%` },
            };
            if (businessCategory) {
                whereClause.business_category = businessCategory;
            }
            const users = await User_1.default.findAll({
                where: whereClause,
                attributes: ["id", "business_name", "business_category"],
            });
            return res.status(200).json({
                status: true,
                message: users.length ? "Business Found" : "No matching business names",
                data: users,
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({
                status: false,
                message: "Failed to fetch business list",
            });
        }
    },
    // -----------------------------
    // POST /api/business/addAssociate
    // Admin only: Add associate business to parent business
    // -----------------------------
    /**
     * Function: addAssociate()
     * Role: Admin
     * Description: Links an associate business to a parent business record.
     * Params: parent_business_id (number), associate_business_id (number)
     * Returns: Created association record.
     */
    async addAssociate(req, res) {
        try {
            if (!isAdminUser(req)) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Admin access required",
                });
            }
            const { parent_business_id, associate_business_id } = req.body;
            if (!parent_business_id || !associate_business_id) {
                return res.status(400).json({
                    status: false,
                    message: "parent_business_id and associate_business_id are required",
                });
            }
            if (parent_business_id === associate_business_id) {
                return res.status(400).json({
                    status: false,
                    message: "Parent and associate business cannot be the same",
                });
            }
            // Check if both businesses exist
            const parentBusiness = await User_1.default.findByPk(parent_business_id);
            const associateBusiness = await User_1.default.findByPk(associate_business_id);
            if (!parentBusiness || !associateBusiness) {
                return res.status(404).json({
                    status: false,
                    message: "One or both businesses not found",
                });
            }
            // Check if association already exists
            const existingAssociation = await BusinessAssociate_1.default.findOne({
                where: {
                    parent_business_id,
                    associate_business_id,
                },
            });
            if (existingAssociation) {
                return res.status(400).json({
                    status: false,
                    message: "This association already exists",
                });
            }
            // Create the association
            const association = await BusinessAssociate_1.default.create({
                parent_business_id,
                associate_business_id,
            });
            return res.json({
                status: true,
                message: "Associate added successfully",
                data: association,
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({
                status: false,
                message: "Failed to add associate: " + (err.message || "Unknown"),
            });
        }
    },
    // -----------------------------
    // POST /api/business/editAssociateDetails
    // Admin only: Edit associate business details
    // -----------------------------
    async editAssociateDetails(req, res) {
        try {
            if (!isAdminUser(req)) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Admin access required",
                });
            }
            const { associate_business_id, business_name, business_fullname, business_email, business_mobile } = req.body;
            if (!associate_business_id) {
                return res.status(400).json({
                    status: false,
                    message: "associate_business_id is required",
                });
            }
            // Find the associate business
            const associateBusiness = await User_1.default.findByPk(associate_business_id);
            if (!associateBusiness) {
                return res.status(404).json({
                    status: false,
                    message: "Associate business not found",
                });
            }
            // Prepare update data with only provided fields
            const updateData = {};
            if (business_name !== undefined)
                updateData.business_name = business_name;
            if (business_fullname !== undefined)
                updateData.business_fullname = business_fullname;
            if (business_email !== undefined)
                updateData.business_email = business_email;
            if (business_mobile !== undefined)
                updateData.business_mobile = business_mobile;
            // Check if at least one field is being updated
            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    status: false,
                    message: "At least one field must be provided for update",
                });
            }
            // Update the associate business details
            await associateBusiness.update(updateData);
            return res.json({
                status: true,
                message: "Associate details updated successfully",
                data: {
                    id: associateBusiness.id,
                    business_name: associateBusiness.business_name,
                    business_fullname: associateBusiness.business_fullname,
                    business_email: associateBusiness.business_email,
                    business_mobile: associateBusiness.business_mobile,
                    updatedAt: associateBusiness.updatedAt
                }
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({
                status: false,
                message: "Failed to edit associate details: " + (err.message || "Unknown"),
            });
        }
    },
    // -----------------------------
    // POST /api/business/removeAssociate
    // Admin only: Remove associate business from parent business
    // -----------------------------
    async removeAssociate(req, res) {
        try {
            if (!isAdminUser(req)) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Admin access required",
                });
            }
            const { parent_business_id, associate_business_id } = req.body;
            if (!parent_business_id || !associate_business_id) {
                return res.status(400).json({
                    status: false,
                    message: "parent_business_id and associate_business_id are required",
                });
            }
            const association = await BusinessAssociate_1.default.findOne({
                where: {
                    parent_business_id,
                    associate_business_id,
                },
            });
            if (!association) {
                return res.status(404).json({
                    status: false,
                    message: "Association not found",
                });
            }
            await association.destroy();
            return res.json({
                status: true,
                message: "Associate removed successfully",
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({
                status: false,
                message: "Failed to remove associate: " + (err.message || "Unknown"),
            });
        }
    },
    // -----------------------------
    // POST /api/business/getAssociates
    // Get associates for a business (using same logic as viewProfile)
    // Returns: parent_business + all associates (children, parent, and siblings)
    // Associates can see their parent and siblings; business owners see their children
    // -----------------------------
    async getAssociates(req, res) {
        try {
            const isAdmin = isAdminUser(req);
            const authUser = req.user;
            let businessId = null;
            if (isAdmin) {
                // Admin must provide business_id in request body
                businessId = req.body.business_id ? Number(req.body.business_id) : null;
                if (!businessId) {
                    return res.status(400).json({
                        status: false,
                        message: "business_id is required for admin users",
                    });
                }
            }
            else {
                // Non-admin: use token business ID
                businessId = getTargetBusinessId(req);
            }
            if (!businessId) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: You cannot access this business_id",
                });
            }
            // Get all associates using the same logic as viewProfile
            // This returns:
            // 1. Child associates (where current business is parent)
            // 2. Parent business (if current business is an associate)
            // 3. Sibling associates (other associates with same parent)
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
                replacements: { businessId: businessId },
                type: sequelize_1.QueryTypes.SELECT,
            }));
            // Get the current business details
            const parentBusiness = await User_1.default.findOne({
                where: { id: businessId },
                attributes: ['id', 'business_name', 'business_fullname', 'email', 'mobile', 'business_email', 'business_mobile'],
            });
            // Prepare response with business and all associates
            const response = {
                parent_business: parentBusiness ? cleanNullValues(JSON.parse(JSON.stringify(parentBusiness))) : null,
                associates: cleanNullValues(associatesRows),
            };
            return res.json({
                status: true,
                data: response,
            });
        }
        catch (err) {
            console.error("getAssociates error:", err);
            return res.status(500).json({
                status: false,
                message: "Failed to get associates: " + (err.message || "Unknown"),
            });
        }
    },
    // -----------------------------
    // POST /api/business/getParentAssociations
    // Get parent businesses for a business (admin can access any, business can access own)
    // For admin: returns all businesses with their associate relationships
    // -----------------------------
    async getParentAssociations(req, res) {
        try {
            const isAdmin = isAdminUser(req);
            let businessId = null;
            if (isAdmin) {
                // Admin can optionally provide business_id, or get all businesses
                businessId = req.body.business_id ? Number(req.body.business_id) : null;
                // If no business_id provided, return all businesses with their associates
                if (!businessId) {
                    // Get all parent businesses (businesses that have associates)
                    const allParentBusinesses = await BusinessAssociate_1.default.findAll({
                        attributes: ['parent_business_id'],
                        group: ['parent_business_id'],
                        raw: true,
                    });
                    const parentBusinessIds = allParentBusinesses.map((pb) => pb.parent_business_id);
                    if (parentBusinessIds.length === 0) {
                        return res.json({
                            status: true,
                            message: "No parent businesses found",
                            data: [],
                        });
                    }
                    // Get all parent business details
                    const parentBusinesses = await User_1.default.findAll({
                        where: { id: { [sequelize_1.Op.in]: parentBusinessIds } },
                        attributes: ['id', 'business_name', 'business_fullname', 'email', 'mobile', 'business_email', 'business_mobile'],
                    });
                    // Get all associations for these parent businesses
                    const allAssociations = await BusinessAssociate_1.default.findAll({
                        where: { parent_business_id: { [sequelize_1.Op.in]: parentBusinessIds } },
                        include: [
                            {
                                model: User_1.default,
                                as: 'associateBusiness',
                                attributes: ['id', 'business_name', 'business_fullname', 'email', 'mobile', 'business_email', 'business_mobile'],
                            },
                            {
                                model: User_1.default,
                                as: 'parentBusiness',
                                attributes: ['id', 'business_name', 'business_fullname', 'email', 'mobile', 'business_email', 'business_mobile'],
                            },
                        ],
                        order: [['parent_business_id', 'ASC'], ['created_at', 'DESC']],
                    });
                    // Group associations by parent business
                    const groupedAssociations = new Map();
                    allAssociations.forEach(association => {
                        const parentId = association.parent_business_id;
                        if (!groupedAssociations.has(parentId)) {
                            groupedAssociations.set(parentId, []);
                        }
                        groupedAssociations.get(parentId).push(association);
                    });
                    // Build response with all parent businesses and their associates
                    const result = parentBusinesses.map(parent => ({
                        parent_business_id: parent.id,
                        parent_business_details: parent,
                        associates: groupedAssociations.get(parent.id)?.map(assoc => ({
                            id: assoc.id,
                            parent_business_id: assoc.parent_business_id,
                            associate_business_id: assoc.associate_business_id,
                            created_at: assoc.created_at,
                            updated_at: assoc.updated_at,
                            associate_business: assoc.associateBusiness,
                        })) || [],
                        total_associates: groupedAssociations.get(parent.id)?.length || 0,
                    }));
                    // Clean null values from response
                    const cleanedResult = cleanNullValues(JSON.parse(JSON.stringify(result)));
                    return res.json({
                        status: true,
                        message: `Found ${parentBusinesses.length} parent businesses with associates`,
                        data: cleanedResult,
                        summary: {
                            total_parent_businesses: parentBusinesses.length,
                            total_associations: allAssociations.length,
                        },
                    });
                }
            }
            else {
                // Non-admin users can only access their own business
                businessId = getTargetBusinessId(req);
            }
            if (!businessId) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: You cannot access this business_id",
                });
            }
            // Original logic for specific business access
            const parentAssociations = await BusinessAssociate_1.default.findAll({
                where: {
                    associate_business_id: businessId,
                },
                include: [
                    {
                        model: User_1.default,
                        as: 'parentBusiness',
                        attributes: ['id', 'business_name', 'business_fullname', 'email', 'mobile', 'business_email', 'business_mobile'],
                    },
                ],
            });
            // Clean null values from response
            const cleanedParentAssociations = cleanNullValues(JSON.parse(JSON.stringify(parentAssociations)));
            return res.json({
                status: true,
                data: cleanedParentAssociations,
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({
                status: false,
                message: "Failed to get parent associations: " + (err.message || "Unknown"),
            });
        }
    },
    // -----------------------------
    // POST /api/business/getAllBusinesses
    // Admin only: Get all businesses
    // -----------------------------
    async getAllBusinesses(req, res) {
        try {
            if (!isAdminUser(req)) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Admin access required",
                });
            }
            const { page = 1, limit = 10, search_key = "" } = req.body;
            const offset = (Number(page) - 1) * Number(limit);
            const whereClause = {
                role_id: 2,
                business_name: { [sequelize_1.Op.ne]: null }
            };
            if (search_key && search_key.trim()) {
                whereClause[sequelize_1.Op.or] = [
                    { business_name: { [sequelize_1.Op.like]: `%${search_key.trim()}%` } },
                    { business_fullname: { [sequelize_1.Op.like]: `%${search_key.trim()}%` } },
                    { email: { [sequelize_1.Op.like]: `%${search_key.trim()}%` } },
                    { mobile: { [sequelize_1.Op.like]: `%${search_key.trim()}%` } }
                ];
            }
            const { count, rows: businesses } = await User_1.default.findAndCountAll({
                where: whereClause,
                attributes: [
                    'id',
                    'business_name',
                    'business_fullname',
                    'business_email',
                    'mobile',
                    'email',
                    'business_address',
                    'business_area',
                    'gst_number',
                    'created_at',
                    'updated_at'
                ],
                limit: Number(limit),
                offset: offset,
                order: [['created_at', 'DESC']],
            });
            return res.json({
                status: true,
                data: businesses,
                pagination: {
                    total: count,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(count / Number(limit)),
                },
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({
                status: false,
                message: "Failed to get businesses: " + (err.message || "Unknown"),
            });
        }
    },
    // -----------------------------
    // POST /api/business/associateNetworkHistory
    // Get visit history for entire associate network (main business + all associates)
    // -----------------------------
    async associateNetworkHistory(req, res) {
        try {
            const businessId = getTargetBusinessId(req);
            if (!businessId) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: You cannot access this business_id",
                });
            }
            // Get all business IDs in the associate network
            const networkIds = await this.getAssociateNetwork(businessId);
            // Get business details for network
            const businessDetails = await this.getBusinessDetails(networkIds);
            // Get all visits for the network
            const visits = await Visit_1.default.findAll({
                where: { business_id: { [sequelize_1.Op.in]: networkIds } },
                order: [["time", "DESC"]],
            });
            if (visits.length === 0) {
                return res.status(200).json({
                    status: true,
                    summary: { premium: 0, elite: 0, core: 0, new: 0 },
                    days: [],
                });
            }
            const cardNumbers = Array.from(new Set(visits.map((v) => v.card_number)));
            const cards = await Card_1.default.findAll({
                where: { number: { [sequelize_1.Op.in]: cardNumbers } },
                attributes: ["number", "name"],
            });
            const cardNameMap = new Map();
            cards.forEach((c) => {
                cardNameMap.set(c.number, c.name ?? null);
            });
            const summary = {
                premium: 0,
                elite: 0,
                core: 0,
                new: 0,
            };
            const daysMap = new Map();
            for (const v of visits) {
                summary[v.tier] = (summary[v.tier] || 0) + 1;
                // Use IST date
                const dateKey = new Date(v.time).toLocaleDateString("en-CA", {
                    timeZone: "Asia/Kolkata",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                });
                if (!daysMap.has(dateKey)) {
                    daysMap.set(dateKey, { date: dateKey, visits: [] });
                }
                const businessInfo = businessDetails.get(v.business_id);
                const group = daysMap.get(dateKey);
                group.visits.push({
                    card_number: v.card_number,
                    name: cardNameMap.get(v.card_number) ?? null,
                    tier: v.tier,
                    time: new Date(v.time).toLocaleString("en-CA", {
                        timeZone: "Asia/Kolkata",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                    }).replace(",", ""),
                    business_name: businessInfo?.business_name || 'Unknown',
                    business_id: v.business_id,
                });
            }
            const days = Array.from(daysMap.values()).sort((a, b) => a.date < b.date ? 1 : -1);
            return res.status(200).json({
                status: true,
                summary,
                days,
                network_businesses: Array.from(businessDetails.entries()).map(([id, details]) => ({
                    business_id: id,
                    ...details
                }))
            });
        }
        catch (err) {
            console.error("associateNetworkHistory error:", err);
            return res.status(500).json({
                status: false,
                message: "Server error: " + err.message,
            });
        }
    },
    // -----------------------------
    // POST /api/business/getAssociateSummary
    // Get comprehensive summary of all associates for main business
    // -----------------------------
    async getAssociateSummary(req, res) {
        try {
            const businessId = getTargetBusinessId(req);
            if (!businessId) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: You cannot access this business_id",
                });
            }
            // Get all associates
            const associates = await BusinessAssociate_1.default.findAll({
                where: {
                    parent_business_id: businessId,
                },
                include: [
                    {
                        model: User_1.default,
                        as: 'associateBusiness',
                        attributes: [
                            'id',
                            'business_name',
                            'business_fullname',
                            'email',
                            'mobile',
                            'business_email',
                            'business_mobile',
                            'business_address',
                            'business_area',
                            'created_at'
                        ],
                    },
                ],
                order: [['created_at', 'DESC']],
            });
            // Get visit statistics for each associate
            const associateIds = associates.map(a => a.associate_business_id);
            const visitStats = await Visit_1.default.findAll({
                where: { business_id: { [sequelize_1.Op.in]: associateIds } },
                attributes: [
                    'business_id',
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'total_visits'],
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.fn)('DISTINCT', (0, sequelize_1.col)('card_number'))), 'unique_customers']
                ],
                group: ['business_id'],
                raw: true,
            });
            const visitStatsMap = new Map();
            visitStats.forEach((stat) => {
                visitStatsMap.set(Number(stat.business_id), {
                    total_visits: Number(stat.total_visits),
                    unique_customers: Number(stat.unique_customers)
                });
            });
            // Enhanced associate data
            const associateSummary = associates.map(associate => {
                const stats = visitStatsMap.get(associate.associate_business_id) || {
                    total_visits: 0,
                    unique_customers: 0
                };
                const associateBusiness = associate.associateBusiness;
                return {
                    association_id: associate.id,
                    parent_business_id: associate.parent_business_id,
                    associate_business_id: associate.associate_business_id,
                    association_created_at: associate.created_at,
                    associate_business_updated_at: associate.updated_at,
                    // Business details
                    business_details: associateBusiness,
                    // Performance metrics
                    performance: {
                        total_visits: stats.total_visits,
                        unique_customers: stats.unique_customers,
                        avg_visits_per_customer: stats.unique_customers > 0
                            ? (stats.total_visits / stats.unique_customers).toFixed(2)
                            : '0.00'
                    },
                    // Contact availability
                    contact_info: {
                        has_email: !!(associateBusiness.email || associateBusiness.business_email),
                        has_mobile: !!(associateBusiness.mobile || associateBusiness.business_mobile),
                        has_address: !!associateBusiness.business_address,
                        has_area: !!associateBusiness.business_area
                    }
                };
            });
            // Overall summary
            const totalAssociates = associates.length;
            const totalVisits = Array.from(visitStatsMap.values()).reduce((sum, stat) => sum + stat.total_visits, 0);
            const totalUniqueCustomers = Array.from(visitStatsMap.values()).reduce((sum, stat) => sum + stat.unique_customers, 0);
            return res.json({
                status: true,
                summary: {
                    total_associates: totalAssociates,
                    total_network_visits: totalVisits,
                    total_network_customers: totalUniqueCustomers,
                    avg_visits_per_associate: totalAssociates > 0 ? (totalVisits / totalAssociates).toFixed(2) : '0.00'
                },
                associates: associateSummary
            });
        }
        catch (err) {
            console.error("getAssociateSummary error:", err);
            return res.status(500).json({
                status: false,
                message: "Failed to get associate summary: " + (err.message || "Unknown"),
            });
        }
    },
    // -----------------------------
    // POST /api/business/associateOnlyHistory
    // Get visit history for associate business only (restricted access)
    // -----------------------------
    async associateOnlyHistory(req, res) {
        try {
            const businessId = getTargetBusinessId(req);
            if (!businessId) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: You cannot access this business_id",
                });
            }
            // Check if this business is an associate (has parent)
            const parentAssociation = await BusinessAssociate_1.default.findOne({
                where: { associate_business_id: businessId },
            });
            if (!parentAssociation) {
                return res.status(403).json({
                    status: false,
                    message: "Access denied: This endpoint is for associate businesses only",
                });
            }
            // Get visits only for this associate business
            const visits = await Visit_1.default.findAll({
                where: { business_id: businessId },
                order: [["time", "DESC"]],
            });
            if (visits.length === 0) {
                return res.status(200).json({
                    status: true,
                    summary: { premium: 0, elite: 0, core: 0, new: 0 },
                    days: [],
                });
            }
            const cardNumbers = Array.from(new Set(visits.map((v) => v.card_number)));
            const cards = await Card_1.default.findAll({
                where: { number: { [sequelize_1.Op.in]: cardNumbers } },
                attributes: ["number", "name"],
            });
            const cardNameMap = new Map();
            cards.forEach((c) => {
                cardNameMap.set(c.number, c.name ?? null);
            });
            const summary = {
                premium: 0,
                elite: 0,
                core: 0,
                new: 0,
            };
            const daysMap = new Map();
            for (const v of visits) {
                summary[v.tier] = (summary[v.tier] || 0) + 1;
                // Use IST date
                const dateKey = new Date(v.time).toLocaleDateString("en-CA", {
                    timeZone: "Asia/Kolkata",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                });
                if (!daysMap.has(dateKey)) {
                    daysMap.set(dateKey, { date: dateKey, visits: [] });
                }
                const group = daysMap.get(dateKey);
                group.visits.push({
                    card_number: v.card_number,
                    name: cardNameMap.get(v.card_number) ?? null,
                    tier: v.tier,
                    time: new Date(v.time).toLocaleString("en-CA", {
                        timeZone: "Asia/Kolkata",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                    }).replace(",", ""),
                });
            }
            const days = Array.from(daysMap.values()).sort((a, b) => a.date < b.date ? 1 : -1);
            return res.status(200).json({
                status: true,
                summary,
                days,
            });
        }
        catch (err) {
            console.error("associateOnlyHistory error:", err);
            return res.status(500).json({
                status: false,
                message: "Server error: " + err.message,
            });
        }
    },
};
exports.default = BusinessController;
