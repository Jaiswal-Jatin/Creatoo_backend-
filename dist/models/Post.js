"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Post.ts
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class Post extends sequelize_1.Model {
}
Post.init({
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    description: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    budget: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    duration: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    deliverable: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    followers_required: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    work_mode: { type: sequelize_1.DataTypes.TINYINT, allowNull: false },
    creator_required: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    per_creator_amount: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    transaction_d: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    total_amount: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    status: {
        type: sequelize_1.DataTypes.ENUM("0", "1", "2", "3", "4"),
        allowNull: false,
        defaultValue: "0",
    },
    is_reported: {
        type: sequelize_1.DataTypes.ENUM("0", "1", "2"),
        allowNull: true,
        defaultValue: "0",
    },
    is_active: {
        type: sequelize_1.DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
    },
    order_id: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    counts: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    post_status: {
        type: sequelize_1.DataTypes.ENUM("0", "1", "2", "3", "4"),
        allowNull: false,
        defaultValue: "0",
    },
    payment_status: {
        type: sequelize_1.DataTypes.ENUM("0", "1", "2"),
        allowNull: false,
        defaultValue: "0",
    },
    payment_status_response: { type: sequelize_1.DataTypes.STRING(10000), allowNull: true },
    post_expiry_date: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    createdAt: { type: sequelize_1.DataTypes.DATE, field: "created_at" },
    updatedAt: { type: sequelize_1.DataTypes.DATE, field: "updated_at" },
}, {
    sequelize: db_1.default,
    tableName: "posts",
    timestamps: true,
    underscored: true,
});
exports.default = Post;
