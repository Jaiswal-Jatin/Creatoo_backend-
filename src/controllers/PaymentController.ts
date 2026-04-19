import { Request, Response } from "express";

import axios from "axios";

import { Op } from "sequelize";



import User from "../models/User";

import Post from "../models/Post";

import PostInterest from "../models/PostInterest";

import Payment from "../models/Payment";

import UserNotification from "../models/UserNotification";

import TemporaryOrder from "../models/TemporaryOrder";

import Order from "../models/Order"; // ✅ orders table

import WalletTransaction from "../models/WalletTransaction"; // ✅ wallet transactions table



class PaymentController {

  // =======================================

  // 1) PAYMENT FAILED: postPaymentStatusFailed

  // =======================================

  async postPaymentStatusFailed(req: Request, res: Response) {

    try {

      const { user_id, post_id, razorpay_order_id, reason, response_json } =

        req.body;



      if (!user_id) {

        return res.status(400).json({

          status: false,

          message: "user_id is required",

        });

      }



      await Payment.create({

        user_id: Number(user_id),

        post_id: post_id ?? null,

        razorpay_order_id: razorpay_order_id ?? null,

        status: "failed",

        response: response_json ?? { reason },

      });



      return res.status(200).json({

        status: true,

        message: "Payment failure logged successfully",

      });

    } catch (error) {

      console.error("postPaymentStatusFailed error:", error);

      return res.status(500).json({

        status: false,

        message: "Failed to log payment failure",

      });

    }

  }



  // =====================================================

  // 2) RELEASE PAYMENT TO CREATOR(S)

  // =====================================================

  async paymentReleaseToCreator(req: Request, res: Response) {

    try {

      const { post_id } = req.body;



      if (!post_id || isNaN(Number(post_id))) {

        return res.status(400).json({

          status: false,

          message: "post_id is required and must be numeric",

        });

      }



      const postId = Number(post_id);



      const interests = await PostInterest.findAll({

        where: { post_id: postId, is_shortlist: 1 },

        attributes: ["creator_id"],

      });



      const creatorIds = interests.map((i: any) => i.creator_id);



      if (!creatorIds.length) {

        return res.status(200).json({

          status: true,

          message: "No creators found or none are shortlisted for this post",

        });

      }



      const post = await Post.findByPk(postId, {

        attributes: ["per_creator_amount", "user_id", "name"],

      });



      if (!post) {

        return res.status(400).json({

          status: false,

          message: "Post not found",

        });

      }



      const perCreatorAmount = Number((post as any).per_creator_amount || 0);

      const totalAmount = perCreatorAmount * creatorIds.length;



      const businessUserId = (post as any).user_id;

      const businessUser = await User.findByPk(businessUserId);



      if (!businessUser) {

        return res.status(200).json({

          status: true,

          message: "Business user not found",

        });

      }



      if (Number((businessUser as any).wallet || 0) < totalAmount) {

        return res.status(200).json({

          status: true,

          message: "Insufficient funds in business user's wallet",

        });

      }



      // Call internal API to add creator wallet transaction

      for (const creatorId of creatorIds) {

        try {

          await axios.post(

            `${process.env.INTERNAL_API_BASE_URL}/wallet/addCreatorWalletTransaction`,

            {

              creator_ids: [creatorId],

              amount: perCreatorAmount,

              post_id: postId,

            }

          );

        } catch (error: any) {

          console.error("addCreatorWalletTransaction error:", error?.response?.data || error);

          return res.status(500).json({

            status: false,

            message:

              "Failed to update creator wallet transaction record: " +

              (error.response?.data?.message || error.message),

          });

        }

      }



      const now = new Date();

      const notifications: any[] = [];



      for (const creatorId of creatorIds) {

        await PostInterest.update(

          { is_payment_done: 1 },

          { where: { post_id: postId, creator_id: creatorId } }

        );



        const creator = await User.findByPk(creatorId, {

          attributes: ["remember_token"],

        });



        if (creator && (creator as any).remember_token) {

          const token = (creator as any).remember_token;

          // TODO: send push notification using token

        }



        notifications.push({

          user_id: creatorId,

          title: "Payment Release Creator",

          description: `Payment for your interest in post ID ${postId} has been marked as done.`,

          createdAt: now,

          updatedAt: now,

        });

      }



      if (notifications.length) {

        await UserNotification.bulkCreate(notifications);

      }



      await Post.update({ post_status: "3" }, { where: { id: postId } });



      (businessUser as any).wallet =

        Number((businessUser as any).wallet || 0) - totalAmount;

      await (businessUser as any).save();



      try {

        await axios.post(

          `${process.env.INTERNAL_API_BASE_URL}/wallet/addBusinessWalletTransaction`,

          {

            user_id: businessUserId,

            amount: totalAmount,

            credit_debit: "debit",

            post_id: postId,

          }

        );

      } catch (error: any) {

        console.error("addBusinessWalletTransaction error:", error?.response?.data || error);

        return res.status(500).json({

          status: false,

          message:

            "Failed to update business wallet transaction record: " +

            (error.response?.data?.message || error.message),

        });

      }



      return res.status(200).json({

        status: true,

        message: "Payment released to creators successfully",

        data: {

          post_id: postId,

          creator_ids: creatorIds,

          per_creator_amount: perCreatorAmount,

          business_user_id: businessUserId,

        },

      });

    } catch (error) {

      console.error("paymentReleaseToCreator error:", error);

      return res.status(500).json({

        status: false,

        message:

          "An unexpected error occurred while releasing payment to creators",

      });

    }

  }



