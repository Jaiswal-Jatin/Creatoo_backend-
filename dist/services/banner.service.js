"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Banner Service. Handles logic for promotional banners.
 * Used By: BannerController
 * Database Model: Banner
 * Critical: No
 */
const Banner_1 = __importDefault(require("../models/Banner"));
class BannerService {
    findById(id) {
        return Banner_1.default.findByPk(id);
    }
    async create(payload) {
        return Banner_1.default.create({
            image: payload.image ?? null,
            link: payload.link ?? null,
            is_active: true,
        });
    }
    fetchRecord() {
        return Banner_1.default.findAll({ order: [["id", "DESC"]] });
    }
    fetch(id) {
        return Banner_1.default.findByPk(id);
    }
    async editBanner(id, data) {
        const banner = await Banner_1.default.findByPk(id);
        if (!banner)
            return null;
        if (typeof data.image !== "undefined")
            banner.image = data.image;
        if (typeof data.link !== "undefined")
            banner.link = data.link;
        await banner.save();
        return banner;
    }
    async delete(id) {
        const banner = await Banner_1.default.findByPk(id);
        if (!banner)
            return null;
        await banner.destroy();
        return banner;
    }
    changeStatus(id, status) {
        return Banner_1.default.update({ is_active: status === 1 }, { where: { id } });
    }
}
exports.default = BannerService;
