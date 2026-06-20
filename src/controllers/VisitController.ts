import { Request, Response } from "express";
import { Op } from "sequelize";
import Card from "../models/Card";
import Visit, { VisitTier } from "../models/Visit";
import User from "../models/User";
import Business from "../models/Business";
import BusinessAssociate from "../models/BusinessAssociate";

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
  private formatIST(date: any): string {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    if (!(d instanceof Date) || isNaN(d.getTime())) return "";
    return d
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
  private formatISTDate(date: any): string {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    if (!(d instanceof Date) || isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  /**
   * Helper: Check if a business is a main/parent business (has direct associates)
   * Returns true if this business has associates, false if it's an associate or standalone
   */
  private async isMainBusiness(businessId: number): Promise<boolean> {
    const associates = await BusinessAssociate.findOne({
      where: { parent_business_id: businessId },
    });
    return !!associates;
  }

  /**
   * Helper: Get all business IDs in the associate network (recursive)
   * Returns ALL businesses connected in the hierarchy (parents, associates, and associates of parents)
   */
  private async getAssociateNetwork(businessId: number): Promise<number[]> {
    const visited = new Set<number>();
    const toProcess = [businessId];

    while (toProcess.length > 0) {
      const currentId = toProcess.shift()!;
      
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Get all direct associates (where current is parent)
      const associates = await BusinessAssociate.findAll({
        where: { parent_business_id: currentId },
        attributes: ['associate_business_id']
      });

      // Get all parent businesses (where current is associate)
      const parents = await BusinessAssociate.findAll({
        where: { associate_business_id: currentId },
        attributes: ['parent_business_id']
      });

      // Add to processing queue
      associates.forEach((a: any) => {
        if (!visited.has(a.associate_business_id)) {
          toProcess.push(a.associate_business_id);
        }
      });

      parents.forEach((p: any) => {
        if (!visited.has(p.parent_business_id)) {
          toProcess.push(p.parent_business_id);
        }
      });
    }

    return Array.from(visited);
  }

  /**
   * Tier logic:
   * - No history => "new"
   * - last visit 0–7 days => "premium"
   * - last visit 8–15 days => "elite"
   * - last visit >15 days => "core"
   */
  private getTimeMs(t: any): number {
    if (!t) return 0;
    if (typeof t === "string") return new Date(t).getTime();
    if (typeof t === "number") return t;
    return t.getTime();
  }

  private calculateTier(lastVisit: Visit | null): VisitTier {
    if (!lastVisit) return "new";

    const now = Date.now();
    const timeMs = this.getTimeMs(lastVisit.time);
    const diffDays = Math.floor((now - timeMs) / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return "premium";
    if (diffDays <= 15) return "elite";
    return "core";
  }

  /**
   * Associate-aware tier calculation:
   * Considers visits to any business in the associate network
   */
  private async calculateAssociateTier(cardNumber: number, businessId: number): Promise<VisitTier> {
    // Get all business IDs in the associate network
    const networkIds = await this.getAssociateNetwork(businessId);
    
    // Find the last visit for this card across the entire network
    const lastVisit = await Visit.findOne({
      where: { 
        card_number: cardNumber, 
        business_id: { [Op.in]: networkIds } 
      },
      order: [["time", "DESC"]],
    });

    return this.calculateTier(lastVisit);
  }

  /**
   * Helper: Load business info from both `businesses` and `users` tables,
   * preferring data from the `businesses` table.
   * Returns a Map<businessId, { business_name, business_image, business_category }>
   */
  private async loadBusinesses(businessIds: number[]): Promise<Map<number, { business_name: string | null; business_image: string | null; business_category: string | null }>> {
    const businessMap = new Map<number, { business_name: string | null; business_image: string | null; business_category: string | null }>();

    if (businessIds.length === 0) return businessMap;

    // Try businesses table first
    const bizRecords = await Business.findAll({
      where: { id: { [Op.in]: businessIds } },
      attributes: ["id", "business_name", "business_image", "business_category"],
    });

    const foundIds = new Set<number>();
    bizRecords.forEach((b: any) => {
      foundIds.add(b.id);
      businessMap.set(b.id, {
        business_name: b.business_name ?? null,
        business_image: b.business_image ?? null,
        business_category: b.business_category ?? null,
      });
    });

    // Fallback to users table for any IDs not found in businesses
    const missingIds = businessIds.filter(id => !foundIds.has(id));
    if (missingIds.length > 0) {
      const userRecords = await User.findAll({
        where: { id: { [Op.in]: missingIds } },
        attributes: ["id", "business_name", "business_image", "business_category"],
      });
      userRecords.forEach((u: any) => {
        businessMap.set(u.id, {
          business_name: u.business_name ?? null,
          business_image: u.business_image ?? null,
          business_category: u.business_category ?? null,
        });
      });
    }

    return businessMap;
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

      // Use associate-aware tier calculation
      const tier = await this.calculateAssociateTier(cardNumber, businessId);

      // 3) Full history for this card & business (or network if main business)
      const isMainBusiness = await this.isMainBusiness(businessId);
      
      let history;
      let businessIdsList: number[];
      
      if (isMainBusiness) {
        // Main business sees visits from entire network
        const networkIds = await this.getAssociateNetwork(businessId);
        businessIdsList = networkIds;
        history = await Visit.findAll({
          where: { card_number: cardNumber, business_id: { [Op.in]: networkIds } },
          order: [["time", "DESC"]],
        });
      } else {
        // Associate business sees only their own visits
        businessIdsList = [businessId];
        history = await Visit.findAll({
          where: { card_number: cardNumber, business_id: businessId },
          order: [["time", "DESC"]],
        });
      }

      // Load business information for network visits
      const businessMap = await this.loadBusinesses(businessIdsList);

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

      // Recalculate tiers per visit in history (stored tiers may be stale)
      const historyAsc = [...history].sort((a, b) => this.getTimeMs(a.time) - this.getTimeMs(b.time));
      const recalculatedTiers = new Map<number, VisitTier>();
      let lastHistoryVisit: Visit | null = null;
      for (const hv of historyAsc) {
        const correctTier = this.calculateTier(lastHistoryVisit);
        recalculatedTiers.set(hv.id, correctTier);
        lastHistoryVisit = hv;
      }

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
          const businessInfo = businessMap.get(v.business_id);

          return {
            id: v.id,
            user_id: v.user_id,
            card_number: v.card_number,
            business_id: v.business_id,
            business_name: businessInfo?.business_name ?? null,
            business_image: businessInfo?.business_image ?? null,
            tier: recalculatedTiers.get(v.id) || "new",
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

      // Use associate-aware tier calculation
      const tier = await this.calculateAssociateTier(cardNumber, businessId);

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

      // Load business information for the response
      const businessMap = await this.loadBusinesses([businessId]);

      // Recalculate tiers per visit in history (stored tiers may be stale)
      const historyAsc = [...history].sort((a, b) => this.getTimeMs(a.time) - this.getTimeMs(b.time));
      const historyTiers = new Map<number, VisitTier>();
      let lastHistoryVisit: Visit | null = null;
      for (const hv of historyAsc) {
        const correctTier = this.calculateTier(lastHistoryVisit);
        historyTiers.set(hv.id, correctTier);
        lastHistoryVisit = hv;
      }

      return res.status(200).json({
        status: true,
        message: "Visit recorded successfully",
        tier,
        card: {
          card_number: card.number,
          name: card.name,
          user_id: card.user_id,
        },
        visit_history: history.map((v) => {
          const businessInfo = businessMap.get(v.business_id);
          return {
            id: v.id,
            user_id: v.user_id,
            card_number: v.card_number,
            business_id: v.business_id,
            business_name: businessInfo?.business_name ?? null,
            business_image: businessInfo?.business_image ?? null,
            tier: historyTiers.get(v.id) || "new",
            time: this.formatIST(v.time), // IST
          };
        }),
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
   *  - days: visits grouped by date (for this business and associate businesses)
   *  - Main business sees all visits including associate business visits with business names
   *  - Associate business sees only their own visits
   *  - Mobile clients can request only main business visits via ?mobile=true
   */
  async history(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res
          .status(401)
          .json({ status: false, message: "Unauthorized" });
      }
      const businessId = req.user.id;

      // Check if this is a main business (has direct associates)
      const main = await this.isMainBusiness(businessId);
      
      // Check if mobile client is requesting (query param: ?mobile=true)
      const isMobileClient = req.query.mobile === "true";
      
      let visits;
      let businessIds: number[];
      
      if (main) {
        // Main business logic:
        // - Web: gets all visits from their network
        // - Mobile: gets only their own main business visits
        if (isMobileClient) {
          // Mobile: show only main business visits, not network
          businessIds = [businessId];
          visits = await Visit.findAll({
            where: { business_id: businessId },
            order: [["time", "DESC"]],
          });
        } else {
          // Web: show full network
          const networkIds = await this.getAssociateNetwork(businessId);
          businessIds = networkIds;
          visits = await Visit.findAll({
            where: { business_id: { [Op.in]: businessIds } },
            order: [["time", "DESC"]],
          });
        }
      } else {
        // Associate business gets only their own visits
        businessIds = [businessId];
        visits = await Visit.findAll({
          where: { business_id: businessId },
          order: [["time", "DESC"]],
        });
      }

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

      // Load business information for all businesses in the visit data
      const businessMap = await this.loadBusinesses(businessIds);

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
        business_id?: number;
        business_name?: string | null;
      };

      type DayGroup = {
        date: string;
        visits: DayVisit[];
      };

      // Recalculate tiers on-the-fly (stored tiers may be stale due to cascading bug)
      // Group visits by card_number, process chronologically to determine correct tier per visit
      const visitsByCard = new Map<number, typeof visits>();
      for (const v of visits) {
        if (!visitsByCard.has(v.card_number)) {
          visitsByCard.set(v.card_number, []);
        }
        visitsByCard.get(v.card_number)!.push(v);
      }

      const recalculatedTiers = new Map<number, VisitTier>();
      for (const [, cardVisits] of visitsByCard) {
        // Sort ASC to process chronologically
        cardVisits.sort((a, b) => this.getTimeMs(a.time) - this.getTimeMs(b.time));
        let lastVisit: Visit | null = null;
        for (const cv of cardVisits) {
          const correctTier = this.calculateTier(lastVisit);
          recalculatedTiers.set(cv.id, correctTier);
          lastVisit = cv;
        }
      }

      const daysMap = new Map<string, DayGroup>();

      for (const v of visits) {
        const correctTier = recalculatedTiers.get(v.id) || "new";
        summary[correctTier] = (summary[correctTier] || 0) + 1;

        // Use IST date
        const dateKey = this.formatISTDate(v.time);

        if (!daysMap.has(dateKey)) {
          daysMap.set(dateKey, { date: dateKey, visits: [] });
        }

        const group = daysMap.get(dateKey)!;
        const businessInfo = businessMap.get(v.business_id);
        
        group.visits.push({
          card_number: v.card_number,
          name: cardNameMap.get(v.card_number) ?? null,
          tier: correctTier,
          time: this.formatIST(v.time), // IST
          business_id: v.business_id,
          business_name: businessInfo?.business_name ?? null,
        });
      }

      const days = Array.from(daysMap.values()).sort((a, b) =>
        a.date < b.date ? 1 : -1
      );

      return res.status(200).json({
        status: true,
        summary,
        days,
        is_main_business: main,
        network_businesses: businessIds.map(id => ({
          business_id: id,
          business_name: businessMap.get(id)?.business_name ?? null,
        })),
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
          businesses: [],
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
          businesses: [],
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
      const businessMap = await this.loadBusinesses(businessIds);

      // 5) Build business-wise structure WITH visits and associate business info
      const businessesData = Array.from(byBusiness.entries()).map(
        ([businessId, bizVisits]) => {
          const lastVisit = bizVisits[0]; // already sorted DESC
          const currentTier = this.calculateTier(lastVisit);

          const bizInfo =
            businessMap.get(businessId) || {
              business_name: null,
              business_image: null,
              business_category: null,
            };

          // Recalculate tiers per visit in this business's history
          const bizVisitsAsc = [...bizVisits].sort((a, b) => this.getTimeMs(a.time) - this.getTimeMs(b.time));
          const bizVisitTiers = new Map<number, VisitTier>();
          let lastBizVisit: Visit | null = null;
          for (const bv of bizVisitsAsc) {
            const correctTier = this.calculateTier(lastBizVisit);
            bizVisitTiers.set(bv.id, correctTier);
            lastBizVisit = bv;
          }

          return {
            business_id: businessId,
            business_name: bizInfo.business_name,
            business_image: bizInfo.business_image,
            business_category: bizInfo.business_category,
            current_tier: currentTier,
            total_visits: bizVisits.length,
            last_visit: this.formatIST(lastVisit.time), // IST
            visits: bizVisits.map((v) => ({
              time: this.formatIST(v.time), // IST
              tier: bizVisitTiers.get(v.id) || "new",
              card_number: v.card_number,
              business_id: v.business_id,
              business_name: bizInfo.business_name,
            })),
          };
        }
      );

      // 6) Sort businesses by last_visit (DESC)
      businessesData.sort(
        (a, b) =>
          new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime()
      );

      return res.status(200).json({
        status: true,
        total_visits: totalVisits,
        businesses: businessesData,
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

      // 3) Load businesses (business_name & business_image from businesses/user tables)
      const businessIds = Array.from(new Set(visits.map((v) => v.business_id)));
      const businessMap = await this.loadBusinesses(businessIds);

      // 4) Recalculate tiers per visit (stored tiers may be stale)
      const visitsAsc = [...visits].sort((a, b) => this.getTimeMs(a.time) - this.getTimeMs(b.time));
      const recalculatedTiers = new Map<number, VisitTier>();
      let lastVisitForTier: Visit | null = null;
      for (const cv of visitsAsc) {
        const correctTier = this.calculateTier(lastVisitForTier);
        recalculatedTiers.set(cv.id, correctTier);
        lastVisitForTier = cv;
      }

      // 5) Build flat history list
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
          tier: recalculatedTiers.get(v.id) || "new",
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
  /**
   * USER SIDE
   * GET /api/visit/today-count?business_id=X
   * Returns today's visit count for the logged-in user at the given business.
   */
  async getTodayVisitCount(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ status: false, message: "Unauthorized" });
      }
      const userId = req.user.id;
      const businessIdRaw = req.query.business_id;
      if (!businessIdRaw) {
        return res.status(422).json({ status: false, message: "business_id is required" });
      }
      const businessId = Number(businessIdRaw);
      if (Number.isNaN(businessId)) {
        return res.status(422).json({ status: false, message: "business_id must be numeric" });
      }

      // Find all cards for this user
      const cards = await Card.findAll({ where: { user_id: userId } });
      const cardNumbers = cards.map((c) => c.number);
      if (cardNumbers.length === 0) {
        return res.json({ status: true, data: { today_count: 0, tier: "new" } });
      }

      // Get today's start and end in IST
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffset);
      const istStartOfDay = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0));
      const istEndOfDay = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 23, 59, 59, 999));

      const todayCount = await Visit.count({
        where: {
          user_id: userId,
          business_id: businessId,
          card_number: { [Op.in]: cardNumbers },
          time: { [Op.gte]: istStartOfDay, [Op.lte]: istEndOfDay },
        },
      });

      // Calculate user's current tier for this business
      const networkIds = await this.getAssociateNetwork(businessId);
      const lastVisit = await Visit.findOne({
        where: {
          user_id: userId,
          business_id: { [Op.in]: networkIds },
          card_number: { [Op.in]: cardNumbers },
        },
        order: [["time", "DESC"]],
      });
      const tier = this.calculateTier(lastVisit);

      return res.json({ status: true, data: { today_count: todayCount, tier } });
    } catch (err: any) {
      console.error("getTodayVisitCount error:", err);
      return res.status(500).json({ status: false, message: "Server error: " + err.message });
    }
  }

  /**
    * BUSINESS SIDE
    * GET /api/visit/business-visits
    * Returns a flat list of all visits for this business with user details.
    * Supports optional search by user name and date filtering.
    */
  async getBusinessVisits(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ status: false, message: "Unauthorized" });
      }
      const businessId = req.user.id;
      const search = req.query.search as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;

      const whereClause: any = { business_id: businessId };

      if (from || to) {
        const timeFilter: any = {};
        if (from) timeFilter[Op.gte] = new Date(from);
        if (to) timeFilter[Op.lte] = new Date(to);
        whereClause.time = timeFilter;
      }

      let visits = await Visit.findAll({
        where: whereClause,
        order: [["time", "DESC"]],
      });

      // Load user details linked via card user_id
      const userIds = Array.from(
        new Set(visits.map((v) => v.user_id).filter(Boolean).map(Number))
      );

      const userMap = new Map<number, { name: string | null; user_image: string | null; mobile: string | null }>();
      if (userIds.length > 0) {
        const users = await User.findAll({
          where: { id: { [Op.in]: userIds } },
          attributes: ["id", "name", "user_image", "mobile"],
        });
        users.forEach((u: any) => {
          userMap.set(u.id, {
            name: u.name ?? null,
            user_image: u.user_image ?? null,
            mobile: u.mobile ?? null,
          });
        });
      }

      // Load card names
      const cardNumbers = Array.from(new Set(visits.map((v) => v.card_number)));
      const cards = await Card.findAll({
        where: { number: { [Op.in]: cardNumbers } },
        attributes: ["number", "name"],
      });
      const cardNameMap = new Map<number, string | null>();
      cards.forEach((c: any) => {
        cardNameMap.set(c.number, c.name ?? null);
      });

      // Recalculate tiers on-the-fly (stored tiers may be stale)
      const visitsByCard = new Map<number, typeof visits>();
      for (const v of visits) {
        if (!visitsByCard.has(v.card_number)) {
          visitsByCard.set(v.card_number, []);
        }
        visitsByCard.get(v.card_number)!.push(v);
      }
      const recalculatedTiers = new Map<number, VisitTier>();
      for (const [, cardVisits] of visitsByCard) {
        cardVisits.sort((a, b) => this.getTimeMs(a.time) - this.getTimeMs(b.time));
        let lastVisit: Visit | null = null;
        for (const cv of cardVisits) {
          const correctTier = this.calculateTier(lastVisit);
          recalculatedTiers.set(cv.id, correctTier);
          lastVisit = cv;
        }
      }

      let result = visits.map((v) => {
        const userId = v.user_id ? Number(v.user_id) : null;
        const user = userId && userMap.has(userId) ? userMap.get(userId)! : null;
        return {
          id: v.id,
          user_id: v.user_id,
          card_number: v.card_number,
          card_name: cardNameMap.get(v.card_number) ?? null,
          tier: recalculatedTiers.get(v.id) || "new",
          time: this.formatIST(v.time),
          user_name: user?.name ?? null,
          user_image: user?.user_image ?? null,
          user_mobile: user?.mobile ?? null,
        };
      });

      // Client-side search filter by user name
      if (search && search.trim().length > 0) {
        const q = search.toLowerCase();
        result = result.filter(
          (r) =>
            (r.user_name && r.user_name.toLowerCase().includes(q)) ||
            (r.card_name && r.card_name.toLowerCase().includes(q))
        );
      }

      return res.status(200).json({
        status: true,
        data: result,
        total: result.length,
      });
    } catch (err: any) {
      console.error("getBusinessVisits error:", err);
      return res.status(500).json({
        status: false,
        message: "Server error: " + err.message,
      });
    }
  }
}

export default new VisitController();
