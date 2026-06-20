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
const sequelize_1 = require("sequelize");
const promise_1 = __importDefault(require("mysql2/promise"));
const env_1 = __importDefault(require("../config/env"));
const seed_1 = __importDefault(require("../config/seed"));
class DbSyncService {
    constructor() {
        this.sequelize = null;
        this.results = [];
    }
    /**
     * Main sync function to be called before server starts
     */
    async sync() {
        try {
            // 1. Ensure database exists
            await this.ensureDatabaseExists();
            // 2. Import models to register them
            const { default: sequelizeInstance } = await Promise.resolve().then(() => __importStar(require('../models')));
            this.sequelize = sequelizeInstance;
            // 3. Perform sync check (Tables & Columns)
            await this.performSync();
            // 3.1. Adjust category_attributes column datatype (JSON/TEXT fallback)
            await this.adjustCategoryAttributesColumn();
            // 3.2. Adjust bookings status column enum to support 'cancelled'
            await this.adjustBookingStatusColumn();
            // 3.3. Fix wallet_transactions.via column type (ENUM→VARCHAR) to accept 'advance_payment'
            await this.fixWalletTransactionViaColumn();
            // 3.4. Reconcile missing wallet transactions for paid advance bookings
            await this.reconcileMissingAdvanceWalletTxns();
            // 3.5. Migrate business users to the new businesses table
            await this.performDataMigration();
            // 4. Run seeds silently
            await this.runSeeds();
            // 5. Print report
            this.printReport();
        }
        catch (error) {
            console.error('❌ DB Sync Error:', error);
            throw error;
        }
    }
    async adjustBookingStatusColumn() {
        if (!this.sequelize)
            return;
        console.log('🔧 Adjusting bookings status column ENUM...');
        try {
            await this.sequelize.query("ALTER TABLE `bookings` MODIFY COLUMN `status` ENUM('pending', 'accepted', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending'");
            console.log('✅ bookings status column verified/modified to include cancelled successfully.');
            this.results.push({ table: 'bookings', field: 'status', status: '🔧 Added cancelled' });
        }
        catch (colError) {
            console.error('❌ Failed to modify bookings status column:', colError);
        }
    }
    async adjustCategoryAttributesColumn() {
        if (!this.sequelize)
            return;
        console.log('🔧 Adjusting category_attributes column type if necessary...');
        try {
            await this.sequelize.query('ALTER TABLE `businesses` MODIFY COLUMN `category_attributes` JSON NULL');
            console.log('✅ category_attributes column verified/modified to JSON successfully.');
            this.results.push({ table: 'businesses', field: 'category_attributes', status: '🔧 Altered to JSON' });
        }
        catch (colError) {
            console.warn('⚠️ Failed to alter category_attributes to JSON, attempting TEXT fallback:', colError);
            try {
                await this.sequelize.query('ALTER TABLE `businesses` MODIFY COLUMN `category_attributes` TEXT NULL');
                console.log('✅ category_attributes column verified/modified to TEXT fallback successfully.');
                this.results.push({ table: 'businesses', field: 'category_attributes', status: '🔧 Altered to TEXT' });
            }
            catch (textColError) {
                console.error('❌ Failed to modify category_attributes column:', textColError);
            }
        }
    }
    async ensureDatabaseExists() {
        try {
            const connection = await promise_1.default.createConnection({
                host: env_1.default.DB_HOST,
                port: env_1.default.DB_PORT,
                user: env_1.default.DB_USER,
                password: env_1.default.DB_PASS,
            });
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env_1.default.DB_NAME}\`;`);
            await connection.end();
        }
        catch (err) {
            // Ignore if database exists or other common connection issues at this stage
        }
    }
    async performSync() {
        if (!this.sequelize)
            return;
        const models = this.sequelize.models;
        const existingTables = await this.getExistingTables();
        for (const modelName in models) {
            const model = models[modelName];
            const tableName = model.tableName;
            if (!existingTables.includes(tableName)) {
                // Table doesn't exist, create it
                await model.sync({ force: false });
                this.results.push({ table: tableName, field: '-', status: '➕ Table Created' });
            }
            else {
                // Table exists, check columns
                this.results.push({ table: tableName, field: '-', status: '✅ Already Exists' });
                await this.syncColumns(model);
            }
        }
    }
    async getExistingTables() {
        if (!this.sequelize)
            return [];
        const tables = await this.sequelize.query('SHOW TABLES', { type: sequelize_1.QueryTypes.SELECT });
        return tables.map((t) => Object.values(t)[0]);
    }
    async syncColumns(model) {
        if (!this.sequelize)
            return;
        const tableName = model.tableName;
        const modelAttributes = model.getAttributes();
        const existingColumns = await this.getTableColumns(tableName);
        for (const attributeName in modelAttributes) {
            const attribute = modelAttributes[attributeName];
            const columnName = attribute.field || attributeName;
            if (!existingColumns.includes(columnName)) {
                // Column missing, add it
                await this.addColumn(tableName, columnName, attribute);
                this.results.push({ table: tableName, field: columnName, status: '➕ Field Added' });
            }
        }
    }
    async getTableColumns(tableName) {
        if (!this.sequelize)
            return [];
        try {
            const columns = await this.sequelize.query(`SHOW COLUMNS FROM \`${tableName}\``, { type: sequelize_1.QueryTypes.SELECT });
            return columns.map((col) => col.Field);
        }
        catch (err) {
            return [];
        }
    }
    async addColumn(tableName, columnName, attribute) {
        if (!this.sequelize)
            return;
        let typeSql = this.getDataTypeSql(attribute);
        let sql = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${typeSql}`;
        if (attribute.allowNull === false)
            sql += ' NOT NULL';
        if (attribute.defaultValue !== undefined) {
            const defaultVal = this.formatDefaultValue(attribute.defaultValue);
            if (defaultVal !== null)
                sql += ` DEFAULT ${defaultVal}`;
        }
        await this.sequelize.query(sql);
    }
    getDataTypeSql(attribute) {
        const type = attribute.type?.constructor?.name || 'STRING';
        switch (type) {
            case 'STRING': return attribute.type?._length ? `VARCHAR(${attribute.type._length})` : 'VARCHAR(255)';
            case 'TEXT': return 'TEXT';
            case 'INTEGER': return 'INT';
            case 'BIGINT': return 'BIGINT';
            case 'FLOAT':
            case 'DOUBLE': return 'DOUBLE';
            case 'DECIMAL': return attribute.type?._precision ? `DECIMAL(${attribute.type._precision}, ${attribute.type._scale || 0})` : 'DECIMAL(10, 2)';
            case 'BOOLEAN': return 'BOOLEAN';
            case 'DATE': return 'DATETIME';
            case 'DATEONLY': return 'DATE';
            case 'TIME': return 'TIME';
            case 'JSON': return 'JSON';
            case 'ENUM': return `ENUM(${attribute.type?.values?.map((v) => `'${v}'`).join(', ') || ''})`;
            default: return 'VARCHAR(255)';
        }
    }
    formatDefaultValue(val) {
        if (val === null)
            return 'NULL';
        if (typeof val === 'string')
            return `'${val}'`;
        if (typeof val === 'boolean')
            return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number')
            return val.toString();
        if (val && typeof val === 'object' && val.constructor.name === 'Fn')
            return null; // Skip sequelize functions
        return null;
    }
    async fixWalletTransactionViaColumn() {
        if (!this.sequelize)
            return;
        try {
            console.log('🔧 Fixing wallet_transactions.via column type...');
            // Force ALTER to VARCHAR(255) regardless of current type, to ensure it accepts 'advance_payment'
            await this.sequelize.query("ALTER TABLE `wallet_transactions` MODIFY COLUMN `via` VARCHAR(255) DEFAULT NULL");
            console.log('✅ wallet_transactions.via column altered to VARCHAR(255)');
            this.results.push({ table: 'wallet_transactions', field: 'via', status: '🔧 Altered to VARCHAR(255)' });
        }
        catch (err) {
            console.error('❌ Failed to fix wallet_transactions.via column:', err);
        }
    }
    async reconcileMissingAdvanceWalletTxns() {
        if (!this.sequelize)
            return;
        try {
            // Find bookings with advance_payment_status='paid' but no wallet transaction for them
            const missing = await this.sequelize.query(`
        SELECT b.id as booking_id, b.business_id, b.advance_amount, b.user_id, b.razorpay_payment_id, b.advance_payment_at
        FROM bookings b
        WHERE b.advance_payment_status = 'paid'
        AND b.advance_amount > 0
        AND NOT EXISTS (
          SELECT 1 FROM wallet_transactions wt
          WHERE wt.user_id = b.business_id
          AND wt.source_type = 'advance_payment'
          AND wt.remark LIKE CONCAT('%booking #', b.id, '%')
        )
      `, { type: sequelize_1.QueryTypes.SELECT });
            if (missing.length === 0) {
                console.log('✅ No missing advance wallet transactions to reconcile.');
                return;
            }
            console.log(`🔧 Found ${missing.length} booking(s) with missing advance wallet transaction(s).`);
            for (const row of missing) {
                console.log(`  → Booking #${row.booking_id}, business=${row.business_id}, amount=${row.advance_amount}`);
                const createdAt = row.advance_payment_at
                    ? new Date(row.advance_payment_at).toISOString().slice(0, 19).replace('T', ' ')
                    : new Date().toISOString().slice(0, 19).replace('T', ' ');
                await this.sequelize.query({
                    query: `INSERT INTO wallet_transactions
            (user_id, from_user_id, amount, credit_debit, remark, is_withdraw_request, via, settlement_status, source_type, created_at, updated_at)
          VALUES
            (?, ?, ?, 'credit', ?, '0', 'advance_payment', 'pending', 'advance_payment', ?, ?)`,
                    values: [row.business_id, row.user_id, row.advance_amount, `Advance payment for booking #${row.booking_id} from user #${row.user_id}`, createdAt, createdAt],
                });
                this.results.push({ table: 'wallet_transactions', field: `booking #${row.booking_id}`, status: '🔧 Missing TXN created' });
            }
            console.log(`✅ Created ${missing.length} missing wallet transaction(s) for advance bookings.`);
            // Backfill from_user_id for existing advance payment wallet transactions that have user info in remark
            const backfillResult = await this.sequelize.query(`
        UPDATE wallet_transactions wt
        JOIN bookings b ON b.id = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(wt.remark, 'booking #', -1), ' ', 1) AS UNSIGNED)
        SET wt.from_user_id = b.user_id
        WHERE wt.source_type = 'advance_payment'
        AND wt.from_user_id IS NULL
        AND wt.remark LIKE '%booking #%'
      `, { type: sequelize_1.QueryTypes.UPDATE });
            if (backfillResult && backfillResult[0]?.affectedRows > 0) {
                console.log(`✅ Backfilled from_user_id for ${backfillResult[0].affectedRows} existing advance payment transactions.`);
                this.results.push({ table: 'wallet_transactions', field: 'from_user_id', status: `🔧 Backfilled ${backfillResult[0].affectedRows} rows` });
            }
            // Backfill from_user_id for existing order payment wallet transactions
            const backfillOrderResult = await this.sequelize.query(`
        UPDATE wallet_transactions wt
        JOIN orders o ON o.order_id = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(wt.remark, 'Order ', -1), ' ', 1) AS CHAR)
        SET wt.from_user_id = o.user_id
        WHERE wt.source_type = 'order_payment'
        AND wt.from_user_id IS NULL
        AND wt.remark LIKE '%Order%'
      `, { type: sequelize_1.QueryTypes.UPDATE });
            if (backfillOrderResult && backfillOrderResult[0]?.affectedRows > 0) {
                console.log(`✅ Backfilled from_user_id for ${backfillOrderResult[0].affectedRows} existing order payment transactions.`);
                this.results.push({ table: 'wallet_transactions', field: 'from_user_id (order)', status: `🔧 Backfilled ${backfillOrderResult[0].affectedRows} rows` });
            }
        }
        catch (err) {
            console.error('❌ Failed to reconcile missing advance wallet transactions:', err);
        }
    }
    async runSeeds() {
        // Capture existing log functions
        const originalLog = console.log;
        const originalWarn = console.warn;
        // Silence seeding logs
        console.log = () => { };
        console.warn = () => { };
        try {
            const seedResult = await seed_1.default.runSeeds();
            if (seedResult.success && seedResult.changes.length > 0) {
                seedResult.changes.forEach(change => {
                    this.results.push({ table: '(seed)', field: '-', status: `🌱 ${change}` });
                });
            }
        }
        catch (err) {
            // Ignore seeding errors for the report
        }
        finally {
            // Restore logs
            console.log = originalLog;
            console.warn = originalWarn;
        }
    }
    async performDataMigration() {
        if (!this.sequelize)
            return;
        try {
            // Check if there are any business users in the users table
            const [businessUsersCountResult] = await this.sequelize.query("SELECT COUNT(*) as count FROM `users` WHERE `role_id` = 2");
            const businessCount = businessUsersCountResult[0]?.count || 0;
            if (businessCount > 0) {
                console.log(`[Migration] Found ${businessCount} business users in users table. Migrating to businesses table...`);
                // Fetch all column names of users table
                const columns = await this.getTableColumns('users');
                const colsEscaped = columns.map(col => `\`${col}\``).join(', ');
                // Insert into businesses table
                await this.sequelize.query(`INSERT IGNORE INTO \`businesses\` (${colsEscaped}) SELECT ${colsEscaped} FROM \`users\` WHERE \`role_id\` = 2`);
                // Delete from users table
                await this.sequelize.query("DELETE FROM `users` WHERE `role_id` = 2");
                console.log(`[Migration] Successfully migrated and cleaned up users table.`);
                this.results.push({ table: 'businesses', field: '-', status: `📦 Migrated ${businessCount} rows` });
            }
        }
        catch (err) {
            console.error('❌ Data migration error:', err);
        }
    }
    printReport() {
        const significantResults = this.results.filter(r => r.status !== '✅ Already Exists');
        if (significantResults.length === 0) {
            console.log('\n✅ Database already in sync. No changes made.\n');
            return;
        }
        // Header
        console.log('\n╔══════════════════════════════════════════════════════╗');
        console.log('║              DATABASE SYNC REPORT                    ║');
        console.log('╠══════════════╦══════════════════╦════════════════════╣');
        console.log('║ Table        ║ Field            ║ Status             ║');
        console.log('╠══════════════╬══════════════════╬════════════════════╣');
        // Only show relevant rows + some context if needed
        // The user wants to see what happened.
        for (const res of this.results) {
            // To keep it clean, if nothing changed for a table, we maybe don't show "Already Exists" if other things changed?
            // No, let's show all tables that were checked but maybe filter to just changes if it's too long?
            // User example shows "Already Exists" mixed with "Table Created".
            const table = res.table.padEnd(12).substring(0, 12);
            const field = res.field.padEnd(16).substring(0, 16);
            const status = res.status.padEnd(18).substring(0, 18);
            console.log(`║ ${table} ║ ${field} ║ ${status} ║`);
        }
        console.log('╚══════════════╩══════════════════╩════════════════════╝\n');
    }
}
exports.default = new DbSyncService();
