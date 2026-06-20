"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: User Routes. Handles Creator and Business management for Admins and search for Users.
 * Used By: Admin Panel, User Mobile App, Business Admin App
 * API Connected: /api/users/*
 * Database Model: User
 * Critical: Yes
 * Notes: Includes Admin-only management routes and shared search endpoints.
 */
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
/**
 * Admin Management Routes (Protected by adminOnly)
 */
router.get("/business/all", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => UserController_1.userController.getAllUsers(req, res, 2));
router.get("/creator/all", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => UserController_1.userController.getAllUsers(req, res, 3));
router.get("/creator/instagram", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => UserController_1.userController.getInstagramUsers(req, res));
router.post("/business/change-status", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => UserController_1.userController.changeStatus(req, res));
router.post("/creator/change-status", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => UserController_1.userController.changeStatus(req, res));
router.get("/business/edit/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => UserController_1.userController.getEditBusiness(req, res));
router.post("/business/edit/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => UserController_1.userController.updateBusiness(req, res));
router.get("/creator/edit/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => UserController_1.userController.getEditCreator(req, res));
router.post("/creator/edit/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => UserController_1.userController.updateCreator(req, res));
router.get("/creator/editInstagram/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => UserController_1.userController.getEditInstagram(req, res));
router.post("/creator/editInstagram/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => UserController_1.userController.updateInstagram(req, res));
router.post("/update-is-top", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => UserController_1.userController.updateIsTop(req, res));
/**
 * Shared Search & Utility Routes
 */
router.post("/search", authJwt_1.authJwt, (req, res) => UserController_1.userController.searchUser(req, res));
router.post("/searchBusinessAndCreator", authJwt_1.authJwt, (req, res) => UserController_1.userController.searchBusinessAndCreator(req, res));
router.post("/inactiveUser", authJwt_1.authJwt, (req, res) => UserController_1.userController.inactiveUser(req, res));
router.post("/getBusinessByUpiId", authJwt_1.authJwt, (req, res) => UserController_1.userController.getBusinessByUpiId(req, res));
exports.default = router;