  // ===============================================

  // 3) UPDATE USER PAYMENT DETAILS

  // ===============================================

  async paymentDetails(req: Request, res: Response) {

    try {

      const {

        user_id,

        payment_mobile_number,

        upi_id,

        bank_account_number,

        IFSC,

        bank_name,

        branch_name,

        default_method,

      } = req.body;



      if (!user_id) {

        return res.status(400).json({

          status: false,

          message: "user_id is required",

        });

      }



      const user = await User.findByPk(user_id);



      if (!user) {

        return res.status(404).json({

          status: false,

          message: "User not found",

        });

      }



      if (payment_mobile_number)

        (user as any).payment_mobile_number = payment_mobile_number;

      if (upi_id) (user as any).upi_id = upi_id;



      if (bank_account_number)

        (user as any).bank_account_number = bank_account_number;

      if (IFSC) (user as any).ifsc = IFSC;

      if (bank_name) (user as any).bank_name = bank_name;

      if (branch_name) (user as any).branch_name = branch_name;



      if (default_method) (user as any).default_method = default_method;



      await (user as any).save();



      return res.status(200).json({

        status: true,

        message: "Payment details updated successfully",

        data: user,

      });

    } catch (error) {

      console.error("paymentDetails error:", error);

      return res.status(500).json({

        status: false,

        message: "Failed to update payment details",

      });

    }

  }



  // ==========================================

  // 4) GET USER PAYMENT DETAILS

  // ==========================================

  async getPaymentDetail(req: Request, res: Response) {

    try {

      const { user_id } = req.body;



      if (!user_id) {

        return res.status(400).json({

          status: false,

          message: "user_id is required",

        });

      }



      const user = await User.findByPk(user_id);



      if (!user) {

        return res.status(404).json({

          status: false,

          message: "User not found",

        });

      }



      const paymentDetails = {

        payment_mobile_number: (user as any).payment_mobile_number ?? null,

        upi_id: (user as any).upi_id ?? null,

        bank_account_number: (user as any).bank_account_number ?? null,

        IFSC: (user as any).ifsc ?? null,

        bank_name: (user as any).bank_name ?? null,

        branch_name: (user as any).branch_name ?? null,

        default_method: (user as any).default_method ?? null,

      };



      const hasAnyValue = Object.values(paymentDetails).some(

        (v) => v !== null && v !== ""

      );



      if (!hasAnyValue) {

        return res.status(200).json({

          status: true,

          message: "No payment details found for this user",

        });

      }



      return res.status(200).json({

        status: true,

        message: "Payment details retrieved successfully",

        data: paymentDetails,

      });

    } catch (error) {

      console.error("getPaymentDetail error:", error);

      return res.status(500).json({

        status: false,

        message: "Failed to retrieve payment details",

      });

    }

  }



