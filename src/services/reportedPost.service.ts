/**
 * Module: Backend (API Server)
 * File Purpose: Reported Post Service. DAO for retrieving posts flagged as inappropriate.
 * Used By: ReportedPostController
 * Database Model: Post
 * Critical: No
 */
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
