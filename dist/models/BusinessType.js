"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessType = void 0;
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class BusinessType extends sequelize_1.Model {
}
exports.BusinessType = BusinessType;
BusinessType.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    title: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    image: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
    sequelize: db_1.default,
    tableName: 'business_types',
    timestamps: true,
});
exports.default = BusinessType;
