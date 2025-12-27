// src/services/PostService.ts
import { Op } from "sequelize";
import Post, { Creation } from "../models/Post";

export interface CreatePostDTO {
  user_id: number;
  name: string;
  description: string;
  budget: number;
  duration: number;
  deliverable: string;
  followers_required: number;
  work_mode: number;          // TINYINT in model
  creator_required: number;
  per_creator_amount: number;

  transaction_d?: string | null;
  total_amount: number;
  status?: string;             // "0" | "1" | "2" | "3" | "4"
  is_reported?: string | null; // "0" | "1" | "2"
  is_active?: number;          // 0 | 1
  order_id?: string | null;
  counts?: number | null;

  post_status: string;         // "0" | "1" | "2" | "3" | "4"
  payment_status?: string;     // "0" | "1" | "2"  (OPTIONAL now)
  payment_status_response?: string | null;
  post_expiry_date?: string | null;
}

export type EditPostDTO = Partial<CreatePostDTO>;

export default class PostService {
  findById(id: number) {
    return Post.findByPk(id);
  }

  /**
   * Create a new post
   */
  async create(data: CreatePostDTO) {
    const payload: Creation = {
      user_id: data.user_id,
      name: data.name,
      description: data.description,
      budget: data.budget,
      duration: data.duration,
      deliverable: data.deliverable,
      followers_required: data.followers_required,
      work_mode: data.work_mode,
      creator_required: data.creator_required,
      per_creator_amount: data.per_creator_amount,

      transaction_d: data.transaction_d ?? null,
      total_amount: data.total_amount,
      status: data.status ?? "0",
      is_reported: data.is_reported ?? "0",
      is_active: data.is_active ?? 0,
      order_id: data.order_id ?? null,
      counts: data.counts ?? null,

      post_status: data.post_status,
      payment_status: data.payment_status ?? "0", // ✅ default to "0"
      payment_status_response: data.payment_status_response ?? null,
      post_expiry_date: data.post_expiry_date ?? null,
    };

    return Post.create(payload);
  }

  /**
   * Fetch posts with optional date filter (inclusive)
   */
  async fetchRecord(opts?: { from_date?: string; to_date?: string }) {
    const where: any = {};

    if (opts?.from_date && opts?.to_date) {
      const from = new Date(opts.from_date);
      const to = new Date(opts.to_date);
      to.setHours(23, 59, 59, 999);

      where.createdAt = {
        [Op.between]: [from, to],
      };
    }

    return Post.findAll({
      where,
      order: [["id", "DESC"]],
    });
  }

  /**
   * Edit an existing post
   */
  async editPost(id: number, updateData: EditPostDTO) {
    const post = await Post.findByPk(id);
    if (!post) return null;

    Object.assign(post, updateData);

    await post.save();
    return post;
  }

  /**
   * Delete a post
   */
  async delete(id: number) {
    const rec = await Post.findByPk(id);
    if (!rec) return null;

    await rec.destroy();
    return rec;
  }

  /**
   * Change active status (0 = inactive, 1 = active)
   */
  changeStatus(id: number, status: number) {
    const isActive = status === 1 ? 1 : 0; // number, not boolean

    return Post.update(
      { is_active: isActive },
      {
        where: { id },
      }
    );
  }
}
