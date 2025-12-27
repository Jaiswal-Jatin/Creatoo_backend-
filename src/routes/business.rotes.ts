// src/routes/business.ts
import { Router } from "express";
import BusinessController from "../controllers/BusinessController";
import { authJwt } from "../middleware/authJwt";
import multer from "multer";

const router = Router();

// Memory storage (NO LOCAL SAVE)
const upload = multer({ storage: multer.memoryStorage() });

// Prefix: /api/business

router.post("/setDiscount", authJwt, BusinessController.setDiscount);

router.post(
  "/businessDescription",
  authJwt,
  upload.fields([
    { name: "business_image", maxCount: 1 },

    { name: "menu_card_1", maxCount: 1 },
    { name: "menu_card_2", maxCount: 1 },
    { name: "menu_card_3", maxCount: 1 },
    { name: "menu_card_4", maxCount: 1 },
    { name: "menu_card_5", maxCount: 1 },

    { name: "business_image_1", maxCount: 1 },
    { name: "business_image_2", maxCount: 1 },
    { name: "business_image_3", maxCount: 1 },
    { name: "business_image_4", maxCount: 1 },
    { name: "business_image_5", maxCount: 1 },
  ]),
  BusinessController.businessDescription
);

router.post(
  "/getBusinessList",
  authJwt,
  BusinessController.getBusinessList
);

router.post("/customerSummary",  authJwt,
 BusinessController.customerSummary);


export default router;
