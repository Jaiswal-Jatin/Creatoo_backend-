import { Request, Response } from "express";
import { Op } from "sequelize";
import axios from "axios";
import crypto from "crypto";
import ManualPayment from "../models/ManualPayment";
import User from "../models/User";
import Business from "../models/Business";
import Setting from "../models/Setting";
import CreatorPointsTransaction from "../models/CreatorPointsTransaction";
import NewUserNotification from "../models/NewUserNotification";
import BusinessSettlement from "../models/BusinessSettlement";
import { sendPushNotification } from "../services/sendPushNotification";
import pointsService from "../services/points.service";
import Card from "../models/Card";
import Visit from "../models/Visit";
import BusinessAssociate from "../models/BusinessAssociate";
import Booking from "../models/Booking";

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

      let platformFee = 0;
      let gstPercent = 0;
      let gstAmount = 0;
      let totalAmount = finalAmount;

      const setting = await Setting.findByPk(1);
      if (setting && setting.manual_platform_fee_active) {
        platformFee = Number(setting.manual_platform_fee) || 0;
        if (setting.manual_gst_active) {
          gstPercent = Number(setting.manual_gst_percent) || 0;
          gstAmount = Math.round(platformFee * (gstPercent / 100) * 100) / 100;
        }
        totalAmount = Math.round((finalAmount + platformFee + gstAmount) * 100) / 100;
      }

      return res.json({
        status: true,
        data: {
          is_first_visit: isFirstVisit,
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
          bill_amount: billAmt,
          points_redeemed: pts,
          final_amount: finalAmount,
          platform_fee: platformFee,
          gst_percent: gstPercent,
          gst_amount: gstAmount,
          total_amount: totalAmount,
          business_name: business.business_name,
        },
      });
    } catch (err: any) {
      console.error("calculatePayment error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  async createRazorpayOrder(req: AuthRequest, res: Response) {
    try {
      const user_id = req.user?.id;
      const { business_id, final_amount, total_amount, bill_amount, points_redeemed, points_value, discount_percentage, discount_amount } = req.body;

      if (!user_id || !business_id || !final_amount || !bill_amount) {
        return res.status(400).json({ status: false, message: "Missing required fields" });
      }

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return res.status(500).json({ status: false, message: "Razorpay keys not configured." });
      }

      const chargeAmount = total_amount ?? final_amount;
      const amountInPaise = Math.round(parseFloat(chargeAmount) * 100);

      const razorpayResp = await axios.post(
        'https://api.razorpay.com/v1/orders',
        {
          amount: amountInPaise,
          currency: 'INR',
          receipt: `manual_pay_${user_id}_${Date.now()}`,
          notes: {
            user_id: String(user_id),
            business_id: String(business_id),
            type: 'manual_payment',
          },
        },
        {
          auth: { username: keyId, password: keySecret },
          timeout: 15000,
        }
      );

      const order = razorpayResp.data;

      return res.status(200).json({
        status: true,
        message: "Razorpay order created",
        data: {
          razorpay_order_id: order.id,
          amount: parseFloat(chargeAmount),
          amount_in_paise: amountInPaise,
          key_id: keyId,
        },
      });
    } catch (err: any) {
      console.error("createRazorpayOrder error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  async submitPayment(req: AuthRequest, res: Response) {
    try {
      const { business_id, bill_amount, points_redeemed, points_value, final_amount, discount_percentage, discount_amount, platform_fee, gst_percent, gst_amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const user_id = req.user?.id;
      if (!user_id || !business_id || !bill_amount || final_amount == null || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ status: false, message: "Missing required fields" });
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        return res.status(500).json({ status: false, message: "Razorpay secret not configured." });
      }

      const expectedSig = crypto
        .createHmac("sha256", keySecret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (expectedSig !== razorpay_signature) {
        return res.status(400).json({ status: false, message: "Invalid Razorpay signature." });
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
        status: "CONFIRMED",
        payment_method: "RAZORPAY",
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        platform_fee: platform_fee != null ? parseFloat(platform_fee) : 0,
        gst_percent: gst_percent != null ? parseFloat(gst_percent) : 0,
        gst_amount: gst_amount != null ? parseFloat(gst_amount) : 0,
      });

      const pointsEarned = await this.processSuccessfulPayment(payment);

      return res.status(201).json({ status: true, message: "Payment successful", data: payment, points_earned: pointsEarned });
    } catch (err: any) {
      console.error("submitPayment error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  private async processSuccessfulPayment(payment: any): Promise<number> {
    payment.confirmed_at = new Date();
    await payment.save();

    // Deduct redeemed points from ANY business credits (not just this business)
    if (payment.points_redeemed > 0) {
      const ptsToDeduct = payment.points_redeemed;
      const allCredits = await CreatorPointsTransaction.findAll({
        where: {
          user_id: payment.user_id,
          credit_debit_remaining_status: "credit",
          remaining_points: { [Op.gt]: 0 },
        },
        order: [["created_at", "ASC"]],
      });
      let remaining = ptsToDeduct;
      for (const tx of allCredits) {
        if (remaining <= 0) break;
        const avail = Number(tx.remaining_points);
        if (avail <= 0) continue;
        if (avail <= remaining) {
          remaining -= avail;
          tx.remaining_points = 0;
        } else {
          tx.remaining_points = avail - remaining;
          remaining = 0;
        }
        await tx.save();
      }
      await CreatorPointsTransaction.create({
        user_id: payment.user_id,
        business_id: payment.business_id,
        points: -ptsToDeduct,
        credit_debit_remaining_status: "debit",
        remaining_points: 0,
        order_id: payment.id.toString(),
        total_bill: payment.bill_amount,
        final_bill: payment.final_amount,
      } as any);
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

    // Add to business settlement (bill type)
    try {
      const settleAmt = Math.round(Number(payment.final_amount) * 100) / 100;
      if (settleAmt > 0) {
        const [rec] = await BusinessSettlement.findOrCreate({
          where: { business_id: payment.business_id, type: 'bill' },
          defaults: { business_id: payment.business_id, type: 'bill', total_amount: 0, settled_amount: 0, pending_amount: 0 },
        });
        rec.total_amount = Math.round((Number(rec.total_amount) + settleAmt) * 100) / 100;
        rec.pending_amount = Math.round((Number(rec.pending_amount) + settleAmt) * 100) / 100;
        await rec.save();
      }
    } catch (settleErr) {
      console.error('Failed to add to bill settlement:', settleErr);
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

      // Send notification to the business about the payment
    try {
      const businessRecord = await User.findByPk(payment.business_id, {
        attributes: ["business_name", "remember_token"],
      });
      const bName = businessRecord?.business_name ?? "Business";

      const businessNotifText = `You have received a payment of ₹${payment.final_amount} from your customer. Status: CONFIRMED`;

      await NewUserNotification.create({
        user_id: payment.business_id,
        order_id: null,
        notification_subject: "Payment Received",
        notification_text: businessNotifText,
        is_redeemed: "BusinessView",
        business_id: payment.business_id,
      } as any);

      if (businessRecord?.remember_token) {
        await sendPushNotification({
          title: "💵 Payment Received",
          description: businessNotifText,
        }, [businessRecord.remember_token]);
      }
    } catch (bizNotifErr) {
      console.error("Error sending business payment notification:", bizNotifErr);
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

      const dailyBookingTotal = await Booking.sum("advance_amount", {
        where: { business_id, advance_payment_status: "paid", advance_payment_at: { [Op.gte]: startOfDay, [Op.lt]: endOfDay } },
      });

      const monthlyBookingTotal = await Booking.sum("advance_amount", {
        where: { business_id, advance_payment_status: "paid", advance_payment_at: { [Op.gte]: startOfMonth, [Op.lt]: endOfMonth } },
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
          daily_booking_total: dailyBookingTotal || 0,
          monthly_booking_total: monthlyBookingTotal || 0,
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
