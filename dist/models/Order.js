"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
const User_1 = __importDefault(require("./User")); // users table
const Business_1 = __importDefault(require("./Business"));
// --------------------
// Model
// --------------------
class Order extends sequelize_1.Model {
}
// --------------------
// Init
// --------------------
Order.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    referrer_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    business_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    order_id: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    original_bill_amount: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    discounted_bill: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    discount_percentage: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: true },
    loyalty_points_used_discount_amount: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    platform_fee: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    gateway_charges: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    reverse_gateway_charges: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    settlement_amount: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    final_bill_amount: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    loyalty_points_earned: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    transaction_response: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    expiry_date: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    review_status: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    status: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE },
    updated_at: { type: sequelize_1.DataTypes.DATE },
}, {
    sequelize: db_1.default,
    tableName: "orders",
    timestamps: true,
    underscored: true,
});
// ----------------------------
// 🔗 Relations (Correct)
// ----------------------------
// Customer (creator)
Order.belongsTo(User_1.default, {
    foreignKey: "user_id",
    as: "creator",
});
// Referrer
Order.belongsTo(User_1.default, {
    foreignKey: "referrer_id",
    as: "referrer",
});
// Business
Order.belongsTo(Business_1.default, {
    foreignKey: "business_id",
    as: "business",
});
exports.default = Order;
