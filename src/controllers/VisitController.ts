import { Request, Response } from "express";
import { Op } from "sequelize";
import Card from "../models/Card";
import Visit, { VisitTier } from "../models/Visit";
import User from "../models/User";

interface AuthUser {
  id: number; // logged-in id (business for business APIs, user for user APIs)
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

class VisitController {
  /**
   * Format a Date as IST string "YYYY-MM-DD HH:MM:SS"
   */
  private formatIST(date: Date): string {
    return date
      .toLocaleString("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(",", "");
  }

  /**
   * Format a Date as IST date-only string "YYYY-MM-DD"
   */
  private formatISTDate(date: Date): string {
    return date.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  /**
   * Tier logic:
   * - No history => "new"
   * - last visit 0–7 days => "premium"
   * - last visit 8–15 days => "elite"
   * - last visit >15 days => "core"
   */
  private calculateTier(lastVisit: Visit | null): VisitTier {
    if (!lastVisit) return "new";

    const now = Date.now();
    const last = lastVisit.time.getTime();
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return "premium";
    if (diffDays <= 15) return "elite";
    return "core";
  }

  /**
   * BUSINESS SIDE
   * GET /api/visit?card_number=1
   *  - card info (with user_image)
   *  - visit history for that card & business
   *  - tier for that card & business
   */
  async getVisitInfo(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res
          .status(401)
          .json({ status: false, message: "Unauthorized" });
      }
      const businessId = req.user.id;

      const cardNumberRaw = req.query.card_number;
      if (!cardNumberRaw) {
        return res.status(422).json({
          status: false,
          message: "card_number is required as query param",
        });
      }

      const cardNumber = Number(cardNumberRaw);
      if (Number.isNaN(cardNumber)) {
        return res.status(422).json({
          status: false,
          message: "card_number must be numeric",
        });
      }

      // 1) Find card
      const card = await Card.findOne({ where: { number: cardNumber } });
      if (!card) {
        return res
          .status(404)
          .json({ status: false, message: "Card not found" });
      }

      // 2) Last visit for this card & business
      const lastVisit = await Visit.findOne({
        where: { card_number: cardNumber, business_id: businessId },
        order: [["time", "DESC"]],
      });

      const tier = this.calculateTier(lastVisit);

      // 3) Full history for this card & business
      const history = await Visit.findAll({
        where: { card_number: cardNumber, business_id: businessId },
        order: [["time", "DESC"]],
      });

      // 4) Load users for user_image
      const rawUserIds: (number | string | null)[] = [
        card.user_id as any,
        ...history.map((v) => v.user_id as any),
      ].filter(Boolean);

      const uniqueUserIds = Array.from(
        new Set(
          rawUserIds
            .map((id) => Number(id))
            .filter((n) => !Number.isNaN(n))
        )
      );

      const userMap = new Map<
        number,
        { user_image: string | null; name: string | null }
      >();

      if (uniqueUserIds.length > 0) {
        const users = await User.findAll({
          where: { id: { [Op.in]: uniqueUserIds } },
          attributes: ["id", "user_image", "name"],
        });

        users.forEach((u: any) => {
          userMap.set(u.id, {
            user_image: u.user_image ?? null,
            name: u.name ?? null,
          });
        });
      }

      const cardUserId = card.user_id ? Number(card.user_id) : null;
      const cardUserData =
        cardUserId && userMap.has(cardUserId)
          ? userMap.get(cardUserId)!
          : null;

      return res.status(200).json({
        status: true,
        card: {
          card_number: card.number,
          name: card.name,
          user_id: card.user_id,
          user_image: cardUserData?.user_image ?? null,
        },
        tier,
        visit_history: history.map((v) => {
          const uid = v.user_id ? Number(v.user_id) : null;
          const u = uid && userMap.has(uid) ? userMap.get(uid)! : null;

          return {
            id: v.id,
            user_id: v.user_id,
            card_number: v.card_number,
            business_id: v.business_id,
            tier: v.tier,
            time: this.formatIST(v.time), // IST
            user_image: u?.user_image ?? null,
            user_name: u?.name ?? null,
          };
        }),
      });
    } catch (err: any) {
      console.error("getVisitInfo error:", err);
      return res.status(500).json({
        status: false,
        message: "Server error: " + err.message,
      });
    }
  }

  /**
   * BUSINESS SIDE
   * POST /api/visit
   * Body: { card_number: number }
   */
  async createVisit(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res
          .status(401)
          .json({ status: false, message: "Unauthorized" });
      }
      const businessId = req.user.id;

