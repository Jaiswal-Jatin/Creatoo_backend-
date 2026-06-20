"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class Review extends sequelize_1.Model {
}
Review.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    business_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    experience: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    expectation: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    recommend: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    fair_money: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    interaction: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    review_text: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    order_id: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    updated_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
}, {
    sequelize: db_1.default,
    tableName: "reviews",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
});
exports.default = Review;
