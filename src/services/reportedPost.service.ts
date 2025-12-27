// src/services/reportedPost.service.ts
import { FindOptions } from "sequelize";
import Post from "../models/Post";

class ReportedPostService {
  async findById(id: number) {
    return Post.findByPk(id);
  }

  async fetchRecord(options: FindOptions = {}) {
    // like where('is_reported', '1')->get();
    return Post.findAll({
      where: { is_reported: 1 }, // or "1" depending on your schema
      ...options,
    });
  }
}

export default new ReportedPostService();
