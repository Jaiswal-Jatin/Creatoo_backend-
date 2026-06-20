"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/TemporaryOrder.ts
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class TemporaryOrder extends sequelize_1.Model {
}
TemporaryOrder.init({
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
        allowNull: false,
    },
    order_id: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    bill_amount: sequelize_1.DataTypes.DECIMAL(10, 2),
    original_bill_amount: sequelize_1.DataTypes.DECIMAL(10, 2),
    discounted_bill: sequelize_1.DataTypes.DECIMAL(10, 2),
    reverse_gateway_charges: sequelize_1.DataTypes.DECIMAL(10, 2),
    loyalty_points_used_discount_amount: sequelize_1.DataTypes.DECIMAL(10, 2),
    platform_fee: sequelize_1.DataTypes.DECIMAL(10, 2),
    settlement_amount: sequelize_1.DataTypes.DECIMAL(10, 2),
    gateway_charges: sequelize_1.DataTypes.DECIMAL(10, 2),
    discount_percentage: sequelize_1.DataTypes.DECIMAL(10, 2),
    gst_on_gateway_charges: sequelize_1.DataTypes.DECIMAL(10, 2),
    final_bill_amount: sequelize_1.DataTypes.DECIMAL(10, 2),
    loyalty_points_will_earn: sequelize_1.DataTypes.INTEGER,
    expiry_date: sequelize_1.DataTypes.DATE,
    referrer_id: sequelize_1.DataTypes.INTEGER,
    review_status: sequelize_1.DataTypes.STRING,
    status: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        defaultValue: "Pending",
    },
    created_at: sequelize_1.DataTypes.DATE,
    updated_at: sequelize_1.DataTypes.DATE,
}, {
    sequelize: db_1.default,
    tableName: "temporary_orders",
    modelName: "TemporaryOrder",
    timestamps: false, // if you use created_at/updated_at manually
    underscored: true, // because DB uses created_at, not createdAt
});
exports.default = TemporaryOrder;
