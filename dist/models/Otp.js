"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class Otp extends sequelize_1.Model {
}
Otp.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    mobile: { type: sequelize_1.DataTypes.STRING(15), allowNull: true },
    business_mobile: { type: sequelize_1.DataTypes.STRING(15), allowNull: true },
    otp: { type: sequelize_1.DataTypes.STRING(10), allowNull: false }, // <= plain OTP
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false, defaultValue: sequelize_1.DataTypes.NOW },
    updated_at: { type: sequelize_1.DataTypes.DATE, allowNull: false, defaultValue: sequelize_1.DataTypes.NOW },
}, { sequelize: db_1.default, tableName: 'otps', modelName: 'Otp', underscored: true, timestamps: true });
exports.default = Otp;
