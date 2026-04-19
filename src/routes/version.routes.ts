/**
 * Module: Backend (API Server)
 * File Purpose: Version Routes. Handles app version verification and lifecycle.
 * Used By: User Mobile App, Business Admin App, Admin Panel
 * API Connected: /api/version/*
 * Database Model: Version
 * Critical: Yes
 */
import { Router } from "express";
import VersionController from "../controllers/VersionController";
import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";  

const router = Router();

/**
 * Route: POST /api/version/verify
 * Role: Public/Shared
 * Description: Compares client app version with server's latest active version.
 */
router.post("/verify", (req, res) =>
  VersionController.verify(req, res)
);

/**
 * Route: GET /api/version/latest
 * Role: Public/Shared
 * Description: Returns the latest active version configuration.
 */
router.get("/latest", (req, res) =>
  VersionController.latest(req, res)
);

/**
 * Route: POST /api/version/
 * Role: Admin
 * Description: Creates a new app version record.
 */
router.post("/", authJwt, adminOnly, (req, res) =>
  VersionController.create(req as any, res)
);

/**
 * Route: PUT /api/version/:id
 * Role: Admin
 * Description: Updates an existing version's message or status.
 */
router.put("/:id", authJwt, adminOnly, (req, res) =>
  VersionController.update(req as any, res)
);

export default router;
