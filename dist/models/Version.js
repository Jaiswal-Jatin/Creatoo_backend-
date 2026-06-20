"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Version.ts
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class Version extends sequelize_1.Model {
}
Version.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    version: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    message: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // active by default
    },
}, {
    sequelize: db_1.default,
    tableName: "versions",
    timestamps: false,
});
exports.default = Version;
