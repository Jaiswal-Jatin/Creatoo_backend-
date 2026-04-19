/**
 * Module: Backend (API Server)
 * File Purpose: Home Routes. Consolidated endpoints for the mobile home screens.
 * Used By: User Mobile App, Business Admin App
 * API Connected: /api/home/*
 * Database Model: Multi-model (Banner, User, Post, etc.)
 * Critical: Yes
 */
import { Router } from "express";
import HomeController from "../controllers/HomeController";
import { authJwt } from "../middleware/authJwt";

const router = Router();

/**
 * Route: POST /api/home/getHomeData
 * Role: Shared (Creator/Business)
 * Description: Fetches banners, top picks, and dynamic discount data for the main home feed.
 */
router.post("/getHomeData", authJwt, (req, res) =>
  HomeController.getHomeData(req, res)
);

/**
 * Route: POST /api/home/getCreatorHome
 * Role: Creator
 * Description: Fetches aggregate counts (applied, ongoing, etc.) specific to the creator's dashboard.
 */
router.post("/getCreatorHome", authJwt, (req, res) =>
  HomeController.getCreatorHome(req, res)
);

/**
 * Route: POST /api/home/getCreatorContact
 * Role: Business Admin
 * Description: Fetches contact details for creators interested in a specific business post.
 */
router.post("/getCreatorContact", authJwt, (req, res) =>
  HomeController.getCreatorContact(req, res)
);

export default router;
