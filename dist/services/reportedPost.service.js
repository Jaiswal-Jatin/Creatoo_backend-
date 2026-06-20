"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Post_1 = __importDefault(require("../models/Post"));
class ReportedPostService {
    async findById(id) {
        return Post_1.default.findByPk(id);
    }
    async fetchRecord(options = {}) {
        // like where('is_reported', '1')->get();
        return Post_1.default.findAll({
            where: { is_reported: 1 }, // or "1" depending on your schema
            ...options,
        });
    }
}
exports.default = new ReportedPostService();
