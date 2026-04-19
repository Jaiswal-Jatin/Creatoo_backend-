import { Sequelize, QueryTypes } from 'sequelize';
import mysql from 'mysql2/promise';
import env from '../config/env';
import seedManager from '../config/seed';

interface SyncResult {
  table: string;
  field: string;
  status: string;
}

class DbSyncService {
  private sequelize: Sequelize | null = null;
  private results: SyncResult[] = [];

  /**
   * Main sync function to be called before server starts
   */
  async sync() {
    try {
      // 1. Ensure database exists
      await this.ensureDatabaseExists();

      // 2. Import models to register them
      const { default: sequelizeInstance } = await import('../models');
      this.sequelize = sequelizeInstance;

      // 3. Perform sync check (Tables & Columns)
      await this.performSync();

      // 4. Run seeds silently
      await this.runSeeds();

      // 5. Print report
      this.printReport();

    } catch (error) {
      console.error('❌ DB Sync Error:', error);
      throw error;
    }
  }

  private async ensureDatabaseExists() {
    try {
      const connection = await mysql.createConnection({
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USER,
        password: env.DB_PASS,
      });

      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\`;`);
      await connection.end();
    } catch (err) {
      // Ignore if database exists or other common connection issues at this stage
    }
  }

  private async performSync() {
    if (!this.sequelize) return;

    const models = this.sequelize.models;
    const existingTables = await this.getExistingTables();

    for (const modelName in models) {
      const model = models[modelName];
      const tableName = model.tableName;

      if (!existingTables.includes(tableName)) {
        // Table doesn't exist, create it
        await model.sync({ force: false });
        this.results.push({ table: tableName, field: '-', status: '➕ Table Created' });
      } else {
        // Table exists, check columns
        this.results.push({ table: tableName, field: '-', status: '✅ Already Exists' });
        await this.syncColumns(model);
      }
    }
  }

  private async getExistingTables(): Promise<string[]> {
    if (!this.sequelize) return [];
    const tables = await this.sequelize.query('SHOW TABLES', { type: QueryTypes.SELECT });
    return tables.map((t: any) => Object.values(t)[0] as string);
  }

  private async syncColumns(model: any) {
    if (!this.sequelize) return;

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

  private async getTableColumns(tableName: string): Promise<string[]> {
    if (!this.sequelize) return [];
    try {
      const columns = await this.sequelize.query(`SHOW COLUMNS FROM \`${tableName}\``, { type: QueryTypes.SELECT });
      return columns.map((col: any) => col.Field);
    } catch (err) {
      return [];
    }
  }

  private async addColumn(tableName: string, columnName: string, attribute: any) {
    if (!this.sequelize) return;

    let typeSql = this.getDataTypeSql(attribute);
    let sql = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${typeSql}`;

    if (attribute.allowNull === false) sql += ' NOT NULL';
    if (attribute.defaultValue !== undefined) {
      const defaultVal = this.formatDefaultValue(attribute.defaultValue);
      if (defaultVal !== null) sql += ` DEFAULT ${defaultVal}`;
    }

    await this.sequelize.query(sql);
  }

  private getDataTypeSql(attribute: any): string {
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
      case 'ENUM': return `ENUM(${attribute.type?.values?.map((v: string) => `'${v}'`).join(', ') || ''})`;
      default: return 'VARCHAR(255)';
    }
  }

  private formatDefaultValue(val: any): string | null {
    if (val === null) return 'NULL';
    if (typeof val === 'string') return `'${val}'`;
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'number') return val.toString();
    if (val && typeof val === 'object' && val.constructor.name === 'Fn') return null; // Skip sequelize functions
    return null;
  }

  private async runSeeds() {
    // Capture existing log functions
    const originalLog = console.log;
    const originalWarn = console.warn;
    
    // Silence seeding logs
    console.log = () => {};
    console.warn = () => {};

    try {
      const seedResult = await seedManager.runSeeds();
      if (seedResult.success && seedResult.changes.length > 0) {
        seedResult.changes.forEach(change => {
          this.results.push({ table: '(seed)', field: '-', status: `🌱 ${change}` });
        });
      }
    } catch (err) {
      // Ignore seeding errors for the report
    } finally {
      // Restore logs
      console.log = originalLog;
      console.warn = originalWarn;
    }
  }

  private printReport() {
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

export default new DbSyncService();

