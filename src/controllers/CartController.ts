// src/controllers/CartController.ts
import { Request, Response } from "express";
import { Op } from "sequelize";
import PostInterest from "../models/PostInterest";
import Post from "../models/Post";
import User from "../models/User";
import sequelize from "../db/sequelize";
import { sendPushNotification } from "../services/notification.service";

class CartController {
  // POST /api/cart/addCart  (Laravel: addCart)
  async addCart(req: Request, res: Response) {
    try {
      const { creator_id, post_id } = req.body as {
        creator_id?: number | string;
        post_id?: number | string;
      };

      // ✅ validation like $request->validate
      if (!creator_id || !post_id) {
        return res.status(422).json({
          status: false,
          message: "creator_id and post_id are required",
        });
      }

      const creatorIdNum = Number(creator_id);
      const postIdNum = Number(post_id);

      if (Number.isNaN(creatorIdNum) || Number.isNaN(postIdNum)) {
        return res.status(422).json({
          status: false,
          message: "creator_id and post_id must be numeric",
        });
      }

      // 🔎 find post_interests row
      const postInterest = await PostInterest.findOne({
        where: {
          creator_id: creatorIdNum,
          post_id: postIdNum,
        },
      });

      if (!postInterest) {
        return res.status(400).json({
          status: false,
          message: "Record not found",
        });
      }

      const currentCart = Number((postInterest as any).is_cart ?? 0);
      const newCartValue = currentCart === 1 ? 0 : 1;

      // toggle is_cart
      await postInterest.update({ is_cart: newCartValue } as any);

      // count how many in cart for this post
      const cartCount = await PostInterest.count({
        where: {
          post_id: postIdNum,
          is_cart: 1,
        },
      });

      // get creator_required from Post
      const post = await Post.findByPk(postIdNum, {
        attributes: ["creator_required"],
      });

      const creatorRequired = Number(post?.creator_required ?? 0);

      if (cartCount > creatorRequired) {
        // ⚠️ same behavior as Laravel: no rollback even if over limit
        return res.status(400).json({
          status: false,
          message: "Can't select more than the creator's requirement",
        });
      }

      // post_status logic is commented in Laravel, so we keep it commented
      // const postStatusValue = cartCount > 0 ? "1" : "0";
      // await post?.update({ post_status: postStatusValue } as any);

      const message =
        newCartValue === 1
          ? "Record added to cart"
          : "Record removed from cart";

      return res.status(200).json({
        status: true,
        message,
      });
    } catch (e: any) {
      console.error("addCart error:", e);
      return res.status(500).json({
        status: false,
        message: "Failed to update cart: " + (e?.message || "Unknown error"),
      });
    }
  }

  // POST /api/cart/addShortlist  (Laravel: addShortlist)
  async addShortlist(req: Request, res: Response) {
    try {
      const { post_id, creator_ids } = req.body as {
        post_id?: number | string;
        creator_ids?: (number | string)[];
      };

      // ✅ Validation like Laravel
      if (!post_id) {
        return res.status(422).json({
          status: false,
          message: "post_id is required",
        });
      }
      if (!creator_ids || !Array.isArray(creator_ids) || creator_ids.length === 0) {
        return res.status(422).json({
          status: false,
          message: "creator_ids is required and must be a non-empty array",
        });
      }

      const postIdNum = Number(post_id);
      if (Number.isNaN(postIdNum)) {
        return res.status(422).json({
          status: false,
          message: "post_id must be numeric",
        });
      }

      const creatorIdNums = creator_ids.map(Number);
      if (creatorIdNums.some((n) => Number.isNaN(n))) {
        return res.status(422).json({
          status: false,
          message: "All creator_ids must be numeric",
        });
      }

      // 🔎 ensure post exists
      const post = await Post.findByPk(postIdNum);
      if (!post) {
        return res.status(404).json({
          status: false,
          message: "Post not found",
        });
      }

      // (optional) ensure all creators exist
      const creatorsCount = await User.count({
        where: {
          id: { [Op.in]: creatorIdNums },
        },
      });
      if (creatorsCount !== creatorIdNums.length) {
        return res.status(422).json({
          status: false,
          message: "One or more creator_ids are invalid",
        });
      }

      const postName = (post as any).name ?? `#${postIdNum}`;

      const notifications: any[] = [];

      // Shortlist those who are already in cart
      for (const creatorId of creatorIdNums) {
        const pi = await PostInterest.findOne({
          where: {
            creator_id: creatorId,
            post_id: postIdNum,
            is_cart: 1,
          },
        });

        if (pi) {
          pi.is_shortlist = 1;
          await pi.save();

          notifications.push({
            user_id: creatorId,
            title: "SHORTLISTED",
            description: `You have been shortlisted for post ID: ${postIdNum}`,
            created_at: new Date(),
            updated_at: new Date(),
          });

          const user = await User.findByPk(creatorId, {
            attributes: ["remember_token"],
          });
          const rememberToken = user?.remember_token;

          if (rememberToken) {
            const notificationPayload = {
              title: "SHORTLISTED",
              description: `You have been shortlisted for post: ${postName}`,
            };

            await sendPushNotification(notificationPayload, [rememberToken]);
          }
        }
      }

      // Insert "shortlisted" notifications into user_notifications
      if (notifications.length > 0) {
        try {
          await sequelize.getQueryInterface().bulkInsert(
            "user_notifications",
            notifications
          );
        } catch (e) {
          console.error("Error inserting shortlist notifications:", e);
          return res.status(500).json({
            error: "An error occurred while sending notifications",
          });
        }
      }

      // Non-shortlisted creators (is_cart = 0 AND is_shortlist = 0)
      const nonShortlisted = await PostInterest.findAll({
        where: {
          post_id: postIdNum,
          is_cart: 0,
          is_shortlist: 0,
        },
        attributes: ["creator_id"],
      });

      const nonShortlistedIds = nonShortlisted.map(
        (r: any) => r.creator_id as number
      );

      if (nonShortlistedIds.length > 0) {
        const nonShortlistedNotifications = nonShortlistedIds.map((creatorId) => ({
          user_id: creatorId,
          title: "Better Luck Next Time",
          description: `Unfortunately, you were not shortlisted for post ID: ${postIdNum}`,
          created_at: new Date(),
          updated_at: new Date(),
        }));

        try {
          await sequelize
            .getQueryInterface()
            .bulkInsert("user_notifications", nonShortlistedNotifications);

          // Push notification to non-shortlisted creators
          const tokenUsers = await User.findAll({
            where: {
              id: { [Op.in]: nonShortlistedIds },
            },
            attributes: ["remember_token"],
          });

          const tokens = tokenUsers
            .map((u) => u.remember_token)
            .filter(Boolean) as string[];

          for (const token of tokens) {
            const notificationPayload = {
              title: "Better Luck Next Time",
              description: `Unfortunately, you were not shortlisted for post: ${postName}`,
            };
            await sendPushNotification(notificationPayload, [token]);
          }
        } catch (e) {
          console.error("Error inserting non-shortlisted notifications:", e);
          return res.status(500).json({
            error:
              "An error occurred while sending non-shortlisted notifications",
          });
        }
      }

      // Update post_status = '2'
      await post.update({ post_status: "2" } as any);

      return res.json({
        status: true,
        message: "Shortlist updated successfully",
      });
    } catch (e: any) {
      console.error("addShortlist error:", e);
      return res.status(500).json({
        status: false,
        message:
          "An error occurred while updating shortlist: " +
          (e?.message || "Unknown error"),
      });
    }
  }
}

export default new CartController();
