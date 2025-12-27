// src/controllers/StatsController.ts
import { Request, Response } from "express";
import { Op, fn, col, literal } from "sequelize";
import User from "../models/User";
import Visit from "../models/Visit";
import Card from "../models/Card";
import CreatorPointsTransaction from "../models/CreatorPointsTransaction";
import Order from "../models/Order";

const StatsController = {
  // -----------------------------
  // GET /api/admin/overallStats
  // Admin: totals for ALL users + user-wise breakdown
  // -----------------------------
  async overallStats(req: Request, res: Response) {
    try {
      const adminId = (req as any).user?.id;
      if (!adminId) {
        return res
          .status(401)
          .json({ status: false, message: "Unauthorized" });
      }

      // --------- 1) Overall totals ---------
      const totalUsers = await User.count();
      const totalVisits = await Visit.count();

      const aggAll = await CreatorPointsTransaction.findOne({
        attributes: [
          [fn("COALESCE", fn("SUM", col("points")), 0), "total_points"],
          [fn("COALESCE", fn("SUM", col("total_bill")), 0), "total_spent"],
        ],
        raw: true,
      });

      const totalPoints = Number((aggAll as any)?.total_points ?? 0);
      const totalSpent = Number((aggAll as any)?.total_spent ?? 0);

      // --------- 2) User-wise stats ---------
      const visitRows = await Visit.findAll({
        where: { user_id: { [Op.ne]: null } }, // per-user visits
        attributes: ["user_id", [fn("COUNT", col("id")), "total_visits"]],
        group: ["user_id"],
        raw: true,
      });

      // if no visits, return only overall
      if (!visitRows.length) {
        return res.json({
          status: true,
          data: {
            total_users: totalUsers,
            total_visits: totalVisits,
            total_points: totalPoints,
            total_spent: totalSpent,
            users: [],
          },
        });
      }

      const userIds = visitRows.map((v: any) => v.user_id);

      // user info
      const users = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ["id", "name", "email"],
      });

      const userMap = new Map<number, { name: string; email: string | null }>();
      users.forEach((u: any) => {
        userMap.set(u.id, {
          name: u.name ?? "Unknown",
          email: u.email ?? null,
        });
      });

      // member_since from first card created
      const cards = await Card.findAll({
        where: { user_id: { [Op.in]: userIds } },
        attributes: [
          "user_id",
          [fn("MIN", col("created_at")), "member_since"],
        ],
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
          memberSinceMap.set(uid, d.toISOString().slice(0, 10)); // "YYYY-MM-DD"
        }
      });

      // points & total spent per user
      const pointsRows = await CreatorPointsTransaction.findAll({
        where: { user_id: { [Op.in]: userIds } },
        attributes: [
          "user_id",
          [fn("COALESCE", fn("SUM", col("points")), 0), "total_points"],
          [fn("COALESCE", fn("SUM", col("total_bill")), 0), "total_spent"],
        ],
        group: ["user_id"],
      });

      const pointsMap = new Map<
        number,
        { total_points: number; total_spent: number }
      >();
      pointsRows.forEach((p: any) => {
        pointsMap.set(p.user_id, {
          total_points: Number(p.get("total_points") ?? 0),
          total_spent: Number(p.get("total_spent") ?? 0),
        });
      });

      // final user-wise array
      const usersData = visitRows.map((v: any) => {
        const userId = v.user_id as number;

        return {
          user_id: userId,
          name: userMap.get(userId)?.name ?? "Unknown",
          email: userMap.get(userId)?.email ?? null,
          total_visits: Number(v.total_visits ?? v["total_visits"]) ?? 0,
          total_spent: pointsMap.get(userId)?.total_spent ?? 0,
          points: pointsMap.get(userId)?.total_points ?? 0,
          member_since: memberSinceMap.get(userId) ?? null,
        };
      });

      // --------- 3) Response with both overall + user-wise ---------
      return res.json({
        status: true,
        data: {
          total_users: totalUsers,
          total_visits: totalVisits,
          total_points: totalPoints,
          total_spent: totalSpent,
          users: usersData,
        },
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message:
          "Failed to fetch admin overall stats: " +
          (err.message || "Unknown"),
      });
    }
  },

  // -----------------------------
  // GET /api/admin/overallBusinessStats
  // Admin: totals for ALL businesses + business-wise breakdown
  // (business details stored in `users` table)
  // -----------------------------
  async overallBusinessStats(req: Request, res: Response) {
    try {
      const adminId = (req as any).user?.id;
      if (!adminId) {
        return res
          .status(401)
          .json({ status: false, message: "Unauthorized" });
      }

      // ---------- 1) Overall totals (business-level) ----------
      // You can filter by role_id if needed, e.g. role_id = 2 for business owners:
      // const totalBusinesses = await User.count({ where: { role_id: 2 } });
      const totalBusinesses = await User.count();

      const totalVisits = await Visit.count();

      const aggAll = await CreatorPointsTransaction.findOne({
        attributes: [
          [fn("COALESCE", fn("SUM", col("points")), 0), "total_points"],
          [fn("COALESCE", fn("SUM", col("total_bill")), 0), "total_spent"],
        ],
        raw: true,
      });

      const totalPoints = Number((aggAll as any)?.total_points ?? 0);
      const totalSpent = Number((aggAll as any)?.total_spent ?? 0);

      // ---------- 2) Business-wise stats ----------
      const visitRows = await Visit.findAll({
        attributes: ["business_id", [fn("COUNT", col("id")), "total_visits"]],
        group: ["business_id"],
        raw: true,
      });

      const businessIds = visitRows
        .map((v: any) => v.business_id as number | null)
        .filter((id): id is number => id !== null && id !== undefined);

      if (!businessIds.length) {
        return res.json({
          status: true,
          data: {
            total_businesses: totalBusinesses,
            total_visits: totalVisits,
            total_points: totalPoints,
            total_spent: totalSpent,
            businesses: [],
          },
        });
      }

      // load business info from users table (business_* fields)
      const businesses = await User.findAll({
        where: { id: { [Op.in]: businessIds } },
        attributes: ["id", "business_name", "business_email", "business_address"],
        raw: true,
      });

      const businessMap = new Map<
        number,
        {
          business_name: string | null;
          business_email: string | null;
          business_address: string | null;
        }
      >();

      businesses.forEach((b: any) => {
        businessMap.set(b.id, {
          business_name: b.business_name ?? "Unknown",
          business_email: b.business_email ?? null,
          business_address: b.business_address ?? null,
        });
      });

      // points & total spent per business
      const pointsRows = await CreatorPointsTransaction.findAll({
        where: { business_id: { [Op.in]: businessIds } },
        attributes: [
          "business_id",
          [fn("COALESCE", fn("SUM", col("points")), 0), "total_points"],
          [fn("COALESCE", fn("SUM", col("total_bill")), 0), "total_spent"],
        ],
        group: ["business_id"],
        raw: true,
      });

      const pointsMap = new Map<
        number,
        { total_points: number; total_spent: number }
      >();

      pointsRows.forEach((p: any) => {
        pointsMap.set(p.business_id, {
          total_points: Number(p.total_points ?? 0),
          total_spent: Number(p.total_spent ?? 0),
        });
      });

      // final business-wise array
      const businessesData = visitRows
        .filter(
          (v: any) => v.business_id !== null && v.business_id !== undefined
        )
        .map((v: any) => {
          const businessId = v.business_id as number;

          return {
            business_id: businessId,
            business_name:
              businessMap.get(businessId)?.business_name ?? "Unknown",
            business_email: businessMap.get(businessId)?.business_email ?? null,
            business_address:
              businessMap.get(businessId)?.business_address ?? null,
            total_visits: Number(v.total_visits ?? v["total_visits"]) ?? 0,
            total_spent: pointsMap.get(businessId)?.total_spent ?? 0,
            points: pointsMap.get(businessId)?.total_points ?? 0,
          };
        });

      // ---------- 3) Response ----------
      return res.json({
        status: true,
        data: {
          total_businesses: totalBusinesses,
          total_visits: totalVisits,
          total_points: totalPoints,
          total_spent: totalSpent,
          businesses: businessesData,
        },
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message:
          "Failed to fetch admin overall business stats: " +
          (err.message || "Unknown"),
      });
    }
  },

  // ----------------------------------------
  // GET /api/admin/discountStatsByUser
  // Admin: discount totals per user
  // ----------------------------------------
  async discountStatsByUser(req: Request, res: Response) {
    try {
      const adminId = (req as any).user?.id;
      if (!adminId) {
        return res
          .status(401)
          .json({ status: false, message: "Unauthorized" });
      }

      // overall totals across all users
      const overallAgg: any = await Order.findOne({
        attributes: [
          [
            fn("COALESCE", fn("SUM", col("original_bill_amount")), 0),
            "total_original_bill",
          ],
          [
            fn("COALESCE", fn("SUM", col("discounted_bill")), 0),
            "total_discounted_bill",
          ],
          [
            literal(
              "COALESCE(SUM(original_bill_amount),0) - COALESCE(SUM(discounted_bill),0)"
            ),
            "total_discount_amount",
          ],
          [
            fn("COALESCE", fn("AVG", col("discount_percentage")), 0),
            "avg_discount_percentage",
          ],
        ],
        raw: true,
      });

      // per-user aggregation (no where needed if user_id is NOT NULL in schema)
      const rows: any[] = await Order.findAll({
        attributes: [
          "user_id",
          [
            fn("COALESCE", fn("SUM", col("original_bill_amount")), 0),
            "total_original_bill",
          ],
          [
            fn("COALESCE", fn("SUM", col("discounted_bill")), 0),
            "total_discounted_bill",
          ],
          [
            literal(
              "COALESCE(SUM(original_bill_amount),0) - COALESCE(SUM(discounted_bill),0)"
            ),
            "total_discount_amount",
          ],
          [
            fn("COALESCE", fn("AVG", col("discount_percentage")), 0),
            "avg_discount_percentage",
          ],
        ],
        group: ["user_id"],
        raw: true,
      });

      const data = rows.map((r) => ({
        user_id: Number(r.user_id),
        total_original_bill: Number(r.total_original_bill ?? 0),
        total_discounted_bill: Number(r.total_discounted_bill ?? 0),
        total_discount_amount: Number(r.total_discount_amount ?? 0),
        avg_discount_percentage: Number(r.avg_discount_percentage ?? 0),
      }));

      return res.json({
        status: true,
        data: {
          overall: {
            total_original_bill: Number(overallAgg.total_original_bill ?? 0),
            total_discounted_bill: Number(
              overallAgg.total_discounted_bill ?? 0
            ),
            total_discount_amount: Number(
              overallAgg.total_discount_amount ?? 0
            ),
            avg_discount_percentage: Number(
              overallAgg.avg_discount_percentage ?? 0
            ),
          },
          users: data,
        },
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message:
          "Failed to fetch discount stats by user: " +
          (err.message || "Unknown"),
      });
    }
  },

  // ----------------------------------------
  // GET /api/admin/discountStatsByBusiness
  // Admin: discount totals per business
  // ----------------------------------------
  async discountStatsByBusiness(req: Request, res: Response) {
    try {
      const adminId = (req as any).user?.id;
      if (!adminId) {
        return res
          .status(401)
          .json({ status: false, message: "Unauthorized" });
      }

      // overall totals across all businesses
      const overallAgg: any = await Order.findOne({
        attributes: [
          [
            fn("COALESCE", fn("SUM", col("original_bill_amount")), 0),
            "total_original_bill",
          ],
          [
            fn("COALESCE", fn("SUM", col("discounted_bill")), 0),
            "total_discounted_bill",
          ],
          [
            literal(
              "COALESCE(SUM(original_bill_amount),0) - COALESCE(SUM(discounted_bill),0)"
            ),
            "total_discount_amount",
          ],
          [
            fn("COALESCE", fn("AVG", col("discount_percentage")), 0),
            "avg_discount_percentage",
          ],
        ],
        raw: true,
      });

      // per-business aggregation (no where needed if business_id is NOT NULL)
      const rows: any[] = await Order.findAll({
        attributes: [
          "business_id",
          [
            fn("COALESCE", fn("SUM", col("original_bill_amount")), 0),
            "total_original_bill",
          ],
          [
            fn("COALESCE", fn("SUM", col("discounted_bill")), 0),
            "total_discounted_bill",
          ],
          [
            literal(
              "COALESCE(SUM(original_bill_amount),0) - COALESCE(SUM(discounted_bill),0)"
            ),
            "total_discount_amount",
          ],
          [
            fn("COALESCE", fn("AVG", col("discount_percentage")), 0),
            "avg_discount_percentage",
          ],
        ],
        group: ["business_id"],
        raw: true,
      });

      const data = rows.map((r) => ({
        business_id: Number(r.business_id),
        total_original_bill: Number(r.total_original_bill ?? 0),
        total_discounted_bill: Number(r.total_discounted_bill ?? 0),
        total_discount_amount: Number(r.total_discount_amount ?? 0),
        avg_discount_percentage: Number(r.avg_discount_percentage ?? 0),
      }));

      return res.json({
        status: true,
        data: {
          overall: {
            total_original_bill: Number(overallAgg.total_original_bill ?? 0),
            total_discounted_bill: Number(
              overallAgg.total_discounted_bill ?? 0
            ),
            total_discount_amount: Number(
              overallAgg.total_discount_amount ?? 0
            ),
            avg_discount_percentage: Number(
              overallAgg.avg_discount_percentage ?? 0
            ),
          },
          businesses: data,
        },
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message:
          "Failed to fetch discount stats by business: " +
          (err.message || "Unknown"),
      });
    }
  },

  // ----------------------------------------
  // GET /api/admin/pointsStatsByUser
  // Admin: Creatoo points (earned / redeemed / balance) per user
  // ----------------------------------------
  async pointsStatsByUser(req: Request, res: Response) {
    try {
      const adminId = (req as any).user?.id;
      if (!adminId) {
        return res
          .status(401)
          .json({ status: false, message: "Unauthorized" });
      }

      // overall totals across all users
      const overallAgg: any = await CreatorPointsTransaction.findOne({
        attributes: [
          // total earned (credit)
          [
            literal(
              "COALESCE(SUM(CASE WHEN LOWER(credit_debit_remaining_status) = 'credit' THEN points ELSE 0 END), 0)"
            ),
            "total_points_earned",
          ],
          // total redeemed (debit)
          [
            literal(
              "COALESCE(SUM(CASE WHEN LOWER(credit_debit_remaining_status) = 'debit' THEN points ELSE 0 END), 0)"
            ),
            "total_points_redeemed",
          ],
          // current balance (remaining_points for credit rows)
          [
            literal(
              "COALESCE(SUM(CASE WHEN LOWER(credit_debit_remaining_status) = 'credit' THEN remaining_points ELSE 0 END), 0)"
            ),
            "total_points_balance",
          ],
        ],
        raw: true,
      });

      // per-user aggregation
      const rows: any[] = await CreatorPointsTransaction.findAll({
        attributes: [
          "user_id",
          [
            literal(
              "COALESCE(SUM(CASE WHEN LOWER(credit_debit_remaining_status) = 'credit' THEN points ELSE 0 END), 0)"
            ),
            "points_earned",
          ],
          [
            literal(
              "COALESCE(SUM(CASE WHEN LOWER(credit_debit_remaining_status) = 'debit' THEN points ELSE 0 END), 0)"
            ),
            "points_redeemed",
          ],
          [
            literal(
              "COALESCE(SUM(CASE WHEN LOWER(credit_debit_remaining_status) = 'credit' THEN remaining_points ELSE 0 END), 0)"
            ),
            "points_balance",
          ],
        ],
        group: ["user_id"],
        raw: true,
      });

      const users = rows.map((r) => ({
        user_id: Number(r.user_id),
        points_earned: Number(r.points_earned ?? 0),
        points_redeemed: Number(r.points_redeemed ?? 0),
        points_balance: Number(r.points_balance ?? 0),
      }));

      return res.json({
        status: true,
        data: {
          overall: {
            total_points_earned: Number(overallAgg.total_points_earned ?? 0),
            total_points_redeemed: Number(
              overallAgg.total_points_redeemed ?? 0
            ),
            total_points_balance: Number(
              overallAgg.total_points_balance ?? 0
            ),
          },
          users,
        },
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message:
          "Failed to fetch points stats by user: " +
          (err.message || "Unknown"),
      });
    }
  },

  // ----------------------------------------
  // GET /api/admin/pointsStatsByBusiness
  // Admin: Creatoo points (earned / redeemed / balance) per business
  // ----------------------------------------
  async pointsStatsByBusiness(req: Request, res: Response) {
    try {
      const adminId = (req as any).user?.id;
      if (!adminId) {
        return res
          .status(401)
          .json({ status: false, message: "Unauthorized" });
      }

      // overall totals across all businesses
      const overallAgg: any = await CreatorPointsTransaction.findOne({
        attributes: [
          [
            literal(
              "COALESCE(SUM(CASE WHEN LOWER(credit_debit_remaining_status) = 'credit' THEN points ELSE 0 END), 0)"
            ),
            "total_points_earned",
          ],
          [
            literal(
              "COALESCE(SUM(CASE WHEN LOWER(credit_debit_remaining_status) = 'debit' THEN points ELSE 0 END), 0)"
            ),
            "total_points_redeemed",
          ],
          [
            literal(
              "COALESCE(SUM(CASE WHEN LOWER(credit_debit_remaining_status) = 'credit' THEN remaining_points ELSE 0 END), 0)"
            ),
            "total_points_balance",
          ],
        ],
        raw: true,
      });

      // per-business aggregation
      const rows: any[] = await CreatorPointsTransaction.findAll({
        attributes: [
          "business_id",
          [
            literal(
              "COALESCE(SUM(CASE WHEN LOWER(credit_debit_remaining_status) = 'credit' THEN points ELSE 0 END), 0)"
            ),
            "points_earned",
          ],
          [
            literal(
              "COALESCE(SUM(CASE WHEN LOWER(credit_debit_remaining_status) = 'debit' THEN points ELSE 0 END), 0)"
            ),
            "points_redeemed",
          ],
          [
            literal(
              "COALESCE(SUM(CASE WHEN LOWER(credit_debit_remaining_status) = 'credit' THEN remaining_points ELSE 0 END), 0)"
            ),
            "points_balance",
          ],
        ],
        group: ["business_id"],
        raw: true,
      });

      const businesses = rows.map((r) => ({
        business_id: Number(r.business_id),
        points_earned: Number(r.points_earned ?? 0),
        points_redeemed: Number(r.points_redeemed ?? 0),
        points_balance: Number(r.points_balance ?? 0),
      }));

      return res.json({
        status: true,
        data: {
          overall: {
            total_points_earned: Number(overallAgg.total_points_earned ?? 0),
            total_points_redeemed: Number(
              overallAgg.total_points_redeemed ?? 0
            ),
            total_points_balance: Number(
              overallAgg.total_points_balance ?? 0
            ),
          },
          businesses,
        },
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message:
          "Failed to fetch points stats by business: " +
          (err.message || "Unknown"),
      });
    }
  },

  // ----------------------------------------
  // GET /api/admin/cardsStats
  // Admin: cards summary + full card list
  // ----------------------------------------
  async cardsStats(req: Request, res: Response) {
    try {
      const adminId = (req as any).user?.id;
      if (!adminId) {
        return res
          .status(401)
          .json({ status: false, message: "Unauthorized" });
      }

      // ---------- 1) Overall counts ----------
      const totalCards = await Card.count();
      const activeCards = await Card.count({ where: { status: 1 } });
      const inactiveCards = await Card.count({ where: { status: 0 } });

      // ---------- 2) Load all cards ----------
      const cards: any[] = await Card.findAll({
        attributes: [
          "id",
          "number",
          "status",
          "user_id",
          "created_at",

        ],
        order: [["created_at", "DESC"]],
        raw: true,
      });

      // collect distinct user_ids from cards (normalize to numbers)
      const userIds = Array.from(
        new Set(
          cards
            .map((c) =>
              c.user_id != null ? Number(c.user_id) : null
            )
            .filter(
              (id): id is number =>
                id !== null && !Number.isNaN(id)
            )
        )
      );

      // ---------- 3) Load users for those cards ----------
      const userMap = new Map<
        number,
        { name: string | null;  email: string | null }
      >();

      if (userIds.length) {
        const users: any[] = await User.findAll({
          where: { id: { [Op.in]: userIds } },
          attributes: ["id", "name", "email"],
          raw: true,
        });

        users.forEach((u) => {
          const uid = Number(u.id);
          if (!Number.isNaN(uid)) {
            userMap.set(uid, {
              name: u.name ?? null,
              email: u.email ?? null,
            });
          }
        });
      }

      // ---------- 4) Build final list ----------
      const list = cards.map((c) => {
        const uid =
          c.user_id != null && !Number.isNaN(Number(c.user_id))
            ? Number(c.user_id)
            : null;

        const userInfo = uid != null ? userMap.get(uid) : undefined;

        return {
          id: c.id,
          number: c.number,
          status: c.status,
          user_id: uid, // null if no user
          user_name: userInfo?.name ?? null,
          email: userInfo?.email ?? null,
          created_at: c.created_at,
          // adjust this if your column is named differently (e.g. "activated_at")
        };
      });

      return res.json({
        status: true,
        data: {
          total_cards: totalCards,
          active_cards: activeCards,
          inactive_cards: inactiveCards,
          cards: list,
        },
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message:
          "Failed to fetch card stats: " + (err.message || "Unknown"),
      });
    }
  },
};

export default StatsController;
