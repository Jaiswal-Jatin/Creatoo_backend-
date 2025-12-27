// src/routes/exclusiveOffer.routes.ts

import { Router } from "express";
import ExclusiveOfferController from "../controllers/ExclusiveOfferController";
import { uploadExclusiveImages } from "../middleware/uploadExclusiveImages";
import { authJwt } from "../middleware/authJwt";

const router = Router();

router.get("/all", authJwt, ExclusiveOfferController.getAll);

router.get("/by-business", authJwt, ExclusiveOfferController.getByBusiness);

router.get(
  "/by-business/:businessId",
  authJwt,
  ExclusiveOfferController.getByBusinessId
);

router.post(
  "/save",
  authJwt,
  uploadExclusiveImages,
  ExclusiveOfferController.saveByBusiness
);

router.delete("/:id", authJwt, ExclusiveOfferController.deleteOffer);

router.delete("/:id/image", authJwt, ExclusiveOfferController.deleteOneImage);

export default router;
