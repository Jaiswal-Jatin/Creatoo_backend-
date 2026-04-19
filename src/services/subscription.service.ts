/**
 * Module: Backend (API Server)
 * File Purpose: Subscription Service. Manages business plan lifecycles, including queuing and active status chaining.
 * Used By: SubscriptionController
 * Database Model: Subscription, Plan, Invoice
 * Critical: Yes (Revenue/Access Control)
 * Notes: Implements "addDays" helper and transaction-safe queuing for plan purchases.
 */
import Subscription, {
  SubscriptionStatus,
  PaymentMethod,
} from "../models/Subscription";
import Plan from "../models/Plan";
import Invoice from "../models/invoice";
import { WhereOptions, Op, Transaction } from "sequelize";
import sequelize from "../db/sequelize";

interface SubscriptionFilter {
  business_id?: number;
  status?: SubscriptionStatus;
  payment_method?: PaymentMethod;
}

// helper to add days
const addDays = (start: Date, days: number): Date => {
  const d = new Date(start);
  d.setDate(d.getDate() + days);
  return d;
};

export default class SubscriptionService {
  async fetchRecord(filters: SubscriptionFilter = {}) {
    const where: WhereOptions = {};

    if (filters.business_id) where["business_id"] = filters.business_id;
    if (filters.status) where["status"] = filters.status;
    if (filters.payment_method) where["payment_method"] = filters.payment_method;

    return Subscription.findAll({ where });
  }

  async fetch(id: number) {
    return Subscription.findByPk(id);
  }

  async findById(id: number) {
    return Subscription.findByPk(id);
  }

  async editSubscription(id: number, payload: any) {
    await Subscription.update(payload, { where: { id } });
    return Subscription.findByPk(id);
  }

  async delete(id: number) {
    const sub = await Subscription.findByPk(id);
    if (!sub) return null;
    await sub.destroy();
    return sub;
  }

  async changeStatus(id: number, status: SubscriptionStatus) {
    return Subscription.update({ status }, { where: { id } });
  }

  /**
   * Business purchase logic (queueing) – used by /purchase
   * - Reads price & duration from Plan
   * - Applies chain logic (active/queued/pending_payment)
   */
  async createForBusinessWithQueue(params: {
    business_id: number;
    plan_id: number;
    payment_method: PaymentMethod;
    transaction_id?: string | null;
    notes?: string | null;
    statusOverride?: SubscriptionStatus; // e.g. "pending_payment"
  }) {
    const {
      business_id,
      plan_id,
      payment_method,
      transaction_id,
      notes,
      statusOverride,
    } = params;

    // 🔹 Load plan – never trust client for price/duration
    const plan = await Plan.findByPk(plan_id);
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

    return sequelize.transaction(async (t: Transaction) => {
      const existing = await Subscription.findAll({
        where: {
          business_id,
          status: {
            [Op.in]: ["active", "queued", "pending_payment"],
          },
        },
        order: [["end_date", "DESC"]],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      const now = new Date();
      let start_date: Date;
      let status: SubscriptionStatus;

      if (!existing.length || existing[0].end_date <= now) {
        // No chain or already ended -> start now
        start_date = now;
        status = statusOverride || "active";
      } else {
        // Extend chain -> new sub starts from last end_date
        start_date = existing[0].end_date;
        status = statusOverride || "queued";
      }

      const end_date = addDays(start_date, durationDays);

      const sub = await Subscription.create(
        {
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
        },
        { transaction: t }
      );

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
  async createManualFromPlan(params: {
    business_id: number;
    plan_id: number;
    status?: SubscriptionStatus;
    payment_method?: PaymentMethod;
    start_date?: string | Date | null;
    notes?: string | null;
    transaction_id?: string | null;
  }) {
    const {
      business_id,
      plan_id,
      payment_method,
      notes,
      transaction_id,
    } = params;
    let { start_date, status } = params;

    // 🔹 Load plan
    const plan = await Plan.findByPk(plan_id);
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

    if (!status) status = "active";

    // normalize start_date
    let start: Date;
    if (start_date) {
      start = new Date(start_date);
    } else {
      start = new Date();
    }

    const end = addDays(start, durationDays);

    return Subscription.create({
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

  async getCurrentSubscription(business_id: number) {
    return Subscription.findOne({
      where: { business_id, status: "active" },
      order: [["end_date", "DESC"]],
    });
  }

  async getInvoices(business_id: number) {
    return Invoice.findAll({
      where: { business_id },
      order: [["createdAt", "DESC"]],
    });
  }
}
