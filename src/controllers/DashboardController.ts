/**
 * Module: Backend (API Server)
 * File Purpose: Dashboard Controller. Provides high-level counts for the Admin Panel dashboard.
 * Used By: Admin Panel
 * API Connected: /api/dashboard/data-counts
 * Database Model: User, Post, PostReport, Order, WalletTransaction
 * Critical: No (Analytics only)
 */
import { Request, Response } from "express";
import { Op, fn, col, where, literal } from "sequelize";
import User from "../models/User";
import Post from "../models/Post";
import PostReport from "../models/PostReport";
import Order from "../models/Order";
import WalletTransaction from "../models/WalletTransaction";

export const getCounts = async (_req: Request, res: Response) => {
  try {
    // Count creators (role_id = 3)
    const creatorCount = await User.count({
      where: { role_id: 3 },
    });

    // Count businesses (role_id = 2)
    const businessCount = await User.count({
      where: { role_id: 2 },
    });

    // Pending withdraw requests: credit_debit is NULL
    const pendingWithdrawRequestCount = await WalletTransaction.count({
      where: { credit_debit: null },
    });

    // All post report rows
    const allReports = await PostReport.findAll({
      attributes: ["post_id"],
    });

    const postIds = allReports.map((item) => item.post_id);

    // Posts that are in the reported list AND is_reported = 0
    const creatorReportedPostsCount = await Post.count({
      where: {
        id: postIds.length > 0 ? postIds : [0], // avoids empty IN error
        is_reported: "0",
      },
    });

    // Pending posts
    const pendingPostCount = await Post.count({
      where: { post_status: "0" },
    });

    // TOTAL orders
    const totalOrders = await Order.count();

    // TODAY orders (same as Laravel: whereDate(created_at, today))
    const todayOrders = await Order.count({
      where: literal(`DATE(created_at) = CURDATE()`),
    });

    return res.json({
      creatorCount,
      businessCount,
      pendingWithdrawRequestCount,
      creatorReportedPostsCount,
      pendingPostCount,
      totalOrders,
      todayOrders,
    });
  } catch (error) {
    console.error("Dashboard getCounts error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};
