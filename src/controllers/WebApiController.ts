// src/controllers/WebApiController.ts

import { Request, Response } from "express";

import { Op } from "sequelize";

import axios from "axios";

import crypto from "crypto";



import NewUserNotification from "../models/NewUserNotification";

import Order from "../models/Order";

import TemporaryOrder from "../models/TemporaryOrder";

import User from "../models/User";

import CreatorPointsTransaction from "../models/CreatorPointsTransaction";

import sequelize from "../db/sequelize";



class WebApiController {

  // POST /api/web/NewNotificationList  (Laravel: NewNotificationList)

  async newNotificationList(req: Request, res: Response) {

    try {

      const {

        user_id,

        role_id,

        per_page,

        page,

      }: {

        user_id?: number | string;

        role_id?: number | string;

        per_page?: number | string;

        page?: number | string;

      } = req.body;



      // Validation (similar to $request->validate)

      if (!user_id || !role_id) {

        return res.status(422).json({

          status: false,

          message: "user_id and role_id are required",

        });

      }



      const userIdNum = Number(user_id);

      const roleIdNum = Number(role_id);



      if (Number.isNaN(userIdNum) || Number.isNaN(roleIdNum)) {

        return res.status(422).json({

          status: false,

          message: "user_id and role_id must be numeric",

        });

      }



      const perPageNum = per_page ? Number(per_page) : 8;

      if (Number.isNaN(perPageNum) || perPageNum < 1) {

        return res.status(422).json({

          status: false,

          message: "per_page must be a numeric value >= 1",

        });

      }



      const pageNum = page ? Number(page) : 1;

      const offset = (pageNum - 1) * perPageNum;



      let where: any = { user_id: userIdNum };



      if (roleIdNum === 3) {

        // whereIn('is_redeemed', [0, 'CreatorView'])

        where.is_redeemed = { [Op.in]: [0, "CreatorView"] };

      } else if (roleIdNum === 2) {

        // where('is_redeemed', 'BusinessView')

        where.is_redeemed = "BusinessView";

      } else {

        // if other roles shouldn't see anything, you can return empty

        return res.status(200).json({

          status: false,

          message: "Empty Notification.",

          data: null,

        });

      }

      

      console.log(`[DEBUG] Fetching notifications for User: ${userIdNum}, Role: ${roleIdNum}, Where:`, JSON.stringify(where));



      const { rows, count } = await NewUserNotification.findAndCountAll({

        where,

        order: [["created_at", "DESC"]],

        limit: perPageNum,

        offset,

      });



      if (!rows || rows.length === 0) {

        return res.status(200).json({

          status: false,

          message: "Empty Notification.",

          data: null,

        });

      }



      // approximate Laravel's paginate structure

      const totalPages = Math.ceil(count / perPageNum);



      return res.status(200).json({

        status: true,

        message: "Notifications fetched successfully.",

        data: {

          data: rows,

          current_page: pageNum,

          per_page: perPageNum,

          total: count,

          last_page: totalPages,

        },

      });

    } catch (e: any) {

      console.error("newNotificationList error:", e);

      return res.status(500).json({

        status: false,

        message:

          "Failed to fetch notifications: " + (e?.message || "Unknown error"),

      });

    }

  }



  // POST /api/web/createOrder  (Laravel: createOrder)

  async createOrder(req: Request, res: Response) {

    try {

      const {

        user_id,

        business_id,

        bill_amount,

      }: {

        user_id?: number | string;

        business_id?: number | string;

        bill_amount?: number | string;

      } = req.body;



      // validation

      if (!user_id || !business_id || !bill_amount) {

        return res.status(422).json({

          status: false,

          message: "user_id, business_id and bill_amount are required",

        });

      }



      const userIdNum = Number(user_id);

      const businessIdNum = Number(business_id);

      const amountNum = Number(bill_amount);



      if (

        Number.isNaN(userIdNum) ||

        Number.isNaN(businessIdNum) ||

        Number.isNaN(amountNum)

      ) {

        return res.status(422).json({

          status: false,

          message: "user_id, business_id and bill_amount must be numeric",

        });

      }



      if (amountNum < 1) {

        return res.status(422).json({

          status: false,

          message: "bill_amount must be at least 1",

        });

      }



      const orderId = "ORD" + crypto.randomBytes(5).toString("hex").toUpperCase();



      // In Laravel you are using BusinessHelper::getBusinessDetailsByKey.

      // Here we just read from env. If you want DB-based config,

      // implement a helper similar to BusinessHelper.

      const keyId = process.env.RAZORPAY_KEY_ID;

      const keySecret = process.env.RAZORPAY_KEY_SECRET;



      if (!keyId || !keySecret) {

        return res.status(500).json({

          status: false,

          message: "Business razorpay details not found.",

        });

      }



      // create local order row

      const order = await Order.create({

        user_id: userIdNum,

        business_id: businessIdNum,

        bill_amount: amountNum,

        status: "pending",

      } as any);



      // Razorpay order creation

      const razorpayOrderResponse = await axios.post(

        "https://api.razorpay.com/v1/orders",

        {

          amount: Math.round(amountNum * 100),

          currency: "INR",

          receipt: orderId,

        },

        {

          auth: {

            username: keyId,

            password: keySecret,

          },

        }

      );



      const razorpayOrder = razorpayOrderResponse.data;

      const razorpayOrderId = razorpayOrder.id;



      order.order_id = razorpayOrderId;

      await order.save();



      return res.status(201).json({

        status: true,

        message: "Order created successfully.",

        data: {

          order_id: razorpayOrderId,

        },

      });

    } catch (e: any) {

      console.error("createOrder error:", e?.response?.data || e);

      return res.status(500).json({

        status: false,

        message:

          "Failed to create order: " +

          (e?.response?.data?.error?.description || e?.message || "Unknown error"),

      });

    }

  }



