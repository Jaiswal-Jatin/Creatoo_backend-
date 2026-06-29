/**
 * Module: Backend (API Server)
 * File Purpose: Points Controller. Handles loyalty points transactions and transfers.
 * Used By: Admin Panel, User Mobile App, Business Admin App
 * API Connected: /api/points/*
 * Database Model: CreatorPointsTransaction (via pointsService)
 * Critical: Yes
 * Notes: Manages the point-based loyalty system between businesses and creators.
 */
import { Request, Response } from "express";
import { Op } from "sequelize";
import pointsService from "../services/points.service";
import Setting from "../models/Setting";
import CreatorPointsTransaction from "../models/CreatorPointsTransaction";
import User from "../models/User";

class PointsController {
  // POST /points/creatooPointsTransaction
  async creatooPointsTransaction(req: Request, res: Response) {
    try {
      const { user_id } = req.body as { user_id?: number | string };

      if (!user_id || isNaN(Number(user_id))) {
        return res.status(400).json({
          status: false,
          message: "Invalid user ID",
        });
      }

      const result = await pointsService.getCreatorPointsTransaction(
        Number(user_id)
      );

      return res.status(200).json({
        status: true,
        message: "Data found successfully",
        data: {
          creatoo_points: result.creatoo_points,
          businessTransactions: result.businessTransactions,
        },
      });
    } catch (e) {
      console.error("creatooPointsTransaction error:", e);
      return res.status(500).json({
        status: false,
        message: "Failed to fetch transaction details",
      });
    }
  }

  // POST /points/businessPointsTransaction
  async businessPointsTransaction(req: Request, res: Response) {
    try {
      const { business_id, from_date, to_date } = req.body as {
        business_id?: number | string;
        from_date?: string;
        to_date?: string;
      };

      if (!from_date || !to_date) {
        return res.status(400).json({
          status: false,
          Message: "Both from_date and to_date are required",
          data: [],
        });
      }

      if (!business_id || isNaN(Number(business_id))) {
        return res.status(400).json({
          status: false,
          Message: "business_id is required and must be numeric",
          data: [],
        });
      }

      const result = await pointsService.getBusinessPointsTransaction(
        Number(business_id),
        from_date,
        to_date
      );

      if (!result.userExists) {
        return res.status(404).json({
          status: false,
          Message: "User not found",
          data: [],
        });
      }

      return res.status(200).json({
        status: true,
        Message: "Data Found Successfully",
        data: {
          user_creatoo_points: result.userCreatooPoints,
          transactions: result.transactions,
        },
      });
    } catch (e) {
      console.error("businessPointsTransaction error:", e);
      return res.status(500).json({
        status: false,
        Message: "Failed to fetch data",
        data: [],
      });
    }
  }

  // POST /points/validateCreatooPoints
  async validateCreatooPoints(req: Request, res: Response) {
    try {
      const { business_id, creator_id, points } = req.body as {
        business_id?: number | string;
        creator_id?: number | string;
        points?: number | string;
      };

      if (
        !business_id ||
        !creator_id ||
        points === undefined ||
        isNaN(Number(business_id)) ||
        isNaN(Number(creator_id)) ||
        isNaN(Number(points))
      ) {
        return res.status(400).json({
          status: false,
          message: "Invalid Input",
        });
      }

      const result = await pointsService.validateCreatooPoints({
        business_id: Number(business_id),
        creator_id: Number(creator_id),
        points: Number(points),
      });

      return res.status(result.code).json({
        status: result.status,
        message: result.message,
        flag: result.flag,
        data: result.data,
      });
    } catch (e) {
      console.error("validateCreatooPoints error:", e);
      return res.status(500).json({
        status: false,
        message: "Failed to validate points",
      });
    }
  }

