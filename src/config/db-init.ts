/**
 * Module: Backend (API Server)
 * File Purpose: Unified Database Initialization System (Connection + Migration + Seed)
 * Used By: Backend System (Server Startup)
 * API Connected: N/A (Database Layer)
 * Database Model: All Models
 * Critical: Yes
 * Notes: Orchestrates database connection, migrations, and seeding in the correct order
 */
import { QueryTypes } from 'sequelize';
import databaseManager from './database';
import migrationManager from './migration';
import seedManager from './seed';

interface DbInitResult {
  success: boolean;
  message: string;
  connectionInfo?: any;
  migrationChanges?: string[];
  seedChanges?: string[];
  totalChanges?: number;
}

class DatabaseInitializer {
  /**
   * Initialize complete database system
   */
  async initialize(): Promise<DbInitResult> {
    const startTime = Date.now();
    console.log('🚀 Starting database initialization...');

    try {
      // Step 1: Connect to database
      console.log('📡 Step 1: Connecting to database...');
      const connectionResult = await databaseManager.authenticate();
      
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
      const migrationResult = await migrationManager.runMigrations();
      
      if (!migrationResult.success) {
        console.error('❌ CRITICAL: Migration failed!');
        console.error('❌ Database schema is incomplete - server cannot start');
        return {
          success: false,
          message: `Migration failed: ${migrationResult.message}`,
          connectionInfo: databaseManager.getConnectionInfo()
        };
      }

      // Step 2.5: Fix column lengths if necessary (prevent VARCHAR 255 length exceptions)
      console.log('🔧 Step 2.5: Adjusting category_attributes column type if necessary...');
      try {
        await databaseManager.getSequelize().query(
          'ALTER TABLE businesses MODIFY COLUMN category_attributes JSON NULL'
        );
        console.log('✅ category_attributes column verified/modified to JSON successfully.');
      } catch (colError) {
        console.warn('⚠️  Failed to alter category_attributes to JSON, attempting TEXT fallback:', colError);
        try {
          await databaseManager.getSequelize().query(
            'ALTER TABLE businesses MODIFY COLUMN category_attributes TEXT NULL'
          );
          console.log('✅ category_attributes column verified/modified to TEXT fallback successfully.');
        } catch (textColError) {
          console.error('❌ Failed to modify category_attributes column:', textColError);
        }
      }

      // Step 3: Validate migration was successful
      if (migrationResult.changes.length === 0) {
        console.log('✅ No schema changes needed - database is up to date');
      } else {
        console.log(`✅ Schema updated: ${migrationResult.changes.length} changes applied`);
      }

      // Step 4: Run seed data
      console.log('🌱 Step 3: Running seed data operations...');
      const seedResult = await seedManager.runSeeds();
      
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
        connectionInfo: databaseManager.getConnectionInfo(),
        migrationChanges: migrationResult.changes || [],
        seedChanges: seedResult.changes || [],
        totalChanges
      };

    } catch (error) {
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
  getStatus(): {
    connected: boolean;
    connectionInfo: any;
    migrationSummary: any;
    seedSummary: any;
  } {
    return {
      connected: databaseManager.isDbConnected(),
      connectionInfo: databaseManager.getConnectionInfo(),
      migrationSummary: migrationManager.getMigrationSummary(),
      seedSummary: seedManager.getSeedSummary()
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await databaseManager.close();
  }

  /**
   * Get detailed initialization report
   */
  getDetailedReport(): string {
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
  private async performFinalValidation(): Promise<{ success: boolean; message: string }> {
    try {
      // Check if we can execute a simple query
      await databaseManager.getSequelize().query('SELECT 1+1 as test', {
        type: QueryTypes.SELECT
      });

      // Check critical tables
      const criticalTables = ['users', 'settings'];
      for (const tableName of criticalTables) {
        const [results] = await databaseManager.getSequelize().query(
          `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${tableName}'`,
          { type: QueryTypes.SELECT }
        );
        
        if ((results as any).count === 0) {
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
    } catch (error) {
      return {
        success: false,
        message: `Final validation failed: ${error}`
      };
    }
  }
}

// Create singleton instance
const databaseInitializer = new DatabaseInitializer();
export default databaseInitializer;
