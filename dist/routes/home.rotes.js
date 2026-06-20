"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Home Routes. Consolidated endpoints for the mobile home screens.
 * Used By: User Mobile App, Business Admin App
 * API Connected: /api/home/*
 * Database Model: Multi-model (Banner, User, Post, etc.)
 * Critical: Yes
 */
const express_1 = require("express");
const HomeController_1 = __importDefault(require("../controllers/HomeController"));
const authJwt_1 = require("../middleware/authJwt");
const router = (0, express_1.Router)();
/**
 * Route: POST /api/home/getHomeData
 * Role: Shared (Creator/Business)
 * Description: Fetches banners, top picks, and dynamic discount data for the main home feed.
 */
router.post("/getHomeData", authJwt_1.authJwt, (req, res) => HomeController_1.default.getHomeData(req, res));
/**
 * Route: POST /api/home/getCreatorHome
 * Role: Creator
 * Description: Fetches aggregate counts (applied, ongoing, etc.) specific to the creator's dashboard.
 */
router.post("/getCreatorHome", authJwt_1.authJwt, (req, res) => HomeController_1.default.getCreatorHome(req, res));
/**
 * Route: POST /api/home/getCreatorContact
 * Role: Business Admin
 * Description: Fetches contact details for creators interested in a specific business post.
 */
router.post("/getCreatorContact", authJwt_1.authJwt, (req, res) => HomeController_1.default.getCreatorContact(req, res));
exports.default = router;
