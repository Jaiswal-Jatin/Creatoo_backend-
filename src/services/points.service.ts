/**
 * Module: Backend (API Server)
 * File Purpose: Points Service. Manages the loyalty points lifecycle, including validation, expiry, and redemptions.
 * Used By: PointsController, HomeController, StatsController
 * Database Model: User, CreatorPointsTransaction, CreatooRequest
 * Critical: Yes (Financial/Loyalty)
 * Notes: Implements complex point expiry logic and atomic point transfers.
 */
import { Op, Transaction } from "sequelize";
import sequelize from "../db/sequelize";
import User from "../models/User";
import CreatorPointsTransaction from "../models/CreatorPointsTransaction";
import CreatooRequest from "../models/CreatooRequest";
import { sendPushNotification } from "./notification.service";

class PointsService {
  /**
   * Laravel: creatooPointsTransaction
   */
  async getCreatorPointsTransaction(userId: number) {
    const transactions = await CreatorPointsTransaction.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
    });

    if (!transactions.length) {
      return {
        creatoo_points: 0,
        businessTransactions: [] as any[],
      };
    }

    const now = new Date();

    const total_balance = transactions
      .filter((t) => t.expiry_date && t.expiry_date >= now)
      .reduce((sum, t) => sum + Number(t.remaining_points), 0);

    // group by business_id (skip nulls)
    const byBusiness = new Map<number, CreatorPointsTransaction[]>();

    for (const t of transactions) {
      if (t.business_id == null) continue; // 🔧 avoid number | null
      const businessId = t.business_id;
      const arr = byBusiness.get(businessId) || [];
      arr.push(t);
      byBusiness.set(businessId, arr);
    }

    const businessTransactions: any[] = [];

    for (const [businessId, group] of byBusiness.entries()) {
      const business = await User.findOne({
        where: { id: businessId, role_id: 2 },
        attributes: ["id", "business_name"],
      });

      if (!business) continue;

      const balanceForBusiness = transactions
        .filter(
          (t) =>
            t.business_id === businessId &&
            t.expiry_date &&
            t.expiry_date >= now
        )
        .reduce((sum, t) => sum + Number(t.remaining_points), 0);

      const transactionsWithExpiryStatus = group.map((t) => {
        const json = t.toJSON() as any;
        const isExpired = json.expiry_date
          ? new Date(json.expiry_date) < now
          : false;
        return {
          ...json,
          is_expired: isExpired,
        };
      });

      businessTransactions.push({
        business_id: business.id,
        business_name: business.business_name,
        total_points: Number(balanceForBusiness),
        transactions: transactionsWithExpiryStatus,
      });
    }

    return {
      creatoo_points: total_balance,
      businessTransactions,
    };
  }

  /**
   * Laravel: businessPointsTransaction
   */
  async getBusinessPointsTransaction(
    businessId: number,
    fromDate: string,
    toDate: string
  ) {
    const user = await User.findByPk(businessId);
    if (!user) {
      return { userExists: false };
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const pointsAdded = await CreatooRequest.sum("points_received", {
      where: {
        business_id: businessId,
        status: "3",
        created_at: {
          [Op.between]: [from, to],
        },
      },
    });

    const userCreatooPoints = Number(pointsAdded || 0);

    const transactions = await CreatooRequest.findAll({
      where: {
        business_id: businessId,
        status: "3",
        created_at: { [Op.between]: [from, to] },
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["instagram_username", "name"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    const formatted = transactions.map((t) => {
      const json: any = t.toJSON();
      const creator = json.creator || {};
      return {
        id: json.id,
        points: Number(json.points_received),
        instagram_username: creator.instagram_username,
        creator_name: creator.name,
        status: json.status === "1" ? "Debited" : "Credited",
        created_at: new Date(json.created_at)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19),
      };
    });

    return {
      userExists: true,
      userCreatooPoints,
      transactions: formatted,
    };
  }

  /**
   * Laravel: validateCreatooPoints
   */
  async validateCreatooPoints(params: {
    business_id: number;
    creator_id: number;
    points: number;
  }) {
    const { business_id, creator_id, points } = params;

    const creatorActivePoints = await CreatooRequest.sum("active_points", {
      where: {
        creator_id,
        business_id,
      },
    });

    // business set_expiry / max_redemption
    const business = await User.findByPk(business_id, {
      attributes: ["set_expiry", "max_redemption"],
    });

    if (!business) {
      return {
        status: false,
        code: 404,
        message: "Business setting expiry not found.",
        data: null,
      };
    }

    const max_redemption = business.max_redemption ?? 0;

    const redeemed_count = await CreatooRequest.count({
      where: {
        business_id,
        creator_id,
        status: "3",
      },
    });

    if (max_redemption < redeemed_count) {
      return {
        status: false,
        code: 400,
        message: "You have exceeded redemption limit.",
        flag: 0,
        data: creatorActivePoints || 0,
      };
    }

    // businessTransactions + creatooPoints logic
    const creatooRequests = await CreatooRequest.findAll({
      where: { creator_id },
      order: [["created_at", "DESC"]],
    });

    const businessTransactions: Record<
      number,
      {
        business_id: number;
        business_name: string | null;
        transactions: any[];
        total_points: number;
      }
    > = {};

    for (const req of creatooRequests) {
      const businessId = req.business_id;
      if (businessId == null) continue; // 🔧 guard against null

      const pointsReceived = Number(req.points_received);
      let statusLabel: string;

      const statusVal = String(req.status);

      switch (statusVal) {
        case "0":
          statusLabel = "pending";
          break;
        case "1":
          statusLabel = "credit";
          break;
        case "3":
          statusLabel = "redeemed";
          break;
        case "2":
        default:
          statusLabel = "rejected";
          break;
      }

      const businessUser = await User.findOne({
        where: { id: businessId, role_id: 2 },
        attributes: ["id", "business_name", "set_expiry"],
      });

      if (!businessUser) continue;

      const createdAt = new Date(req.created_at || new Date());
      const updatedAt = new Date(req.updated_at || new Date());

      const transactionData: any = {
        points_received: pointsReceived,
        updated_at: updatedAt.toISOString().replace("T", " ").slice(0, 19),
        credit_debit: statusLabel,
        expiry: null,
      };

      if (statusVal === "1") {
        const expiryDays = businessUser.set_expiry ?? 0;
        const diffDays = Math.floor(
          (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const isExpired = diffDays > expiryDays ? "Expired" : "Active";
        transactionData.expiry = isExpired;
        if (isExpired === "Active") {
          transactionData.remaining_days = expiryDays - diffDays;
        }
      }

      if (!businessTransactions[businessId]) {
        businessTransactions[businessId] = {
          business_id: businessUser.id,
          business_name: businessUser.business_name,
          transactions: [],
          total_points: 0,
        };
      }

      businessTransactions[businessId].transactions.push(transactionData);

      if (statusVal === "1" && transactionData.expiry === "Active") {
        businessTransactions[businessId].total_points += pointsReceived;
      } else if (statusVal === "3") {
        businessTransactions[businessId].total_points -= pointsReceived;
      }
    }

    const creatooPoints = Object.values(businessTransactions).reduce(
      (carry, transaction) =>
        transaction.total_points > 0
          ? carry + transaction.total_points
          : carry,
      0
    );

    if (points <= Number(creatorActivePoints || 0)) {
      return {
        status: true,
        code: 200,
        message: "Valid points.",
        flag: 1,
        data: creatorActivePoints || 0,
      };
    } else {
      return {
        status: false,
        code: 400,
        message: "Insufficient active points.",
        flag: 0,
        data: creatorActivePoints || 0,
      };
    }
  }

  /**
   * Laravel: transferCreatooPoints
   */
  async transferCreatooPoints(params: {
    business_id: number;
    creator_id: number;
    points: number;
  }) {
    const { business_id, creator_id, points } = params;

    return await sequelize.transaction(async (t: Transaction) => {
      const business = await User.findByPk(business_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const creator = await User.findByPk(creator_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!business || !creator) {
        return {
          status: false,
          code: 404,
          message: "Business or creator not found.",
        };
      }

      const activePointsRecords = await CreatooRequest.findAll({
        where: {
          creator_id,
          business_id,
          active_points: {
            [Op.gt]: 0,
          },
        },
        order: [["created_at", "ASC"]],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      const totalActivePoints = activePointsRecords.reduce(
        (sum, r) => sum + Number(r.active_points),
        0
      );

      if (totalActivePoints < points) {
        return {
          status: false,
          code: 400,
          message: "Creator does not have enough active points.",
        };
      }

      let remainingPoints = points;

      for (const record of activePointsRecords) {
        if (remainingPoints <= 0) break;

        const ap = Number(record.active_points);

        if (ap <= remainingPoints) {
          remainingPoints -= ap;
          record.active_points = 0;
          await record.save({ transaction: t });
        } else {
          record.active_points = ap - remainingPoints;
          await record.save({ transaction: t });
          remainingPoints = 0;
        }
      }

      // update user_creatoo_points
      const businessPoints = Number(business.user_creatoo_points || 0);
      const creatorPoints = Number(creator.user_creatoo_points || 0);

      await business.update(
        { user_creatoo_points: businessPoints + points },
        { transaction: t }
      );
      await creator.update(
        { user_creatoo_points: creatorPoints - points },
        { transaction: t }
      );

      const transactionId = `${business_id}${creator_id}${Date.now()}`;

      await CreatooRequest.create(
        {
          business_id,
          creator_id,
          points_received: points,
          transaction_id: transactionId,
          status: "3",
        },
        { transaction: t }
      );

      // push notification to business
      const rememberToken = business.remember_token;

      if (rememberToken) {
        await sendPushNotification(
          {
            title: "Redeem Points Received",
            description: `You have successfully received ${points} points.`,
          },
          [rememberToken as string]
        );
      }

      return {
        status: true,
        code: 200,
        message: "Creatoo points transferred successfully.",
        data: {
          transaction_id: transactionId,
          transferred_points: points,
        },
      };
    });
  }
}

export const pointsService = new PointsService();
export default pointsService;
