"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/card.ts
const express_1 = require("express");
const CardController_1 = __importDefault(require("../controllers/CardController"));
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
router.post("/verify", authJwt_1.authJwt, (req, res) => CardController_1.default.verify(req, res));
router.get("/info", authJwt_1.authJwt, (req, res) => CardController_1.default.info(req, res));
router.get("/info/number/:number", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => CardController_1.default.infoByNumber(req, res));
router.get("/check", authJwt_1.authJwt, (req, res) => CardController_1.default.checkUserCard(req, res));
router.post("/reset/:number", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => CardController_1.default.resetByNumber(req, res));
router.post("/add", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => CardController_1.default.addCards(req, res));
exports.default = router;
