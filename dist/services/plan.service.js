"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Plan Service. Handles CRUD for subscription plans.
 * Used By: PlanController, SubscriptionService
 * Database Model: Plan
 * Critical: Yes (Service Configuration)
 */
const Plan_1 = __importDefault(require("../models/Plan"));
class PlanService {
    // Get all plans (optionally only active)
    async getPlans(options) {
        const where = {};
        if (options?.onlyActive) {
            where.is_active = true;
        }
        return Plan_1.default.findAll({
            where,
            order: [["id", "DESC"]],
        });
    }
    // If you still need "global plan" somewhere else, this returns active ones (array)
    async getGlobalPlan() {
        return this.getPlans({ onlyActive: true });
    }
    async createGlobalPlan(payload) {
        return Plan_1.default.create({
            name: payload.name,
            description: payload.description ?? null,
            price: payload.price,
            duration_days: payload.duration_days,
            is_active: typeof payload.is_active === "boolean" ? payload.is_active : true,
        });
    }
    async updatePlan(id, payload) {
        const plan = await Plan_1.default.findByPk(id);
        if (!plan)
            return null;
        await plan.update(payload);
        return plan;
    }
}
exports.default = PlanService;
