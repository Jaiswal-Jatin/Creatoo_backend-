import { Router } from "express";
import PromotionalNotificationController from "../controllers/PromotionalNotificationController";
import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

// ✅ Promotional Notifications (type = 1)
router.get("/promotional/all", authJwt, adminOnly, (req, res) =>
  PromotionalNotificationController.index(req, res)
);

// ✅ Send Notification By ID (from DB)
router.get("/send/:id", authJwt, adminOnly, (req, res) =>
  PromotionalNotificationController.sendNotification(req, res)
);

// ✅ Dynamic Notifications (type = 2)
router.get("/dynamic/all", authJwt, adminOnly, (req, res) =>
  PromotionalNotificationController.dynamicNotification(req, res)
);

// ✅ Festival Notifications (type = 3)
router.get("/festival/all", authJwt, adminOnly, (req, res) =>
  PromotionalNotificationController.festivalNotification(req, res)
);

// ✅ Custom Notifications (type = 4)
router.get("/custom/all", authJwt, adminOnly, (req, res) =>
  PromotionalNotificationController.customNotification(req, res)
);

// ✅ Helper route
router.get("/custom/add", authJwt, adminOnly, (req, res) =>
  PromotionalNotificationController.addNotification(req, res)
);

// ✅ Create custom notification
router.post("/custom/store", authJwt, adminOnly, (req, res) =>
  PromotionalNotificationController.storeCustomNotification(req, res)
);

// ✅ Get custom notification for edit
router.get("/custom/edit/:id", authJwt, adminOnly, (req, res) =>
  PromotionalNotificationController.editNotification(req, res)
);

// ✅ Update custom notification
router.post("/custom/update/:id", authJwt, adminOnly, (req, res) =>
  PromotionalNotificationController.updateNotification(req, res)
);

// ✅ Send notification to ALL users (from payload)
router.post("/send-all", authJwt, adminOnly, (req, res) =>
  PromotionalNotificationController.sendAllUsers(req, res)
);

// ✅ ✅ Send notification to SPECIFIC users
router.post("/send-users", authJwt, adminOnly, (req, res) =>
  PromotionalNotificationController.sendSpecificUsers(req, res)
);

// ✅ ✅ View logs (latest 200)
router.get("/logs", authJwt, adminOnly, (req, res) =>
  PromotionalNotificationController.logs(req, res)
);

// ✅ ✅ View logs by user_id
router.get("/logs/:user_id", authJwt, adminOnly, (req, res) =>
  PromotionalNotificationController.logsByUser(req, res)
);

export default router;
