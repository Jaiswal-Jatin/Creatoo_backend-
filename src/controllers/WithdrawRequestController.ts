/**
 * Module: Backend (API Server)
 * File Purpose: Withdraw Request Controller. Manages the lifecycle of creator withdrawal requests.
 * Used By: Admin Panel, User Mobile App
 * API Connected: /api/withdrawRequest/*
 * Database Model: WithdrawRequest, User
 * Critical: Yes
 * Notes: Tracks the status (Pending, Completed, Rejected) of cash-out requests.
 */
import { Request, Response } from "express";
import { Op } from "sequelize";
import WithdrawRequest from "../models/WithdrawRequest";
import User from "../models/User";
import sequelize from "../db/sequelize";

// ---------------------------------------------------------------------
// POST /api/withdrawRequest/addWithdrawRequest
// (Laravel: Route::post('addWithdrawRequest', ...))
// ---------------------------------------------------------------------
export const addWithdrawRequest = async (req: Request, res: Response) => {
  try {
    const { creator_id, amount } = req.body;

    if (!creator_id || !amount) {
      return res.status(422).json({
        status: false,
        message: "creator_id and amount are required",
      });
    }

    const withdrawRequest = await WithdrawRequest.create({
      creator_id: Number(creator_id),   // FIXED
      amount: Number(amount),           // FIXED
    });

    return res.status(201).json({
      status: true,
      message: "Withdraw Request added successfully",
      data: withdrawRequest,
    });
  } catch (error) {
    console.error("addWithdrawRequest error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};


// ---------------------------------------------------------------------
// GET /api/withdrawRequest/list
// (Equivalent of Laravel getWithdrawRequest())
// ---------------------------------------------------------------------
export const getWithdrawRequest = async (req: Request, res: Response) => {
  try {
    const withdrawRequests = await WithdrawRequest.findAll({
      attributes: ["id", "creator_id", "amount", "transaction_id", "status"],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name"],
        },
      ],
    });

    const formatted = withdrawRequests.map((wr: any) => ({
      id: wr.id,
      creator_name: wr.user ? wr.user.name : null,
      amount: wr.amount,
      transaction_id: wr.transaction_id,
      status: wr.status,
    }));

    return res.json({
      status: true,
      data: formatted,
    });
  } catch (error) {
    console.error("getWithdrawRequest error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};


// ---------------------------------------------------------------------
// GET /api/withdrawRequest/all
// ---------------------------------------------------------------------
export const getAllWithdrawRequest = async (req: Request, res: Response) => {
  try {
    const { from_date, to_date } = req.query as {
      from_date?: string;
      to_date?: string;
    };

    const where: any = {};

    if (from_date && to_date) {
      const from = new Date(from_date);
      const to = new Date(to_date);
      to.setHours(23, 59, 59, 999);
      where.created_at = { [Op.between]: [from, to] };
    }

    const records = await WithdrawRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "mobile"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // If later you want DataTables: return res.json({ data: records })
    return res.json(records);
  } catch (error) {
    console.error("getAllWithdrawRequest error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

// ---------------------------------------------------------------------
// POST /api/withdrawRequest/update-transaction
// ---------------------------------------------------------------------
export const updateTransaction = async (req: Request, res: Response) => {
  const { creator_id, transaction_id } = req.body as {
    creator_id?: number;
    transaction_id?: string;
  };

  // Basic validation (Laravel equivalent)
  if (!creator_id || !transaction_id) {
    return res.status(400).json({
      success: false,
      message: "creator_id and transaction_id are required",
    });
  }

  const t = await sequelize.transaction();

  try {
    const [updatedCount] = await WithdrawRequest.update(
      {
        transaction_id,
        status: 1, // same as Laravel: '1' -> completed
      },
      {
        where: { creator_id },
        transaction: t,
      }
    );

    await t.commit();

    if (updatedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No withdraw request found" });
    }

    return res.json({ success: true });
  } catch (error) {
    await t.rollback();
    console.error("updateTransaction error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ---------------------------------------------------------------------
// POST /api/withdrawRequest/changeStatusToRejected
// ---------------------------------------------------------------------
export const changeStatusToRejected = async (req: Request, res: Response) => {
  try {
    const { id, status } = req.body as { id?: number; status?: number };

    if (!id || typeof status === "undefined") {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid Data" });
    }

    const [affectedRows] = await WithdrawRequest.update(
      { status },
      { where: { id } }
    );

    if (affectedRows === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Invalid Data" });
    }

    let message = "Status changed successfully";
    if (status === 2) {
      message = "Request has been rejected successfully";
    }

    return res.json({ status: "success", message });
  } catch (error) {
    console.error("changeStatusToRejected error:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
};