      const { card_number } = req.body as {
        card_number?: number | string;
      };
      if (!card_number) {
        return res.status(422).json({
          status: false,
          message: "card_number is required",
        });
      }

      const cardNumber = Number(card_number);
      if (Number.isNaN(cardNumber)) {
        return res.status(422).json({
          status: false,
          message: "card_number must be numeric",
        });
      }

      const card = await Card.findOne({ where: { number: cardNumber } });
      if (!card) {
        return res
          .status(404)
          .json({ status: false, message: "Card not found" });
      }

      const lastVisit = await Visit.findOne({
        where: { card_number: cardNumber, business_id: businessId },
        order: [["time", "DESC"]],
      });

      const tier = this.calculateTier(lastVisit);

      await Visit.create({
        user_id: card.user_id as any,
        card_number: card.number,
        business_id: businessId,
        tier,
        time: new Date(),
      });

      const history = await Visit.findAll({
        where: { card_number: cardNumber, business_id: businessId },
        order: [["time", "DESC"]],
      });

      return res.status(200).json({
        status: true,
        message: "Visit recorded successfully",
        tier,
        card: {
          card_number: card.number,
          name: card.name,
          user_id: card.user_id,
        },
        visit_history: history.map((v) => ({
          id: v.id,
          user_id: v.user_id,
          card_number: v.card_number,
          business_id: v.business_id,
          tier: v.tier,
          time: this.formatIST(v.time), // IST
        })),
      });
    } catch (err: any) {
      console.error("createVisit error:", err);
      return res.status(500).json({
        status: false,
        message: "Server error: " + err.message,
      });
    }
  }

  /**
   * BUSINESS SIDE
   * GET /api/visit/history
   *  - summary: counts of premium / elite / core / new
   *  - days: visits grouped by date (for this business)
   */
  async history(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res
          .status(401)
          .json({ status: false, message: "Unauthorized" });
      }
      const businessId = req.user.id;

      const visits = await Visit.findAll({
        where: { business_id: businessId },
        order: [["time", "DESC"]],
      });

      if (visits.length === 0) {
        return res.status(200).json({
          status: true,
          summary: { premium: 0, elite: 0, core: 0, new: 0 },
          days: [],
        });
      }

      const cardNumbers = Array.from(
        new Set(visits.map((v) => v.card_number))
      );
      const cards = await Card.findAll({
        where: { number: { [Op.in]: cardNumbers } },
        attributes: ["number", "name"],
      });

      const cardNameMap = new Map<number, string | null>();
      cards.forEach((c: any) => {
        cardNameMap.set(c.number, c.name ?? null);
      });

      const summary: Record<VisitTier, number> = {
        premium: 0,
        elite: 0,
        core: 0,
        new: 0,
      };

      type DayVisit = {
        card_number: number;
        name: string | null;
        tier: VisitTier;
        time: string;
      };

      type DayGroup = {
        date: string;
        visits: DayVisit[];
      };

      const daysMap = new Map<string, DayGroup>();

      for (const v of visits) {
        summary[v.tier] = (summary[v.tier] || 0) + 1;

        // Use IST date
        const dateKey = this.formatISTDate(v.time);

        if (!daysMap.has(dateKey)) {
          daysMap.set(dateKey, { date: dateKey, visits: [] });
        }

        const group = daysMap.get(dateKey)!;
        group.visits.push({
          card_number: v.card_number,
          name: cardNameMap.get(v.card_number) ?? null,
          tier: v.tier,
          time: this.formatIST(v.time), // IST
        });
      }

      const days = Array.from(daysMap.values()).sort((a, b) =>
        a.date < b.date ? 1 : -1
      );

      return res.status(200).json({
        status: true,
        summary,
        days,
      });
    } catch (err: any) {
      console.error("history error:", err);
      return res.status(500).json({
        status: false,
        message: "Server error: " + err.message,
      });
    }
  }

  // =================== USER SIDE ===================
  // GET /api/visit/user-history
  //
  // Token = user (card owner)
  // Returns restaurant-wise history:
  //  - total_visits
  //  - restaurants: [ { business_id, business_name, business_image, total_visits, last_visit, current_tier, visits[] } ]
  async userHistory(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized",
        });
      }

      const userId = req.user.id;

      // 1) Find all cards for this user
      const cards = await Card.findAll({ where: { user_id: userId } });

      if (cards.length === 0) {
        return res.status(200).json({
          status: true,
          total_visits: 0,
          restaurants: [],
        });
      }

      const cardNumbers = cards.map((c) => c.number);

      // 2) All visits for this user (any business, any card)
      const visits = await Visit.findAll({
        where: {
          user_id: userId,
          card_number: { [Op.in]: cardNumbers },
        },
        order: [["time", "DESC"]],
      });

      if (visits.length === 0) {
        return res.status(200).json({
          status: true,
          total_visits: 0,
          restaurants: [],
        });
      }

      const totalVisits = visits.length;

      // 3) Group visits by business_id
      const byBusiness = new Map<number, Visit[]>();
      for (const v of visits) {
        if (!byBusiness.has(v.business_id)) {
          byBusiness.set(v.business_id, []);
        }
        byBusiness.get(v.business_id)!.push(v);
      }

      // 4) Load businesses (correct columns)
      const businessIds = Array.from(byBusiness.keys());

      const businesses = await User.findAll({
        where: { id: { [Op.in]: businessIds } },
        attributes: ["id", "business_name", "business_image"],
      });

      const businessMap = new Map<
        number,
        { business_name: string | null; business_image: string | null }
      >();

      businesses.forEach((b: any) => {
        businessMap.set(b.id, {
          business_name: b.business_name ?? null,
          business_image: b.business_image ?? null,
        });
      });

      // 5) Build restaurant-wise structure WITH visits
      const restaurants = Array.from(byBusiness.entries()).map(
        ([businessId, bizVisits]) => {
          const lastVisit = bizVisits[0]; // already sorted DESC
          const currentTier = this.calculateTier(lastVisit);

          const bizInfo =
            businessMap.get(businessId) || {
              business_name: null,
              business_image: null,
            };

          return {
            business_id: businessId,
            business_name: bizInfo.business_name,
            business_image: bizInfo.business_image,
            current_tier: currentTier,
            total_visits: bizVisits.length,
            last_visit: this.formatIST(lastVisit.time), // IST
            visits: bizVisits.map((v) => ({
              time: this.formatIST(v.time), // IST
              tier: v.tier,
              card_number: v.card_number,
            })),
          };
        }
      );

      // 6) Sort restaurants by last_visit (DESC)
      restaurants.sort(
        (a, b) =>
          new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime()
      );

      return res.status(200).json({
        status: true,
        total_visits: totalVisits,
        restaurants,
      });
    } catch (err: any) {
      console.error("userHistory error:", err);
      return res.status(500).json({
        status: false,
        message: "Server error: " + err.message,
      });
    }
  }

  /**
   * USER SIDE
   * GET /api/visit/user-all-history
   *
   * Returns a flat list of ALL visits for this user (no grouping),
   * with business name + image for each visit.
   */
  async userAllHistory(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized",
        });
      }

      const userId = req.user.id;

      // 1) All cards for this user
      const cards = await Card.findAll({
        where: { user_id: userId },
        attributes: ["number"],
      });

      if (cards.length === 0) {
        return res.status(200).json({
          status: true,
          history: [],
        });
      }

      const cardNumbers = cards.map((c) => c.number);

      // 2) All visits for this user (any business, any of their cards)
      const visits = await Visit.findAll({
        where: {
          user_id: userId,
          card_number: { [Op.in]: cardNumbers },
        },
        order: [["time", "DESC"]],
      });

      if (visits.length === 0) {
        return res.status(200).json({
          status: true,
          history: [],
        });
      }

      // 3) Load businesses (business_name & business_image from User table)
      const businessIds = Array.from(new Set(visits.map((v) => v.business_id)));

      const businesses = await User.findAll({
        where: { id: { [Op.in]: businessIds } },
        attributes: ["id", "business_name", "business_image"],
      });

      const businessMap = new Map<
        number,
        { business_name: string | null; business_image: string | null }
      >();

      businesses.forEach((b: any) => {
        businessMap.set(b.id, {
          business_name: b.business_name ?? null,
          business_image: b.business_image ?? null,
        });
      });

      // 4) Build flat history list
      const history = visits.map((v) => {
        const biz =
          businessMap.get(v.business_id) || {
            business_name: null,
            business_image: null,
          };

        return {
          id: v.id,
          business_id: v.business_id,
          business_name: biz.business_name,
          business_image: biz.business_image,
          time: this.formatIST(v.time), // IST
          tier: v.tier,
          card_number: v.card_number,
        };
      });

      return res.status(200).json({
        status: true,
        history,
      });
    } catch (err: any) {
      console.error("userAllHistory error:", err);
      return res.status(500).json({
        status: false,
        message: "Server error: " + err.message,
      });
    }
  }
}

export default new VisitController();