  // POST /points/getBusinessBonusInfo
  async getBusinessBonusInfo(req: Request, res: Response) {
    try {
      const { user_id, business_id } = req.body as {
        user_id?: number | string;
        business_id?: number | string;
      };

      if (!user_id || !business_id || isNaN(Number(user_id)) || isNaN(Number(business_id))) {
        return res.status(400).json({
          status: false,
          message: "Invalid input",
        });
      }

      const setting = await Setting.findByPk(1);
      const bonusPoints = setting?.signup_bonus_points ?? 50;

      // Check if user has any credit transaction for this business
      const existingTxn = await CreatorPointsTransaction.findOne({
        where: {
          user_id: Number(user_id),
          business_id: Number(business_id),
          credit_debit_remaining_status: 'credit',
        },
      });

      const isFirstVisit = !existingTxn;

      return res.json({
        status: true,
        data: {
          is_first_visit: isFirstVisit,
          signup_bonus_points: isFirstVisit ? bonusPoints : 0,
          message: isFirstVisit
            ? `You have ${bonusPoints} signup bonus points for this business!`
            : "You've already visited this business.",
        },
      });
    } catch (e) {
      console.error("getBusinessBonusInfo error:", e);
      return res.status(500).json({
        status: false,
        message: "Failed to fetch business bonus info",
      });
    }
  }

  // POST /points/calculateLoyaltyDiscount
  async calculateLoyaltyDiscount(req: Request, res: Response) {
    try {
      const { user_id, business_id, bill_amount, points_to_use } = req.body as {
        user_id?: number | string;
        business_id?: number | string;
        bill_amount?: number | string;
        points_to_use?: number | string;
      };

      if (!user_id || !business_id || !bill_amount || points_to_use === undefined) {
        return res.status(400).json({
          status: false,
          message: "Invalid input",
        });
      }

      const userId = Number(user_id);
      const billAmount = Number(bill_amount);
      const pointsToUse = Number(points_to_use);

      // Fetch user's available bonus + loyalty points
      const bonusTxns = await CreatorPointsTransaction.findAll({
        where: {
          user_id: userId,
          credit_debit_remaining_status: 'credit',
          remaining_points: { [Op.gt]: 0 },
        },
      });

      // Include bonus (business_id: null) + business-specific points
      const relevantTxns = bonusTxns.filter(t =>
        t.business_id === null || t.business_id === Number(business_id)
      );

      const totalAvailablePoints = relevantTxns.reduce(
        (sum, t) => sum + t.remaining_points, 0
      );

      // Max 60% of available points
      const maxUsableFromPoints = Math.floor(totalAvailablePoints * 0.60);
      
      // Max 60% of bill amount
      const maxUsableFromBill = Math.floor(billAmount * 0.60);
      
      // Max usable is the minimum of both limits
      const maxUsable = Math.min(maxUsableFromPoints, maxUsableFromBill);
      const actualPointsToUse = Math.min(pointsToUse, maxUsable);

      // Dynamic platform fee from settings
      const setting = await Setting.findByPk(1);
      const platformFeePercent = setting?.platform_fee_percent ?? 1.5;
      const platformFee = billAmount * (platformFeePercent / 100);

      const effectiveDiscount = actualPointsToUse - platformFee;
      const finalBill = billAmount - effectiveDiscount;

      return res.json({
        status: true,
        data: {
          bill_amount: billAmount,
          available_points: totalAvailablePoints,
          max_usable_points: maxUsable,
          points_to_redeem: actualPointsToUse,
          platform_fee_percent: platformFeePercent,
          platform_fee_deducted: Math.round(platformFee * 100) / 100,
          effective_discount: Math.round(effectiveDiscount * 100) / 100,
          final_bill: Math.round(finalBill * 100) / 100,
        },
      });
    } catch (e) {
      console.error("calculateLoyaltyDiscount error:", e);
      return res.status(500).json({
        status: false,
        message: "Failed to calculate loyalty discount",
      });
    }
  }

  // POST /points/transferCreatooPoints
  async transferCreatooPoints(req: Request, res: Response) {
    try {
      const { business_id, creator_id, points } = req.body as {
        business_id?: number | string;
        creator_id?: number | string;
        points?: number | string;
      };

      if (
        !business_id ||
        !creator_id ||
        points === undefined ||
        isNaN(Number(business_id)) ||
        isNaN(Number(creator_id)) ||
        isNaN(Number(points))
      ) {
        return res.status(400).json({
          status: false,
          message: "Invalid input data",
        });
      }

      const result = await pointsService.transferCreatooPoints({
        business_id: Number(business_id),
        creator_id: Number(creator_id),
        points: Number(points),
      });

      return res.status(result.code).json({
        status: result.status,
        message: result.message,
        data: result.data,
      });
    } catch (e) {
      console.error("transferCreatooPoints error:", e);
      return res.status(500).json({
        status: false,
        message: "Failed to transfer creatoo points.",
      });
    }
  }
}

export default new PointsController();
