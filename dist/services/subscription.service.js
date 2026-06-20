"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Subscription Service. Manages business plan lifecycles, including queuing and active status chaining.
 * Used By: SubscriptionController
 * Database Model: Subscription, Plan, Invoice
 * Critical: Yes (Revenue/Access Control)
 * Notes: Implements "addDays" helper and transaction-safe queuing for plan purchases.
 */
const Subscription_1 = __importDefault(require("../models/Subscription"));
const Plan_1 = __importDefault(require("../models/Plan"));
const invoice_1 = __importDefault(require("../models/invoice"));
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../db/sequelize"));
// helper to add days
const addDays = (start, days) => {
    const d = new Date(start);
    d.setDate(d.getDate() + days);
    return d;
};
class SubscriptionService {
    async fetchRecord(filters = {}) {
        const where = {};
        if (filters.business_id)
            where["business_id"] = filters.business_id;
        if (filters.status)
            where["status"] = filters.status;
        if (filters.payment_method)
            where["payment_method"] = filters.payment_method;
        return Subscription_1.default.findAll({ where });
    }
    async fetch(id) {
        return Subscription_1.default.findByPk(id);
    }
    async findById(id) {
        return Subscription_1.default.findByPk(id);
    }
    async editSubscription(id, payload) {
        await Subscription_1.default.update(payload, { where: { id } });
        return Subscription_1.default.findByPk(id);
    }
    async delete(id) {
        const sub = await Subscription_1.default.findByPk(id);
        if (!sub)
            return null;
        await sub.destroy();
        return sub;
    }
    async changeStatus(id, status) {
        return Subscription_1.default.update({ status }, { where: { id } });
    }
    /**
     * Business purchase logic (queueing) – used by /purchase
     * - Reads price & duration from Plan
     * - Applies chain logic (active/queued/pending_payment)
     */
    async createForBusinessWithQueue(params) {
        const { business_id, plan_id, payment_method, transaction_id, notes, statusOverride, } = params;
        // 🔹 Load plan – never trust client for price/duration
        const plan = await Plan_1.default.findByPk(plan_id);
        if (!plan || !plan.is_active) {
            throw new Error("Invalid or inactive plan selected");
        }
        const price = Number(plan.price);
        const durationDays = Number(plan.duration_days);
        if (Number.isNaN(price) || price <= 0) {
            throw new Error("Plan price is not configured correctly");
        }
        if (Number.isNaN(durationDays) || durationDays <= 0) {
            throw new Error("Plan duration is not configured correctly");
        }
        return sequelize_2.default.transaction(async (t) => {
            const existing = await Subscription_1.default.findAll({
                where: {
                    business_id,
                    status: {
                        [sequelize_1.Op.in]: ["active", "queued", "pending_payment"],
                    },
                },
                order: [["end_date", "DESC"]],
                lock: t.LOCK.UPDATE,
                transaction: t,
            });
            const now = new Date();
            let start_date;
            let status;
            if (!existing.length || existing[0].end_date <= now) {
                // No chain or already ended -> start now
                start_date = now;
                status = statusOverride || "active";
            }
            else {
                // Extend chain -> new sub starts from last end_date
                start_date = existing[0].end_date;
                status = statusOverride || "queued";
            }
            const end_date = addDays(start_date, durationDays);
            const sub = await Subscription_1.default.create({
                business_id,
                plan_id,
                price,
                duration: durationDays,
                status,
                auto_renew: false,
                start_date,
                end_date,
                payment_method,
                transaction_id: transaction_id || null,
                notes: notes || null,
            }, { transaction: t });
            return sub;
        });
    }
    /**
     * Admin manual creation using plan – used by /api/subscription/add
     * - Admin passes business_id + plan_id (optionally status, payment_method, start_date)
     * - Service loads plan.price & plan.duration_days
     * - start_date: given or now
     * - end_date: start_date + plan.duration_days
     */
    async createManualFromPlan(params) {
        const { business_id, plan_id, payment_method, notes, transaction_id, } = params;
        let { start_date, status } = params;
        // 🔹 Load plan
        const plan = await Plan_1.default.findByPk(plan_id);
        if (!plan || !plan.is_active) {
            throw new Error("Invalid or inactive plan selected");
        }
        const price = Number(plan.price);
        const durationDays = Number(plan.duration_days);
        if (Number.isNaN(price) || price <= 0) {
            throw new Error("Plan price is not configured correctly");
        }
        if (Number.isNaN(durationDays) || durationDays <= 0) {
            throw new Error("Plan duration is not configured correctly");
        }
        if (!status)
            status = "active";
        // normalize start_date
        let start;
        if (start_date) {
            start = new Date(start_date);
        }
        else {
            start = new Date();
        }
        const end = addDays(start, durationDays);
        return Subscription_1.default.create({
            business_id,
            plan_id,
            price,
            duration: durationDays,
            status,
            auto_renew: false,
            start_date: start,
            end_date: end,
            payment_method: payment_method || null,
            transaction_id: transaction_id || null,
            notes: notes || null,
        });
    }
    async getCurrentSubscription(business_id) {
        return Subscription_1.default.findOne({
            where: { business_id, status: "active" },
            order: [["end_date", "DESC"]],
        });
    }
    async getInvoices(business_id) {
        return invoice_1.default.findAll({
            where: { business_id },
            order: [["createdAt", "DESC"]],
        });
    }
}
exports.default = SubscriptionService;
