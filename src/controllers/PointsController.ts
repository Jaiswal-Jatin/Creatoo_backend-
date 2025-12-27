// src/controllers/PointsController.ts
import { Request, Response } from "express";
import pointsService from "../services/points.service";

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
