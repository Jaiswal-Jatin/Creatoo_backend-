/**
 * Module: Backend (API Server)
 * File Purpose: Database Migration System with automatic table/column creation and validation
 * Used By: Backend System (Server Startup)
 * API Connected: N/A (Database Layer)
 * Database Model: All Models
 * Critical: Yes
 * Notes: Handles automatic database schema updates without data loss
 */
import { QueryTypes } from 'sequelize';
import databaseManager from './database';

interface TableInfo {
  tableName: string;
  columns: ColumnInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  allowNull: boolean;
  defaultValue?: any;
  primaryKey?: boolean;
  autoIncrement?: boolean;
}

interface MigrationResult {
  success: boolean;
  message: string;
  changes: string[];
}

class MigrationManager {
  private sequelize = databaseManager.getSequelize();
  private changes: string[] = [];

  /**
   * Run all database migrations
   */
  async runMigrations(): Promise<MigrationResult> {
    try {
      console.log('🔄 Starting database migrations...');
      this.changes = [];

      // Check database connection
      if (!databaseManager.isDbConnected()) {
        const authResult = await databaseManager.authenticate();
        if (!authResult.success) {
          return {
            success: false,
            message: 'Database connection failed',
            changes: []
          };
        }
      }

      // Get all existing tables
      const existingTables = await this.getExistingTables();
      console.log(`📋 Found ${existingTables.length} existing tables`);

      // Import all models to ensure they are registered
      await this.importAllModels();

      // Get all model tables
      const modelTables = await this.getModelTables();
      console.log(`📦 Found ${modelTables.length} model tables to check`);
      
      // Validate all model tables are properly defined
      if (modelTables.length === 0) {
        return {
          success: false,
          message: 'No model tables found - check model definitions',
          changes: []
        };
      }
      
      // Process each model table
      for (const modelTable of modelTables) {
        await this.processTable(modelTable, existingTables);
      }

      // Final validation - ensure all critical tables exist
      const finalValidation = await this.validateCriticalTables();
      if (!finalValidation.success) {
        return {
          success: false,
          message: `Critical validation failed: ${finalValidation.message}`,
          changes: [...this.changes]
        };
      }

      console.log(`✅ Migration completed. ${this.changes.length} changes made.`);
      return {
        success: true,
        message: 'Migration completed successfully',
        changes: [...this.changes]
      };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return {
        success: false,
        message: `Migration failed: ${error}`,
        changes: [...this.changes]
      };
    }
  }

  /**
   * Get list of existing tables in database
   */
  private async getExistingTables(): Promise<string[]> {
    const tables = await this.sequelize.query<TableInfo>(
      'SHOW TABLES',
      { type: QueryTypes.SELECT }
    );
    return tables.map((table: any) => Object.values(table)[0] as string);
  }

  /**
   * Import all models to ensure they are registered with Sequelize
   */
  private async importAllModels(): Promise<void> {
    try {
      console.log('📦 Importing all models...');
      
      // Import models to ensure they are registered with the same sequelize instance
      const { default: sequelize } = await import('../models');
      
      // Wait a bit for models to be registered
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify models are registered with our sequelize instance
      const models = sequelize.models;
      const modelCount = Object.keys(models).length;
      
      console.log(`📦 All models imported successfully (${modelCount} models found)`);
      
      if (modelCount === 0) {
        throw new Error('No models were registered with Sequelize');
      }
      
      // Log all model names for debugging
      const modelNames = Object.keys(models);
      console.log('📋 Registered models:', modelNames.join(', '));
      
      // Update our sequelize instance to use the models
      this.sequelize = sequelize;
      
    } catch (error) {
      console.error('❌ Failed to import models:', error);
      throw error;
    }
  }

  /**
   * Get all model tables from Sequelize
   */
  private async getModelTables(): Promise<string[]> {
    const models = this.sequelize.models;
    
    const tableNames = Object.values(models)
      .map((model: any) => {
        const tableName = model.tableName;
        console.log(`📋 Found model: ${model.name || 'Unknown'} -> Table: ${tableName}`);
        return tableName;
      })
      .filter(tableName => tableName && tableName !== undefined);
    
    console.log(`📦 Found ${tableNames.length} model tables to check`);
    return tableNames;
  }

  /**
   * Process a single table (create if not exists, add missing columns)
   */
  private async processTable(tableName: string, existingTables: string[]): Promise<void> {
    const tableExists = existingTables.includes(tableName);
    
    if (!tableExists) {
      await this.createTable(tableName);
      return;
    }

    await this.checkAndAddMissingColumns(tableName);
  }

