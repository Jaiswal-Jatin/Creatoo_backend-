"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Business Type Service. Manages categories for businesses (e.g., Food, Fashion).
 * Used By: BusinessTypeController
 * Database Model: BusinessType
 * Critical: No
 */
const BusinessType_1 = __importDefault(require("../models/BusinessType"));
class BusinessTypeService {
    findById(id) {
        return BusinessType_1.default.findByPk(id);
    }
    async create(data) {
        return BusinessType_1.default.create({
            title: data.title,
            image: data.image ?? null,
            is_active: true,
        });
    }
    async fetchRecord() {
        return BusinessType_1.default.findAll({ order: [['id', 'DESC']] });
    }
    async editBusinessType(id, data) {
        const record = await BusinessType_1.default.findByPk(id);
        if (!record)
            return null;
        if (data.title)
            record.title = data.title;
        if (data.image)
            record.image = data.image;
        await record.save();
        return record;
    }
    async delete(id) {
        const record = await BusinessType_1.default.findByPk(id);
        if (!record)
            return null;
        await record.destroy();
        return record;
    }
    async changeStatus(id, status) {
        return BusinessType_1.default.update({ is_active: status === 1 }, { where: { id } });
    }
}
exports.default = BusinessTypeService;
