"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDb = void 0;
/**
 * Module: Backend (API Server)
 * File Purpose: Express Application Configuration. Sets up middleware, routes, and database sync logic.
 * Used By: Backend System / All Roles via API
 * API Connected: All API Endpoints defined in routes/
 * Database Model: Synchronizes all models defined in the system.
 * Critical: Yes
 * Notes: Central hub for all route registrations and global middleware.
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes")); // base/index routes
const db_init_1 = __importDefault(require("./config/db-init"));
const env_1 = __importDefault(require("./config/env"));
// Feature-specific route modules
const banner_routes_1 = __importDefault(require("./routes/banner.routes"));
const businessType_routes_1 = __importDefault(require("./routes/businessType.routes"));
const post_routes_1 = __importDefault(require("./routes/post.routes"));
const setting_routes_1 = __importDefault(require("./routes/setting.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const walletTransaction_routes_1 = __importDefault(require("./routes/walletTransaction.routes"));
const referrer_routes_1 = __importDefault(require("./routes/referrer.routes"));
const promotionalNotification_routes_1 = __importDefault(require("./routes/promotionalNotification.routes"));
const creatooRequest_routes_1 = __importDefault(require("./routes/creatooRequest.routes"));
const reportedPost_routes_1 = __importDefault(require("./routes/reportedPost.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const withdrawRequest_routes_1 = __importDefault(require("./routes/withdrawRequest.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const cart_1 = __importDefault(require("./routes/cart"));
const points_routes_1 = __importDefault(require("./routes/points.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const business_rotes_1 = __importDefault(require("./routes/business.rotes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
const opportunity_routes_1 = __importDefault(require("./routes/opportunity.routes"));
const home_rotes_1 = __importDefault(require("./routes/home.rotes"));
const webApi_1 = __importDefault(require("./routes/webApi"));
const card_routes_1 = __importDefault(require("./routes/card.routes"));
const visit_routes_1 = __importDefault(require("./routes/visit.routes"));
const version_routes_1 = __importDefault(require("./routes/version.routes"));
const exclusiveOffer_routes_1 = __importDefault(require("./routes/exclusiveOffer.routes"));
const legal_1 = __importDefault(require("./routes/legal"));
const subscription_routes_1 = __importDefault(require("./routes/subscription.routes"));
const manualPayment_routes_1 = __importDefault(require("./routes/manualPayment.routes"));
const plan_routes_1 = __importDefault(require("./routes/plan.routes"));
const stats_routes_1 = __importDefault(require("./routes/stats.routes"));
const scan_routes_1 = __importDefault(require("./routes/scan.routes"));
const booking_routes_1 = __importDefault(require("./routes/booking.routes"));
const settlement_routes_1 = __importDefault(require("./routes/settlement.routes"));
const app = (0, express_1.default)();
// -----------------------------------------------------------------------------
// 🗂 Ensure upload directory exists (env.UPLOAD_DIR, usually "public")
// -----------------------------------------------------------------------------
const uploadRoot = path_1.default.isAbsolute(env_1.default.UPLOAD_DIR)
    ? env_1.default.UPLOAD_DIR
    : path_1.default.join(process.cwd(), env_1.default.UPLOAD_DIR || "public");
if (!fs_1.default.existsSync(uploadRoot)) {
    fs_1.default.mkdirSync(uploadRoot, { recursive: true });
}
// -----------------------------------------------------------------------------
// 🧱 Core middlewares
// -----------------------------------------------------------------------------
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// ✅ API Request Logger — prints every request to terminal
app.use((req, _res, next) => {
    console.log(`\x1b[36m[${new Date().toLocaleTimeString()}] ➡️  ${req.method} ${req.originalUrl}\x1b[0m`);
    next();
});
app.use((0, morgan_1.default)(":method :url :status - :response-time ms"));
// Serve all public files
app.use("/public", express_1.default.static(uploadRoot));
// 📌 Serve Android App Links file at:
//     https://api.tapbill.in/.well-known/assetlinks.json
app.use("/.well-known", express_1.default.static(path_1.default.join(uploadRoot, ".well-known")));
// -----------------------------------------------------------------------------
// 🚀 Main API routes (base)
// -----------------------------------------------------------------------------
app.use("/api", routes_1.default);
// -----------------------------------------------------------------------------
// 📃 Legal pages (HTML responses)
// -----------------------------------------------------------------------------
app.use("/api", legal_1.default);
// -----------------------------------------------------------------------------
// 🧩 Feature routes (modularized endpoints)
// -----------------------------------------------------------------------------
app.use("/api/banner", banner_routes_1.default);
app.use("/api/businessType", businessType_routes_1.default);
app.use("/api/post", post_routes_1.default);
app.use("/api/setting", setting_routes_1.default);
app.use("/api/users", user_routes_1.default);
app.use("/api/walletTransaction", walletTransaction_routes_1.default);
app.use("/api/referrer", referrer_routes_1.default);
app.use("/api/notification", promotionalNotification_routes_1.default);
app.use("/api/creatooRequest", creatooRequest_routes_1.default);
app.use("/api/reportedPost", reportedPost_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/order", order_routes_1.default);
app.use("/api/withdrawRequest", withdrawRequest_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
app.use("/api/cart", cart_1.default);
app.use("/api/points", points_routes_1.default);
app.use("/api/payment", payment_routes_1.default);
app.use("/api/business", business_rotes_1.default);
app.use("/api/review", review_routes_1.default);
app.use("/api/opportunity", opportunity_routes_1.default);
app.use("/api/home", home_rotes_1.default);
app.use("/api/web", webApi_1.default);
app.use("/api/cards", card_routes_1.default);
app.use("/api/visit", visit_routes_1.default);
app.use("/api/version", version_routes_1.default);
app.use("/api/exclusiveOffer", exclusiveOffer_routes_1.default);
app.use("/api/subscription", subscription_routes_1.default);
app.use("/api/plan", plan_routes_1.default);
app.use("/api/stats", stats_routes_1.default);
app.use("/api/scan", scan_routes_1.default);
app.use("/api/manual-payment", manualPayment_routes_1.default);
app.use("/api/booking", booking_routes_1.default);
app.use("/api/settlement", settlement_routes_1.default);
// -----------------------------------------------------------------------------
// ⚠️ Global error handler
// -----------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ status: false, message: "Internal server error" });
});
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
const startDb = async () => {
    try {
        const initResult = await db_init_1.default.initialize();
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
        }
        else {
            console.error('❌ Database initialization failed:', initResult.message);
            return {
                status: false,
                message: initResult.message
            };
        }
    }
    catch (err) {
        console.error("❌ Database initialization error:", err);
        return { status: false, message: String(err) };
    }
};
exports.startDb = startDb;
exports.default = app;