  // POST /api/web/applyOffers  (Laravel: applyOffers)

  async applyOffers(req: Request, res: Response) {

    try {

      const {

        user_id,

        business_id,

        bill_amount,

        referrer_code,

      }: {

        user_id?: number | string;

        business_id?: number | string;

        bill_amount?: number | string;

        referrer_code?: string | null;

      } = req.body;



      // Validation

      if (!user_id || !business_id || !bill_amount) {

        return res.status(422).json({

          status: false,

          message: "user_id, business_id and bill_amount are required",

        });

      }



      const userIdNum = Number(user_id);

      const businessIdNum = Number(business_id);

      const originalBillAmount = Number(bill_amount);



      if (

        Number.isNaN(userIdNum) ||

        Number.isNaN(businessIdNum) ||

        Number.isNaN(originalBillAmount)

      ) {

        return res.status(422).json({

          status: false,

          message:

            "user_id, business_id and bill_amount must be valid numeric values",

        });

      }



      const referrerCode = referrer_code || null;



      let referrerId: number | null = null;



      // Referral logic

      if (referrerCode) {

        const referrer = await User.findOne({

          where: { referrer_code: referrerCode },

        });



        referrerId = referrer ? (referrer.id as number) : null;



        if (!referrer) {

          return res.status(400).json({

            status: false,

            message: "Invalid referral code",

          });

        }



        const alreadyUsedReferral = await Order.findOne({

          where: {

            user_id: userIdNum,

            business_id: businessIdNum,

            referrer_id: referrerId,

          },

        });



        if (alreadyUsedReferral) {

          return res.status(400).json({

            status: false,

            message:

              "You have already used this referral code for this business.",

          });

        }

      }

      const business = await User.findByPk(businessIdNum);

      if (!business) {
        return res.status(404).json({
          status: false,
          message: "Business not found",
        });
      }

      // Ensure we have the latest data from database
      await business.reload();

      const maxDiscountPercentage = Math.max(
        0,
        Number((business as any).set_first_time_discount) || 0
      );
      const secondMaxDiscount = Math.max(
        0,
        Number((business as any).set_regular_discount) || 0
      );
      const minimumOrderAmount = Math.max(
        0,
        Number((business as any).min_order) || 0
      );



      if (originalBillAmount < minimumOrderAmount) {

        return res.status(400).json({

          status: false,

          message: `Minimum Order Value is: ${minimumOrderAmount}.`,

        });

      }



      // First visit?

      const existingOrder = await Order.findOne({

        where: {

          user_id: userIdNum,

          business_id: businessIdNum,

        },

      });



      const isFirstVisit = !existingOrder;



      // Sum remaining_points with expiry_date >= now

      const balanceForBusiness =

        (await CreatorPointsTransaction.sum("remaining_points", {

          where: {

            user_id: userIdNum,

            business_id: businessIdNum,

            expiry_date: { [Op.gte]: new Date() },

          },

        })) || 0;



      let discountPercentage: number;



      if (isFirstVisit) {

        discountPercentage = maxDiscountPercentage;

      } else {

        const requiredPoints = (originalBillAmount * secondMaxDiscount) / 100;



        discountPercentage =

          balanceForBusiness >= requiredPoints

            ? secondMaxDiscount

            : (balanceForBusiness / requiredPoints) * secondMaxDiscount;



        // min_threshold from settings

        const [rows] = await sequelize.query(

          "SELECT min_threshold FROM settings WHERE min_threshold IS NOT NULL LIMIT 1"

        );

        const settingsRows = rows as Array<{ min_threshold?: number }>;

        const minThreshold = settingsRows[0]?.min_threshold ?? 0;



        if (discountPercentage < minThreshold) {

          discountPercentage = minThreshold;

        }

      }



      const discountAmount = (originalBillAmount * discountPercentage) / 100;

      const discountedBill = originalBillAmount - discountAmount;



      const loyaltyPointsEarned = Math.round(

        ((discountedBill * discountPercentage) / 100) * 2

      );



      // platform / gateway charges

      // OLD CODE - DEPRECATED (using platform_fee_percent instead of platform_fee_rupees)
      // const businessUser = await User.findByPk(businessIdNum, {
      //   attributes: [
      //     "platform_fee_percent",
      //     "gateway_charges",
      //     "reverse_gateway_charges",
      //   ] as any,
      // });
      // const platformFee =
      //   Number((businessUser as any)?.platform_fee_percent) || 0;

      // Use the already loaded fresh business data instead of making another database call
      const platformFee =
        Number((business as any)?.platform_fee_rupees) || 0;
      const gatewayCharges =
        Number((business as any)?.gateway_charges) || 0;
      const reverseGatewayCharges =
        Number((business as any)?.reverse_gateway_charges) || 0;



      const finalPlatformFee = discountedBill + platformFee;



      const gstOnGateway = (finalPlatformFee * gatewayCharges) / 100;

      const finalBillAmount = finalPlatformFee + gstOnGateway;



      const settlementAmount =

        finalBillAmount -

        (finalBillAmount * reverseGatewayCharges) / 100 -

        platformFee;



      const orderId = `MT${Date.now().toString(36).toUpperCase()}`;

      const pointsRedeemedHere = isFirstVisit ? 0.0 : Number(discountAmount.toFixed(2));



      // Clean previous temp orders in "applyoffers" status

      await TemporaryOrder.destroy({

        where: {

          status: "applyoffers",

          user_id: userIdNum,

        },

      });



      // Razorpay payment init (no SDK) using axios

      const razorpayKey = process.env.RAZORPAY_KEY_ID;

      const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;



      if (!razorpayKey || !razorpaySecret) {

        return res.status(500).json({

          status: false,

          message: "Razorpay configuration missing",

        });

      }



      const payload = {

        amount: Math.round(Number(finalBillAmount.toFixed(2)) * 100),

        currency: "INR",

        receipt: orderId,

        payment_capture: 1,

      };



      // console.info("Razorpay Request Payload", {

      //   payload,

      //   user_id: userIdNum,

      //   business_id: businessIdNum,

      //   original_bill_amount: originalBillAmount,

      //   discounted_bill: discountedBill,

      //   final_bill_amount: finalBillAmount,

      // });



      let razorpayData: any = null;



      try {

        const razorpayResponse = await axios.post(

          "https://api.razorpay.com/v1/orders",

          payload,

          {

            auth: {

              username: razorpayKey,

              password: razorpaySecret,

            },

          }

        );



        razorpayData = razorpayResponse.data;

        console.info("Razorpay Decoded Response", {

          decoded_response: razorpayData,

        });

      } catch (err: any) {

        console.error("Razorpay Error", err?.response?.data || err);

      }



      const tempOrder = await TemporaryOrder.create({

        user_id: userIdNum,

        business_id: businessIdNum,

        order_id: razorpayData?.id ?? null,

        original_bill_amount: originalBillAmount,

        discounted_bill: Number(discountedBill.toFixed(2)),

        loyalty_points_used_discount_amount: Number(discountAmount.toFixed(2)),

        platform_fee: platformFee,

        gateway_charges: gatewayCharges,

        reverse_gateway_charges: reverseGatewayCharges,

        settlement_amount: settlementAmount,

        discount_percentage: discountPercentage,

        final_bill_amount: Number(finalBillAmount.toFixed(2)),

        loyalty_points_will_earn: loyaltyPointsEarned,

        referrer_id: referrerId,

        status: "applyoffers",

      } as any);



      // console.info("TemporaryOrder Saved", { order: tempOrder });



      return res.status(200).json({

        status: true,

        message: "Points calculated successfully",

        data: {

          order_id: tempOrder.order_id,

          original_bill: originalBillAmount,

          is_first_visit: isFirstVisit,

          discount_percentage: Number((Number(discountPercentage) || 0).toFixed(2)),

          discount_applied: Number(discountAmount.toFixed(2)),

          discounted_bill: Number(discountedBill.toFixed(2)),

          platform_fee: platformFee,

          convenience_fee: gstOnGateway,

          final_bill_amount: Number(finalBillAmount.toFixed(2)),

          total_points_for_business: balanceForBusiness,

          points_redeemed_here: pointsRedeemedHere,

          points_you_will_earn: loyaltyPointsEarned,

        },

      });

    } catch (e: any) {

      console.error("applyOffers error:", e);

      return res.status(500).json({

        status: false,

        message:

          "An error occurred while applying offers: " +

          (e?.message || "Unknown error"),

      });

    }

  }





}



export default new WebApiController();

