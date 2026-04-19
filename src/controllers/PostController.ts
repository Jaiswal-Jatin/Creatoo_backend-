/**
 * Module: Backend (API Server)
 * File Purpose: Post Controller. Handles business post creation, management, and push notifications.
 * Used By: Admin Panel, Business Admin App
 * API Connected: /api/post/*
 * Database Model: Post, User, Setting, PostInterest
 * Critical: Yes
 * Notes: Includes tax calculation logic and Firebase push notification integration.
 */
import { Request, Response } from 'express';
import { Op, QueryTypes } from 'sequelize';
import PostService from '../services/post.service';
import User from '../models/User';
import Setting from '../models/Setting';
import Post from '../models/Post';
import sequelize from '../db/sequelize';
import { sendPushNotification } from '../services/sendPushNotification';
import PostInterest from "../models/PostInterest";

const service = new PostService();

// helper: compute total amount like PHP calculateTotalAmount
async function computeTotalAmount(budget: number, userId: number): Promise<number> {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');

  const s = await Setting.findOne();
  if (!s) throw new Error('Settings not found');

  const gst = (user as any).gst_number || '';
  const isMaharashtra = gst.endsWith('27');

  const platformFee = Number((s as any).platform_fee_percent || 0);
  let totalGst = 0;
  if (isMaharashtra) {
    const cgst = Number((s as any).cgst_percent || 0);
    const sgst = Number((s as any).sgst_percent || 0);
    totalGst = cgst + sgst;
  } else {
    totalGst = Number((s as any).igst_percent || 0);
  }
  const total = budget + (budget * (totalGst + platformFee)) / 100;
  return Number(total.toFixed(2));
}

