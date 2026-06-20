"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const exclusiveOffer_service_1 = __importDefault(require("../services/exclusiveOffer.service"));
const storage_service_1 = require("../services/storage.service");
const service = new exclusiveOffer_service_1.default();
const toPublic = (absPath) => {
    const rel = path_1.default.relative(process.cwd(), absPath).split(path_1.default.sep).join("/");
    return `/${rel}`;
};
// helper: read JSON array from body safely
const parseJsonArray = (val) => {
    if (!val)
        return [];
    // if it's already an array from some middleware
    if (Array.isArray(val)) {
        return val.map((v) => String(v));
    }
    // if it's a JSON string like '["/a.png","/b.png"]'
    if (typeof val === "string") {
        try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
        }
        catch {
            return [];
        }
    }
    return [];
};
// normalize any array of values (strings/objects) into an array of string paths
const toPathArray = (items) => {
    if (!items)
        return [];
    const arr = Array.isArray(items) ? items : [items];
    return arr
        .map((item) => {
        if (typeof item === "string")
            return item;
        if (typeof item === "object" && item !== null) {
            const obj = item;
            return (obj.fileUrl ||
                obj.url ||
                obj.path ||
                obj.location ||
                "");
        }
        return "";
    })
        .filter((p) => typeof p === "string" && p.length > 0);
};
const deleteImages = (paths) => {
    const normalized = toPathArray(paths || []);
    normalized.forEach((p) => p && (0, storage_service_1.deleteIfExists)(p));
};
const MAX_IMAGES_PER_TYPE = 20;
const ExclusiveOfferController = {
    // GET /api/exclusiveOffer/all
    async getAll(req, res) {
        try {
            const draw = Number(req.query.draw || 1);
            const records = await service.fetchAll();
            const data = records.map((rec) => ({
                id: rec.id,
                business_id: rec.business_id,
                premium: toPathArray(rec.premium || []),
                elite: toPathArray(rec.elite || []),
                core: toPathArray(rec.core || []),
                is_active: rec.is_active ? 1 : 0,
            }));
            return res.json({
                draw,
                recordsTotal: records.length,
                recordsFiltered: records.length,
                data,
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({
                draw: 1,
                recordsTotal: 0,
                recordsFiltered: 0,
                data: [],
                message: "Internal Server Error",
            });
        }
    },
    async getByBusinessId(req, res) {
        try {
            const businessIdParam = req.params.businessId || req.query.business_id;
            const businessId = Number(businessIdParam);
            if (!businessId || Number.isNaN(businessId)) {
                return res.status(400).json({
                    message: "Valid business_id is required",
                });
            }
            const record = await service.findByBusinessId(businessId);
            if (!record) {
                return res.status(404).json({
                    message: "Exclusive offer not found for this business_id",
                });
            }
            return res.json({
                data: {
                    id: record.id,
                    business_id: record.business_id,
                    premium: toPathArray(record.premium || []),
                    elite: toPathArray(record.elite || []),
                    core: toPathArray(record.core || []),
                    is_active: record.is_active,
                    createdAt: record.createdAt,
                    updatedAt: record.updatedAt,
                },
            });
        }
        catch (err) {
            console.error(err);
            return res
                .status(500)
                .json({ message: err.message || "Something went wrong" });
        }
    },
    // GET /api/exclusiveOffer/by-business
    // business_id comes from token (req.user.id)
    async getByBusiness(req, res) {
        try {
            const businessId = req.user?.id;
            if (!businessId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const record = await service.findByBusinessId(businessId);
            if (!record) {
                return res.status(404).json({ message: "Exclusive offer not found" });
            }
            return res.json({
                data: {
                    id: record.id,
                    business_id: record.business_id,
                    premium: toPathArray(record.premium || []),
                    elite: toPathArray(record.elite || []),
                    core: toPathArray(record.core || []),
                    is_active: record.is_active,
                    createdAt: record.createdAt,
                    updatedAt: record.updatedAt,
                },
            });
        }
        catch (err) {
            console.error(err);
            return res
                .status(500)
                .json({ message: err.message || "Something went wrong" });
        }
    },
    // POST /api/exclusiveOffer/save
    // Uses token business_id; multi-image + selective delete via keep_*
    async saveByBusiness(req, res) {
        try {
            const businessId = req.user?.id;
            if (!businessId) {
                return res
                    .status(401)
                    .json({ message: "Unauthorized: No business ID in token" });
            }
            const isActiveRaw = req.body.is_active;
            const is_active = typeof isActiveRaw !== "undefined"
                ? Number(isActiveRaw) === 1
                : undefined;
            const existing = await service.findByBusinessId(businessId);
            const files = req.files;
            // which existing images to keep (for edit/delete)
            const keepPremium = parseJsonArray(req.body.keep_premium);
            const keepElite = parseJsonArray(req.body.keep_elite);
            const keepCore = parseJsonArray(req.body.keep_core);
            // current arrays from DB (normalize in case they are objects)
            const existingPremium = toPathArray(existing?.premium || []);
            const existingElite = toPathArray(existing?.elite || []);
            const existingCore = toPathArray(existing?.core || []);
            // delete removed images from disk
            const removedPremium = existingPremium.filter((p) => !keepPremium.includes(p));
            deleteImages(removedPremium);
            const removedElite = existingElite.filter((p) => !keepElite.includes(p));
            deleteImages(removedElite);
            const removedCore = existingCore.filter((p) => !keepCore.includes(p));
            deleteImages(removedCore);
            // start with kept ones
            let premiumImages = [...keepPremium];
            let eliteImages = [...keepElite];
            let coreImages = [...keepCore];
            // add newly uploaded images (compressed) – premium
            if (files?.premium?.length) {
                if (premiumImages.length + files.premium.length > MAX_IMAGES_PER_TYPE) {
                    return res.status(400).json({
                        message: `You can upload maximum ${MAX_IMAGES_PER_TYPE} premium images`,
                    });
                }
                for (const file of files.premium) {
                    const { fileUrl } = await (0, storage_service_1.saveCompressedImage)(file);
                    premiumImages.push(fileUrl);
                }
            }
            // elite
            if (files?.elite?.length) {
                if (eliteImages.length + files.elite.length > MAX_IMAGES_PER_TYPE) {
                    return res.status(400).json({
                        message: `You can upload maximum ${MAX_IMAGES_PER_TYPE} elite images`,
                    });
                }
                for (const file of files.elite) {
                    const { fileUrl } = await (0, storage_service_1.saveCompressedImage)(file);
                    eliteImages.push(fileUrl);
                }
            }
            // core
            if (files?.core?.length) {
                if (coreImages.length + files.core.length > MAX_IMAGES_PER_TYPE) {
                    return res.status(400).json({
                        message: `You can upload maximum ${MAX_IMAGES_PER_TYPE} core images`,
                    });
                }
                for (const file of files.core) {
                    const { fileUrl } = await (0, storage_service_1.saveCompressedImage)(file);
                    coreImages.push(fileUrl);
                }
            }
            const payload = {
                premium: premiumImages,
                elite: eliteImages,
                core: coreImages,
            };
            if (typeof is_active !== "undefined")
                payload.is_active = is_active;
            const { record, created } = await service.createOrUpdateByBusinessId(businessId, payload);
            return res.status(created ? 201 : 200).json({
                message: created
                    ? "Exclusive offer created successfully"
                    : "Exclusive offer updated successfully",
                exclusive_offer: record,
            });
        }
        catch (err) {
            console.error(err);
            return res
                .status(500)
                .json({ message: err.message || "Something went wrong" });
        }
    },
    // DELETE /api/exclusiveOffer/:id  (delete whole record)
    async deleteOffer(req, res) {
        try {
            const id = Number(req.params.id);
            const userId = req.user?.id;
            if (!id) {
                return res.status(400).json({ message: "id is required" });
            }
            const existing = await service.findById(id);
            if (!existing) {
                return res.status(404).json({ message: "Exclusive offer not found" });
            }
            if (existing.business_id !== userId) {
                return res.status(403).json({ message: "Forbidden" });
            }
            deleteImages(existing.premium || []);
            deleteImages(existing.elite || []);
            deleteImages(existing.core || []);
            await existing.destroy();
            return res.json({ message: "Exclusive offer deleted successfully" });
        }
        catch (err) {
            console.error(err);
            return res
                .status(500)
                .json({ message: err.message || "Something went wrong" });
        }
    },
    // DELETE /api/exclusiveOffer/:id/image
    // body: { section: "premium" | "elite" | "core", imageUrl: "..." }
    async deleteOneImage(req, res) {
        try {
            const id = Number(req.params.id);
            const userId = req.user?.id;
            const { section, imageUrl } = req.body;
            if (!id || !section || !imageUrl) {
                return res
                    .status(400)
                    .json({ message: "id, section, and imageUrl are required" });
            }
            if (!["premium", "elite", "core"].includes(section)) {
                return res.status(400).json({ message: "Invalid section" });
            }
            const existing = await service.findById(id);
            if (!existing) {
                return res.status(404).json({ message: "Exclusive offer not found" });
            }
            if (existing.business_id !== userId) {
                return res.status(403).json({ message: "Forbidden" });
            }
            const images = toPathArray(existing[section] || []);
            if (!images.includes(imageUrl)) {
                return res.status(404).json({ message: "Image not found in section" });
            }
            const updatedImages = images.filter((img) => img !== imageUrl);
            (0, storage_service_1.deleteIfExists)(imageUrl);
            existing[section] = updatedImages;
            await existing.save();
            return res.json({
                message: "Image deleted successfully",
                [section]: updatedImages,
            });
        }
        catch (err) {
            console.error(err);
            return res
                .status(500)
                .json({ message: err.message || "Something went wrong" });
        }
    },
};
exports.default = ExclusiveOfferController;
