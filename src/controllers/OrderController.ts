import { Request, Response } from "express";
import { Op } from "sequelize";
import Order from "../models/Order";
import User from "../models/User";

export const index = async (req: Request, res: Response) => {
  try {
    const {
      from_date,
      to_date,
      business_name,
      filter,
    } = req.query as {
      from_date?: string;
      to_date?: string;
      business_name?: string;
      filter?: string;
    };

    const searchValue =
      (req.query["search[value]"] as string | undefined) || "";

    // Base WHERE for orders
    const whereOrder: any = {};

    // Laravel: if filter == 'today'
    if (filter === "today") {
      const today = new Date();
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const end = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );
      whereOrder.created_at = { [Op.between]: [start, end] };
    }

    // Date range filter
    if (from_date && to_date) {
      const start = new Date(from_date);
      const end = new Date(to_date);
      end.setHours(23, 59, 59, 999);
      whereOrder.created_at = { [Op.between]: [start, end] };
    }

    // WHERE for business user
    const whereBusiness: any = {};

    if (business_name) {
      whereBusiness.business_name = { [Op.like]: `%${business_name}%` };
    }

    // global search like Laravel's $searchKeyword
    if (searchValue) {
      whereBusiness.business_name = { [Op.like]: `%${searchValue}%` };
    }

    // Main query
    const orders = await Order.findAll({
      where: whereOrder,
      include: [
  {
    model: User,
    as: "business",
    attributes: ["business_name","id"],
    required: false,
    where: Object.keys(whereBusiness).length ? whereBusiness : undefined,
  },
  {
    model: User,
    as: "referrer",
    attributes: ["referrer_code"],
    required: false,
  },
  {
    model: User,
    as: "creator",  // 👈 ADD THIS
    attributes: ["name"],
    required: false,
  },
],

      attributes: [
        "order_id",
        "user_id",
        "original_bill_amount",
        "loyalty_points_used_discount_amount",
        "final_bill_amount",
        "loyalty_points_earned",
        "review_status",
        "referrer_id",
        "discount_percentage",
        "settlement_amount",
        "created_at",
      ],
      order: [["created_at", "DESC"]],
    });

    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order: any) => {
      const amt = Number(order.settlement_amount || 0);
      return sum + amt;
    }, 0);

    // If you're using DataTables on frontend, this structure works well:
    return res.json({
      data: orders,
      total_orders: totalOrders,
      total_amount: totalAmount.toFixed(2),
      // For full DataTables server-side:
      // draw: Number(req.query.draw || 1),
      // recordsTotal: totalOrders,
      // recordsFiltered: totalOrders,
    });
  } catch (error) {
    console.error("OrderController.index error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const showDetails = async (req: Request, res: Response) => {
  try {
    const { order_id } = req.params;

    const order = await Order.findOne({
      where: { order_id },
      include: [
        {
          model: User,
          as: "business",
          attributes: ["business_name"],
          required: false,
        },
        {
          model: User,
          as: "creator",
          attributes: ["name"],
          required: false,
        },
        {
          model: User,
          as: "referrer",
          attributes: ["referrer_code"],
          required: false,
        },
      ],
      attributes: [
        "order_id",
        "original_bill_amount",
        "platform_fee",
        "gateway_charges",
        "loyalty_points_used_discount_amount",
        "loyalty_points_earned",
        "review_status",
        "final_bill_amount",
        "referrer_id",
        "discount_percentage",
        "settlement_amount",
        "business_id",
        "user_id",
        "created_at",
      ],
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json(order);
  } catch (error) {
    console.error("OrderController.showDetails error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
