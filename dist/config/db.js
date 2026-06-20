"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Legacy Database Configuration (Deprecated - Use database.ts instead)
 * Used By: Legacy Code Only
 * API Connected: N/A (Database Layer)
 * Database Model: All Models
 * Critical: No (Being replaced by database.ts)
 * Notes: This file is kept for backward compatibility. Use database.ts for new code.
 */
const database_1 = __importDefault(require("./database"));
// Export the Sequelize instance from the new database manager
exports.default = database_1.default.getSequelize();
