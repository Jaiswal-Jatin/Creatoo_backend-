import { Request, Response } from "express";
import { Op } from "sequelize";
import ManualPayment from "../models/ManualPayment";
import User from "../models/User";
import Business from "../models/Business";
import CreatorPointsTransaction from "../models/CreatorPointsTransaction";
import NewUserNotification from "../models/NewUserNotification";
import { sendPushNotification } from "../services/sendPushNotification";
import pointsService from "../services/points.service";
import Card from "../models/Card";
import Visit from "../models/Visit";
import BusinessAssociate from "../models/BusinessAssociate";

interface AuthRequest extends Request {
  user?: { id: number; role_id: number };
}

class ManualPaymentController {

  async calculatePayment(req: AuthRequest, res: Response) {
    try {
      const { business_id, bill_amount, points_redeemed } = req.body;
      const user_id = req.user?.id;
      if (!user_id || !business_id || !bill_amount) {
        return res.status(400).json({ status: false, message: "Missing required fields" });
      }

      const business = await Business.findByPk(business_id, {
        attributes: ["set_first_time_discount", "set_regular_discount", "upi_id", "business_name"],
      });
      if (!business) {
        return res.status(404).json({ status: false, message: "Business not found" });
      }

      const previousPayments = await ManualPayment.count({
        where: { user_id, business_id, status: "CONFIRMED" },
      });
      const isFirstVisit = previousPayments === 0;

      const discountPercentage = isFirstVisit
        ? (business.set_first_time_discount || 0)
        : (business.set_regular_discount || 0);

      const billAmt = parseFloat(bill_amount);
      const discountAmount = Math.floor(billAmt * (discountPercentage / 100));
      const afterDiscount = billAmt - discountAmount;

      const activeCredits = await CreatorPointsTransaction.findAll({
        where: {
          user_id,
          business_id,
          credit_debit_remaining_status: "credit",
          remaining_points: {
            [Op.gt]: 0
          }
        }
      });
      const now = new Date();
      const balanceForBusiness = activeCredits.reduce(
        (sum, t) => sum + pointsService.getActivePointsForTransaction(t, now),
        0
      );
      const maxRedeemablePoints = Math.floor(balanceForBusiness * 0.60);

      const ptsRequested = parseInt(points_redeemed || "0");
      const pts = Math.min(ptsRequested, maxRedeemablePoints);
      const finalAmount = Math.max(0, afterDiscount - pts);

      return res.json({
        status: true,
        data: {
          is_first_visit: isFirstVisit,
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
          bill_amount: billAmt,
          points_redeemed: pts,
          final_amount: finalAmount,
          upi_id: business.upi_id || "",
          business_name: business.business_name,
        },
      });
    } catch (err: any) {
      console.error("calculatePayment error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  async submitPayment(req: AuthRequest, res: Response) {
    try {
      const { business_id, bill_amount, points_redeemed, points_value, final_amount, discount_percentage, discount_amount } = req.body;
      const user_id = req.user?.id;
      if (!user_id || !business_id || !bill_amount || final_amount == null) {
        return res.status(400).json({ status: false, message: "Missing required fields" });
      }

      const activeCredits = await CreatorPointsTransaction.findAll({
        where: {
          user_id,
          business_id,
          credit_debit_remaining_status: "credit",
          remaining_points: {
            [Op.gt]: 0
          }
        }
      });
      const now = new Date();
      const balanceForBusiness = activeCredits.reduce(
        (sum, t) => sum + pointsService.getActivePointsForTransaction(t, now),
        0
      );
      const maxRedeemablePoints = Math.floor(balanceForBusiness * 0.60);
      const requestedPts = parseInt(points_redeemed || "0");
      if (requestedPts > maxRedeemablePoints) {
        return res.status(400).json({
          status: false,
          message: `You can only redeem up to 60% of your total Creatoo points. Max redeemable for this payment is ${maxRedeemablePoints} points.`
        });
      }

      const payment = await ManualPayment.create({
        user_id,
        business_id,
        bill_amount: parseFloat(bill_amount),
        points_redeemed: parseInt(points_redeemed || "0"),
        points_value: parseFloat(points_value || "0"),
        final_amount: parseFloat(final_amount),
        discount_percentage: discount_percentage != null ? parseFloat(discount_percentage) : null,
        discount_amount: discount_amount != null ? parseFloat(discount_amount) : null,
        status: status || "PENDING",
        payment_method: "UPI_INTENT",
        transaction_ref: transaction_ref || null,
        upi_id: upi_id || null,
        payment_response: payment_response || null,
        payment_app: payment_app || null,
      });

      let pointsEarned = 0;
      if (payment.status === "SUCCESS") {
        pointsEarned = await this.processSuccessfulPayment(payment);
      }

      return res.status(201).json({ status: true, message: "Payment submitted", data: payment, points_earned: pointsEarned });
    } catch (err: any) {
      console.error("submitPayment error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  async confirmPayment(req: AuthRequest, res: Response) {
    try {
      const { payment_id } = req.body;
      const business_id = req.user?.id;
      if (!payment_id) {
        return res.status(400).json({ status: false, message: "payment_id is required" });
      }
      const payment = await ManualPayment.findByPk(payment_id);
      if (!payment) {
        return res.status(404).json({ status: false, message: "Payment not found" });
      }
      if (payment.business_id !== business_id) {
        return res.status(403).json({ status: false, message: "Unauthorized" });
      }
      if (payment.status !== "PENDING") {
        return res.status(400).json({ status: false, message: "Payment already processed" });
      }
      payment.status = "SUCCESS";
      
      const pointsEarned = await this.processSuccessfulPayment(payment);

      return res.json({ status: true, message: "Payment confirmed", points_earned: pointsEarned, data: payment });
    } catch (err: any) {
      console.error("confirmPayment error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  private async processSuccessfulPayment(payment: any): Promise<number> {
    payment.confirmed_at = new Date();
    await payment.save();

    // Deduct redeemed points if any
    if (payment.points_redeemed > 0) {
      await pointsService.deductPoints(
        payment.user_id,
        payment.business_id,
        payment.points_redeemed,
        payment.id.toString()
      );
    }

    // 1) Find the associate network IDs for this business
    const visited = new Set<number>();
    const toProcess = [payment.business_id];

    while (toProcess.length > 0) {
      const currentId = toProcess.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const associates = await BusinessAssociate.findAll({
        where: { parent_business_id: currentId },
        attributes: ['associate_business_id']
      });

      const parents = await BusinessAssociate.findAll({
        where: { associate_business_id: currentId },
        attributes: ['parent_business_id']
      });

      associates.forEach((a: any) => {
        if (!visited.has(a.associate_business_id)) toProcess.push(a.associate_business_id);
      });

      parents.forEach((p: any) => {
        if (!visited.has(p.parent_business_id)) toProcess.push(p.parent_business_id);
      });
    }

    const networkIds = Array.from(visited);

    // 2) Find all cards for this user
    const userCards = await Card.findAll({ where: { user_id: payment.user_id } });
    const cardNumbers = userCards.map((c) => c.number);

    // 3) Find the last visit for this user/card in the network
    const lastVisit = await Visit.findOne({
      where: {
        [Op.or]: [
          { user_id: payment.user_id },
          { card_number: { [Op.in]: cardNumbers } }
        ],
        business_id: { [Op.in]: networkIds }
      },
      order: [["time", "DESC"]],
    });

    // 4) Determine active tier based on time since last visit across network
    let activeTier: 'new' | 'core' | 'elite' | 'premium' = "new";
    if (lastVisit) {
      const now = Date.now();
      const timeValue = lastVisit.time;
      const timeMs = typeof timeValue === "string"
        ? new Date(timeValue).getTime()
        : typeof timeValue === "number"
          ? timeValue
          : timeValue.getTime();
      const diffDays = Math.floor((now - timeMs) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) activeTier = "premium";
      else if (diffDays <= 15) activeTier = "elite";
      else activeTier = "core";
    }

    // 5) Apply tier-based multiplier
    let pointsMultiplier = 1.0;
    if (activeTier === "premium") {
      pointsMultiplier = 2.0;
    } else if (activeTier === "elite") {
      pointsMultiplier = 1.5;
    }

    const basePoints = Math.round(payment.final_amount * 0.1);
    const pointsEarned = Math.round(basePoints * pointsMultiplier);

    if (pointsEarned > 0) {
      await CreatorPointsTransaction.create({
        user_id: payment.user_id,
        business_id: payment.business_id,
        points: pointsEarned,
        credit_debit_remaining_status: "credit",
        total_bill: payment.bill_amount,
        final_bill: payment.final_amount,
        remaining_points: pointsEarned,
      });
    }

    // Auto-mark visit on payment confirmation (replaces manual code entry)
    if (userCards.length > 0) {
      await Visit.create({
        user_id: payment.user_id,
        card_number: userCards[0].number,
        business_id: payment.business_id,
        tier: activeTier,
        time: new Date(),
      });
    }

    // Send "Points Earned" notification to the user
    try {
      const userRecord = await User.findByPk(payment.user_id, {
        attributes: ["name", "remember_token"],
      });
      const receiptName = userRecord?.name ?? "Unknown User";

      const businessRecord = await User.findByPk(payment.business_id, {
        attributes: ["business_name"],
      });
      const bName = businessRecord?.business_name ?? "Business";

      let tierNote = "";
      if (activeTier === "premium") {
        tierNote = ` Because you are a Premium visitor, your points were doubled (2x)!`;
      } else if (activeTier === "elite") {
        tierNote = ` Because you are an Elite visitor, your points were multiplied by 1.5x!`;
      } else if (activeTier === "core") {
        tierNote = ` Because you are a Core visitor, you earned standard 1x points.`;
      }

      const creator_subject = "🎉 You've Earned Points!";
      const creator_text = `Hey ${receiptName}, you just scored ${pointsEarned} Creatoo Points for your payment at ${bName}.${tierNote} Keep earning and stack them up for exciting rewards!`;

      await NewUserNotification.create({
        user_id: payment.user_id,
        order_id: null,
        notification_subject: "Points Earned!",
        notification_text: creator_text,
        is_redeemed: "CreatorView",
        business_id: payment.business_id,
      } as any);

      if (userRecord?.remember_token) {
        await sendPushNotification({
          title: creator_subject,
          description: creator_text,
        }, [userRecord.remember_token]);
      }
    } catch (notifErr) {
      console.error("Error sending earn points notification:", notifErr);
    }
    
    return pointsEarned;
  }

  async setPaymentPaidAt(req: AuthRequest, res: Response) {
    try {
      const { payment_id } = req.body;
      const user_id = req.user?.id;
      if (!payment_id) {
        return res.status(400).json({ status: false, message: "payment_id is required" });
      }
      const payment = await ManualPayment.findByPk(payment_id);
      if (!payment) {
        return res.status(404).json({ status: false, message: "Payment not found" });
      }
      if (payment.user_id !== user_id) {
        return res.status(403).json({ status: false, message: "Unauthorized" });
      }
      payment.paid_at = new Date();
      await payment.save();
      return res.json({ status: true, message: "Paid at updated", data: payment });
    } catch (err: any) {
      console.error("setPaymentPaidAt error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  async cancelPayment(req: AuthRequest, res: Response) {
    try {
      const { payment_id } = req.body;
      const business_id = req.user?.id;
      if (!payment_id) {
        return res.status(400).json({ status: false, message: "payment_id is required" });
      }
      const payment = await ManualPayment.findByPk(payment_id);
      if (!payment) {
        return res.status(404).json({ status: false, message: "Payment not found" });
      }
      if (payment.business_id !== business_id) {
        return res.status(403).json({ status: false, message: "Unauthorized" });
      }
      if (payment.status !== "PENDING") {
        return res.status(400).json({ status: false, message: "Payment already processed" });
      }
      payment.status = "CANCELLED";
      await payment.save();
      return res.json({ status: true, message: "Payment cancelled", data: payment });
    } catch (err: any) {
      console.error("cancelPayment error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  async getBusinessPayments(req: AuthRequest, res: Response) {
    try {
      const business_id = req.user?.id;
      const { status: filterStatus } = req.body;
      const where: any = { business_id };
      if (filterStatus) where.status = filterStatus;
      const payments = await ManualPayment.findAll({
        where,
        order: [["created_at", "DESC"]],
        include: [{ model: User, as: "user", attributes: ["id", "name", "mobile", "user_image"] }],
      });
      return res.json({ status: true, data: payments });
    } catch (err: any) {
      console.error("getBusinessPayments error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  async getUserPayments(req: AuthRequest, res: Response) {
    try {
      const user_id = req.user?.id;
      const payments = await ManualPayment.findAll({
        where: { user_id },
        order: [["created_at", "DESC"]],
        include: [{ model: Business, as: "business", attributes: ["id", "business_name", "business_image"] }],
      });
      return res.json({ status: true, data: payments });
    } catch (err: any) {
      console.error("getUserPayments error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  async getBusinessPaymentStats(req: AuthRequest, res: Response) {
    try {
      const business_id = req.user?.id;
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 86400000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const dailyTotal = await ManualPayment.sum("final_amount", {
        where: { business_id, status: "CONFIRMED", created_at: { [Op.gte]: startOfDay, [Op.lt]: endOfDay } },
      });

      const monthlyTotal = await ManualPayment.sum("final_amount", {
        where: { business_id, status: "CONFIRMED", created_at: { [Op.gte]: startOfMonth, [Op.lt]: endOfMonth } },
      });

      const recentPayments = await ManualPayment.findAll({
        where: { business_id },
        order: [["created_at", "DESC"]],
        limit: 5,
        include: [{ model: User, as: "user", attributes: ["id", "name", "mobile", "user_image"] }],
      });

      return res.json({
        status: true,
        data: {
          daily_total: dailyTotal || 0,
          monthly_total: monthlyTotal || 0,
          recent_payments: recentPayments,
        },
      });
    } catch (err: any) {
      console.error("getBusinessPaymentStats error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  async getBusinessWalletPayments(req: AuthRequest, res: Response) {
    try {
      const business_id = req.user?.id;
      const { month } = req.body;
      if (!month) return res.status(400).json({ status: false, message: "month is required (YYYY-MM)" });
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr);
      const mon = parseInt(monthStr);
      const startOfMonth = new Date(year, mon - 1, 1);
      const endOfMonth = new Date(year, mon, 1);

      const monthlyTotal = await ManualPayment.sum("final_amount", {
        where: { business_id, status: "CONFIRMED", created_at: { [Op.gte]: startOfMonth, [Op.lt]: endOfMonth } },
      });

      const payments = await ManualPayment.findAll({
        where: { business_id, created_at: { [Op.gte]: startOfMonth, [Op.lt]: endOfMonth } },
        order: [["created_at", "DESC"]],
        include: [{ model: User, as: "user", attributes: ["id", "name", "mobile", "user_image"] }],
      });

      return res.json({
        status: true,
        data: { monthly_total: monthlyTotal || 0, payments },
      });
    } catch (err: any) {
      console.error("getBusinessWalletPayments error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  }
}

export default new ManualPaymentController();
