"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Database Configuration using Sequelize ORM.
 * Used By: Backend System
 * API Connected: N/A
 * Database Model: N/A (Initializes connection to MySQL)
 * Critical: Yes
 * Notes: Uses MySQL dialect and underscores for field names.
 */
const sequelize_1 = require("sequelize");
const env_1 = __importDefault(require("../config/env"));
const sequelize = new sequelize_1.Sequelize(env_1.default.DB_NAME, env_1.default.DB_USER, env_1.default.DB_PASS, {
    host: env_1.default.DB_HOST,
    port: env_1.default.DB_PORT,
    dialect: 'mysql',
    logging: false,
    define: { underscored: true, freezeTableName: false },
});
exports.default = sequelize;
