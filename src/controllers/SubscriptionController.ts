import { Request, Response } from "express";
import axios from "axios";
import crypto from "crypto";
import { Op } from "sequelize";

import SubscriptionService from "../services/subscription.service";
import Subscription, { SubscriptionStatus } from "../models/Subscription";
import { Invoice } from "../models/invoice";

const service = new SubscriptionService();

/**
 * Helper: find invoice using Razorpay order id or fallback to transaction_id
 */
const findInvoiceByOrder = async (orderId: string) => {
  if (!orderId) return null;

  // 1) Try by razorpay_order_id
  let invoice = await Invoice.findOne({
    where: { razorpay_order_id: orderId },
  });

  // 2) Fallback by transaction_id
  if (!invoice) {
    invoice = await Invoice.findOne({
      where: { transaction_id: orderId },
    });
  }

  return invoice;
};

export default {
  // ==============================
  // ADMIN: LIST ALL SUBSCRIPTIONS
  // GET /subscription/all
  // ==============================
  async getAllSubscriptionService(req: Request, res: Response) {
    try {
      const draw = Number(req.query.draw || 1);

      const filters: any = {};
      if (req.query.business_id) {
        const businessIdNum = Number(req.query.business_id);
        if (!Number.isNaN(businessIdNum)) {
          filters.business_id = businessIdNum;
        }
      }
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.payment_method) {
        filters.payment_method = req.query.payment_method;
      }

      const records = await service.fetchRecord(filters);

      const data = records.map((rec: any) => ({
        id: rec.id,
        business_id: rec.business_id,
        price: rec.price,
        duration: rec.duration,
        status: rec.status,
        start_date: rec.start_date,
        end_date: rec.end_date,
        auto_renew: rec.auto_renew,
        payment_method: rec.payment_method,
        transaction_id: rec.transaction_id,
        notes: rec.notes,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
      }));

      return res.json({
        draw,
        recordsTotal: records.length,
        recordsFiltered: records.length,
        data,
      });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({
        draw: 1,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: [],
        message: error.message || "Internal Server Error",
      });
    }
  },

  // ==============================
  // VIEW STUB
  // GET /subscription/add
  // ==============================
  subscriptionView(_req: Request, res: Response) {
    res.json({ message: "Render 'subscription.add' page in your front-end." });
  },

  // ==============================
  // ADMIN: CREATE MANUAL SUB (USING PLAN)
  // POST /subscription/add
  // ==============================
  async addSubscription(req: Request, res: Response) {
    try {
      const {
        business_id,
        plan_id,
        payment_method,
        transaction_id,
        notes,
        status,
      } = req.body;

      if (!business_id) {
        return res.status(422).json({ message: "business_id is required" });
      }
      if (!plan_id) {
        return res.status(422).json({ message: "plan_id is required" });
      }

      const businessIdNum = Number(business_id);
      const planIdNum = Number(plan_id);

      if (Number.isNaN(businessIdNum) || businessIdNum <= 0) {
        return res
          .status(422)
          .json({ message: "business_id must be a positive number" });
      }

      if (Number.isNaN(planIdNum) || planIdNum <= 0) {
        return res
          .status(422)
          .json({ message: "plan_id must be a positive number" });
      }

      const subscription = await service.createForBusinessWithQueue({
        business_id: businessIdNum,
        plan_id: planIdNum,
        payment_method: payment_method || null,
        transaction_id: transaction_id || null,
        notes: notes || null,
        statusOverride: status as SubscriptionStatus | undefined,
      });

      return res.status(201).json({
        message: "Subscription created successfully from plan",
        subscription,
      });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ message: err.message || "Something went wrong" });
    }
  },

  // ===============================================================
  // BUSINESS PURCHASE – INIT ONLY
  // POST /subscription/purchase
  //
  // MODE: INIT
  //   body: { plan_id, payment_method }
  //
  //   → creates subscription (pending)
  //   → creates Razorpay order
  //   → updates subscription.transaction_id
  //   → creates invoice (pending)
  // ===============================================================
  async purchaseForBusiness(req: Request, res: Response) {
    try {
      const user: any = (req as any).user || {};
      const business_id = user.id || req.body.business_id || req.body.id;

      if (!business_id) {
        return res.status(400).json({
          message: "Business ID not found",
        });
      }

      const { plan_id, payment_method } = req.body;

      if (!plan_id) {
        return res
          .status(422)
          .json({ message: "plan_id is required to purchase subscription" });
      }

      const planIdNum = Number(plan_id);
      if (Number.isNaN(planIdNum) || planIdNum <= 0) {
        return res
          .status(422)
          .json({ message: "plan_id must be a positive number" });
      }

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        return res.status(500).json({
          message: "Razorpay keys not configured",
        });
      }

      // 1) Create subscription first (in pending_payment) from plan
      const subscription = await service.createForBusinessWithQueue({
        business_id: Number(business_id),
        plan_id: planIdNum,
        payment_method: payment_method || null,
        statusOverride: "pending_payment",
        // transaction_id will be set AFTER we get Razorpay order id
      });

      const amount = Number((subscription as any).price);
      if (Number.isNaN(amount) || amount <= 0) {
        console.error(
          "❌ Invalid price returned from subscription for Razorpay:",
          amount
        );
        return res
          .status(500)
          .json({ message: "Invalid subscription price for Razorpay" });
      }

      const amountInPaise = Math.round(amount * 100);
      const receipt = `SUB-${business_id}-${Date.now()}`;

      // 2) Create Razorpay order with subscription price
      const razorpayResp = await axios.post(
        "https://api.razorpay.com/v1/orders",
        {
          amount: amountInPaise,
          currency: "INR",
          receipt,
          payment_capture: 1,
        },
        {
          auth: {
            username: keyId,
            password: keySecret,
          },
        }
      );

      const order = razorpayResp.data;
      // console.log("🧾 Razorpay order created:", order);

      // 3) Update subscription with Razorpay order id as transaction_id
      await Subscription.update(
        { transaction_id: order.id },
        { where: { id: (subscription as any).id } }
      );

      // 4) Create invoice linked to this subscription
      const invoice = await Invoice.create({
        business_id: Number(business_id),
        subscription_id: (subscription as any).id,
        amount,
        payment_method: payment_method || null,
        status: "pending",
        razorpay_order_id: order.id,
        transaction_id: order.id,
      } as any);

      // console.log("🧾 Invoice created for subscription:", {
      //   invoice_id: invoice.id,
      //   razorpay_order_id: invoice.razorpay_order_id,
      // });

      return res.status(201).json({
        status: true,
        message: "Order created. Complete payment via Razorpay.",
        subscription,
        invoice,
        razorpay: {
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          key_id: keyId,
        },
      });
    } catch (err: any) {
      console.error("purchaseForBusiness ERROR:", err?.response?.data || err);
      return res.status(500).json({
        message: err.message || "Something went wrong",
      });
    }
  },

  // ===============================================================
  // BUSINESS PAYMENT SUCCESS – SEPARATE ENDPOINT
  // POST /subscription/payment-success
  //
  // MODE: SUCCESS
  //   body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_status? }
  //
  //   → verifies Razorpay signature
  //   → marks invoice as paid
  //   → activates subscription
  // ===============================================================
  async paymentSuccess(req: Request, res: Response) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_status,
      } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          status: false,
          message:
            "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
        });
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

      if (!keySecret) {
        return res.status(500).json({
          status: false,
          message: "Razorpay secret not configured",
        });
      }

      // console.log("🟢 Razorpay SUCCESS Callback Detected:", {
      //   razorpay_order_id,
      //   razorpay_payment_id,
      //   payment_status,
      // });

      // Verify signature
      const expectedSig = crypto
        .createHmac("sha256", keySecret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (expectedSig !== razorpay_signature) {
        console.error("❌ Invalid Razorpay signature", {
          expectedSig,
          razorpay_signature,
        });
        return res.status(400).json({
          status: false,
          message: "Invalid Razorpay signature",
        });
      }

      // Optional: if payment_status provided and not SUCCESS, ignore
      if (payment_status && payment_status !== "SUCCESS") {
        return res.status(200).json({
          status: true,
          message: "Payment not successful, no changes applied",
        });
      }

      // Find invoice
      const invoice = await findInvoiceByOrder(razorpay_order_id);

      if (!invoice) {
        console.error(
          "❌ Invoice not found for Razorpay order id:",
          razorpay_order_id
        );
        return res.status(404).json({
          status: false,
          message: "Invoice not found for this Razorpay order id",
        });
      }

      // Mark invoice as paid
      (invoice as any).status = "paid";
      // If these fields exist in your model, uncomment:
      // (invoice as any).razorpay_payment_id = razorpay_payment_id;
      // (invoice as any).payment_status = "SUCCESS";
      await invoice.save();

      // Find & activate subscription
      let subscription: any = null;

      // Try via subscription_id from invoice
      if ((invoice as any).subscription_id) {
        subscription = await Subscription.findByPk(
          (invoice as any).subscription_id
        );
      }

      // Fallback: via business_id + transaction_id (Razorpay order id)
      if (!subscription) {
        subscription = await Subscription.findOne({
          where: {
            business_id: invoice.business_id,
            transaction_id: razorpay_order_id,
          },
        });
      }

      if (subscription) {
        subscription.status = "active";

        // Ensure dates
        if (!subscription.start_date) {
          subscription.start_date = new Date();
        }

        if (!subscription.end_date) {
          const duration = subscription.duration || 30;
          const end = new Date(subscription.start_date);
          end.setDate(end.getDate() + duration);
          subscription.end_date = end;
        }

        await subscription.save();
      } else {
        console.warn(
          "⚠️ Subscription not found for invoice, only invoice marked as paid"
        );
      }

      return res.json({
        status: true,
        message: "Payment successful. Subscription activated.",
        data: {
          invoice_id: invoice.id,
          subscription_id: subscription ? subscription.id : null,
        },
      });
    } catch (err: any) {
      console.error("paymentSuccess ERROR:", err?.response?.data || err);
      return res.status(500).json({
        status: false,
        message: err.message || "Something went wrong",
      });
    }
  },

  // ==============================
  // ADMIN: VIEW SINGLE SUBSCRIPTION
  // GET /subscription/view/:id
  // ==============================
  async getEditSubscription(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid subscription id" });
      }

      const data = await service.fetch(id);
      if (!data) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      return res.json({ data });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ message: err.message || "Something went wrong" });
    }
  },

  // ==============================
  // ADMIN: UPDATE SUBSCRIPTION
  // POST /subscription/edit/:id
  // ==============================
  async updateSubscription(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid subscription id" });
      }

      const existing = await service.findById(id);
      if (!existing) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      const payload: any = {};
      const fields = [
        "business_id",
        "price",
        "duration",
        "status",
        "payment_method",
        "transaction_id",
        "notes",
      ];

      fields.forEach((f) => {
        if (typeof (req.body as any)[f] !== "undefined") {
          payload[f] = (req.body as any)[f];
        }
      });

      // Never allow turning auto_renew on via API
      if (typeof (req.body as any).auto_renew !== "undefined") {
        payload.auto_renew = false;
      }

      const updated = await service.editSubscription(id, payload);
      return res.json({
        message: "Subscription updated successfully",
        subscription: updated,
      });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ message: err.message || "Something went wrong" });
    }
  },

  // ==============================
  // ADMIN: DELETE SUBSCRIPTION
  // GET /subscription/delete/:id
  // ==============================
  async deleteSubscription(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid subscription id" });
      }

      const deleted = await service.delete(id);
      if (!deleted) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      return res.json({ message: "Subscription deleted successfully" });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ message: err.message || "Something went wrong" });
    }
  },

  // ==============================
  // ADMIN: CHANGE STATUS
  // POST /subscription/change-status
  // ==============================
  async changeStatus(req: Request, res: Response) {
    try {
      const { id, status } = req.body || {};
      if (typeof id === "undefined" || typeof status === "undefined") {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid Data" });
      }

      const numericId = Number(id);
      if (!numericId || Number.isNaN(numericId)) {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid subscription id" });
      }

      const sub = await service.findById(numericId);
      if (!sub) {
        return res
          .status(404)
          .json({ status: "error", message: "Subscription not found" });
      }

      const newStatus = status as SubscriptionStatus;

      // Enforce: only one ACTIVE per business
      if (newStatus === "active") {
        const activeCount = await Subscription.count({
          where: {
            business_id: sub.business_id,
            status: "active",
            id: { [Op.ne]: sub.id },
          },
        });

        if (activeCount > 0) {
          return res.status(400).json({
            status: "error",
            message: "Business already has an active subscription",
          });
        }
      }

      const [affected] = await service.changeStatus(numericId, newStatus);

      if (affected > 0) {
        const message = `Status changed to ${newStatus} successfully`;
        return res.json({ status: "success", message });
      }

      return res
        .status(404)
        .json({ status: "error", message: "Subscription not found" });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        status: "error",
        message: err.message || "Something went wrong",
      });
    }
  },

  // ==============================
  // BUSINESS SIDE: CURRENT SUB
  // GET /subscription/my/current
  // ==============================
  async getMyCurrentSubscription(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const business_id = user?.id;

      if (!business_id) {
        return res
          .status(400)
          .json({ message: "Invalid business_id in token" });
      }

      const subscription = await Subscription.findOne({
        where: { business_id, status: "active" },
        order: [["end_date", "DESC"]],
      });

      return res.json({ subscription });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ message: err.message || "Something went wrong" });
    }
  },

  // ==============================
  // BUSINESS SIDE: REMAINING DAYS
  // GET /subscription/my/remaining-days
  // ==============================
  async getMyRemainingDays(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const business_id = user?.id;

      if (!business_id) {
        return res
          .status(400)
          .json({ message: "Invalid business_id in token" });
      }

      const subscription = await Subscription.findOne({
        where: { business_id, status: "active" },
        order: [["end_date", "DESC"]],
      });

      if (!subscription) {
        return res.json({
          remaining_days: 0,
          message: "No active subscription",
        });
      }

      const now = new Date();
      const end = new Date(subscription.end_date as any);

      const diffMs = end.getTime() - now.getTime();
      const remaining_days = Math.max(
        0,
        Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      );

      return res.json({
        remaining_days,
        end_date: subscription.end_date,
      });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ message: err.message || "Something went wrong" });
    }
  },

  // ==============================
  // BUSINESS SIDE: MY INVOICES
  // GET /subscription/my/invoices
  // ==============================
  async getMyInvoices(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const business_id = user?.id;

      if (!business_id) {
        return res
          .status(400)
          .json({ message: "Invalid business_id in token" });
      }

      const invoices = await Invoice.findAll({
        where: { business_id },
        order: [["createdAt", "DESC"]],
      });

      return res.json({ invoices });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ message: err.message || "Something went wrong" });
    }
  },
};