  // ==========================================

  // 5) FETCH PAYMENT STATUS FROM RAZORPAY

  // ==========================================

  async fetchPaymentStatus(req: Request, res: Response) {

    try {

      const { user_id } = req.body;



      if (!user_id) {

        return res.status(400).json({

          status: false,

          message: "user_id is required",

        });

      }



      const user = await User.findByPk(user_id);



      if (!user) {

        return res.status(404).json({

          status: false,

          message: "User not found",

        });

      }



      const orderId = (user as any).last_order_id;



      if (!orderId) {

        return res.status(404).json({

          status: false,

          message: "No orders found for the given user ID.",

          data: null,

        });

      }



      const keyId = process.env.RAZORPAY_KEY_ID;

      const keySecret = process.env.RAZORPAY_KEY_SECRET;



      if (!keyId || !keySecret) {

        return res.status(500).json({

          status: false,

          message: "Business razorpay details not configured.",

        });

      }



      const response = await axios.get(

        `https://api.razorpay.com/v1/orders/${orderId}/payments`,

        {

          headers: {

            Authorization:

              "Basic " +

              Buffer.from(`${keyId}:${keySecret}`).toString("base64"),

            "Content-Type": "application/json",

          },

        }

      );



      const paymentStatus = response.data;



      await Payment.create({

        user_id: Number(user_id),

        razorpay_order_id: orderId,

        status: "fetched",

        response: paymentStatus,

      });



      return res.status(200).json({

        status: true,

        message: "Payment status fetched successfully",

        data: paymentStatus,

      });

    } catch (error: any) {

      console.error("fetchPaymentStatus error:", error?.response?.data || error);

      return res.status(500).json({

        status: false,

        message:

          "Failed to fetch payment status: " +

          (error.response?.data?.error?.description || error.message),

        data: null,

      });

    }

  }



  // ==========================================

  // 6) PROCESS PAYMENT  (mark temp order as processing)

  // ==========================================

  async processPayment(req: Request, res: Response) {

    try {

      const { order_id } = req.body;



      if (!order_id) {

        return res.status(400).json({

          status: false,

          message: "order_id is required",

        });

      }



      const tempOrder = await TemporaryOrder.findOne({ where: { order_id } });



      if (!tempOrder) {

        return res.status(404).json({

          status: false,

          message: "Temp Order not found",

        });

      }



      (tempOrder as any).status = "processing";

      await (tempOrder as any).save();



      return res.status(200).json({

        status: true,

        message: "Temp Order has been marked as Processing",

        data: null,

      });

    } catch (error) {

      console.error("processPayment error:", error);

      return res.status(500).json({

        status: false,

        message: "Failed to process payment",

      });

    }

  }



  // ==========================================

  // 7) PAYMENT SUCCESS / FAILED (from frontend callback)

  // ==========================================