export default {
  // GET /api/post/all
  async getAllPostService(req: Request, res: Response) {
    try {
      const { from_date, to_date } = req.query as any;
      const records = await service.fetchRecord({
        from_date,
        to_date,
      });

      // filter to role_id == 2 users only & add names (parity with PHP)
      const userIds = Array.from(new Set(records.map((r: any) => r.user_id)));
      const users = await User.findAll({ where: { id: { [Op.in]: userIds }, role_id: 2 } });
      const userMap = new Map(users.map(u => [u.id, u]));

      const filtered = records.filter((r: any) => userMap.has(r.user_id));

      const formatted = filtered.map((r: any) => {
        const u = userMap.get(r.user_id)!;
        const isActiveHtml = r.is_active
          ? `<div><span class="tb-status text-success" onclick="changeStatus(${r.id},0)" style="cursor:pointer;">Active</span></div>`
          : `<div><span class="tb-status text-danger" onclick="changeStatus(${r.id},1)" style="cursor:pointer;">Inactive</span></div>`;

        return {
          id: r.id,
          user_id: r.user_id,
          user_name: (u as any).name,
          business_fullname: (u as any).business_fullname,
          post_name: `<a href="/api/post/edit/${r.id}">${r.name}</a>`,
          budget: r.budget,
          duration: r.duration,
          post_status: r.post_status,
          is_active: isActiveHtml,
          created_at: r.createdAt,
        };
      });

      // DataTables-friendly
      return res.json({
        draw: 1,
        recordsTotal: formatted.length,
        recordsFiltered: formatted.length,
        data: formatted,
      });
    } catch (err) {
      console.error('getAllPostService error:', err);
      return res.status(500).json({ status: false, message: 'Failed to fetch posts' });
    }
  },

  // GET /api/post/add (placeholder)
  postView(_req: Request, res: Response) {
    return res.json({ message: "Render 'post.add' page in your front-end." });
  },

  // GET /api/post/edit/:id
  async getEditPost(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const data = await service.findById(id);
      if (!data) return res.status(404).json({ status: false, message: 'Post not found' });
      return res.json({ status: true, data, id });
    } catch (err) {
      console.error('getEditPost error:', err);
      return res.status(500).json({ status: false, message: 'Failed to fetch post' });
    }
  },

  // POST /api/post/add  (protected)
  async addPost(req: Request & { user?: any }, res: Response) {
    try {
      const {
        name, description, duration, deliverable, followers_required,
        work_mode, creator_required, per_creator_amount, post_status,
        post_expiry_date,
      } = req.body;

      // basic validation parity
      const required = { name, description, duration, deliverable, followers_required, work_mode, creator_required, per_creator_amount, post_status };
      const missing = Object.entries(required)
        .filter(([_, v]) => v === undefined || v === null || v === '')
        .map(([k]) => k);
      if (missing.length) {
        return res.status(422).json({
          status: false,
          message: `Missing: ${missing.join(', ')}`,
        });
      }

      const user_id = req.user?.id; // from auth middleware
      if (!user_id) return res.status(401).json({ status: false, message: 'Unauthorized' });

      const budget = Number(per_creator_amount) * Number(creator_required);
      const total_amount = await computeTotalAmount(budget, user_id);

      const created = await service.create({
        name,
        user_id,
        description,
        budget,
        duration,
        deliverable,
        followers_required: Number(followers_required),
        work_mode,
        creator_required: Number(creator_required),
        per_creator_amount: Number(per_creator_amount),
        post_status: String(post_status),
        total_amount,
        post_expiry_date: post_expiry_date ?? null,
      });

      // on publish (0 -> 1) send push
      if (String(post_status) === '1') {
        // collect tokens from users having remember_token (like PHP)
        const tokensUsers = await User.findAll({
          where: { remember_token: { [Op.ne]: null } },
          attributes: ['remember_token'],
        });
        const tokens = tokensUsers
          .map(u => u.remember_token)
          .filter(Boolean) as string[];
        if (tokens.length) {
          await sendPushNotification(
            { title: 'NEW POST', description: `A new post has been added with post: ${name}` },
            tokens
          );
        }
      }

      return res.json({ status: true, message: 'Post created successfully', data: created });
    } catch (err) {
      console.error('addPost error:', err);
      return res.status(500).json({ status: false, message: 'Failed to create post' });
    }
  },

  // POST /api/post/edit/:id
  async updatePost(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const {
        name, description, duration, deliverable, followers_required,
        work_mode, creator_required, per_creator_amount, post_status,
        transaction_d,
      } = req.body;

      const post = await service.findById(id);
      if (!post) return res.status(404).json({ status: false, message: 'Post not found' });

      const budget = Number(per_creator_amount) * Number(creator_required);
      const total_amount = await computeTotalAmount(budget, post.user_id);

      // send push if moving 0 -> 1
      if (String((post as any).post_status) === '0' && String(post_status) === '1') {
        const tokensUsers = await (User as any).findAll({
          where: { remember_token: { [Op.ne]: null } },
          attributes: ['remember_token'],
        });
        const tokens = tokensUsers
          .map((u: any) => u.remember_token)
          .filter(Boolean) as string[];
        if (tokens.length) {
          await sendPushNotification(
            { title: 'NEW POST', description: `A new post has been added with post: ${(post as any).name}` },
            tokens
          );
        }
      }

      const updated = await service.editPost(id, {
        name,
        description,
        duration,
        deliverable,
        followers_required: Number(followers_required),
        work_mode,
        creator_required: Number(creator_required),
        per_creator_amount: Number(per_creator_amount),
        post_status: String(post_status),
        transaction_d: transaction_d ?? null,
        budget,
        total_amount,
      });

      return res.json({
        status: true,
        message: 'Post details updated successfully.',
        data: updated,
      });
    } catch (err) {
      console.error('updatePost error:', err);
      return res.status(500).json({ status: false, message: 'Failed to update post' });
    }
  },

  // GET /api/post/delete/:id
  async deletePost(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const deleted = await service.delete(id);
      if (!deleted) return res.status(404).json({ status: false, message: 'Post not found' });
      return res.json({ status: true, message: 'Post details deleted successfully.' });
    } catch (err) {
      console.error('deletePost error:', err);
      return res.status(500).json({ status: false, message: 'Error while deleting post' });
    }
  },

  // POST /api/post/change-status
  async changeStatus(req: Request, res: Response) {
    try {
      const { id, status } = req.body || {};
      if (!id) return res.status(422).json({ status: false, message: 'id required' });

      const [affected] = await service.changeStatus(Number(id), Number(status));
      if (affected > 0) {
        const message =
          Number(status) === 1
            ? "Active status change successfully"
            : "Inactive status change successfully";
        return res.json({ status: 'success', message });
      }
      return res.status(404).json({ status: 'error', message: 'Record not found' });
    } catch (err) {
      console.error('changeStatus error:', err);
      return res.status(500).json({ status: 'error', message: 'Invalid Data' });
    }
  },

  // POST /api/post/myPost  (Laravel: myPost)
  async myPost(req: Request, res: Response) {
    try {
      const { user_id } = req.body as { user_id?: number | string };

      if (user_id === undefined || user_id === null || isNaN(Number(user_id))) {
        return res.status(400).json({
          status: false,
          message: 'User ID must be numeric',
          data: [],
        });
      }

      const userIdNum = Number(user_id);

      const posts = await Post.findAll({
        where: {
          user_id: userIdNum,
          is_reported: { [Op.ne]: 1 },
          payment_status: '1',
        },
        order: [['created_at', 'DESC']],
      });

      if (!posts.length) {
        return res.status(200).json({
          status: true,
          message: 'No posts found for the given user ID',
          data: [],
        });
      }

      const postIds = posts.map(p => p.id);

      // SELECT post_id, COUNT(creator_id) as post_interest_count FROM post_interests ...
      const rows = await sequelize.query(
        `
        SELECT post_id, COUNT(creator_id) AS post_interest_count
        FROM post_interests
        WHERE post_id IN (:postIds)
        GROUP BY post_id
      `,
        {
          replacements: { postIds },
          type: QueryTypes.SELECT,
        }
      ) as { post_id: number; post_interest_count: string | number }[];

      const interestMap = new Map<number, number>();
      rows.forEach(r => {
        interestMap.set(r.post_id, Number(r.post_interest_count));
      });

      const transformed = posts.map(p => {
        const plain = p.toJSON() as any;
        plain.post_interest_count = interestMap.get(p.id) ?? 0;
        return plain;
      });

      return res.status(200).json({
        status: true,
        message: 'Data found Successfully',
        data: transformed,
      });
    } catch (e: any) {
      console.error('myPost error:', e);
      return res.status(500).json({
        status: false,
        message: 'An error occurred: ' + e.message,
        data: [],
      });
    }
  },

  // POST /api/post/postPaymentStatus  (Laravel: postPaymentStatus)
