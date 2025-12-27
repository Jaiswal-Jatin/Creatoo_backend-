// src/routes/points.routes.ts
import { Router } from "express";
import PointsController from "../controllers/PointsController";
import { authJwt } from "../middleware/authJwt";

const router = Router();

router.post(
  "/creatooPointsTransaction",
  authJwt,
  (req, res) => PointsController.creatooPointsTransaction(req, res)
);

router.post(
  "/businessPointsTransaction",
  authJwt,
  (req, res) => PointsController.businessPointsTransaction(req, res)
);

router.post(
  "/validateCreatooPoints",
  authJwt,
  (req, res) => PointsController.validateCreatooPoints(req, res)
);

router.post(
  "/transferCreatooPoints",
  authJwt,
  (req, res) => PointsController.transferCreatooPoints(req, res)
);

export default router;
