"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class Setting extends sequelize_1.Model {
}
Setting.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    cgst_percent: sequelize_1.DataTypes.FLOAT,
    sgst_percent: sequelize_1.DataTypes.FLOAT,
    igst_percent: sequelize_1.DataTypes.FLOAT,
    platform_fee_percent: sequelize_1.DataTypes.FLOAT,
    gateway_charges: sequelize_1.DataTypes.FLOAT,
    reverse_gateway_charges: sequelize_1.DataTypes.FLOAT,
    creatoo_points: sequelize_1.DataTypes.FLOAT,
    advance_platform_fee: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        defaultValue: 10.00,
    },
    advance_gst_percent: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        defaultValue: 18.00,
    },
}, {
    sequelize: db_1.default,
    tableName: 'settings',
});
exports.default = Setting;
