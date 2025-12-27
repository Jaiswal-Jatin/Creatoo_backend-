// src/controllers/PostInterestController.ts
import { Request, Response } from "express";
import { QueryTypes } from "sequelize";
import PostInterest from "../models/PostInterest";
import User from "../models/User";
import Post from "../models/Post";
import PostReport from "../models/PostReport"; // make sure this model exists
import sequelize from "../db/sequelize";
import { sendPushNotification } from "../services/notification.service";

/**
 * GET /api/post/interests/:id
 * Returns list of interests for a given post_id
 */
export const getPostInterests = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // post_id

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "post id is required",
      });
    }

    const interests = await PostInterest.findAll({
      where: { post_id: Number(id) },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "name", "mobile", "email"],
        },
        {
          model: Post,
          as: "post",
          attributes: ["id", "name", "description"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.json(interests);
  } catch (error) {
    console.error("getPostInterests error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

/**
 * POST /api/post/postInterest
 * Laravel: postInterest
 */
export const postInterest = async (req: Request, res: Response) => {
  try {
    const { user_id, post_id } = req.body as {
      user_id?: number | string;
      post_id?: number | string;
    };

    // validate post_id presence
    if (!post_id) {
      return res.status(400).json({
        status: false,
        message: "Post ID is missing or invalid.",
      });
    }

    const userIdNum = Number(user_id);
    const postIdNum = Number(post_id);

    if (Number.isNaN(userIdNum) || Number.isNaN(postIdNum)) {
      return res.status(400).json({
        status: false,
        message: "user_id and post_id must be numeric.",
      });
    }

    const validUser = await User.findOne({
      where: { id: userIdNum, is_insta_verified: "1" },
    });

    if (!validUser) {
      return res.status(200).json({
        status: true,
        message: "Please verify your account to apply the post",
      });
    }

    const minFollowerPost = await Post.findByPk(postIdNum);
    if (!minFollowerPost) {
      return res.status(404).json({
        status: false,
        message: "Post not found.",
      });
    }

    const followerCount = (validUser as any).follower_count || 0;
    const followersRequired = (minFollowerPost as any).followers_required || 0;

    if (followerCount < followersRequired) {
      return res.status(200).json({
        status: true,
        message: "Follower criteria is not fulfilled.",
      });
    }

    // has user already applied?
    const existingInterest = await PostInterest.findOne({
      where: { creator_id: userIdNum, post_id: postIdNum },
    });

    if (existingInterest) {
      return res.status(200).json({
        status: false,
        message: "You have already applied for this post",
      });
    }

    // create interest
    await PostInterest.create({
      creator_id: userIdNum,
      post_id: postIdNum,
    });

    // notify the business user who owns the post
    const businessUserId = (minFollowerPost as any).user_id as number | null;

    if (businessUserId) {
      try {
        // insert into user_notifications table
        const title = "New Interest in Your Post";
        const postName = (minFollowerPost as any).name as string;
        const description =
          "A creator has shown interest in your post with ID: " + postIdNum;

        await sequelize.query(
          `
          INSERT INTO user_notifications (user_id, title, description, created_at, updated_at)
          VALUES (:user_id, :title, :description, NOW(), NOW())
        `,
          {
            replacements: {
              user_id: businessUserId,
              title,
              description,
            },
            type: QueryTypes.INSERT,
          }
        );

        const businessUser = await User.findByPk(businessUserId, {
          attributes: ["remember_token"],
        });

        const rememberToken = (businessUser as any)?.remember_token as
          | string
          | null;

        if (rememberToken) {
          const notification = {
            title,
            description: "A creator has shown interest in your post: " + postName,
          };

          await sendPushNotification(notification, [rememberToken]);
        }
      } catch (err) {
        console.error("postInterest notification error:", err);
        // Interest registered, but notification failed
        return res.status(200).json({
          status: true,
          message:
            "User interest registered successfully, but failed to send notification.",
        });
      }
    }

    return res.status(200).json({
      status: true,
      message: "You have successfully applied for the post.",
    });
  } catch (e) {
    console.error("postInterest error:", e);
    return res.status(500).json({
      status: false,
      message: "Failed to register user interest",
    });
  }
};

/**
 * POST /api/post/postReportRequest
 * Laravel: postReportRequest
 */
export const postReportRequest = async (req: Request, res: Response) => {
  try {
    const { post_id, user_id, description } = req.body as {
      post_id?: number | string;
      user_id?: number | string;
      description?: string;
    };

    // Validation like $request->validate
    const missing: string[] = [];
    if (!post_id) missing.push("post_id");
    if (!user_id) missing.push("user_id");
    if (!description) missing.push("description");

    if (missing.length) {
      return res.status(422).json({
        status: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    const postIdNum = Number(post_id);
    const userIdNum = Number(user_id);

    if (Number.isNaN(postIdNum) || Number.isNaN(userIdNum)) {
      return res.status(422).json({
        status: false,
        message: "post_id and user_id must be numeric",
      });
    }

    const validUser = await User.findOne({
      where: { id: userIdNum, is_insta_verified: "1" },
    });

    if (!validUser) {
      return res.status(200).json({
        status: true,
        message: "Please verify your account to report the post",
      });
    }

    const existingReport = await PostReport.findOne({
      where: { post_id: postIdNum, user_id: userIdNum },
    });

    if (existingReport) {
      return res.status(200).json({
        status: true,
        message: "You already reported this post",
      });
    }

    const postReport = await PostReport.create({
      post_id: postIdNum,
      user_id: userIdNum,
      description,
    });

    if (postReport) {
      return res.status(201).json({
        status: true,
        message: "Post reported successfully",
      });
    } else {
      return res.status(500).json({
        status: false,
        message: "Failed to report post",
      });
    }
  } catch (e) {
    console.error("postReportRequest error:", e);
    return res.status(500).json({
      status: false,
      message: "Failed to report post",
    });
  }
};
