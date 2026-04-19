/**
 * Module: Backend (API Server)
 * File Purpose: Enhanced Database Connection Manager with logging and connection pooling
 * Used By: Backend System
 * API Connected: N/A (Database Layer)
 * Database Model: All Models
 * Critical: Yes
 * Notes: Manages MySQL connection with proper error handling, logging, and connection pooling
 */
import { Sequelize } from 'sequelize';
import env from './env';

class DatabaseManager {
  private sequelize: Sequelize;
  private isConnected: boolean = false;

  constructor() {
    this.sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASS, {
      host: env.DB_HOST,
      port: env.DB_PORT,
      dialect: 'mysql',
      logging: (msg) => {
        if (env.NODE_ENV === 'development') {
          console.log(`🗄️  [SQL] ${msg}`);
        }
      },
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
  async authenticate(): Promise<{ success: boolean; message: string }> {
    try {
      await this.sequelize.authenticate();
      this.isConnected = true;
      console.log('✅ Database connection established successfully');
      return { success: true, message: 'Connection established' };
    } catch (error) {
      this.isConnected = false;
      console.error('❌ Unable to connect to database:', error);
      return { success: false, message: `Connection failed: ${error}` };
    }
  }

  /**
   * Get Sequelize instance
   */
  getSequelize(): Sequelize {
    return this.sequelize;
  }

  /**
   * Check if database is connected
   */
  isDbConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      await this.sequelize.close();
      this.isConnected = false;
      console.log('🔒 Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
  }

  /**
   * Get database connection info
   */
  getConnectionInfo(): { host: string; database: string; port: number; connected: boolean } {
    return {
      host: env.DB_HOST,
      database: env.DB_NAME,
      port: env.DB_PORT,
      connected: this.isConnected
    };
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();
export default databaseManager;
