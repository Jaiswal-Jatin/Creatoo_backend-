import { Request, Response } from "express";
import PlanService from "../services/plan.service";

const planService = new PlanService();

export default {
  // GET /api/admin/subscription/plan
  // Optional: ?onlyActive=true
  async getPlans(req: Request, res: Response) {
    try {
      const onlyActive =
        typeof req.query.onlyActive !== "undefined" &&
        String(req.query.onlyActive).toLowerCase() === "true";

      const plans = await planService.getPlans({ onlyActive });

      return res.json({
        plans,
        count: plans.length,
      });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ message: err.message || "Something went wrong" });
    }
  },

  // POST /api/admin/subscription/plan
  async createPlan(req: Request, res: Response) {
    try {
      const { name, description, price, duration_days, is_active } = req.body;

      if (!name) {
        return res.status(422).json({ message: "name is required" });
      }
      if (price === undefined || price === null || price === "") {
        return res.status(422).json({ message: "price is required" });
      }
      if (duration_days === undefined || duration_days === null || duration_days === "") {
        return res
          .status(422)
          .json({ message: "duration_days is required" });
      }

      const numericPrice = Number(price);
      const numericDuration = Number(duration_days);

      if (Number.isNaN(numericPrice) || numericPrice <= 0) {
        return res
          .status(422)
          .json({ message: "price must be a positive number" });
      }

      if (Number.isNaN(numericDuration) || numericDuration <= 0) {
        return res
          .status(422)
          .json({ message: "duration_days must be a positive number" });
      }

      const plan = await planService.createGlobalPlan({
        name,
        description,
        price: numericPrice,
        duration_days: numericDuration,
        is_active,
      });

      return res.status(201).json({
        message: "Subscription plan created successfully",
        plan,
      });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ message: err.message || "Something went wrong" });
    }
  },

  // PATCH /api/admin/subscription/plan/:id
  async updatePlan(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid plan id" });
      }

      const payload: any = {};
      const fields = [
        "name",
        "description",
        "price",
        "duration_days",
        "is_active",
      ];

      fields.forEach((field) => {
        if (typeof req.body[field] !== "undefined") {
          payload[field] = req.body[field];
        }
      });

      if (typeof payload.price !== "undefined") {
        const numericPrice = Number(payload.price);
        if (Number.isNaN(numericPrice) || numericPrice <= 0) {
          return res
            .status(422)
            .json({ message: "price must be a positive number" });
        }
        payload.price = numericPrice;
      }

      if (typeof payload.duration_days !== "undefined") {
        const numericDuration = Number(payload.duration_days);
        if (Number.isNaN(numericDuration) || numericDuration <= 0) {
          return res.status(422).json({
            message: "duration_days must be a positive number",
          });
        }
        payload.duration_days = numericDuration;
      }

      const updated = await planService.updatePlan(id, payload);
      if (!updated) {
        return res.status(404).json({ message: "Plan not found" });
      }

      return res.json({
        message: "Subscription plan updated successfully",
        plan: updated,
      });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ message: err.message || "Something went wrong" });
    }
  },
};
