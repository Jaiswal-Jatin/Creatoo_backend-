"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/PostInterest.ts
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class PostInterest extends sequelize_1.Model {
}
PostInterest.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    post_id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
    },
    creator_id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
    },
    is_cart: {
        type: sequelize_1.DataTypes.TINYINT,
        allowNull: true,
        defaultValue: 0,
    },
    is_shortlist: {
        type: sequelize_1.DataTypes.TINYINT,
        allowNull: true,
        defaultValue: 0,
    },
    is_payment_done: {
        type: sequelize_1.DataTypes.TINYINT,
        allowNull: true,
        defaultValue: 0,
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
    },
}, {
    sequelize: db_1.default,
    tableName: "post_interests",
    timestamps: true,
    underscored: true,
});
// NOTE: Association removed - live database has no primary key on posts.id
// PostInterest.belongsTo(User, { foreignKey: "creator_id", as: "creator" });
// PostInterest.belongsTo(Post, { foreignKey: "post_id", as: "post" });
exports.default = PostInterest;
