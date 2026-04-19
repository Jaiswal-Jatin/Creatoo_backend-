/**
 * Module: Backend (API Server)
 * File Purpose: Legacy Database Configuration (Deprecated - Use database.ts instead)
 * Used By: Legacy Code Only
 * API Connected: N/A (Database Layer)
 * Database Model: All Models
 * Critical: No (Being replaced by database.ts)
 * Notes: This file is kept for backward compatibility. Use database.ts for new code.
 */
import databaseManager from './database';

// Export the Sequelize instance from the new database manager
export default databaseManager.getSequelize();
