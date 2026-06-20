"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Enhanced Database Connection Manager with logging and connection pooling
 * Used By: Backend System
 * API Connected: N/A (Database Layer)
 * Database Model: All Models
 * Critical: Yes
 * Notes: Manages MySQL connection with proper error handling, logging, and connection pooling
 */
const sequelize_1 = require("sequelize");
const env_1 = __importDefault(require("./env"));
class DatabaseManager {
    constructor() {
        this.isConnected = false;
        this.sequelize = new sequelize_1.Sequelize(env_1.default.DB_NAME, env_1.default.DB_USER, env_1.default.DB_PASS, {
            host: env_1.default.DB_HOST,
            port: env_1.default.DB_PORT,
            dialect: 'mysql',
            logging: false,
            timezone: '+05:30',
            dialectOptions: {
                dateStrings: true,
                typeCast: true,
                timezone: '+05:30'
            },
            define: {
                underscored: true,
                timestamps: true,
                charset: 'utf8mb4',
                collate: 'utf8mb4_unicode_ci'
            },
            pool: {
                max: 10,
                min: 0,
                acquire: 30000,
                idle: 10000
            },
            retry: {
                max: 3,
                timeout: 5000
            }
        });
    }
    /**
     * Authenticate database connection
     */
    async authenticate() {
        try {
            await this.sequelize.authenticate();
            this.isConnected = true;
            console.log('✅ Database connection established successfully');
            return { success: true, message: 'Connection established' };
        }
        catch (error) {
            this.isConnected = false;
            console.error('❌ Unable to connect to database:', error);
            return { success: false, message: `Connection failed: ${error}` };
        }
    }
    /**
     * Get Sequelize instance
     */
    getSequelize() {
        return this.sequelize;
    }
    /**
     * Check if database is connected
     */
    isDbConnected() {
        return this.isConnected;
    }
    /**
     * Close database connection
     */
    async close() {
        try {
            await this.sequelize.close();
            this.isConnected = false;
            console.log('🔒 Database connection closed');
        }
        catch (error) {
            console.error('❌ Error closing database connection:', error);
        }
    }
    /**
     * Get database connection info
     */
    getConnectionInfo() {
        return {
            host: env_1.default.DB_HOST,
            database: env_1.default.DB_NAME,
            port: env_1.default.DB_PORT,
            connected: this.isConnected
        };
    }
}
// Create singleton instance
const databaseManager = new DatabaseManager();
exports.default = databaseManager;
