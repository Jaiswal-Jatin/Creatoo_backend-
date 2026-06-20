"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Version Routes. Handles app version verification and lifecycle.
 * Used By: User Mobile App, Business Admin App, Admin Panel
 * API Connected: /api/version/*
 * Database Model: Version
 * Critical: Yes
 */
const express_1 = require("express");
const VersionController_1 = __importDefault(require("../controllers/VersionController"));
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
/**
 * Route: POST /api/version/verify
 * Role: Public/Shared
 * Description: Compares client app version with server's latest active version.
 */
router.post("/verify", (req, res) => VersionController_1.default.verify(req, res));
/**
 * Route: GET /api/version/latest
 * Role: Public/Shared
 * Description: Returns the latest active version configuration.
 */
router.get("/latest", (req, res) => VersionController_1.default.latest(req, res));
/**
 * Route: POST /api/version/
 * Role: Admin
 * Description: Creates a new app version record.
 */
router.post("/", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => VersionController_1.default.create(req, res));
/**
 * Route: PUT /api/version/:id
 * Role: Admin
 * Description: Updates an existing version's message or status.
 */
router.put("/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => VersionController_1.default.update(req, res));
exports.default = router;
