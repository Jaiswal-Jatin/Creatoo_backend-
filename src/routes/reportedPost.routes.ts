// src/routes/reportedPost.routes.ts
import { Router } from "express";
import ReportedPostController from "../controllers/ReportedPostController";
import { authJwt } from "../middleware/authJwt";

const router = Router();

router.get(
  "/all",
  authJwt,
  (req, res) => ReportedPostController.getAllReportedPostService(req, res)
);

router.get(
  "/getUserReportedPost",
  authJwt,
  (req, res) => ReportedPostController.getUserReportedPost(req, res)
);

router.post(
  "/approve",
  authJwt,
  (req, res) => ReportedPostController.approveReport(req, res)
);

router.post(
  "/reject",
  authJwt,
  (req, res) => ReportedPostController.rejectReport(req, res)
);

router.post(
  "/change-status",
  authJwt,
  (req, res) => ReportedPostController.changeStatus(req, res)
);

export default router;
