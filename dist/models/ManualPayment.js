"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class ManualPayment extends sequelize_1.Model {
}
ManualPayment.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    business_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    bill_amount: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: false },
    points_redeemed: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    points_value: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    final_amount: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: false },
    discount_percentage: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: true },
    discount_amount: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    status: {
        type: sequelize_1.DataTypes.ENUM("PENDING", "CONFIRMED", "CANCELLED"),
        defaultValue: "PENDING",
    },
    payment_method: { type: sequelize_1.DataTypes.STRING, allowNull: false, defaultValue: "MANUAL" },
    paid_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    confirmed_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    updated_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
}, {
    sequelize: db_1.default,
    tableName: "manual_payments",
    timestamps: true,
    underscored: true,
});
const User_1 = __importDefault(require("./User"));
const Business_1 = __importDefault(require("./Business"));
ManualPayment.belongsTo(User_1.default, { foreignKey: "user_id", as: "user" });
ManualPayment.belongsTo(Business_1.default, { foreignKey: "business_id", as: "business" });
exports.default = ManualPayment;
