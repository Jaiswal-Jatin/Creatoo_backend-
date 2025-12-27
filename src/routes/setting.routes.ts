import { Router } from "express";
import SettingController from "../controllers/SettingController";
import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

router.get("/edit/:id", authJwt, adminOnly, SettingController.getEditSetting);
router.put("/edit/:id", authJwt, adminOnly, SettingController.updateSetting);

router.post(
  "/setting",
  authJwt,
  (req, res) => SettingController.getBusinessSetting(req, res)
);

router.post(
  "/businessSetting",
  authJwt,
  (req, res) => SettingController.updateBusinessSetting(req, res)
);

router.post(
  "/getBusinessSetting",
  authJwt,
  (req, res) => SettingController.getBusinessSettingDetails(req, res)
);

export default router;