  async paymentSuccess(req: Request, res: Response) {

    try {

      const { order_id, user_id, payment_status } = req.body;

     



      if (!order_id || !user_id || !payment_status) {

        return res.status(400).json({

          status: false,

          message: "order_id, user_id & payment_status are required",

        });

      }



      const tempOrder = await TemporaryOrder.findOne({ where: { order_id } });



      if (!tempOrder) {

        return res.status(404).json({

          status: false,

          message: "Temp Order not found",

        });

      }



      // SUCCESS

      if (payment_status === "SUCCESS") {

        const responseData = await this.saveOrder(

          String(order_id),

          Number((tempOrder as any).business_id),

          Number(user_id)

        );



        return res.status(200).json({

          status: true,

          message: "Payment success retrieved successfully",

          data: responseData,

        });

      }



      // FAILED

      (tempOrder as any).status = "failed";

      await (tempOrder as any).save();



      // Also log in payments table

      await Payment.create({

        user_id: Number(user_id),

        razorpay_order_id: String(order_id),

        status: "failed",

        response: { source: "paymentSuccess", message: "Payment failed" },

      });



      return res.status(200).json({

        status: true,

        message: "Failed Payment",

        data: null,

      });

    } catch (error) {

      console.error("paymentSuccess error:", error);

      return res.status(500).json({

        status: false,

        message: "Failed to handle payment success",

      });

    }

  }



  // ==========================================

  // 8) SAVE ORDER (creates record in orders table)

  // ==========================================

