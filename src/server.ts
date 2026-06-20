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
import databaseManager from './config/database';
import pointsService from './services/points.service';
import os from 'os';

/**
 * Main Server Entry Point
 */
(async () => {

  try {
    // 1. Connect to Database first
    console.log('📡 Connecting to database...');
    const dbStatus = await databaseManager.authenticate();
    if (!dbStatus.success) {
      throw new Error(`Database connection failed: ${dbStatus.message}`);
    }

    // 2. Run Auto Database Sync before server starts
    await dbSyncService.sync();

    // 3. Start the Express server
    app.listen(env.PORT, () => {
      // Get network IP address
      const interfaces = os.networkInterfaces();
      let networkUrl = 'Not available';
      
      for (const interfaceName in interfaces) {
        const addresses = interfaces[interfaceName];
        if (addresses) {
          for (const addr of addresses) {
            if (addr.family === 'IPv4' && !addr.internal) {
              networkUrl = `http://${addr.address}:${env.PORT}`;
              break;
            }
          }
        }
        if (networkUrl !== 'Not available') break;
      }

      console.log('\n╔══════════════════════════════════════════════════════╗');
      console.log('║         ⚡ CREATOO BACKEND SERVER STARTED ⚡         ║');
      console.log('╚══════════════════════════════════════════════════════╝');
      console.log(`  💻 Local URL:      http://localhost:${env.PORT}`);
      console.log(`  🌐 Network URL:    ${networkUrl}`);
      console.log(`  🔌 Port:           ${env.PORT}`);
      console.log(`  📁 Environment:    ${env.NODE_ENV}`);
      console.log(`  🗄️  Database Host:  ${env.DB_HOST}`);
      console.log(`  🗄️  Database Name:  ${env.DB_NAME}`);
      console.log('========================================================\n');

      // Start Expiry Scheduler
      console.log('⏰ Starting Loyalty Points Expiry Scheduler (24h)...');
      pointsService.runDailyExpiryJob(); // Run once on startup
      setInterval(() => {
        pointsService.runDailyExpiryJob();
      }, 24 * 60 * 60 * 1000);

      // Start Booking Reminder Scheduler (every 1 min check)
      console.log('🔔 Starting 1-Hour Booking Reminder Scheduler...');
      setInterval(async () => {
        try {
          const { Op } = await import('sequelize');
          const Booking = (await import('./models/Booking')).default;
          const User = (await import('./models/User')).default;
          const Business = (await import('./models/Business')).default;
          const { sendPushNotification } = await import('./services/sendPushNotification');

          const now = new Date();
          const targetDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
          const targetDateStr = targetDate.toISOString().slice(0, 10);   // YYYY-MM-DD
          const targetTimeStr = `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`; // HH:mm

          const upcoming = await Booking.findAll({
            where: {
              status: 'accepted',
              reminder_sent: false,
              booking_date: targetDateStr,
              booking_time: { [Op.between]: [targetTimeStr + ':00', targetTimeStr + ':59'] } as any,
            },
          });

          for (const booking of upcoming) {
            const user = await User.findByPk(booking.user_id, { attributes: ['id', 'name', 'remember_token'] });
            const business = await Business.findByPk(booking.business_id, { attributes: ['id', 'business_name', 'remember_token'] });

            const tokens: string[] = [];
            if (user?.remember_token) tokens.push(user.remember_token);
            if (business?.remember_token) tokens.push(business.remember_token);

            if (tokens.length > 0) {
              await sendPushNotification(
                {
                  title: '⏰ Booking in 1 Hour!',
                  description: `Reminder: ${user?.name || 'Customer'}'s booking at ${business?.business_name || 'the business'} is at ${booking.booking_time} today.`,
                  data: { type: 'booking_reminder', booking_id: String(booking.id) },
                },
                tokens
              );
            }
            await booking.update({ reminder_sent: true } as any);
            console.log(`🔔 Reminder sent for booking #${booking.id}`);
          }
        } catch (reminderErr) {
          console.error('❌ Booking reminder error:', reminderErr);
        }
      }, 60 * 1000); // Check every 1 minute
    });

  } catch (error) {
    console.error('❌ FATAL: Server failed to start');
    console.error(error);
    process.exit(1);
  }
})();


