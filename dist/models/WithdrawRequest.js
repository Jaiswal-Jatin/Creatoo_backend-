"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
const User_1 = __importDefault(require("./User"));
class WithdrawRequest extends sequelize_1.Model {
}
WithdrawRequest.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    creator_id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    amount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        get() {
            const val = this.getDataValue("amount");
            return val !== null ? Number(val) : null;
        },
    },
    status: {
        type: sequelize_1.DataTypes.TINYINT,
        allowNull: true,
        defaultValue: 0, // 0 = pending
    },
    transaction_id: {
        type: sequelize_1.DataTypes.STRING(255),
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
    tableName: "withdraw_requests",
    timestamps: true, // created_at & updated_at
    underscored: true, // created_at not createdAt
});
// ----------------------------
// RELATIONSHIP
// ----------------------------
WithdrawRequest.belongsTo(User_1.default, {
    foreignKey: "creator_id",
    as: "user",
});
exports.default = WithdrawRequest;
