/**
 * Module: Backend (API Server)
 * File Purpose: Express Application Configuration. Sets up middleware, routes, and database sync logic.
 * Used By: Backend System / All Roles via API
 * API Connected: All API Endpoints defined in routes/
 * Database Model: Synchronizes all models defined in the system.
 * Critical: Yes
 * Notes: Central hub for all route registrations and global middleware.
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "fs";
import path from "path";

import routes from "./routes"; // base/index routes
import sequelize from "./config/db";
import databaseInitializer from "./config/db-init";
import env from "./config/env";

// Feature-specific route modules
import bannerRoutes from "./routes/banner.routes";
import businessTypeRoutes from "./routes/businessType.routes";
import postRoutes from "./routes/post.routes";
import settingRoutes from "./routes/setting.routes";
import userRoutes from "./routes/user.routes";
import walletTransactionRoutes from "./routes/walletTransaction.routes";
import referrerRoutes from "./routes/referrer.routes";
import promotionalNotificationRoutes from "./routes/promotionalNotification.routes";
import creatooRequestRoutes from "./routes/creatooRequest.routes";
import reportedPostRoutes from "./routes/reportedPost.routes";
import adminRouter from "./routes/admin.routes";
import orderRoutes from "./routes/order.routes";
import withdrawRequestRoutes from "./routes/withdrawRequest.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import cartRoutes from "./routes/cart";
import pointsRoutes from "./routes/points.routes";
import paymentRoutes from "./routes/payment.routes";
import businessRoutes from "./routes/business.rotes";
import reviewRoutes from "./routes/review.routes";
import opportunityRouter from "./routes/opportunity.routes";
import homeRouter from "./routes/home.rotes";
import webapiRouter from "./routes/webApi";
import cardsRouter from "./routes/card.routes";
import visitRoutes from "./routes/visit.routes";
import versionRoutes from "./routes/version.routes";
import exclusiveOfferRoutes from "./routes/exclusiveOffer.routes";
import legalRoutes from "./routes/legal";
import subscriptionRoutes from "./routes/subscription.routes";
import manualPaymentRoutes from "./routes/manualPayment.routes";
import planRoutes from "./routes/plan.routes";
import statsRoutes from "./routes/stats.routes";
import scanRoutes from "./routes/scan.routes";
import bookingRoutes from "./routes/booking.routes";
import settlementRoutes from "./routes/settlement.routes";

const app = express();

// -----------------------------------------------------------------------------
// 🗂 Ensure upload directory exists (env.UPLOAD_DIR, usually "public")
// -----------------------------------------------------------------------------
const uploadRoot = path.isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : path.join(process.cwd(), env.UPLOAD_DIR || "public");

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

// -----------------------------------------------------------------------------
// 🧱 Core middlewares
// -----------------------------------------------------------------------------
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ✅ API Request Logger — prints every request to terminal
app.use((req, _res, next) => {
  console.log(`\x1b[36m[${new Date().toLocaleTimeString()}] ➡️  ${req.method} ${req.originalUrl}\x1b[0m`);
  next();
});
app.use(morgan(":method :url :status - :response-time ms"));

// Serve all public files
app.use("/public", express.static(uploadRoot));

// 📌 Serve Android App Links file at:
//     https://api.tapbill.in/.well-known/assetlinks.json
app.use(
  "/.well-known",
  express.static(path.join(uploadRoot, ".well-known"))
);

// -----------------------------------------------------------------------------
// 🚀 Main API routes (base)
// -----------------------------------------------------------------------------
app.use("/api", routes);

// -----------------------------------------------------------------------------
// 📃 Legal pages (HTML responses)
// -----------------------------------------------------------------------------
app.use("/api", legalRoutes);

// -----------------------------------------------------------------------------
// 🧩 Feature routes (modularized endpoints)
// -----------------------------------------------------------------------------
app.use("/api/banner", bannerRoutes);
app.use("/api/businessType", businessTypeRoutes);
app.use("/api/post", postRoutes);
app.use("/api/setting", settingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/walletTransaction", walletTransactionRoutes);
app.use("/api/referrer", referrerRoutes);
app.use("/api/notification", promotionalNotificationRoutes);
app.use("/api/creatooRequest", creatooRequestRoutes);
app.use("/api/reportedPost", reportedPostRoutes);
app.use("/api/admin", adminRouter);
app.use("/api/order", orderRoutes);
app.use("/api/withdrawRequest", withdrawRequestRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/points", pointsRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/opportunity", opportunityRouter);
app.use("/api/home", homeRouter);
app.use("/api/web", webapiRouter);
app.use("/api/cards", cardsRouter);
app.use("/api/visit", visitRoutes);
app.use("/api/version", versionRoutes);
app.use("/api/exclusiveOffer", exclusiveOfferRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/plan", planRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/manual-payment", manualPaymentRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/settlement", settlementRoutes);

// -----------------------------------------------------------------------------
// ⚠️ Global error handler
// -----------------------------------------------------------------------------
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
);

// -----------------------------------------------------------------------------
// 🗄️ Database initialization helper
// -----------------------------------------------------------------------------
/**
 * Function: startDb()
 * Role: Backend System
 * Description: Initializes database connection, runs migrations, and seeds data.
 * Params: None
 * Returns: Promise<{ status: boolean, message: string, details?: any }>
 * Used: Yes (in server.ts)
 */
export const startDb = async () => {
  try {
    const initResult = await databaseInitializer.initialize();
    
    if (initResult.success) {
      console.log('✅ Database initialization completed successfully');
      console.log(`📊 Total changes made: ${initResult.totalChanges || 0}`);
      
      // Log detailed changes if any were made
      if (initResult.migrationChanges && initResult.migrationChanges.length > 0) {
        console.log('🔄 Migration changes:');
        initResult.migrationChanges.forEach(change => console.log(`   ${change}`));
      }
      
      if (initResult.seedChanges && initResult.seedChanges.length > 0) {
        console.log('🌱 Seed changes:');
        initResult.seedChanges.forEach(change => console.log(`   ${change}`));
      }
      
      return { 
        status: true, 
        message: initResult.message,
        details: initResult
      };
    } else {
      console.error('❌ Database initialization failed:', initResult.message);
      return { 
        status: false, 
        message: initResult.message 
      };
    }
  } catch (err) {
    console.error("❌ Database initialization error:", err);
    return { status: false, message: String(err) };
  }
};

export default app;
