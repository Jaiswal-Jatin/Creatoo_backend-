"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class NewUserNotification extends sequelize_1.Model {
}
NewUserNotification.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    order_id: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    notification_subject: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    notification_text: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    is_redeemed: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    updated_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
}, {
    sequelize: db_1.default,
    tableName: "new_user_notifications",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
});
exports.default = NewUserNotification;
