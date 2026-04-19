/**
 * Module: Backend (API Server)
 * File Purpose: Entry point for the Backend Server. Initializes database, Firebase, and starts the Express application.
 * Used By: Backend System
 * API Connected: N/A (Server Startup)
 * Database Model: N/A
 * Critical: Yes
 * Notes: Responsible for bootstrapping the application and displaying the startup banner.
 */
import app from './app';
import env from './config/env';
import dbSyncService from './services/dbSync.service';

/**
 * Main Server Entry Point
 */
(async () => {

  try {
    // 1. Run Auto Database Sync before server starts
    await dbSyncService.sync();

    // 2. Start the Express server
    app.listen(env.PORT, () => {
      console.log(`🚀 Server started on port ${env.PORT}`);
    });

  } catch (error) {
    console.error('❌ FATAL: Server failed to start');
    console.error(error);
    process.exit(1);
  }
})();

