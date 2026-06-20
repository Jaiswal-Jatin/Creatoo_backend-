"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Admin Service for direct database interactions with 'admins' table.
 * Used By: AdminController, adminOnly Middleware
 * API Connected: N/A
 * Database Model: admins table (Raw SQL)
 * Critical: Yes
 * Notes: Uses raw SQL queries instead of Sequelize models for Admin management.
 */
const sequelize_1 = __importDefault(require("../db/sequelize"));
const sequelize_2 = require("sequelize");
class AdminService {
    /**
     * Function: findByEmail()
     * Description: Finds an admin by their email address.
     * Params: email (string)
     * Returns: Admin object or null
     */
    async findByEmail(email) {
        const rows = (await sequelize_1.default.query('SELECT * FROM admins WHERE email = ? LIMIT 1', {
            type: sequelize_2.QueryTypes.SELECT,
            replacements: [email],
        }));
        return rows[0] || null;
    }
    /**
     * Function: findById()
     * Description: Finds an admin by their numeric ID.
     * Params: id (number)
     * Returns: Admin object or null
     */
    async findById(id) {
        const rows = (await sequelize_1.default.query('SELECT * FROM admins WHERE id = ? LIMIT 1', {
            type: sequelize_2.QueryTypes.SELECT,
            replacements: [id],
        }));
        return rows[0] || null;
    }
    /**
     * Function: updatePassword()
     * Description: Updates the hashed password for an admin.
     * Params: id (number), hashedPassword (string)
     * Returns: void
     */
    async updatePassword(id, hashedPassword) {
        await sequelize_1.default.query('UPDATE admins SET password = ?, updated_at = NOW() WHERE id = ?', {
            type: sequelize_2.QueryTypes.UPDATE,
            replacements: [hashedPassword, id],
        });
    }
    /**
     * Function: create()
     * Description: Creates a new admin record.
     * Params: name, email, hashedPassword
     * Returns: The newly created Admin object
     * Used: For seeding or initial setup
     */
    async create(name, email, hashedPassword) {
        const result = await sequelize_1.default.query('INSERT INTO admins (name, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())', {
            type: sequelize_2.QueryTypes.INSERT,
            replacements: [name, email, hashedPassword],
        });
        // MySQL: result[0] is insertId
        const insertId = result[0];
        const admin = await this.findById(insertId);
        if (!admin)
            throw new Error('Failed to create admin');
        return admin;
    }
}
exports.default = AdminService;
