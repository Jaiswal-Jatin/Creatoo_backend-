"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Card_1 = __importDefault(require("../models/Card"));
const Visit_1 = __importDefault(require("../models/Visit"));
const User_1 = __importDefault(require("../models/User"));
const Business_1 = __importDefault(require("../models/Business"));
const BusinessAssociate_1 = __importDefault(require("../models/BusinessAssociate"));
class VisitController {
    /**
     * Format a Date as IST string "YYYY-MM-DD HH:MM:SS"
     */
    formatIST(date) {
        const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
        if (!(d instanceof Date) || isNaN(d.getTime()))
            return "";
        return d
            .toLocaleString("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        })
            .replace(",", "");
    }
    /**
     * Format a Date as IST date-only string "YYYY-MM-DD"
     */
    formatISTDate(date) {
        const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
        if (!(d instanceof Date) || isNaN(d.getTime()))
            return "";
        return d.toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    }
    /**
     * Helper: Check if a business is a main/parent business (has direct associates)
     * Returns true if this business has associates, false if it's an associate or standalone
     */
    async isMainBusiness(businessId) {
        const associates = await BusinessAssociate_1.default.findOne({
            where: { parent_business_id: businessId },
        });
        return !!associates;
    }
    /**
     * Helper: Get all business IDs in the associate network (recursive)
     * Returns ALL businesses connected in the hierarchy (parents, associates, and associates of parents)
     */
    async getAssociateNetwork(businessId) {
        const visited = new Set();
        const toProcess = [businessId];
        while (toProcess.length > 0) {
            const currentId = toProcess.shift();
            if (visited.has(currentId))
                continue;
            visited.add(currentId);
            // Get all direct associates (where current is parent)
            const associates = await BusinessAssociate_1.default.findAll({
                where: { parent_business_id: currentId },
                attributes: ['associate_business_id']
            });
            // Get all parent businesses (where current is associate)
            const parents = await BusinessAssociate_1.default.findAll({
                where: { associate_business_id: currentId },
                attributes: ['parent_business_id']
            });
            // Add to processing queue
            associates.forEach((a) => {
                if (!visited.has(a.associate_business_id)) {
                    toProcess.push(a.associate_business_id);
                }
            });
            parents.forEach((p) => {
                if (!visited.has(p.parent_business_id)) {
                    toProcess.push(p.parent_business_id);
                }
            });
        }
        return Array.from(visited);
    }
    /**
     * Tier logic:
     * - No history => "new"
     * - last visit 0–7 days => "premium"
     * - last visit 8–15 days => "elite"
     * - last visit >15 days => "core"
     */
    calculateTier(lastVisit) {
        if (!lastVisit)
            return "new";
        const now = Date.now();
        const timeValue = lastVisit.time;
        const timeMs = typeof timeValue === "string" ? new Date(timeValue).getTime() : timeValue.getTime();
        const diffDays = Math.floor((now - timeMs) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7)
            return "premium";
        if (diffDays <= 15)
            return "elite";
        return "core";
    }
    /**
     * Associate-aware tier calculation:
     * Considers visits to any business in the associate network
     */
    async calculateAssociateTier(cardNumber, businessId) {
        // Get all business IDs in the associate network
        const networkIds = await this.getAssociateNetwork(businessId);
        // Find the last visit for this card across the entire network
        const lastVisit = await Visit_1.default.findOne({
            where: {
                card_number: cardNumber,
                business_id: { [sequelize_1.Op.in]: networkIds }
            },
            order: [["time", "DESC"]],
        });
        return this.calculateTier(lastVisit);
    }
    /**
     * Helper: Load business info from both `businesses` and `users` tables,
     * preferring data from the `businesses` table.
     * Returns a Map<businessId, { business_name, business_image, business_category }>
     */
    async loadBusinesses(businessIds) {
        const businessMap = new Map();
        if (businessIds.length === 0)
            return businessMap;
        // Try businesses table first
        const bizRecords = await Business_1.default.findAll({
            where: { id: { [sequelize_1.Op.in]: businessIds } },
            attributes: ["id", "business_name", "business_image", "business_category"],
        });
        const foundIds = new Set();
        bizRecords.forEach((b) => {
            foundIds.add(b.id);
            businessMap.set(b.id, {
                business_name: b.business_name ?? null,
                business_image: b.business_image ?? null,
                business_category: b.business_category ?? null,
            });
        });
        // Fallback to users table for any IDs not found in businesses
        const missingIds = businessIds.filter(id => !foundIds.has(id));
        if (missingIds.length > 0) {
            const userRecords = await User_1.default.findAll({
                where: { id: { [sequelize_1.Op.in]: missingIds } },
                attributes: ["id", "business_name", "business_image", "business_category"],
            });
            userRecords.forEach((u) => {
                businessMap.set(u.id, {
                    business_name: u.business_name ?? null,
                    business_image: u.business_image ?? null,
                    business_category: u.business_category ?? null,
                });
            });
        }
        return businessMap;
    }
    /**
     * BUSINESS SIDE
     * GET /api/visit?card_number=1
     *  - card info (with user_image)
     *  - visit history for that card & business
     *  - tier for that card & business
     */
    async getVisitInfo(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res
                    .status(401)
                    .json({ status: false, message: "Unauthorized" });
            }
            const businessId = req.user.id;
            const cardNumberRaw = req.query.card_number;
            if (!cardNumberRaw) {
                return res.status(422).json({
                    status: false,
                    message: "card_number is required as query param",
                });
            }
            const cardNumber = Number(cardNumberRaw);
            if (Number.isNaN(cardNumber)) {
                return res.status(422).json({
                    status: false,
                    message: "card_number must be numeric",
                });
            }
            // 1) Find card
            const card = await Card_1.default.findOne({ where: { number: cardNumber } });
            if (!card) {
                return res
                    .status(404)
                    .json({ status: false, message: "Card not found" });
            }
            // 2) Last visit for this card & business
            const lastVisit = await Visit_1.default.findOne({
                where: { card_number: cardNumber, business_id: businessId },
                order: [["time", "DESC"]],
            });
            // Use associate-aware tier calculation
            const tier = await this.calculateAssociateTier(cardNumber, businessId);
            // 3) Full history for this card & business (or network if main business)
            const isMainBusiness = await this.isMainBusiness(businessId);
            let history;
            let businessIdsList;
            if (isMainBusiness) {
                // Main business sees visits from entire network
                const networkIds = await this.getAssociateNetwork(businessId);
                businessIdsList = networkIds;
                history = await Visit_1.default.findAll({
                    where: { card_number: cardNumber, business_id: { [sequelize_1.Op.in]: networkIds } },
                    order: [["time", "DESC"]],
                });
            }
            else {
                // Associate business sees only their own visits
                businessIdsList = [businessId];
                history = await Visit_1.default.findAll({
                    where: { card_number: cardNumber, business_id: businessId },
                    order: [["time", "DESC"]],
                });
            }
            // Load business information for network visits
            const businessMap = await this.loadBusinesses(businessIdsList);
            // 4) Load users for user_image
            const rawUserIds = [
                card.user_id,
                ...history.map((v) => v.user_id),
            ].filter(Boolean);
            const uniqueUserIds = Array.from(new Set(rawUserIds
                .map((id) => Number(id))
                .filter((n) => !Number.isNaN(n))));
            const userMap = new Map();
            if (uniqueUserIds.length > 0) {
                const users = await User_1.default.findAll({
                    where: { id: { [sequelize_1.Op.in]: uniqueUserIds } },
                    attributes: ["id", "user_image", "name"],
                });
                users.forEach((u) => {
                    userMap.set(u.id, {
                        user_image: u.user_image ?? null,
                        name: u.name ?? null,
                    });
                });
            }
            const cardUserId = card.user_id ? Number(card.user_id) : null;
            const cardUserData = cardUserId && userMap.has(cardUserId)
                ? userMap.get(cardUserId)
                : null;
            return res.status(200).json({
                status: true,
                card: {
                    card_number: card.number,
                    name: card.name,
                    user_id: card.user_id,
                    user_image: cardUserData?.user_image ?? null,
                },
                tier,
                visit_history: history.map((v) => {
                    const uid = v.user_id ? Number(v.user_id) : null;
                    const u = uid && userMap.has(uid) ? userMap.get(uid) : null;
                    const businessInfo = businessMap.get(v.business_id);
                    return {
                        id: v.id,
                        user_id: v.user_id,
                        card_number: v.card_number,
                        business_id: v.business_id,
                        business_name: businessInfo?.business_name ?? null,
                        business_image: businessInfo?.business_image ?? null,
                        tier: v.tier,
                        time: this.formatIST(v.time), // IST
                        user_image: u?.user_image ?? null,
                        user_name: u?.name ?? null,
                    };
                }),
            });
        }
        catch (err) {
            console.error("getVisitInfo error:", err);
            return res.status(500).json({
                status: false,
                message: "Server error: " + err.message,
            });
        }
    }
    /**
     * BUSINESS SIDE
     * POST /api/visit
     * Body: { card_number: number }
     */
    async createVisit(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res
                    .status(401)
                    .json({ status: false, message: "Unauthorized" });
            }
            const businessId = req.user.id;
            const { card_number } = req.body;
            if (!card_number) {
                return res.status(422).json({
                    status: false,
                    message: "card_number is required",
                });
            }
            const cardNumber = Number(card_number);
            if (Number.isNaN(cardNumber)) {
                return res.status(422).json({
                    status: false,
                    message: "card_number must be numeric",
                });
            }
            const card = await Card_1.default.findOne({ where: { number: cardNumber } });
            if (!card) {
                return res
                    .status(404)
                    .json({ status: false, message: "Card not found" });
            }
            const lastVisit = await Visit_1.default.findOne({
                where: { card_number: cardNumber, business_id: businessId },
                order: [["time", "DESC"]],
            });
            // Use associate-aware tier calculation
            const tier = await this.calculateAssociateTier(cardNumber, businessId);
            await Visit_1.default.create({
                user_id: card.user_id,
                card_number: card.number,
                business_id: businessId,
                tier,
                time: new Date(),
            });
            const history = await Visit_1.default.findAll({
                where: { card_number: cardNumber, business_id: businessId },
                order: [["time", "DESC"]],
            });
            // Load business information for the response
            const businessMap = await this.loadBusinesses([businessId]);
            return res.status(200).json({
                status: true,
                message: "Visit recorded successfully",
                tier,
                card: {
                    card_number: card.number,
                    name: card.name,
                    user_id: card.user_id,
                },
                visit_history: history.map((v) => {
                    const businessInfo = businessMap.get(v.business_id);
                    return {
                        id: v.id,
                        user_id: v.user_id,
                        card_number: v.card_number,
                        business_id: v.business_id,
                        business_name: businessInfo?.business_name ?? null,
                        business_image: businessInfo?.business_image ?? null,
                        tier: v.tier,
                        time: this.formatIST(v.time), // IST
                    };
                }),
            });
        }
        catch (err) {
            console.error("createVisit error:", err);
            return res.status(500).json({
                status: false,
                message: "Server error: " + err.message,
            });
        }
    }
    /**
     * BUSINESS SIDE
     * GET /api/visit/history
     *  - summary: counts of premium / elite / core / new
     *  - days: visits grouped by date (for this business and associate businesses)
     *  - Main business sees all visits including associate business visits with business names
     *  - Associate business sees only their own visits
     *  - Mobile clients can request only main business visits via ?mobile=true
     */
    async history(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res
                    .status(401)
                    .json({ status: false, message: "Unauthorized" });
            }
            const businessId = req.user.id;
            // Check if this is a main business (has direct associates)
            const main = await this.isMainBusiness(businessId);
            // Check if mobile client is requesting (query param: ?mobile=true)
            const isMobileClient = req.query.mobile === "true";
            let visits;
            let businessIds;
            if (main) {
                // Main business logic:
                // - Web: gets all visits from their network
                // - Mobile: gets only their own main business visits
                if (isMobileClient) {
                    // Mobile: show only main business visits, not network
                    businessIds = [businessId];
                    visits = await Visit_1.default.findAll({
                        where: { business_id: businessId },
                        order: [["time", "DESC"]],
                    });
                }
                else {
                    // Web: show full network
                    const networkIds = await this.getAssociateNetwork(businessId);
                    businessIds = networkIds;
                    visits = await Visit_1.default.findAll({
                        where: { business_id: { [sequelize_1.Op.in]: businessIds } },
                        order: [["time", "DESC"]],
                    });
                }
            }
            else {
                // Associate business gets only their own visits
                businessIds = [businessId];
                visits = await Visit_1.default.findAll({
                    where: { business_id: businessId },
                    order: [["time", "DESC"]],
                });
            }
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
            // Load business information for all businesses in the visit data
            const businessMap = await this.loadBusinesses(businessIds);
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
                const dateKey = this.formatISTDate(v.time);
                if (!daysMap.has(dateKey)) {
                    daysMap.set(dateKey, { date: dateKey, visits: [] });
                }
                const group = daysMap.get(dateKey);
                const businessInfo = businessMap.get(v.business_id);
                group.visits.push({
                    card_number: v.card_number,
                    name: cardNameMap.get(v.card_number) ?? null,
                    tier: v.tier,
                    time: this.formatIST(v.time), // IST
                    business_id: v.business_id,
                    business_name: businessInfo?.business_name ?? null,
                });
            }
            const days = Array.from(daysMap.values()).sort((a, b) => a.date < b.date ? 1 : -1);
            return res.status(200).json({
                status: true,
                summary,
                days,
                is_main_business: main,
                network_businesses: businessIds.map(id => ({
                    business_id: id,
                    business_name: businessMap.get(id)?.business_name ?? null,
                })),
            });
        }
        catch (err) {
            console.error("history error:", err);
            return res.status(500).json({
                status: false,
                message: "Server error: " + err.message,
            });
        }
    }
    // =================== USER SIDE ===================
    // GET /api/visit/user-history
    //
    // Token = user (card owner)
    // Returns restaurant-wise history:
    //  - total_visits
    //  - restaurants: [ { business_id, business_name, business_image, total_visits, last_visit, current_tier, visits[] } ]
    async userHistory(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    status: false,
                    message: "Unauthorized",
                });
            }
            const userId = req.user.id;
            // 1) Find all cards for this user
            const cards = await Card_1.default.findAll({ where: { user_id: userId } });
            if (cards.length === 0) {
                return res.status(200).json({
                    status: true,
                    total_visits: 0,
                    businesses: [],
                });
            }
            const cardNumbers = cards.map((c) => c.number);
            // 2) All visits for this user (any business, any card)
            const visits = await Visit_1.default.findAll({
                where: {
                    user_id: userId,
                    card_number: { [sequelize_1.Op.in]: cardNumbers },
                },
                order: [["time", "DESC"]],
            });
            if (visits.length === 0) {
                return res.status(200).json({
                    status: true,
                    total_visits: 0,
                    businesses: [],
                });
            }
            const totalVisits = visits.length;
            // 3) Group visits by business_id
            const byBusiness = new Map();
            for (const v of visits) {
                if (!byBusiness.has(v.business_id)) {
                    byBusiness.set(v.business_id, []);
                }
                byBusiness.get(v.business_id).push(v);
            }
            // 4) Load businesses (correct columns)
            const businessIds = Array.from(byBusiness.keys());
            const businessMap = await this.loadBusinesses(businessIds);
            // 5) Build business-wise structure WITH visits and associate business info
            const businessesData = Array.from(byBusiness.entries()).map(([businessId, bizVisits]) => {
                const lastVisit = bizVisits[0]; // already sorted DESC
                const currentTier = this.calculateTier(lastVisit);
                const bizInfo = businessMap.get(businessId) || {
                    business_name: null,
                    business_image: null,
                    business_category: null,
                };
                return {
                    business_id: businessId,
                    business_name: bizInfo.business_name,
                    business_image: bizInfo.business_image,
                    business_category: bizInfo.business_category,
                    current_tier: currentTier,
                    total_visits: bizVisits.length,
                    last_visit: this.formatIST(lastVisit.time), // IST
                    visits: bizVisits.map((v) => ({
                        time: this.formatIST(v.time), // IST
                        tier: v.tier,
                        card_number: v.card_number,
                        business_id: v.business_id,
                        business_name: bizInfo.business_name,
                    })),
                };
            });
            // 6) Sort businesses by last_visit (DESC)
            businessesData.sort((a, b) => new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime());
            return res.status(200).json({
                status: true,
                total_visits: totalVisits,
                businesses: businessesData,
            });
        }
        catch (err) {
            console.error("userHistory error:", err);
            return res.status(500).json({
                status: false,
                message: "Server error: " + err.message,
            });
        }
    }
    /**
     * USER SIDE
     * GET /api/visit/user-all-history
     *
     * Returns a flat list of ALL visits for this user (no grouping),
     * with business name + image for each visit.
     */
    async userAllHistory(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    status: false,
                    message: "Unauthorized",
                });
            }
            const userId = req.user.id;
            // 1) All cards for this user
            const cards = await Card_1.default.findAll({
                where: { user_id: userId },
                attributes: ["number"],
            });
            if (cards.length === 0) {
                return res.status(200).json({
                    status: true,
                    history: [],
                });
            }
            const cardNumbers = cards.map((c) => c.number);
            // 2) All visits for this user (any business, any of their cards)
            const visits = await Visit_1.default.findAll({
                where: {
                    user_id: userId,
                    card_number: { [sequelize_1.Op.in]: cardNumbers },
                },
                order: [["time", "DESC"]],
            });
            if (visits.length === 0) {
                return res.status(200).json({
                    status: true,
                    history: [],
                });
            }
            // 3) Load businesses (business_name & business_image from businesses/user tables)
            const businessIds = Array.from(new Set(visits.map((v) => v.business_id)));
            const businessMap = await this.loadBusinesses(businessIds);
            // 4) Build flat history list
            const history = visits.map((v) => {
                const biz = businessMap.get(v.business_id) || {
                    business_name: null,
                    business_image: null,
                };
                return {
                    id: v.id,
                    business_id: v.business_id,
                    business_name: biz.business_name,
                    business_image: biz.business_image,
                    time: this.formatIST(v.time), // IST
                    tier: v.tier,
                    card_number: v.card_number,
                };
            });
            return res.status(200).json({
                status: true,
                history,
            });
        }
        catch (err) {
            console.error("userAllHistory error:", err);
            return res.status(500).json({
                status: false,
                message: "Server error: " + err.message,
            });
        }
    }
    /**
     * BUSINESS SIDE
     * GET /api/visit/business-visits
     * Returns a flat list of all visits for this business with user details.
     * Supports optional search by user name and date filtering.
     */
    async getBusinessVisits(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({ status: false, message: "Unauthorized" });
            }
            const businessId = req.user.id;
            const search = req.query.search;
            const from = req.query.from;
            const to = req.query.to;
            const whereClause = { business_id: businessId };
            if (from || to) {
                const timeFilter = {};
                if (from)
                    timeFilter[sequelize_1.Op.gte] = new Date(from);
                if (to)
                    timeFilter[sequelize_1.Op.lte] = new Date(to);
                whereClause.time = timeFilter;
            }
            let visits = await Visit_1.default.findAll({
                where: whereClause,
                order: [["time", "DESC"]],
            });
            // Load user details linked via card user_id
            const userIds = Array.from(new Set(visits.map((v) => v.user_id).filter(Boolean).map(Number)));
            const userMap = new Map();
            if (userIds.length > 0) {
                const users = await User_1.default.findAll({
                    where: { id: { [sequelize_1.Op.in]: userIds } },
                    attributes: ["id", "name", "user_image", "mobile"],
                });
                users.forEach((u) => {
                    userMap.set(u.id, {
                        name: u.name ?? null,
                        user_image: u.user_image ?? null,
                        mobile: u.mobile ?? null,
                    });
                });
            }
            // Load card names
            const cardNumbers = Array.from(new Set(visits.map((v) => v.card_number)));
            const cards = await Card_1.default.findAll({
                where: { number: { [sequelize_1.Op.in]: cardNumbers } },
                attributes: ["number", "name"],
            });
            const cardNameMap = new Map();
            cards.forEach((c) => {
                cardNameMap.set(c.number, c.name ?? null);
            });
            let result = visits.map((v) => {
                const userId = v.user_id ? Number(v.user_id) : null;
                const user = userId && userMap.has(userId) ? userMap.get(userId) : null;
                return {
                    id: v.id,
                    user_id: v.user_id,
                    card_number: v.card_number,
                    card_name: cardNameMap.get(v.card_number) ?? null,
                    tier: v.tier,
                    time: this.formatIST(v.time),
                    user_name: user?.name ?? null,
                    user_image: user?.user_image ?? null,
                    user_mobile: user?.mobile ?? null,
                };
            });
            // Client-side search filter by user name
            if (search && search.trim().length > 0) {
                const q = search.toLowerCase();
                result = result.filter((r) => (r.user_name && r.user_name.toLowerCase().includes(q)) ||
                    (r.card_name && r.card_name.toLowerCase().includes(q)));
            }
            return res.status(200).json({
                status: true,
                data: result,
                total: result.length,
            });
        }
        catch (err) {
            console.error("getBusinessVisits error:", err);
            return res.status(500).json({
                status: false,
                message: "Server error: " + err.message,
            });
        }
    }
}
exports.default = new VisitController();
