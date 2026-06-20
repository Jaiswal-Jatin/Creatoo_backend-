"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Exclusive Offer Service. Manages business-specific tier-based offers.
 * Used By: ExclusiveOfferController
 * Database Model: ExclusiveOffer
 * Critical: Yes (Marketing/Loyalty)
 */
const ExclusiveOffer_1 = __importDefault(require("../models/ExclusiveOffer"));
class ExclusiveOfferService {
    async fetchAll() {
        return ExclusiveOffer_1.default.findAll();
    }
    async findById(id) {
        return ExclusiveOffer_1.default.findByPk(id);
    }
    async findByBusinessId(businessId) {
        return ExclusiveOffer_1.default.findOne({ where: { business_id: businessId } });
    }
    async create(data) {
        return ExclusiveOffer_1.default.create(data);
    }
    async updateByBusinessId(businessId, data) {
        const record = await this.findByBusinessId(businessId);
        if (!record)
            return null;
        return record.update(data);
    }
    async createOrUpdateByBusinessId(businessId, data) {
        const existing = await this.findByBusinessId(businessId);
        if (existing) {
            const updated = await existing.update(data);
            return { record: updated, created: false };
        }
        const created = await this.create({
            business_id: businessId,
            ...data,
        });
        return { record: created, created: true };
    }
}
exports.default = ExclusiveOfferService;
