"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PromotionalNotificationController_1 = __importDefault(require("../controllers/PromotionalNotificationController"));
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
// ✅ Promotional Notifications (type = 1)
router.get("/promotional/all", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => PromotionalNotificationController_1.default.index(req, res));
// ✅ Send Notification By ID (from DB)
router.get("/send/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => PromotionalNotificationController_1.default.sendNotification(req, res));
// ✅ Dynamic Notifications (type = 2)
router.get("/dynamic/all", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => PromotionalNotificationController_1.default.dynamicNotification(req, res));
// ✅ Festival Notifications (type = 3)
router.get("/festival/all", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => PromotionalNotificationController_1.default.festivalNotification(req, res));
// ✅ Custom Notifications (type = 4)
router.get("/custom/all", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => PromotionalNotificationController_1.default.customNotification(req, res));
// ✅ Helper route
router.get("/custom/add", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => PromotionalNotificationController_1.default.addNotification(req, res));
// ✅ Create custom notification
router.post("/custom/store", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => PromotionalNotificationController_1.default.storeCustomNotification(req, res));
// ✅ Get custom notification for edit
router.get("/custom/edit/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => PromotionalNotificationController_1.default.editNotification(req, res));
// ✅ Update custom notification
router.post("/custom/update/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => PromotionalNotificationController_1.default.updateNotification(req, res));
// ✅ Send notification to ALL users (from payload)
router.post("/send-all", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => PromotionalNotificationController_1.default.sendAllUsers(req, res));
// ✅ ✅ Send notification to SPECIFIC users
router.post("/send-users", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => PromotionalNotificationController_1.default.sendSpecificUsers(req, res));
// ✅ ✅ View logs (latest 200)
router.get("/logs", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => PromotionalNotificationController_1.default.logs(req, res));
// ✅ ✅ View logs by user_id
router.get("/logs/:user_id", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => PromotionalNotificationController_1.default.logsByUser(req, res));
exports.default = router;
