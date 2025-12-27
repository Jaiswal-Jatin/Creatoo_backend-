// src/services/walletTransaction.service.ts
import WalletTransaction from "../models/WalletTransaction";
import User from "../models/User";
import { FindOptions } from "sequelize";

class WalletTransactionService {
  async findById(id: number) {
    return WalletTransaction.findByPk(id, {
      include: [{ model: User, as: "user" }],
    });
  }

  async fetchRecord(options: FindOptions = {}) {
    return WalletTransaction.findAll({
      include: [{ model: User, as: "user" }],
      ...options,
    });
  }

  async fetch(userId: number) {
    return WalletTransaction.findOne({
      where: { user_id: userId },
      include: [{ model: User, as: "user" }],
    });
  }
}

export default new WalletTransactionService();
