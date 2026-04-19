/**
 * Module: Backend (API Server)
 * File Purpose: Database Seed Data System for default values
 * Used By: Backend System (Server Startup)
 * API Connected: N/A (Database Layer)
 * Database Model: All Models
 * Critical: Yes
 * Notes: Handles insertion of default/seed data without duplicates
 */
import { QueryTypes } from 'sequelize';
import databaseManager from './database';

interface SeedResult {
  success: boolean;
  message: string;
  changes: string[];
}

class SeedManager {
  private sequelize = databaseManager.getSequelize();
  private changes: string[] = [];

  /**
   * Run all seed data operations
   */
  async runSeeds(): Promise<SeedResult> {
    try {
      console.log('🌱 Starting seed data operations...');
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

      // Import all models
      await this.importAllModels();

      // Run seed operations
      await this.seedSettings();
      await this.seedBusinessTypes();
      await this.seedDefaultPlans();
      
      console.log(`✅ Seed operations completed. ${this.changes.length} changes made.`);
      return {
        success: true,
        message: 'Seed operations completed successfully',
        changes: [...this.changes]
      };

    } catch (error) {
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
  private async importAllModels(): Promise<void> {
    try {
      await import('../models');
      console.log('📦 All models imported for seeding');
    } catch (error) {
      console.error('❌ Failed to import models for seeding:', error);
      throw error;
    }
  }

  /**
   * Seed default settings
   */
  private async seedSettings(): Promise<void> {
    try {
      // Check if settings table exists and has data
      const tableExists = await this.checkTableExists('settings');
      if (!tableExists) {
        console.log('⚠️  Settings table does not exist, skipping settings seed');
        return;
      }

      const existingCount = await this.sequelize.query(
        'SELECT COUNT(*) as count FROM settings',
        { type: QueryTypes.SELECT }
      );

      const count = (existingCount as any[])[0]?.count || 0;
      
      if (count === 0) {
        await this.sequelize.query(`
          INSERT INTO settings (cgst_percent, sgst_percent, igst_percent, platform_fee_percent, gateway_charges, reverse_gateway_charges, creatoo_points, created_at, updated_at)
          VALUES (9.0, 9.0, 18.0, 2.0, 2.0, 2.0, 1.0, NOW(), NOW())
        `);
        
        this.changes.push('🌱 Default settings created');
        console.log('🌱 Default settings created');
      } else {
        console.log('📋 Settings already exist, skipping');
      }
    } catch (error) {
      console.error('❌ Failed to seed settings:', error);
      throw error;
    }
  }

  /**
   * Seed default business types
   */
  private async seedBusinessTypes(): Promise<void> {
    try {
      const tableExists = await this.checkTableExists('business_types');
      if (!tableExists) {
        console.log('⚠️  Business types table does not exist, skipping business types seed');
        return;
      }

      const existingCount = await this.sequelize.query(
        'SELECT COUNT(*) as count FROM business_types',
        { type: QueryTypes.SELECT }
      );

      const count = (existingCount as any[])[0]?.count || 0;
      
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
      } else {
        console.log('📋 Business types already exist, skipping');
      }
    } catch (error) {
      console.error('❌ Failed to seed business types:', error);
      throw error;
    }
  }

  /**
   * Seed default plans
   */
  private async seedDefaultPlans(): Promise<void> {
    try {
      const tableExists = await this.checkTableExists('plans');
      if (!tableExists) {
        console.log('⚠️  Plans table does not exist, skipping plans seed');
        return;
      }

      const existingCount = await this.sequelize.query(
        'SELECT COUNT(*) as count FROM plans',
        { type: QueryTypes.SELECT }
      );

      const count = (existingCount as any[])[0]?.count || 0;
      
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
      } else {
        console.log('📋 Plans already exist, skipping');
      }
    } catch (error) {
      console.error('❌ Failed to seed plans:', error);
      throw error;
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

  /**
   * Check if a record exists in a table
   */
  private async recordExists(tableName: string, condition: string, replacements?: any): Promise<boolean> {
    try {
      const result = await this.sequelize.query(`
        SELECT COUNT(*) as count FROM ${tableName} WHERE ${condition}
      `, {
        replacements,
        type: QueryTypes.SELECT
      });

      const count = (result as any[])[0]?.count || 0;
      return count > 0;
    } catch (error) {
      console.error(`❌ Failed to check if record exists in ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Get seed summary
   */
  getSeedSummary(): { totalChanges: number; changes: string[] } {
    return {
      totalChanges: this.changes.length,
      changes: [...this.changes]
    };
  }
}

// Create singleton instance
const seedManager = new SeedManager();
export default seedManager;
