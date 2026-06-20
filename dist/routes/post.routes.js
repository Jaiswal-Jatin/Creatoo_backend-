"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Post Routes. Endpoints for business gig management and creator interactions.
 * Used By: Admin Panel, Business Admin App, User Mobile App
 * API Connected: /api/post/*
 * Database Model: Post, PostInterest
 * Critical: Yes
 * Notes: Shares endpoints for businesses to create posts and creators to interact with them.
 */
const express_1 = require("express");
const PostController_1 = __importDefault(require("../controllers/PostController"));
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const PostInterestController_1 = require("../controllers/PostInterestController");
const router = (0, express_1.Router)();
/**
 * Route: GET /api/post/all
 * Role: Admin
 * Description: Fetches all posts for auditing purposes.
 */
router.get("/all", authJwt_1.authJwt, adminOnly_1.adminOnly, PostController_1.default.getAllPostService);
/**
 * Route: POST /api/post/add
 * Role: Business Admin
 * Description: Business adds a new post (gig).
 */
router.post("/add", authJwt_1.authJwt, PostController_1.default.addPost);
/**
 * Route: GET /api/post/add
 * Role: Admin
 * Description: Placeholder for add post view.
 */
router.get("/add", authJwt_1.authJwt, adminOnly_1.adminOnly, PostController_1.default.postView);
/**
 * Route: GET /api/post/edit/:id
 * Role: Admin
 * Description: Fetches post data for editing.
 */
router.get("/edit/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, PostController_1.default.getEditPost);
/**
 * Route: POST /api/post/edit/:id
 * Role: Admin
 * Description: Updates post details (Admin view).
 */
router.post("/edit/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, PostController_1.default.updatePost);
/**
 * Route: GET /api/post/delete/:id
 * Role: Admin
 * Description: Deletes a post record.
 */
router.get("/delete/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, PostController_1.default.deletePost);
/**
 * Route: POST /api/post/change-status
 * Role: Admin
 * Description: Toggles post active/inactive status.
 */
router.post("/change-status", authJwt_1.authJwt, adminOnly_1.adminOnly, PostController_1.default.changeStatus);
/**
 * Route: GET /api/post/interests/:id
 * Role: Shared
 * Description: Retrieves interests/applications list for a specific post.
 */
router.get("/interests/:id", PostInterestController_1.getPostInterests);
/**
 * Route: POST /api/post/myPost
 * Role: Business Admin
 * Description: Lists posts created by the authenticated business.
 */
router.post("/myPost", authJwt_1.authJwt, PostController_1.default.myPost);
/**
 * Route: POST /api/post/postPaymentStatus
 * Role: Business Admin
 * Description: Updates the payment status of a post (post-checkout).
 */
router.post("/postPaymentStatus", authJwt_1.authJwt, PostController_1.default.postPaymentStatus);
/**
 * Route: POST /api/post/getPostApplicationList
 * Role: Shared
 * Description: Retrieves detailed application list for a post.
 */
router.post("/getPostApplicationList", authJwt_1.authJwt, PostController_1.default.getPostApplicationList);
/**
 * Route: POST /api/post/postInterest
 * Role: Creator
 * Description: Creator expresses interest/applies to a post.
 */
router.post("/postInterest", authJwt_1.authJwt, PostInterestController_1.postInterest);
/**
 * Route: POST /api/post/postReportRequest
 * Role: Creator
 * Description: Creator reports a fraudulent or inappropriate post.
 */
router.post("/postReportRequest", authJwt_1.authJwt, PostInterestController_1.postReportRequest);
exports.default = router;