async postPaymentStatus(req: Request, res: Response) {
  try {
    const {
      user_id,
      post_id,
      payment_status,
      payment_status_response,
    } = req.body as {
      user_id?: number | string;
      post_id?: number | string;
      payment_status?: string;
      payment_status_response?: string;
    };

    // ✅ Validation (same intent as $request->validate)
    const missing: string[] = [];
    if (user_id === undefined) missing.push("user_id");
    if (post_id === undefined) missing.push("post_id");
    if (!payment_status) missing.push("payment_status");
    if (!payment_status_response) missing.push("payment_status_response");

    if (missing.length) {
      return res.status(422).json({
        status: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    const userIdNum = Number(user_id);
    const postIdNum = Number(post_id);

    if (Number.isNaN(userIdNum) || Number.isNaN(postIdNum)) {
      return res.status(422).json({
        status: false,
        message: "user_id and post_id must be integers",
      });
    }

    if (
      payment_status !== "success" &&
      payment_status !== "failed"
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid payment status",
      });
    }

    // 🔎 ensure user exists
    const user = await User.findByPk(userIdNum);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // 🔎 find post belonging to that user
    const post = await Post.findOne({
      where: { id: postIdNum, user_id: userIdNum },
    });

    if (!post) {
      return res.status(404).json({
        status: false,
        message: "Post not found for this user",
      });
    }

    // 💾 Here is where your original PHP updateStatus logic would run.
    // For now, we just store the status + the response.
    await post.update({
      // make sure your Post model has these columns in DB:
      payment_status,
      payment_status_response,
    } as any);

    return res.status(200).json({
      status: true,
      message: "Payment status updated successfully",
    });
  } catch (err) {
    console.error("postPaymentStatus error:", err);
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating payment status",
    });
  }
},
// POST /api/post/getPostApplicationList
// Laravel: getPostApplicationList
async getPostApplicationList(req: Request, res: Response) {
  try {
    const { post_id } = req.body as { post_id?: number | string };

    // ✅ Validation like $request->validate
    if (post_id === undefined || post_id === null) {
      return res.status(422).json({
        status: false,
        message: "post_id is required",
      });
    }

    const postIdNum = Number(post_id);
    if (Number.isNaN(postIdNum)) {
      return res.status(422).json({
        status: false,
        message: "post_id must be a valid integer",
      });
    }

    // 🔎 Find interests for this post
    const postInterests = await PostInterest.findAll({
      where: { post_id: postIdNum },
      attributes: ["creator_id", "is_cart", "is_shortlist"],
    });

    if (!postInterests.length) {
      return res.status(200).json({
        status: true,
        message: "No creators found for the given post ID.",
      });
    }

    const creatorIds = postInterests.map((pi) => pi.creator_id);

    // 🔎 Load creator users (role_id = 3)
    const creators = await User.findAll({
      where: {
        id: creatorIds,
        role_id: 3,
      },
      attributes: [
        "id",
        "name",
        "email",
        "mobile",
        "role_id",
        "instagram_link",
        "bio",
        "email_verified_at",
        "address",
        "user_image",
        "instagram_username",
        "engagement_rate",
      ],
    });

    if (!creators.length) {
      return res.status(200).json({
        status: true,
        message: "No creators found",
      });
    }

    // Attach is_cart & is_shortlist like in Laravel
    const creatorsWithFlags = creators.map((creator) => {
      const cJson = creator.toJSON() as any;
      const pi = postInterests.find(
        (p) => p.creator_id === creator.id
      ) as any;

      return {
        ...cJson,
        is_cart: pi?.is_cart ?? 0,
        is_shortlist: pi?.is_shortlist ?? 0,
      };
    });

    return res.status(200).json({
      status: true,
      message: "Creators retrieved successfully.",
      data: creatorsWithFlags,
    });
  } catch (e: any) {
    console.error("getPostApplicationList error:", e);
    return res.status(500).json({
      status: false,
      message: "Failed to retrieve creators: " + (e?.message || "Unknown error"),
    });
  }
},

};
