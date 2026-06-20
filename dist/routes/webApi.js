"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/webApi.routes.ts
const express_1 = require("express");
const WebApiController_1 = __importDefault(require("../controllers/WebApiController"));
const authJwt_1 = require("../middleware/authJwt");
const router = (0, express_1.Router)();
router.post("/NewNotificationList", authJwt_1.authJwt, (req, res) => WebApiController_1.default.newNotificationList(req, res));
router.post("/createOrder", authJwt_1.authJwt, (req, res) => WebApiController_1.default.createOrder(req, res));
router.post("/applyOffers", authJwt_1.authJwt, (req, res) => WebApiController_1.default.applyOffers(req, res));
exports.default = router;
