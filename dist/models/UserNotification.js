"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/UserNotification.ts
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class UserNotification extends sequelize_1.Model {
}
UserNotification.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: false,
    },
}, {
    sequelize: db_1.default,
    tableName: "user_notifications",
    modelName: "UserNotification",
});
exports.default = UserNotification;
