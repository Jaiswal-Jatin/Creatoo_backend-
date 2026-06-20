"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Unified Database Initialization System (Connection + Migration + Seed)
 * Used By: Backend System (Server Startup)
 * API Connected: N/A (Database Layer)
 * Database Model: All Models
 * Critical: Yes
 * Notes: Orchestrates database connection, migrations, and seeding in the correct order
 */
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("./database"));
const migration_1 = __importDefault(require("./migration"));
const seed_1 = __importDefault(require("./seed"));
class DatabaseInitializer {
    /**
     * Initialize complete database system
     */
    async initialize() {
        const startTime = Date.now();
        console.log('🚀 Starting database initialization...');
        try {
            // Step 1: Connect to database
            console.log('📡 Step 1: Connecting to database...');
            const connectionResult = await database_1.default.authenticate();
            if (!connectionResult.success) {
                console.error('❌ CRITICAL: Database connection failed!');
                console.error('❌ Server cannot start without database connection');
                return {
                    success: false,
                    message: `Database connection failed: ${connectionResult.message}`
                };
            }
            // Step 2: Run migrations
            console.log('🔄 Step 2: Running database migrations...');
            const migrationResult = await migration_1.default.runMigrations();
            if (!migrationResult.success) {
                console.error('❌ CRITICAL: Migration failed!');
                console.error('❌ Database schema is incomplete - server cannot start');
                return {
                    success: false,
                    message: `Migration failed: ${migrationResult.message}`,
                    connectionInfo: database_1.default.getConnectionInfo()
                };
            }
            // Step 2.5: Fix column lengths if necessary (prevent VARCHAR 255 length exceptions)
            console.log('🔧 Step 2.5: Adjusting category_attributes column type if necessary...');
            try {
                await database_1.default.getSequelize().query('ALTER TABLE businesses MODIFY COLUMN category_attributes JSON NULL');
                console.log('✅ category_attributes column verified/modified to JSON successfully.');
            }
            catch (colError) {
                console.warn('⚠️  Failed to alter category_attributes to JSON, attempting TEXT fallback:', colError);
                try {
                    await database_1.default.getSequelize().query('ALTER TABLE businesses MODIFY COLUMN category_attributes TEXT NULL');
                    console.log('✅ category_attributes column verified/modified to TEXT fallback successfully.');
                }
                catch (textColError) {
                    console.error('❌ Failed to modify category_attributes column:', textColError);
                }
            }
            // Step 3: Validate migration was successful
            if (migrationResult.changes.length === 0) {
                console.log('✅ No schema changes needed - database is up to date');
            }
            else {
                console.log(`✅ Schema updated: ${migrationResult.changes.length} changes applied`);
            }
            // Step 4: Run seed data
            console.log('🌱 Step 3: Running seed data operations...');
            const seedResult = await seed_1.default.runSeeds();
            if (!seedResult.success) {
                console.warn(`⚠️  Seed operations failed (non-critical): ${seedResult.message}`);
                console.log('⚠️  Server will continue but some default data may be missing');
            }
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            const totalChanges = (migrationResult.changes?.length || 0) + (seedResult.changes?.length || 0);
            console.log(`✅ Database initialization completed in ${duration}s`);
            console.log(`📊 Total changes: ${totalChanges}`);
            // Final validation
            const finalValidation = await this.performFinalValidation();
            if (!finalValidation.success) {
                console.error('❌ CRITICAL: Final database validation failed!');
                return {
                    success: false,
                    message: `Final validation failed: ${finalValidation.message}`
                };
            }
            return {
                success: true,
                message: `Database initialized successfully in ${duration}s`,
                connectionInfo: database_1.default.getConnectionInfo(),
                migrationChanges: migrationResult.changes || [],
                seedChanges: seedResult.changes || [],
                totalChanges
            };
        }
        catch (error) {
            console.error('❌ Database initialization failed:', error);
            return {
                success: false,
                message: `Database initialization failed: ${error}`
            };
        }
    }
    /**
     * Get initialization status
     */
    getStatus() {
        return {
            connected: database_1.default.isDbConnected(),
            connectionInfo: database_1.default.getConnectionInfo(),
            migrationSummary: migration_1.default.getMigrationSummary(),
            seedSummary: seed_1.default.getSeedSummary()
        };
    }
    /**
     * Close database connection
     */
    async close() {
        await database_1.default.close();
    }
    /**
     * Get detailed initialization report
     */
    getDetailedReport() {
        const status = this.getStatus();
        const report = `
📊 Database Initialization Report
================================
Connection Status: ${status.connected ? '✅ Connected' : '❌ Disconnected'}
Database: ${status.connectionInfo.database}
Host: ${status.connectionInfo.host}
Port: ${status.connectionInfo.port}

Migration Summary:
- Total Changes: ${status.migrationSummary.totalChanges}
- Changes: ${status.migrationSummary.changes.length > 0 ? status.migrationSummary.changes.join(', ') : 'None'}

Seed Summary:
- Total Changes: ${status.seedSummary.totalChanges}
- Changes: ${status.seedSummary.changes.length > 0 ? status.seedSummary.changes.join(', ') : 'None'}
    `.trim();
        return report;
    }
    /**
     * Perform final validation of database state
     */
    async performFinalValidation() {
        try {
            // Check if we can execute a simple query
            await database_1.default.getSequelize().query('SELECT 1+1 as test', {
                type: sequelize_1.QueryTypes.SELECT
            });
            // Check critical tables
            const criticalTables = ['users', 'settings'];
            for (const tableName of criticalTables) {
                const [results] = await database_1.default.getSequelize().query(`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${tableName}'`, { type: sequelize_1.QueryTypes.SELECT });
                if (results.count === 0) {
                    return {
                        success: false,
                        message: `Critical table '${tableName}' is missing`
                    };
                }
            }
            return {
                success: true,
                message: 'Final validation passed'
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Final validation failed: ${error}`
            };
        }
    }
}
// Create singleton instance
const databaseInitializer = new DatabaseInitializer();
exports.default = databaseInitializer;
