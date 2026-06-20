"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const VisitController_1 = __importDefault(require("../controllers/VisitController"));
const authJwt_1 = require("../middleware/authJwt");
const router = (0, express_1.Router)();
router.get("/", authJwt_1.authJwt, (req, res) => VisitController_1.default.getVisitInfo(req, res));
router.post("/", authJwt_1.authJwt, (req, res) => VisitController_1.default.createVisit(req, res));
router.get("/history", authJwt_1.authJwt, (req, res) => VisitController_1.default.history(req, res));
router.get("/business-visits", authJwt_1.authJwt, (req, res) => VisitController_1.default.getBusinessVisits(req, res));
router.get("/user-history", authJwt_1.authJwt, (req, res) => VisitController_1.default.userHistory(req, res));
router.get("/user-all-history", authJwt_1.authJwt, (req, res) => VisitController_1.default.userAllHistory(req, res));
exports.default = router;
