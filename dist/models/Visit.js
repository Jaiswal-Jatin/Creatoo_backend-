"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Visit.ts
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class Visit extends sequelize_1.Model {
}
Visit.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    card_number: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    business_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    tier: {
        type: sequelize_1.DataTypes.ENUM("new", "core", "elite", "premium"),
        allowNull: false,
        defaultValue: "new",
    },
    time: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: db_1.default,
    tableName: "visits",
    timestamps: false,
});
exports.default = Visit;
