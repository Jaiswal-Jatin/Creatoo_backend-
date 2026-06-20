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
/**
 * Module: Backend (API Server)
 * File Purpose: Entry point for the Backend Server. Initializes database, Firebase, and starts the Express application.
 * Used By: Backend System
 * API Connected: N/A (Server Startup)
 * Database Model: N/A
 * Critical: Yes
 * Notes: Responsible for bootstrapping the application and displaying the startup banner.
 */
const app_1 = __importDefault(require("./app"));
const env_1 = __importDefault(require("./config/env"));
const dbSync_service_1 = __importDefault(require("./services/dbSync.service"));
const database_1 = __importDefault(require("./config/database"));
const points_service_1 = __importDefault(require("./services/points.service"));
const os_1 = __importDefault(require("os"));
/**
 * Main Server Entry Point
 */
(async () => {
    try {
        // 1. Connect to Database first
        console.log('📡 Connecting to database...');
        const dbStatus = await database_1.default.authenticate();
        if (!dbStatus.success) {
            throw new Error(`Database connection failed: ${dbStatus.message}`);
        }
        // 2. Run Auto Database Sync before server starts
        await dbSync_service_1.default.sync();
        // 3. Start the Express server
        app_1.default.listen(env_1.default.PORT, () => {
            // Get network IP address
            const interfaces = os_1.default.networkInterfaces();
            let networkUrl = 'Not available';
            for (const interfaceName in interfaces) {
                const addresses = interfaces[interfaceName];
                if (addresses) {
                    for (const addr of addresses) {
                        if (addr.family === 'IPv4' && !addr.internal) {
                            networkUrl = `http://${addr.address}:${env_1.default.PORT}`;
                            break;
                        }
                    }
                }
                if (networkUrl !== 'Not available')
                    break;
            }
            console.log('\n╔══════════════════════════════════════════════════════╗');
            console.log('║         ⚡ CREATOO BACKEND SERVER STARTED ⚡         ║');
            console.log('╚══════════════════════════════════════════════════════╝');
            console.log(`  💻 Local URL:      http://localhost:${env_1.default.PORT}`);
            console.log(`  🌐 Network URL:    ${networkUrl}`);
            console.log(`  🔌 Port:           ${env_1.default.PORT}`);
            console.log(`  📁 Environment:    ${env_1.default.NODE_ENV}`);
            console.log(`  🗄️  Database Host:  ${env_1.default.DB_HOST}`);
            console.log(`  🗄️  Database Name:  ${env_1.default.DB_NAME}`);
            console.log('========================================================\n');
            // Start Expiry Scheduler
            console.log('⏰ Starting Loyalty Points Expiry Scheduler (24h)...');
            points_service_1.default.runDailyExpiryJob(); // Run once on startup
            setInterval(() => {
                points_service_1.default.runDailyExpiryJob();
            }, 24 * 60 * 60 * 1000);
            // Start Booking Reminder Scheduler (every 1 min check)
            console.log('🔔 Starting 1-Hour Booking Reminder Scheduler...');
            setInterval(async () => {
                try {
                    const { Op } = await Promise.resolve().then(() => __importStar(require('sequelize')));
                    const Booking = (await Promise.resolve().then(() => __importStar(require('./models/Booking')))).default;
                    const User = (await Promise.resolve().then(() => __importStar(require('./models/User')))).default;
                    const Business = (await Promise.resolve().then(() => __importStar(require('./models/Business')))).default;
                    const { sendPushNotification } = await Promise.resolve().then(() => __importStar(require('./services/sendPushNotification')));
                    const now = new Date();
                    const targetDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
                    const targetDateStr = targetDate.toISOString().slice(0, 10); // YYYY-MM-DD
                    const targetTimeStr = `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`; // HH:mm
                    const upcoming = await Booking.findAll({
                        where: {
                            status: 'accepted',
                            reminder_sent: false,
                            booking_date: targetDateStr,
                            booking_time: { [Op.between]: [targetTimeStr + ':00', targetTimeStr + ':59'] },
                        },
                    });
                    for (const booking of upcoming) {
                        const user = await User.findByPk(booking.user_id, { attributes: ['id', 'name', 'remember_token'] });
                        const business = await Business.findByPk(booking.business_id, { attributes: ['id', 'business_name', 'remember_token'] });
                        const tokens = [];
                        if (user?.remember_token)
                            tokens.push(user.remember_token);
                        if (business?.remember_token)
                            tokens.push(business.remember_token);
                        if (tokens.length > 0) {
                            await sendPushNotification({
                                title: '⏰ Booking in 1 Hour!',
                                description: `Reminder: ${user?.name || 'Customer'}'s booking at ${business?.business_name || 'the business'} is at ${booking.booking_time} today.`,
                                data: { type: 'booking_reminder', booking_id: String(booking.id) },
                            }, tokens);
                        }
                        await booking.update({ reminder_sent: true });
                        console.log(`🔔 Reminder sent for booking #${booking.id}`);
                    }
                }
                catch (reminderErr) {
                    console.error('❌ Booking reminder error:', reminderErr);
                }
            }, 60 * 1000); // Check every 1 minute
        });
    }
    catch (error) {
        console.error('❌ FATAL: Server failed to start');
        console.error(error);
        process.exit(1);
    }
})();
