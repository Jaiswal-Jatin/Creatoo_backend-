"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/reportedPost.routes.ts
const express_1 = require("express");
const ReportedPostController_1 = __importDefault(require("../controllers/ReportedPostController"));
const authJwt_1 = require("../middleware/authJwt");
const router = (0, express_1.Router)();
router.get("/all", authJwt_1.authJwt, (req, res) => ReportedPostController_1.default.getAllReportedPostService(req, res));
router.get("/getUserReportedPost", authJwt_1.authJwt, (req, res) => ReportedPostController_1.default.getUserReportedPost(req, res));
router.post("/approve", authJwt_1.authJwt, (req, res) => ReportedPostController_1.default.approveReport(req, res));
router.post("/reject", authJwt_1.authJwt, (req, res) => ReportedPostController_1.default.rejectReport(req, res));
router.post("/change-status", authJwt_1.authJwt, (req, res) => ReportedPostController_1.default.changeStatus(req, res));
exports.default = router;
