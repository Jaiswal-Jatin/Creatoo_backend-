/**
 * Module: Backend (API Server)
 * File Purpose: User Routes. Handles Creator and Business management for Admins and search for Users.
 * Used By: Admin Panel, User Mobile App, Business Admin App
 * API Connected: /api/users/*
 * Database Model: User
 * Critical: Yes
 * Notes: Includes Admin-only management routes and shared search endpoints.
 */
import { Router } from "express";
import { userController } from "../controllers/UserController";
import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

/**
 * Admin Management Routes (Protected by adminOnly)
 */
router.get(
  "/business/all",
  authJwt,
  adminOnly,
  (req, res) => userController.getAllUsers(req, res, 2)
);

router.get(
  "/creator/all",
  authJwt,
  adminOnly,
  (req, res) => userController.getAllUsers(req, res, 3)
);

router.get(
  "/creator/instagram",
  authJwt,
  adminOnly,
  (req, res) => userController.getInstagramUsers(req, res)
);

router.post(
  "/business/change-status",
  authJwt,
  adminOnly,
  (req, res) => userController.changeStatus(req, res)
);

router.post(
  "/creator/change-status",
  authJwt,
  adminOnly,
  (req, res) => userController.changeStatus(req, res)
);

router.get(
  "/business/edit/:id",
  authJwt,
  adminOnly,
  (req, res) => userController.getEditBusiness(req, res)
);

router.post(
  "/business/edit/:id",
  authJwt,
  adminOnly,
  (req, res) => userController.updateBusiness(req, res)
);

router.get(
  "/creator/edit/:id",
  authJwt,
  adminOnly,
  (req, res) => userController.getEditCreator(req, res)
);

router.post(
  "/creator/edit/:id",
  authJwt,
  adminOnly,
  (req, res) => userController.updateCreator(req, res)
);

router.get(
  "/creator/editInstagram/:id",
  authJwt,
  adminOnly,
  (req, res) => userController.getEditInstagram(req, res)
);

router.post(
  "/creator/editInstagram/:id",
  authJwt,
  adminOnly,
  (req, res) => userController.updateInstagram(req, res)
);

router.post(
  "/update-is-top",
  authJwt,
  adminOnly,
  (req, res) => userController.updateIsTop(req, res)
);

/**
 * Shared Search & Utility Routes
 */
router.post(
  "/search",
  authJwt,
  (req, res) => userController.searchUser(req, res)
);

router.post(
  "/searchBusinessAndCreator",
  authJwt,
  (req, res) => userController.searchBusinessAndCreator(req, res)
);

router.post(
  "/inactiveUser",
  authJwt,       
  (req, res) => userController.inactiveUser(req, res)
);

export default router;
