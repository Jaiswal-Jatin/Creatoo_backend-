"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/CreatorPointsTransaction.ts
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class CreatorPointsTransaction extends sequelize_1.Model {
}
CreatorPointsTransaction.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    business_id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
    order_id: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
    },
    points: {
        // ⬅️ matches DB column `points`
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    expiry_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    credit_debit_remaining_status: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    business_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    total_bill: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    settlement_amount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    discount_percentage: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        allowNull: true,
    },
    final_bill: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    receipt_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    remaining_points: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    reverse_gateway_charges: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
}, {
    sequelize: db_1.default,
    tableName: "creator_points_transactions",
    timestamps: true,
    underscored: true, // uses created_at / updated_at
});
exports.default = CreatorPointsTransaction;
