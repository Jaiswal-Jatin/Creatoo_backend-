"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ReferrerController_1 = __importDefault(require("../controllers/ReferrerController"));
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
router.get("/all", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => ReferrerController_1.default.index(req, res));
router.get("/add", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => ReferrerController_1.default.create(req, res));
router.post("/add", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => ReferrerController_1.default.store(req, res));
router.get("/edit/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => ReferrerController_1.default.edit(req, res));
router.post("/update/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => ReferrerController_1.default.update(req, res));
exports.default = router;
