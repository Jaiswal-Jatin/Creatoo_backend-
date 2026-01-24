import { Request, Response } from "express";
import { Op, fn, col } from "sequelize";
import User from "../models/User";
import Visit from "../models/Visit";
import Card from "../models/Card";
import CreatorPointsTransaction from "../models/CreatorPointsTransaction";
import { deleteIfExists, saveCompressedImage } from "../services/storage.service";

// ✅ Your token has: req.user.role === "admin"
const isAdminUser = (req: Request): boolean => {
  const authUser = (req as any).user;
  return authUser?.role === "admin" || authUser?.role_id === 1;
};

/**
 * ✅ ACCESS RULE:
 * - Admin -> can access any business_id (body) OR fallback to token id
 * - Normal user -> can access ONLY their own token id
 *   - if they send business_id and it's different -> return null (FORBIDDEN)
 */
const getTargetBusinessId = (req: Request): number | null => {
  const authUser = (req as any).user;
  if (!authUser?.id) return null;

  const tokenBusinessId = Number(authUser.id);
  const bodyBusinessId =
    req.body.business_id !== undefined && req.body.business_id !== null
      ? Number(req.body.business_id)
      : null;

  const isAdmin = isAdminUser(req);

  // ✅ ADMIN → can target any business_id
  if (isAdmin) {
    if (bodyBusinessId && bodyBusinessId > 0) return bodyBusinessId;
    return tokenBusinessId;
  }

  // ✅ NON-ADMIN USER:
  // if no business_id passed → self access
  if (!bodyBusinessId) return tokenBusinessId;

  // if business_id passed but not equal to token id → forbidden
  if (bodyBusinessId !== tokenBusinessId) return null;

  // if same → allow
  return tokenBusinessId;
};

