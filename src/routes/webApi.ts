// src/routes/webApi.routes.ts
import { Router } from "express";
import WebApiController from "../controllers/WebApiController";
import { authJwt } from "../middleware/authJwt";

const router = Router();

router.post(
  "/NewNotificationList",
  authJwt,
  (req, res) => WebApiController.newNotificationList(req, res)
);

router.post(
  "/createOrder",
  authJwt,
  (req, res) => WebApiController.createOrder(req, res)
);

router.post(
  "/applyOffers",
  authJwt,
  (req, res) => WebApiController.applyOffers(req, res)
);

export default router;
