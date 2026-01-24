// src/controllers/WalletTransactionController.ts
import { Request, Response } from "express";
import { Op, QueryTypes } from "sequelize";
import axios from "axios";

import User from "../models/User";
import WalletTransaction from "../models/WalletTransaction";
import sequelize from "../db/sequelize";
import Post from "../models/Post";
import TemporaryOrder from "../models/TemporaryOrder";
import Order from "../models/Order"; // if needed in saveOrder or elsewhere

class WalletTransactionController {
  // GET /walletTransaction/allCreator
  async getAllCreatorWalletTransactionService(req: Request, res: Response) {
    try {
      const { from_date, to_date, user_id } = req.query as {
        from_date?: string;
        to_date?: string;
        user_id?: string;
      };

      const where: any = {
        is_withdraw_request: { [Op.ne]: "1" },
      };

      // user filter
      if (user_id && user_id !== "null") {
        where.user_id = Number(user_id);
      }

      // date range filter
      if (from_date && to_date) {
        const fromDate = new Date(from_date);
        const toDate = new Date(to_date);
        toDate.setHours(23, 59, 59, 999);

        where.created_at = {
          [Op.between]: [fromDate, toDate],
        };
      }

      const transactions = await WalletTransaction.findAll({
        where,
        include: [
          {
            model: User,
            as: "user",
            where: { role_id: 3 }, // creators
            attributes: ["id", "name"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      const data = transactions.map((t) => {
        const json: any = t.toJSON();
        return {
          ...json,
          user_info: json.user?.name ?? "N/A",
          created_at_formatted: new Date(json.created_at)
            .toISOString()
            .replace("T", " ")
            .slice(0, 19),
        };
      });

      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // GET /walletTransaction/allBusiness
  async getAllBusinessWalletTransactionService(req: Request, res: Response) {
    try {
      const { from_date, to_date, business_id } = req.query as {
        from_date?: string;
        to_date?: string;
        business_id?: string;
      };

      const where: any = {};

      if (from_date && to_date) {
        const fromDate = new Date(from_date);
        const toDate = new Date(to_date);
        toDate.setHours(23, 59, 59, 999);

        where.created_at = {
          [Op.between]: [fromDate, toDate],
        };
      }

      if (business_id && business_id !== "null") {
        where.user_id = Number(business_id);
      }

      const transactions = await WalletTransaction.findAll({
        where,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "business_fullname"],
            required: false,
          },
        ],
        order: [["created_at", "DESC"]],
      });

      const data = transactions.map((t) => {
        const json: any = t.toJSON();

        const rawDate = json.created_at ?? json.createdAt; // handle both just in case
        let created_at_formatted: string | null = null;

        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            created_at_formatted = d.toISOString().replace("T", " ").slice(0, 19);
          }
        }

        return {
          ...json,
          user_info: json.user?.business_fullname || "N/A",
          created_at_formatted,
        };
      });


      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // GET /walletTransaction/allWalletRequest
  async getAllRequestWalletTransactionService(req: Request, res: Response) {
    try {
      const { from_date, to_date } = req.query as {
        from_date?: string;
        to_date?: string;
      };

      const where: any = {
        is_withdraw_request: "1",
      };

      if (from_date && to_date) {
        const fromDate = new Date(from_date);
        const toDate = new Date(to_date);
        toDate.setHours(23, 59, 59, 999);

        where.created_at = {
          [Op.between]: [fromDate, toDate],
        };
      }

      const transactions = await WalletTransaction.findAll({
        where,
        include: [
          {
            model: User,
            as: "user",
            where: { role_id: 3 },
          },
        ],
        order: [["created_at", "DESC"]],
      });

      const data = transactions.map((t) => {
        const json: any = t.toJSON();
        const user = json.user;

        let bank_details = "N/A";

        if (user) {
          switch (user.default_method) {
            case "phone":
              bank_details = user.payment_mobile_number ?? "N/A";
              break;
            case "upi":
              bank_details = user.upi_id ?? "N/A";
              break;
            case "bank":
              const parts = [
                user.bank_account_number &&
                `Acc. No : ${user.bank_account_number}`,
                user.ifsc && `IFSC : ${user.ifsc}`,
                user.bank_name && `Bank Name : ${user.bank_name}`,
                user.branch_name && `Branch Name : ${user.branch_name}`,
              ].filter(Boolean);
              bank_details = parts.join(", ") || "N/A";
              break;
          }
        }

        const action =
          json.credit_debit === "debit"
            ? '<span class="text-success">Paid</span>'
            : `<button class="btn btn-primary change-request" data-id="${json.id}">
                 Change Request
               </button>`;

        return {
          ...json,
          user_info: user?.name ?? "N/A",
          payment_mode: user?.default_method ?? "N/A",
          bank_details,
          action,
          created_at_formatted: new Date(json.created_at)
            .toISOString()
            .replace("T", " ")
            .slice(0, 19),
        };
      });

      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // POST /walletTransaction/change-request-submit
  async submitChangeRequest(req: Request, res: Response) {
    try {
      const { id } = req.body as { id: number };

      if (!id) {
        return res
          .status(400)
          .json({ success: false, message: "id is required" });
      }

      const transaction = await WalletTransaction.findByPk(id);
      if (!transaction) {
        return res
          .status(404)
          .json({ success: false, message: "Transaction not found" });
      }

      const user = await User.findByPk(transaction.user_id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // @ts-ignore – wallet numeric column on User
      if (Number(user.wallet) < Number(transaction.amount)) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance.",
        });
      }

      transaction.credit_debit = "debit";
      await transaction.save();

      // @ts-ignore
      user.wallet = Number(user.wallet) - Number(transaction.amount);
      await user.save();

      return res.json({
        success: true,
        message: "Request updated successfully.",
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, message: "Server error" });
    }
  }

  // GET /walletTransaction/check-balance?recordId=123
  async checkBalance(req: Request, res: Response) {
    try {
      const { recordId } = req.query as { recordId?: string };

      if (!recordId) {
        return res.status(400).json({
          success: false,
          message: "recordId is required",
        });
      }

      const transaction = await WalletTransaction.findByPk(Number(recordId));
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      const user = await User.findByPk(transaction.user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // @ts-ignore
      const wallet = Number(user.wallet);
      const amount = Number(transaction.amount);

      if (wallet < amount) {
        return res.status(200).json({
          success: false,
          message: "Insufficient wallet balance.",
        });
      }

      return res.status(200).json({
        success: true,
        wallet_balance: wallet,
        requested_amount: amount,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }

  // POST /walletTransaction/businessWalletTransaction
  // Laravel: businessWalletTransaction
  async businessWalletTransaction(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized",
          data: [],
        });
      }

      const user = await User.findByPk(userId);

      if (!user || user.role_id !== 2) {
        return res.status(403).json({
          status: false,
          message: "Access allowed only for business users",
          data: [],
        });
      }

      const transactions = await WalletTransaction.findAll({
        where: { user_id: userId },
        order: [["created_at", "DESC"]],
      });

      if (!transactions.length) {
        return res.status(200).json({
          status: true,
          message: "No wallet transactions found",
          data: [],
        });
      }

      const data = transactions.map((t) => {
        const json: any = t.toJSON();
        return {
          id: json.id,
          user_id: json.user_id,
          amount: json.amount,
          credit_debit: json.credit_debit,
          is_withdraw_request: json.is_withdraw_request,
          transaction_id: json.transaction_id,
          remark: json.remark,
          created_at: json.created_at,
          created_at_formatted: new Date(json.created_at)
            .toISOString()
            .replace("T", " ")
            .slice(0, 19),
        };
      });

      return res.status(200).json({
        status: true,
        message: "Data found Successfully",
        data,
      });
    } catch (err) {
      console.error("businessWalletTransaction error:", err);
      return res.status(500).json({
        status: false,
        message: "Server error",
        data: [],
      });
    }
  }

  // POST /walletTransaction/creatorWalletTransaction
  // Laravel: creatorWalletTransaction
  async creatorWalletTransaction(req: Request, res: Response) {
    try {
      const { user_id, role_id, search } = req.body as {
        user_id?: number | string;
        role_id?: number | string;
        search?: string;
      };

      if (!user_id || !role_id) {
        return res.status(400).json({
          status: false,
          message: "Invalid user ID or role ID",
        });
      }

      // Force creator role (same as Laravel where role_id = '3')
      const user = await User.findOne({
        where: { id: Number(user_id), role_id: 3 },
      });

      if (!user) {
        return res.status(400).json({
          status: false,
          message: "Invalid User",
        });
      }

      const replacements: any = {
        userId: Number(user_id),
      };

      let searchCondition = "";
      if (search && String(search).trim() !== "") {
        searchCondition =
          " AND (o.order_id LIKE :search OR u.business_name LIKE :search)";
        replacements.search = `%${search}%`;
      }

      const sql = `
        SELECT
          u.business_name AS paid_to,
          o.original_bill_amount AS bill_amount,
          o.final_bill_amount,
          o.created_at,
          o.id,
          o.order_id
        FROM orders o
        INNER JOIN users u ON o.business_id = u.id
        WHERE o.user_id = :userId
        ${searchCondition}
        ORDER BY o.created_at DESC
      `;

      const orders = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT,
      });

      return res.status(200).json({
        status: true,
        message: "Data found successfully",
        data: {
          transactions: orders,
        },
      });
    } catch (err) {
      console.error("creatorWalletTransaction error:", err);
      return res.status(500).json({
        status: false,
        message: "Server error",
      });
    }
  }

  // POST /walletTransaction/addBusinessWalletTransaction
  // Laravel: addBusinessWalletTransaction
  async addBusinessWalletTransaction(req: Request, res: Response) {
    try {
      const { user_id, amount, credit_debit, post_id } = req.body as {
        user_id?: number | string;
        amount?: number | string;
        credit_debit?: string;
        post_id?: number | string;
      };

      // Basic validation (Laravel-like)
      if (!user_id || isNaN(Number(user_id))) {
        return res.status(400).json({
          status: false,
          message: "user_id is required and must be an integer",
        });
      }

      if (!post_id || isNaN(Number(post_id))) {
        return res.status(400).json({
          status: false,
          message: "post_id is required and must be an integer",
        });
      }

      if (!amount || isNaN(Number(amount))) {
        return res.status(400).json({
          status: false,
          message: "amount is required and must be numeric",
        });
      }

      if (!credit_debit || !["credit", "debit"].includes(credit_debit)) {
        return res.status(400).json({
          status: false,
          message: "credit_debit must be either 'credit' or 'debit'",
        });
      }

      const post = await Post.findByPk(Number(post_id));
      if (!post) {
        return res.status(200).json({
          status: true,
          message: "Post not found",
        });
      }

      const user = await User.findByPk(Number(user_id));
      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
        });
      }

      // In Laravel they call $user->save() without changing anything
      await user.save();

      const numericAmount = Number(amount);
      const remark = `PO${post_id} ${numericAmount} has been ${credit_debit === "credit" ? "credited" : "debited"
        } in your wallet`;

      const transaction = await WalletTransaction.create({
        user_id: Number(user_id),
        amount: numericAmount,
        credit_debit,
        remark,
      } as any);

      return res.status(200).json({
        status: true,
        message: "Transaction completed successfully.",
        data: transaction,
      });
    } catch (err) {
      console.error("addBusinessWalletTransaction error:", err);
      return res.status(500).json({
        status: false,
        message: "Server error",
      });
    }
  }

  // ------------------------------------------------------------------
  // NEW: POST /walletTransaction/checkTransactionStatus
  // Laravel: checkTransactionStatus
  // ------------------------------------------------------------------
  async checkTransactionStatus(req: Request, res: Response) {
    try {
      // 1. Extract raw values
      const orderIdRaw = req.body.order_id;
      const userIdRaw = req.body.user_id;

      // 2. Validate presence
      const errors: Record<string, string[]> = {};
      if (!orderIdRaw) errors.order_id = ["order_id is required"];
      if (!userIdRaw) errors.user_id = ["user_id is required"];

      const userIdNum = Number(userIdRaw);
      if (userIdRaw != null && Number.isNaN(userIdNum)) {
        errors.user_id = [...(errors.user_id || []), "user_id must be numeric"];
      }

      if (Object.keys(errors).length > 0) {
        return res.status(422).json({
          status: false,
          message: "Validation failed",
          errors,
        });
      }

      // 3. Safe cast
      const orderId: string = String(orderIdRaw);

      // 4. Fetch TemporaryOrder
      const tempOrder = await TemporaryOrder.findOne({
        where: { order_id: orderId },
      });

      if (!tempOrder) {
        return res.status(404).json({
          status: false,
          message: "Order not found",
        });
      }

      // 5. Razorpay credentials
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!razorpayKeyId || !razorpayKeySecret) {
        console.error("Missing Razorpay credentials in env");
        return res.status(500).json({
          status: false,
          message: "Payment configuration error",
        });
      }

      const razorpayUrl = `https://api.razorpay.com/v1/orders/${orderId}/payments`;

      // 6. Call Razorpay API
      let statusResponse: any;
      try {
        const resp = await axios.get(razorpayUrl, {
          auth: {
            username: razorpayKeyId,
            password: razorpayKeySecret,
          },
          headers: {
            "Content-Type": "application/json",
          },
        });

        statusResponse = resp.data;
      } catch (err: any) {
        console.error("Razorpay API error:", err?.response?.data || err.message);
        return res.status(200).json({
          status: true,
          message: "Error fetching payment status from Razorpay",
          error: err?.response?.data || null,
        });
      }

      console.log("Razorpay status API response:", statusResponse);

      // 7. Handle invalid response
      if (!statusResponse || statusResponse.error) {
        return res.status(200).json({
          status: true,
          message: "Error fetching payment status from Razorpay",
          error: statusResponse.error || null,
        });
      }

      // 8. No payments found yet
      if (!Array.isArray(statusResponse.items) || statusResponse.items.length === 0) {
        if ((tempOrder as any).status === "processing") {
          (tempOrder as any).status = "failed";
          await tempOrder.save();
        }

        return res.status(200).json({
          status: true,
          message: "No payment found yet. Please check again shortly.",
        });
      }

      // 9. Latest payment
      const latestPayment = statusResponse.items[0];
      const paymentStatus = latestPayment.status;

      if (paymentStatus === "captured") {
        // Payment successful → save order
        const responseData = await this.saveOrder(
          orderId,
          (tempOrder as any).business_id,
          userIdNum
        );

        (tempOrder as any).status = "completed";
        await tempOrder.save();

        return res.status(200).json({
          status: true,
          message: "Payment verified and order saved successfully",
          data: responseData,
        });
      } else if (paymentStatus === "failed") {
        (tempOrder as any).status = "failed";
        await tempOrder.save();

        return res.status(200).json({
          status: true,
          message: "Payment failed or cancelled",
        });
      } else {
        return res.status(200).json({
          status: true,
          message: "Payment is pending or in unknown state",
          data: null,
        });
      }
    } catch (err) {
      console.error("checkTransactionStatus error:", err);
      return res.status(500).json({
        status: false,
        message: "Server error",
      });
    }
  }

  // ------------------------------------------------------------------
  // Helper: saveOrder (Laravel: $this->saveOrder)
  // 👉 Replace this stub with full port of your Laravel saveOrder()
  // ------------------------------------------------------------------
  private async saveOrder(
    orderId: string,
    businessId: number,
    userId: number
  ): Promise<any> {
    // TODO: port your actual Laravel saveOrder() logic here
    return {
      order_id: orderId,
      business_id: businessId,
      user_id: userId,
    };
  }
}

export default new WalletTransactionController();