const BusinessController = {
  // -----------------------------
  // POST /api/business/customerSummary
  // -----------------------------
  async customerSummary(req: Request, res: Response) {
    try {
      const businessId = getTargetBusinessId(req);

      if (!businessId) {
        return res.status(403).json({
          status: false,
          message: "Forbidden: You cannot access this business_id",
        });
      }

      const visitRows = await Visit.findAll({
        where: { business_id: businessId },
        attributes: ["user_id", [fn("COUNT", col("id")), "total_visits"]],
        group: ["user_id"],
      });

      if (!visitRows.length) {
        return res.json({ status: true, data: [] });
      }

      const userIds = visitRows.map((v: any) => v.user_id);

      const users = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ["id", "name", "email", "mobile"],
      });

      const userMap = new Map<number, any>();
      users.forEach((u: any) => {
        userMap.set(u.id, {
          name: u.name ?? "Unknown",
          email: u.email ?? null,
          mobile: u.mobile ?? null,
        });
      });

      const cards = await Card.findAll({
        where: {
          user_id: { [Op.in]: userIds },
        },
        attributes: ["user_id", [fn("MIN", col("created_at")), "member_since"]],
        group: ["user_id"],
        raw: true,
      });

      const memberSinceMap = new Map<number, string | null>();
      cards.forEach((c: any) => {
        const uid = Number(c.user_id);
        const ms = c.member_since as Date | string | null;

        if (!ms) {
          memberSinceMap.set(uid, null);
        } else {
          const d = ms instanceof Date ? ms : new Date(ms);
          memberSinceMap.set(uid, d.toISOString().slice(0, 10));
        }
      });

      const pointsRows = await CreatorPointsTransaction.findAll({
        where: {
          business_id: businessId,
          user_id: { [Op.in]: userIds },
        },
        attributes: [
          "user_id",
          [fn("COALESCE", fn("SUM", col("points")), 0), "total_points"],
          [fn("COALESCE", fn("SUM", col("total_bill")), 0), "total_spent"],
        ],
        group: ["user_id"],
      });

      const pointsMap = new Map<number, any>();
      pointsRows.forEach((p: any) => {
        pointsMap.set(p.user_id, {
          total_points: Number(p.get("total_points") ?? 0),
          total_spent: Number(p.get("total_spent") ?? 0),
        });
      });

      const data = visitRows.map((v: any) => {
        const userId = Number(v.user_id);

        return {
          user_id: userId,
          name: userMap.get(userId)?.name ?? "Unknown",
          email: userMap.get(userId)?.email ?? null,
          mobile: userMap.get(userId)?.mobile ?? null,
          total_visits: Number(v.get("total_visits")) ?? 0,
          total_spent: pointsMap.get(userId)?.total_spent ?? 0,
          points: pointsMap.get(userId)?.total_points ?? 0,
          member_since: memberSinceMap.get(userId) ?? null,
        };
      });

      return res.json({ status: true, data });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message:
          "Failed to fetch customer summary: " + (err.message || "Unknown"),
      });
    }
  },

  // -----------------------------
  // POST /api/business/setDiscount
  // -----------------------------
  async setDiscount(req: Request, res: Response) {
    try {
      const businessId = getTargetBusinessId(req);

      console.log("req.user =>", (req as any).user);
      console.log("req.body =>", req.body);
      console.log("TARGET businessId =>", businessId);

      if (!businessId) {
        return res.status(403).json({
          status: false,
          message: "Forbidden: You cannot access this business_id",
        });
      }

      const {
        set_first_time_discount,
        set_regular_discount,
        min_order,
        set_expiry,
      } = req.body;

      const errors: Record<string, string[]> = {};

      const firstNum = Number(set_first_time_discount);
      const regularNum = Number(set_regular_discount);
      const minOrderNum = Number(min_order);
      const expiryNum = Number(set_expiry);

      if (Number.isNaN(firstNum) || firstNum < 0 || firstNum > 100)
        errors.set_first_time_discount = ["Must be between 0 and 100"];

      if (Number.isNaN(regularNum) || regularNum < 0 || regularNum > 100)
        errors.set_regular_discount = ["Must be between 0 and 100"];

      if (Number.isNaN(minOrderNum) || minOrderNum < 0)
        errors.min_order = ["Must be at least 0"];

      if (Number.isNaN(expiryNum) || expiryNum < 1)
        errors.set_expiry = ["Must be at least 1"];

      if (Object.keys(errors).length) {
        return res.status(422).json({ status: false, errors });
      }

      const user: any = await User.findByPk(businessId);

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "Business not found",
        });
      }

      user.set_first_time_discount = firstNum;
      user.set_regular_discount = regularNum;
      user.min_order = minOrderNum;
      user.set_expiry = expiryNum;

      await user.save();
      await user.reload();

      return res.json({
        status: true,
        message: "Discount applied successfully",
        data: user,
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "Failed to apply discount: " + (err.message || "Unknown"),
      });
    }
  },

  // -----------------------------
  // POST /api/business/businessDescription
  // -----------------------------
  async businessDescription(req: Request, res: Response) {
    try {
      const businessId = getTargetBusinessId(req);

      if (!businessId) {
        return res.status(403).json({
          status: false,
          message: "Forbidden: You cannot access this business_id",
        });
      }

      const user: any = await User.findByPk(businessId);
      if (!user) {
        return res.status(404).json({
          status: false,
          message: "Business not found",
        });
      }

      const { time_from, time_to, pricing_range_text } = req.body;
      const files = req.files as { [key: string]: Express.Multer.File[] };

      // business_image
      if (files?.business_image?.[0]) {
        if (user.business_image) deleteIfExists(user.business_image);
        const { fileUrl } = await saveCompressedImage(files.business_image[0]);
        user.business_image = fileUrl;
      }

      // menu_card_1..5
      for (let i = 1; i <= 5; i++) {
        const field = `menu_card_${i}`;
        if (files?.[field]?.[0]) {
          if (user[field]) deleteIfExists(user[field]);
          const { fileUrl } = await saveCompressedImage(files[field][0]);
          user[field] = fileUrl;
        }
      }

      // business_image_1..5
      for (let i = 1; i <= 5; i++) {
        const field = `business_image_${i}`;
        if (files?.[field]?.[0]) {
          if (user[field]) deleteIfExists(user[field]);
          const { fileUrl } = await saveCompressedImage(files[field][0]);
          user[field] = fileUrl;
        }
      }

      if (time_from) user.time_from = time_from;
      if (time_to) user.time_to = time_to;
      if (pricing_range_text) user.pricing_range_text = pricing_range_text;

      await user.save();
      await user.reload();

      return res.json({
        status: true,
        message: "Business details updated successfully",
        data: user,
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message:
          "Failed to update business description: " + (err.message || "Unknown"),
      });
    }
  },

  // -----------------------------
  // POST /api/business/getBusinessList
  // -----------------------------
  async getBusinessList(req: Request, res: Response) {
    try {
      const searchKey = (req.body.search_key || "").trim();

      if (searchKey.length < 3) {
        return res.status(200).json({
          status: true,
          message: "Minimum 3 characters required",
          data: [],
        });
      }

      const users = await User.findAll({
        where: {
          role_id: 2,
          business_name: { [Op.like]: `%${searchKey}%` },
        },
        attributes: ["id", "business_name"],
      });

      return res.status(200).json({
        status: true,
        message: users.length ? "Business Found" : "No matching business names",
        data: users,
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "Failed to fetch business list",
      });
    }
  },
};

export default BusinessController;