  private async saveOrder(

    orderId: string,

    businessId: number,

    userId: number

  ) {

    const round2 = (val: any) =>

      Number.isFinite(Number(val))

        ? Math.round(Number(val) * 100) / 100

        : 0;



    // 1) If payment already recorded, just return details based on temp order

    const existingPayment = await Payment.findOne({

      where: { razorpay_order_id: orderId, user_id: userId },

    });



    const tempOrder = await TemporaryOrder.findOne({

      where: { order_id: orderId },

    });



    if (!tempOrder) {

      throw new Error("Temporary order not found");

    }



    // names

    const business = await User.findByPk(businessId);

    const user = await User.findByPk(userId);



    const businessName =

      (business as any)?.business_name ?? "Unknown Business";

    const receiptName = (user as any)?.name ?? "Unknown User";



    const originalBill = round2(

      (tempOrder as any).original_bill_amount ??

        (tempOrder as any).bill_amount

    );

    const finalBill = round2((tempOrder as any).final_bill_amount);



    // mark temp order as success (like Laravel)

    (tempOrder as any).status = "success";

    await (tempOrder as any).save();



    // 2) Ensure Payment row is success

    let payment = existingPayment;

    if (!payment) {

      payment = await Payment.create({

        user_id: userId,

        post_id: null, // no post_id in temporary_orders table

        razorpay_order_id: orderId,

        status: "success",

        amount: finalBill,

        response: {

          source: "saveOrder",

          temporary_order_id: (tempOrder as any).id,

          original_bill_amount: (tempOrder as any).original_bill_amount,

          discounted_bill: (tempOrder as any).discounted_bill,

          final_bill_amount: (tempOrder as any).final_bill_amount,

          platform_fee: (tempOrder as any).platform_fee,

          gateway_charges: (tempOrder as any).gateway_charges,

          settlement_amount: (tempOrder as any).settlement_amount,

          loyalty_points_used_discount_amount:

            (tempOrder as any).loyalty_points_used_discount_amount,

          loyalty_points_will_earn:

            (tempOrder as any).loyalty_points_will_earn,

          referrer_id: (tempOrder as any).referrer_id,

        },

      });

    } else if (payment.status !== "success") {

      payment.status = "success";

      payment.amount = finalBill;

      await payment.save();

    }



    // created_at from temporary_orders table

    const createdAtRaw: Date =

      (tempOrder as any).created_at ||

      (tempOrder as any).createdAt ||

      new Date();



    const created_at = createdAtRaw

      .toISOString()

      .slice(0, 19)

      .replace("T", " "); // Y-m-d H:i:s



    // 3) CREATE / UPDATE RECORD IN `orders` TABLE

    const orderDefaults = {

      user_id: userId,

      business_id: businessId,

      referrer_id: (tempOrder as any).referrer_id ?? null,



      order_id: orderId,



      original_bill_amount: (tempOrder as any).original_bill_amount,

      discounted_bill: (tempOrder as any).discounted_bill,

      discount_percentage: (tempOrder as any).discount_percentage ?? null,

      loyalty_points_used_discount_amount:

        (tempOrder as any).loyalty_points_used_discount_amount,

      platform_fee: (tempOrder as any).platform_fee,

      gateway_charges: (tempOrder as any).gateway_charges,

      reverse_gateway_charges: (tempOrder as any).reverse_gateway_charges,

      settlement_amount: (tempOrder as any).settlement_amount,

      final_bill_amount: (tempOrder as any).final_bill_amount,

      loyalty_points_earned:

        (tempOrder as any).loyalty_points_will_earn ?? null,

      transaction_response: null, // or JSON.stringify(payment) if you want

      expiry_date: (tempOrder as any).expiry_date ?? null,

      review_status: (tempOrder as any).review_status ?? null,

      status: "success",



      created_at: createdAtRaw,

      updated_at: createdAtRaw,

    };



    const [order, created] = await Order.findOrCreate({

      where: {

        order_id: orderId,

        user_id: userId,

      },

      defaults: orderDefaults,

    });



    if (!created) {

      await order.update(orderDefaults as any);

    }



    // 4) Update user's last_order_id (used in fetchPaymentStatus)

    if (user) {

      (user as any).last_order_id = orderId;

      await (user as any).save();

    }



    // 5) CREATE WALLET TRANSACTION FOR BUSINESS OWNER
    // Automatically store order payment in wallet_transactions table for business owner
    try {
      const originalAmount = Number((tempOrder as any).original_bill_amount) || 0;
      const platformFee = Number((tempOrder as any).platform_fee) || 0; // Fixed amount in ₹
      const gatewayCharges = Number((tempOrder as any).gateway_charges) || 0; // Percentage value
      const reverseGatewayCharges = Number((tempOrder as any).reverse_gateway_charges) || 0; // Percentage value
      const settlementAmount = Number((tempOrder as any).settlement_amount) || 0;
      
      // Apply reverse calculator using the same formula as WebApiController
      // Net Amount = Final Bill Amount - (Final Bill Amount * reverse_gateway_charges / 100) - platform_fee
      const finalBillAmount = Number((tempOrder as any).final_bill_amount) || 0;
      const netAmountReceived = finalBillAmount - (finalBillAmount * reverseGatewayCharges / 100) - platformFee;
      const finalSettlementAmount = settlementAmount > 0 ? settlementAmount : netAmountReceived;
      
      // Check if wallet transaction already exists for this order
      const existingWalletTransaction = await WalletTransaction.findOne({
        where: {
          user_id: businessId,
          remark: {
            [Op.like]: `%Order ${orderId}%`
          }
        }
      });
      
      // Create wallet transaction only if it doesn't exist
      if (!existingWalletTransaction) {
        await WalletTransaction.create({
          user_id: businessId,
          amount: finalSettlementAmount,
          credit_debit: "credit",
          remark: `Payment received for Order ${orderId}`,
          is_withdraw_request: "0",
          via: "order_payment",
          created_at: createdAtRaw,
          updated_at: createdAtRaw
        } as any);
        
        console.log(`Auto-created wallet transaction for Order ${orderId}: ₹${finalSettlementAmount}`);
        console.log(`Fee breakdown - Original: ₹${originalAmount}, Platform: ₹${platformFee}, Gateway: ${gatewayCharges}%, Reverse Gateway: ${reverseGatewayCharges}%, Net: ₹${finalSettlementAmount}`);
      }
    } catch (walletError) {
      console.error("Error creating wallet transaction for order:", walletError);
      // Continue with response even if wallet transaction creation fails
    }

    // 6) Response matching your Laravel $responseData structure

    return {

      business_id: businessId,

      business_name: businessName,

      total_bill: originalBill,

      final_bill: finalBill,

      created_at,

      receipt_name: receiptName,

      order_id: (order as any).id ?? null,

      razorpay_order_id: orderId,

    };

  }

}



export default new PaymentController();