  /**
   * Create a new table
   */
  private async createTable(tableName: string): Promise<void> {
    try {
      const model = this.sequelize.models[tableName];
      if (!model) {
        console.warn(`⚠️  Model not found for table: ${tableName}`);
        return;
      }

      await model.sync({ force: false });
      this.changes.push(`✨ Table '${tableName}' created`);
      console.log(`✨ Created table: ${tableName}`);
    } catch (error) {
      console.error(`❌ Failed to create table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Check and add missing columns to an existing table
   */
  private async checkAndAddMissingColumns(tableName: string): Promise<void> {
    try {
      const model = this.sequelize.models[tableName];
      if (!model) {
        console.warn(`⚠️  Model not found for table: ${tableName}`);
        return;
      }

      // Get existing columns
      const existingColumns = await this.getTableColumns(tableName);
      const modelAttributes = model.getAttributes();
      
      // Check each model attribute
      for (const [attributeName, attribute] of Object.entries(modelAttributes)) {
        const columnInfo = attribute as any;
        const columnName = columnInfo.field || attributeName;
        
        if (!existingColumns.includes(columnName)) {
          await this.addColumn(tableName, columnName, columnInfo);
          this.changes.push(`➕ Column '${columnName}' added to table '${tableName}'`);
          console.log(`➕ Added column ${columnName} to table ${tableName}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to check columns for table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get existing columns for a table
   */
  private async getTableColumns(tableName: string): Promise<string[]> {
    const columns = await this.sequelize.query(
      `SHOW COLUMNS FROM ${tableName}`,
      { type: QueryTypes.SELECT }
    );
    return columns.map((col: any) => col.Field);
  }

  /**
   * Add a new column to a table
   */
  private async addColumn(tableName: string, columnName: string, attribute: any): Promise<void> {
    try {
      let sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${this.getDataType(attribute)}`;
      
      if (attribute.allowNull === false) {
        sql += ' NOT NULL';
      }
      
      if (attribute.defaultValue !== undefined) {
        sql += ` DEFAULT ${this.getDefaultValue(attribute.defaultValue)}`;
      }

      await this.sequelize.query(sql);
    } catch (error) {
      console.error(`❌ Failed to add column ${columnName} to table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Convert Sequelize data type to MySQL data type
   */
  private getDataType(attribute: any): string {
    const type = attribute.type.constructor.name;
    
    switch (type) {
      case 'STRING':
        return attribute.type._length ? `VARCHAR(${attribute.type._length})` : 'VARCHAR(255)';
      case 'TEXT':
        return 'TEXT';
      case 'INTEGER':
        return 'INT';
      case 'BIGINT':
        return 'BIGINT';
      case 'FLOAT':
      case 'DOUBLE':
        return 'DOUBLE';
      case 'DECIMAL':
        return attribute.type._precision ? 
          `DECIMAL(${attribute.type._precision}, ${attribute.type._scale || 0})` : 
          'DECIMAL(10, 2)';
      case 'BOOLEAN':
        return 'BOOLEAN';
      case 'DATE':
        return 'DATE';
      case 'DATEONLY':
        return 'DATE';
      case 'TIME':
        return 'TIME';
      case 'JSON':
        return 'JSON';
      case 'ENUM':
        return `ENUM(${attribute.type.values.map((v: string) => `'${v}'`).join(', ')})`;
      default:
        return 'VARCHAR(255)';
    }
  }

  /**
   * Format default value for SQL
   */
  private getDefaultValue(defaultValue: any): string {
    if (defaultValue === null) return 'NULL';
    if (typeof defaultValue === 'string') return `'${defaultValue}'`;
    if (typeof defaultValue === 'boolean') return defaultValue ? 'TRUE' : 'FALSE';
    if (defaultValue instanceof Date) return `'${defaultValue.toISOString()}'`;
    return String(defaultValue);
  }

  /**
   * Get migration summary
   */
  getMigrationSummary(): { totalChanges: number; changes: string[] } {
    return {
      totalChanges: this.changes.length,
      changes: [...this.changes]
    };
  }

  /**
   * Validate critical tables exist and have required columns
   */
  private async validateCriticalTables(): Promise<{ success: boolean; message: string }> {
    try {
      const criticalTables = ['users', 'settings', 'business_types'];
      
      for (const tableName of criticalTables) {
        const tableExists = await this.checkTableExists(tableName);
        if (!tableExists) {
          return {
            success: false,
            message: `Critical table '${tableName}' is missing`
          };
        }
        
        // Check if table has columns
        const columns = await this.getTableColumns(tableName);
        if (columns.length === 0) {
          return {
            success: false,
            message: `Table '${tableName}' exists but has no columns`
          };
        }
      }
      
      return {
        success: true,
        message: 'All critical tables validated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Validation failed: ${error}`
      };
    }
  }

  /**
   * Check if a table exists
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.sequelize.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = :tableName
      `, {
        replacements: { tableName },
        type: QueryTypes.SELECT
      });

      const count = (result as any[])[0]?.count || 0;
      return count > 0;
    } catch (error) {
      console.error(`❌ Failed to check if table ${tableName} exists:`, error);
      return false;
    }
  }
}

// Create singleton instance
const migrationManager = new MigrationManager();
export default migrationManager;
