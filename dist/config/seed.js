"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Database Seed Data System for default values
 * Used By: Backend System (Server Startup)
 * API Connected: N/A (Database Layer)
 * Database Model: All Models
 * Critical: Yes
 * Notes: Handles insertion of default/seed data without duplicates
 */
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("./database"));
class SeedManager {
    constructor() {
        this.sequelize = database_1.default.getSequelize();
        this.changes = [];
    }
    /**
     * Run all seed data operations
     */
    async runSeeds() {
        try {
            console.log('🌱 Starting seed data operations...');
            this.changes = [];
            // Check database connection
            if (!database_1.default.isDbConnected()) {
                const authResult = await database_1.default.authenticate();
                if (!authResult.success) {
                    return {
                        success: false,
                        message: 'Database connection failed',
                        changes: []
                    };
                }
            }
            // Import all models
            await this.importAllModels();
            // Run seed operations
            await this.seedSettings();
            await this.seedBusinessTypes();
            await this.seedDefaultPlans();
            await this.seedTurfOptions();
            console.log(`✅ Seed operations completed. ${this.changes.length} changes made.`);
            return {
                success: true,
                message: 'Seed operations completed successfully',
                changes: [...this.changes]
            };
        }
        catch (error) {
            console.error('❌ Seed operations failed:', error);
            return {
                success: false,
                message: `Seed operations failed: ${error}`,
                changes: [...this.changes]
            };
        }
    }
    /**
     * Import all models to ensure they are registered with Sequelize
     */
    async importAllModels() {
        try {
            await Promise.resolve().then(() => __importStar(require('../models')));
            console.log('📦 All models imported for seeding');
        }
        catch (error) {
            console.error('❌ Failed to import models for seeding:', error);
            throw error;
        }
    }
    /**
     * Seed default settings
     */
    async seedSettings() {
        try {
            // Check if settings table exists and has data
            const tableExists = await this.checkTableExists('settings');
            if (!tableExists) {
                console.log('⚠️  Settings table does not exist, skipping settings seed');
                return;
            }
            const existingCount = await this.sequelize.query('SELECT COUNT(*) as count FROM settings', { type: sequelize_1.QueryTypes.SELECT });
            const count = existingCount[0]?.count || 0;
            if (count === 0) {
                await this.sequelize.query(`
          INSERT INTO settings (cgst_percent, sgst_percent, igst_percent, platform_fee_percent, gateway_charges, reverse_gateway_charges, creatoo_points, advance_platform_fee, advance_gst_percent, created_at, updated_at)
          VALUES (9.0, 9.0, 18.0, 2.0, 2.0, 2.0, 1.0, 10.0, 18.0, NOW(), NOW())
        `);
                this.changes.push('🌱 Default settings created');
                console.log('🌱 Default settings created');
            }
            else {
                console.log('📋 Settings already exist, skipping');
            }
        }
        catch (error) {
            console.error('❌ Failed to seed settings:', error);
            throw error;
        }
    }
    /**
     * Seed default business types
     */
    async seedBusinessTypes() {
        try {
            const tableExists = await this.checkTableExists('business_types');
            if (!tableExists) {
                console.log('⚠️  Business types table does not exist, skipping business types seed');
                return;
            }
            const existingCount = await this.sequelize.query('SELECT COUNT(*) as count FROM business_types', { type: sequelize_1.QueryTypes.SELECT });
            const count = existingCount[0]?.count || 0;
            if (count === 0) {
                const defaultTypes = [
                    'Restaurant',
                    'Retail Shop',
                    'Service Provider',
                    'Professional',
                    'Manufacturing',
                    'E-commerce',
                    'Education',
                    'Healthcare',
                    'Entertainment',
                    'Other'
                ];
                for (const type of defaultTypes) {
                    await this.sequelize.query(`
            INSERT INTO business_types (name, created_at, updated_at)
            VALUES (:name, NOW(), NOW())
          `, {
                        replacements: { name: type }
                    });
                }
                this.changes.push(`🌱 ${defaultTypes.length} default business types created`);
                console.log(`🌱 ${defaultTypes.length} default business types created`);
            }
            else {
                console.log('📋 Business types already exist, skipping');
            }
        }
        catch (error) {
            console.error('❌ Failed to seed business types:', error);
            throw error;
        }
    }
    /**
     * Seed default plans
     */
    async seedDefaultPlans() {
        try {
            const tableExists = await this.checkTableExists('plans');
            if (!tableExists) {
                console.log('⚠️  Plans table does not exist, skipping plans seed');
                return;
            }
            const existingCount = await this.sequelize.query('SELECT COUNT(*) as count FROM plans', { type: sequelize_1.QueryTypes.SELECT });
            const count = existingCount[0]?.count || 0;
            if (count === 0) {
                const defaultPlans = [
                    {
                        name: 'Basic',
                        price: 0,
                        duration_days: 30,
                        features: JSON.stringify({
                            max_cards: 1,
                            max_visits_per_month: 50,
                            analytics: false,
                            custom_branding: false,
                            priority_support: false
                        }),
                        is_active: true
                    },
                    {
                        name: 'Professional',
                        price: 299,
                        duration_days: 30,
                        features: JSON.stringify({
                            max_cards: 5,
                            max_visits_per_month: 500,
                            analytics: true,
                            custom_branding: true,
                            priority_support: false
                        }),
                        is_active: true
                    },
                    {
                        name: 'Enterprise',
                        price: 999,
                        duration_days: 30,
                        features: JSON.stringify({
                            max_cards: -1, // Unlimited
                            max_visits_per_month: -1, // Unlimited
                            analytics: true,
                            custom_branding: true,
                            priority_support: true,
                            api_access: true,
                            custom_integrations: true
                        }),
                        is_active: true
                    }
                ];
                for (const plan of defaultPlans) {
                    await this.sequelize.query(`
            INSERT INTO plans (name, price, duration_days, features, is_active, created_at, updated_at)
            VALUES (:name, :price, :duration_days, :features, :is_active, NOW(), NOW())
          `, {
                        replacements: plan
                    });
                }
                this.changes.push(`🌱 ${defaultPlans.length} default plans created`);
                console.log(`🌱 ${defaultPlans.length} default plans created`);
            }
            else {
                console.log('📋 Plans already exist, skipping');
            }
        }
        catch (error) {
            console.error('❌ Failed to seed plans:', error);
            throw error;
        }
    }
    async seedTurfOptions() {
        try {
            const tableExists = await this.checkTableExists('turf_options');
            if (!tableExists) {
                console.log('⚠️  Turf options table does not exist, skipping turf options seed');
                return;
            }
            const options = [
                // Court sizes
                { type: 'court_size', value: '5v5', sort_order: 1 },
                { type: 'court_size', value: '7v7', sort_order: 2 },
                { type: 'court_size', value: '9v9', sort_order: 3 },
                { type: 'court_size', value: '11v11', sort_order: 4 },
                // Ground types
                { type: 'ground_type', value: 'Artificial Grass', sort_order: 1 },
                { type: 'ground_type', value: 'Natural Grass', sort_order: 2 },
                { type: 'ground_type', value: 'Clay Court', sort_order: 3 },
                { type: 'ground_type', value: 'Wooden Floor', sort_order: 4 },
                // Sports
                { type: 'sport', value: 'Football', sort_order: 1 },
                { type: 'sport', value: 'Cricket', sort_order: 2 },
                { type: 'sport', value: 'Badminton', sort_order: 3 },
                { type: 'sport', value: 'Tennis', sort_order: 4 },
                { type: 'sport', value: 'Basketball', sort_order: 5 },
                { type: 'sport', value: 'Volleyball', sort_order: 6 },
                // Amenities
                { type: 'amenity', value: 'Parking', sort_order: 1 },
                { type: 'amenity', value: 'Changing Rooms', sort_order: 2 },
                { type: 'amenity', value: 'Floodlights', sort_order: 3 },
                { type: 'amenity', value: 'Water', sort_order: 4 },
                { type: 'amenity', value: 'Cafeteria', sort_order: 5 },
                { type: 'amenity', value: 'Equipment Rental', sort_order: 6 },
            ];
            let addedCount = 0;
            for (const opt of options) {
                const exists = await this.recordExists('turf_options', 'type = :type AND value = :value', {
                    type: opt.type,
                    value: opt.value
                });
                if (!exists) {
                    await this.sequelize.query(`
            INSERT INTO turf_options (type, value, sort_order, created_at, updated_at)
            VALUES (:type, :value, :sort_order, NOW(), NOW())
          `, { replacements: opt });
                    addedCount++;
                }
            }
            if (addedCount > 0) {
                this.changes.push(`🌱 ${addedCount} turf options created`);
                console.log(`🌱 ${addedCount} turf options created`);
            }
            else {
                console.log('📋 Turf options already exist, skipping');
            }
        }
        catch (error) {
            console.error('❌ Failed to seed turf options:', error);
            throw error;
        }
    }
    /**
     * Check if a table exists
     */
    async checkTableExists(tableName) {
        try {
            const result = await this.sequelize.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = :tableName
      `, {
                replacements: { tableName },
                type: sequelize_1.QueryTypes.SELECT
            });
            const count = result[0]?.count || 0;
            return count > 0;
        }
        catch (error) {
            console.error(`❌ Failed to check if table ${tableName} exists:`, error);
            return false;
        }
    }
    /**
     * Check if a record exists in a table
     */
    async recordExists(tableName, condition, replacements) {
        try {
            const result = await this.sequelize.query(`
        SELECT COUNT(*) as count FROM ${tableName} WHERE ${condition}
      `, {
                replacements,
                type: sequelize_1.QueryTypes.SELECT
            });
            const count = result[0]?.count || 0;
            return count > 0;
        }
        catch (error) {
            console.error(`❌ Failed to check if record exists in ${tableName}:`, error);
            return false;
        }
    }
    /**
     * Get seed summary
     */
    getSeedSummary() {
        return {
            totalChanges: this.changes.length,
            changes: [...this.changes]
        };
    }
}
// Create singleton instance
const seedManager = new SeedManager();
exports.default = seedManager;
