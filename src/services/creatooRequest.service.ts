// src/services/creatooRequest.service.ts
import { FindOptions, Op } from "sequelize";
import CreatooRequest from "../models/CreatooRequest";
import User from "../models/User";

class CreatooRequestService {
  async fetchRecord(options: FindOptions = {}) {
    return CreatooRequest.findAll({
      where: {
        // status: 0,1,2  → now stored as strings '0','1','2'
        status: { [Op.in]: ["0", "1", "2"] },
      },
      include: [
        { model: User, as: "creator" },
        { model: User, as: "business" },
      ],
      order: [["created_at", "DESC"]],
      ...options,
    });
  }

  async fetchRedeem(options: FindOptions = {}) {
    return CreatooRequest.findAll({
      where: {
        // redeemed → status '3'
        status: "3",
      },
      include: [
        { model: User, as: "creator" },
        { model: User, as: "business" },
      ],
      order: [["created_at", "DESC"]],
      ...options,
    });
  }

  async fetch(id: number) {
    return CreatooRequest.findByPk(id, {
      include: [
        { model: User, as: "creator" },
        { model: User, as: "business" },
      ],
    });
  }
}

export default new CreatooRequestService();
