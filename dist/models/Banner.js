"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Banner = void 0;
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class Banner extends sequelize_1.Model {
}
exports.Banner = Banner;
Banner.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    image: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    link: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { sequelize: db_1.default, tableName: "banners", timestamps: true });
exports.default = Banner;
