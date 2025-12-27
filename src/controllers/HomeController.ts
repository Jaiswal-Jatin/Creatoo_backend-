// src/controllers/HomeController.ts
import { Request, Response } from "express";
import { Op, literal, QueryTypes } from "sequelize";
import sequelize from "../db/sequelize";

import User from "../models/User";
import Banner from "../models/Banner";
import Order from "../models/Order";
import Post from "../models/Post";
import PostInterest from "../models/PostInterest";
import PostReport from "../models/PostReport";
import CreatorPointsTransaction from "../models/CreatorPointsTransaction";
import TemporaryOrder from "../models/TemporaryOrder";

class HomeController {
  // ----------------------------
  // POST /api/getHomeData
  // Laravel: getHomeData
  // ----------------------------
  async getHomeData(req: Request, res: Response) {
    try {
      const { user_id } = req.body as { user_id?: number | string };

      // validation
      const errors: Record<string, string[]> = {};
      if (!user_id) errors.user_id = ["user_id is required"];

      const userIdNum = Number(user_id);
      if (Number.isNaN(userIdNum)) {
        errors.user_id = [...(errors.user_id || []), "user_id must be numeric"];
      }

      if (Object.keys(errors).length > 0) {
        return res.status(422).json({
          status: false,
          message: "Validation failed",
          errors,
        });
      }

      const user = await User.findByPk(userIdNum);
      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
        });
      }

      // Banners (max 5)
      const banners = await Banner.findAll({
        attributes: ["id", "image", "link", "is_active"],
        where: { is_active: 1 },
        limit: 5,
        order: [["id", "DESC"]],
      });

      // Top reviews (only for role_id == 3)
      // Top reviews (only for role_id == 3)
      let topReviews: any[] = [];
      if (user.role_id === 3 || user.role_id === 2) {
        topReviews = await this.getTotalCountReview();
      }


      // Top creators
      const topCreator = await User.findAll({
        attributes: [
          "id",
          "name",
          "email",
          "mobile",
          "address",
          "instagram_link",
          "instagram_username",
          "user_image",
          "is_top",
          "is_active",
        ],
        where: {
          is_top: 1,
          role_id: 3,
        },
        order: [["created_at", "DESC"]],
        limit: 5,
      });

      // Top business
      const topBusiness = await User.findAll({
        attributes: [
          "id",
          "business_fullname",
          "business_name",
          "business_email",
          "business_mobile",
          "business_site_url",
          "business_image",
          "is_top",
          "is_active",
          "business_address",
          "set_first_time_discount",
        ],
        where: {
          is_top: 1,
          role_id: 2,
        },
        order: [["created_at", "DESC"]],
        limit: 5,
      });

      // New creators – you ended up sending [] in Laravel, so we mirror that
      const newCreator: any[] = [];

      // New business (excluding current user)
      const newBusiness = await User.findAll({
        attributes: [
          "id",
          "business_fullname",
          "business_name",
          "business_email",
          "business_mobile",
          "business_site_url",
          "business_image",
          "is_active",
          "business_area",
          "set_first_time_discount",
        ],
        where: {
          role_id: 2,
          id: { [Op.ne]: userIdNum },
        },
        order: [["created_at", "DESC"]],
        limit: 5,
      });

      // last_order_id from users
      const lastOrderId = user.last_order_id ?? null;

      let paymentStatusData: any = null;

      if (lastOrderId) {
        // Laravel: Post::where('order_id', $lastOrder)->where('transaction_d', null)->where('payment_status', '0')->where('user_id', $user_id)
        const post = await Post.findOne({
          where: {
            order_id: String(lastOrderId),
            transaction_d: null,
            payment_status: "0",
            user_id: userIdNum,
          } as any,
        });

        if (post) {
          // fetch payment status (stubbed)
          paymentStatusData = await this.fetchPaymentStatus(userIdNum);

          const status = paymentStatusData?.data?.items?.[0]?.status;

          if (status === "failed") {
            post.payment_status_response = JSON.stringify(
              paymentStatusData.data
            );
            post.payment_status = "2";
            await post.save();

            await User.update(
              { last_order_id: null },
              { where: { id: userIdNum } }
            );
          } else if (status === "captured") {
            const upiTransactionId =
              paymentStatusData?.data?.items?.[0]?.acquirer_data
                ?.upi_transaction_id;

            await this.updateStatus(
              userIdNum,
              post.id,
              JSON.stringify(paymentStatusData.data),
              status
            );
            await User.update(
              { last_order_id: null },
              { where: { id: userIdNum } }
            );
          }
        }
      }

      // Role specific data
      let roleSpecificData: any = null;

      if (user.role_id === 2) {
        // BUSINESS SIDE

        // QR code placeholder path – in Laravel you generated and stored it
        const qrCodePath = `qr_image/${user.id}_qr_code.png`;
        // (If you want real QR, generate and save file in a service.)

        // Today's settlement_amount sum
        const now = new Date();
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        );
        const endOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );

        const todayWalletPoints = await Order.sum("settlement_amount", {
          where: {
            business_id: userIdNum,
            created_at: {
              [Op.gte]: startOfDay,
              [Op.lte]: endOfDay,
            },
          } as any,
        });

        // You were using Orders to derive "total_balance" from expiry_date + remaining_points.
        // We'll mirror that, treating the model rows as any for remaining_points.
        const orders = (await Order.findAll({
          where: { business_id: userIdNum },
          order: [["created_at", "DESC"]],
        })) as any[];

        const nowDate = new Date();
        const total_balance = orders.reduce((sum, o) => {
          const expiry = o.expiry_date ? new Date(o.expiry_date) : null;
          if (expiry && expiry >= nowDate) {
            const remainingPoints = Number(o.remaining_points ?? 0);
            return sum + remainingPoints;
          }
          return sum;
        }, 0);

        // Profile completion logic
        let profileCompletion = 0;

        if (
          user.business_name &&
          user.business_mobile &&
          user.business_address &&
          user.business_area
        ) {
          profileCompletion = 1;
        }

        if (
          profileCompletion >= 1 &&
          user.time_from &&
          user.time_to &&
          user.pricing_range_text &&
          (user.business_image_1 ||
            user.business_image_2 ||
            user.business_image_3)
        ) {
          profileCompletion = 2;
        }

        if (
          profileCompletion >= 2 &&
          user.set_first_time_discount != null &&
          user.set_regular_discount != null &&
          user.min_order != null &&
          user.set_expiry != null
        ) {
          profileCompletion = 3;
        }

        roleSpecificData = {
          qr_code: qrCodePath,
          today_wallet_points: Number(todayWalletPoints || 0),
          user_creatoo_points: Number(total_balance || 0),
          profile_completion_status: profileCompletion,
        };
      } else if (user.role_id === 3) {
        // CREATOR SIDE – Creatoo points from creator_points_transactions
        const creatooPoints =
          (await CreatorPointsTransaction.sum("remaining_points", {
            where: {
              user_id: userIdNum,
              expiry_date: {
                [Op.gte]: new Date(),
              },
            },
          })) || 0;

        roleSpecificData = {
          user_creatoo_points: Number(creatooPoints),
        };
      }

      // pending review flag via orders + users
      const pendingReviewRows = (await sequelize.query(
        `
        SELECT 
          users.business_name,
          orders.business_id,
          orders.order_id
        FROM orders
        JOIN users ON orders.business_id = users.id
        WHERE orders.user_id = :userId
          AND orders.review_status = 'pending'
        LIMIT 1
      `,
        {
          replacements: { userId: userIdNum },
          type: QueryTypes.SELECT,
        }
      )) as any[];

      const is_pending_review_flag =
        pendingReviewRows.length > 0 ? pendingReviewRows[0] : null;

      // latest TemporaryOrder for earned_point
      const latestOrder = await TemporaryOrder.findOne({
        where: { user_id: userIdNum },
        order: [["id", "DESC"]],
      });

      const earned_point = latestOrder
        ? Number((latestOrder as any).loyalty_points_will_earn || 0)
        : 0;

      // if there's a temp order in "processing" but real order not yet created,
      // send its order_id
      let order_id: string | null = null;
      const tempOrder = await TemporaryOrder.findOne({
        where: { user_id: userIdNum, status: "processing" },
        order: [["created_at", "DESC"]],
      });

      if (tempOrder) {
        const tempOrderId = (tempOrder as any).order_id as string;
        const existingOrder = await Order.findOne({
          where: { order_id: tempOrderId },
        });
        if (!existingOrder) {
          order_id = tempOrderId;
        }
      }

      const data = {
        banners,
        top_reviews: topReviews,
        topCreator,
        topBusiness,
        newCreator,
        newBusiness,
        paymentStatus: paymentStatusData?.data ?? null,
        role_specific_data: roleSpecificData,
        is_pending_review_flag,
        earned_point,
        order_id,
      };

      return res.status(200).json({
        status: true,
        message: "Data found successfully.",
        data,
      });
    } catch (e: any) {
      console.error("getHomeData error:", e);
      return res.status(500).json({
        status: false,
        message: "Failed to process getHomeData",
      });
    }
  }

  // ----------------------------
  // POST /api/getCreatorHome
  // Laravel: getCreatorHome
  // ----------------------------
  async getCreatorHome(req: Request, res: Response) {
    try {
      const { user_id } = req.body as { user_id?: number | string };

      const errors: Record<string, string[]> = {};
      if (!user_id) errors.user_id = ["user_id is required"];

      const userIdNum = Number(user_id);
      if (Number.isNaN(userIdNum)) {
        errors.user_id = [...(errors.user_id || []), "user_id must be numeric"];
      }

      if (Object.keys(errors).length > 0) {
        return res.status(422).json({
          status: false,
          message: "Validation failed",
          errors,
        });
      }

      // reported post IDs for this user
      const userReportedRows = await PostReport.findAll({
        where: { user_id: userIdNum },
        attributes: ["post_id"],
        raw: true,
      });
      const reportedIds = userReportedRows.map((r: any) => r.post_id as number);

      // postIdsApplied
      let postIdsAppliedRows = await PostInterest.findAll({
        where: { creator_id: userIdNum },
        attributes: ["post_id"],
        raw: true,
      });
      let postIdsApplied = postIdsAppliedRows.map(
        (r: any) => r.post_id as number
      );

      const currentDate = new Date();
      const y = currentDate.getFullYear();
      const m = (currentDate.getMonth() + 1).toString().padStart(2, "0");
      const d = currentDate.getDate().toString().padStart(2, "0");
      const currentDateStr = `${y}-${m}-${d}`;

      const expiryCondition = literal(
        `STR_TO_DATE(post_expiry_date, '%d/%m/%Y') >= '${currentDateStr}'`
      );

      // opportunities = open posts not applied & not reported
      const opportunitiesList = await Post.findAll({
        where: {
          post_status: "1",
          payment_status: "1",
          id: {
            [Op.notIn]: [...postIdsApplied, ...reportedIds],
          },
          is_reported: {
            [Op.ne]: "1",
          },
          post_expiry_date: {
            [Op.ne]: null,
          },
          [Op.and]: expiryCondition,
        } as any,
      });
      const opportunitiesCount = opportunitiesList.length;

      // recompute applied IDs
      postIdsAppliedRows = await PostInterest.findAll({
        where: { creator_id: userIdNum },
        attributes: ["post_id"],
        raw: true,
      });
      postIdsApplied = postIdsAppliedRows.map((r: any) => r.post_id as number);

      // postsWithStatus1 (applied & status=1)
      const postsWithStatus1Rows = await Post.findAll({
        where: {
          id: { [Op.in]: postIdsApplied, [Op.notIn]: reportedIds },
          post_status: "1",
          payment_status: "1",
          is_reported: { [Op.ne]: "1" },
        } as any,
        attributes: ["id"],
        raw: true,
      });
      const postsWithStatus1Ids = postsWithStatus1Rows.map(
        (r: any) => r.id as number
      );

      const appliedCount = postsWithStatus1Ids.length;

      // onGoingDeals: post_status = 2
      const postIdsForOnRows = await PostInterest.findAll({
        where: { creator_id: userIdNum },
        attributes: ["post_id"],
        raw: true,
      });
      const postIdsForOn = postIdsForOnRows.map(
        (r: any) => r.post_id as number
      );

      const onGoingIdsRows = await Post.findAll({
        where: {
          id: { [Op.in]: postIdsForOn, [Op.notIn]: reportedIds },
          post_status: "2",
          payment_status: "1",
          is_reported: { [Op.ne]: "1" },
        } as any,
        attributes: ["id"],
        raw: true,
      });
      const onGoingDeals = onGoingIdsRows.length;

      // successfulDeals: shortlisted + paid + post_status 3
      const postIdsDealRows = await PostInterest.findAll({
        where: {
          creator_id: userIdNum,
          is_payment_done: 1,
          is_shortlist: 1,
        },
        attributes: ["post_id"],
        raw: true,
      });
      const postIdsDeal = postIdsDealRows.map((r: any) => r.post_id as number);

      const successfulDealsRows = await Post.findAll({
        where: {
          id: { [Op.in]: postIdsDeal, [Op.notIn]: reportedIds },
          post_status: "3",
          payment_status: "1",
        } as any,
        attributes: ["id"],
        raw: true,
      });
      const successfulDeals = successfulDealsRows.length;

      const data = {
        opportunities: opportunitiesCount,
        applied: appliedCount,
        onGoingDeals,
        successfulDeals,
      };

      return res.status(200).json({
        status: true,
        message: "Request processed successfully",
        data,
      });
    } catch (e: any) {
      console.error("getCreatorHome error:", e);
      return res.status(500).json({
        status: false,
        message: "Failed to process the request",
      });
    }
  }

  // ----------------------------
  // POST /api/getCreatorContact
  // Laravel: getCreatorContact
  // ----------------------------
  async getCreatorContact(req: Request, res: Response) {
    try {
      const { post_id } = req.body as { post_id?: number | string };

      const errors: Record<string, string[]> = {};
      if (!post_id) errors.post_id = ["post_id is required"];

      const postIdNum = Number(post_id);
      if (Number.isNaN(postIdNum)) {
        errors.post_id = [...(errors.post_id || []), "post_id must be numeric"];
      }

      if (Object.keys(errors).length > 0) {
        return res.status(422).json({
          status: false,
          message: "Validation failed",
          errors,
        });
      }

      const creatorRows = await PostInterest.findAll({
        where: { post_id: postIdNum },
        attributes: ["creator_id"],
        raw: true,
      });

      const creatorIds = creatorRows.map((r: any) => r.creator_id as number);

      if (creatorIds.length === 0) {
        return res.status(200).json({
          status: true,
          message: "Data found Successfully",
          data: [],
        });
      }

      const contactDetails = await User.findAll({
        attributes: [
          "name",
          "mobile",
          "email",
          "instagram_username",
          "address",
        ],
        where: {
          id: { [Op.in]: creatorIds },
        },
      });

      return res.status(200).json({
        status: true,
        message: "Data found Successfully",
        data: contactDetails,
      });
    } catch (e: any) {
      console.error("getCreatorContact error:", e);
      return res.status(500).json({
        status: false,
        message: "Failed to fetch creator contact",
      });
    }
  }

  // ---------------------------------------------------
  // 🔹 Helpers
  // ---------------------------------------------------
  private async getTotalCountReview(): Promise<any[]> {
    const topUsers = (await sequelize.query(
      `
      SELECT 
        users.id,
        users.name,
        users.user_image,
        COUNT(reviews.id) AS total_reviews
      FROM reviews
      JOIN users ON reviews.user_id = users.id
      GROUP BY users.id, users.name, users.user_image
      ORDER BY total_reviews DESC
      LIMIT 10
    `,
      {
        type: QueryTypes.SELECT,
      }
    )) as any[];

    return topUsers;
  }



  private async fetchPaymentStatus(userId: number): Promise<any | null> {
    // TODO: integrate with payment gateway API (Razorpay etc.)
    // Should return shape similar to:
    // { data: { items: [ { status: 'failed' | 'captured', acquirer_data: { upi_transaction_id } } ] } }
    return null;
  }

  private async updateStatus(
    userId: number,
    postId: number,
    paymentResponseJson: string,
    status: string
  ): Promise<void> {
    // TODO: implement your Laravel updateStatus logic here
    return;
  }
}

export default new HomeController();
