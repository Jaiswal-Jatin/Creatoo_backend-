"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/CreatooRequest.ts
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
const User_1 = __importDefault(require("./User"));
const Business_1 = __importDefault(require("./Business"));
class CreatooRequest extends sequelize_1.Model {
}
CreatooRequest.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    creator_id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    business_id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    image: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
    },
    points_received: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
    },
    active_points: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
    },
    bill_amount: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: db_1.default,
    tableName: "creatoo_requests",
    timestamps: true,
    underscored: true,
});
// relations like in Laravel: creator() and business()
CreatooRequest.belongsTo(User_1.default, {
    foreignKey: "creator_id",
    as: "creator",
});
CreatooRequest.belongsTo(Business_1.default, {
    foreignKey: "business_id",
    as: "business",
});
exports.default = CreatooRequest;
