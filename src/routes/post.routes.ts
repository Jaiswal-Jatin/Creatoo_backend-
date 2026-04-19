/**
 * Module: Backend (API Server)
 * File Purpose: Post Routes. Endpoints for business gig management and creator interactions.
 * Used By: Admin Panel, Business Admin App, User Mobile App
 * API Connected: /api/post/*
 * Database Model: Post, PostInterest
 * Critical: Yes
 * Notes: Shares endpoints for businesses to create posts and creators to interact with them.
 */
import { Router } from "express";
import PostController from "../controllers/PostController";
import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";
import {
  getPostInterests,
  postInterest,
  postReportRequest,
} from "../controllers/PostInterestController";

const router = Router();

/**
 * Route: GET /api/post/all
 * Role: Admin
 * Description: Fetches all posts for auditing purposes.
 */
router.get("/all", authJwt, adminOnly, PostController.getAllPostService);

/**
 * Route: POST /api/post/add
 * Role: Business Admin
 * Description: Business adds a new post (gig).
 */
router.post("/add", authJwt, PostController.addPost);

/**
 * Route: GET /api/post/add
 * Role: Admin
 * Description: Placeholder for add post view.
 */
router.get("/add", authJwt, adminOnly, PostController.postView);

/**
 * Route: GET /api/post/edit/:id
 * Role: Admin
 * Description: Fetches post data for editing.
 */
router.get("/edit/:id", authJwt, adminOnly, PostController.getEditPost);

/**
 * Route: POST /api/post/edit/:id
 * Role: Admin
 * Description: Updates post details (Admin view).
 */
router.post("/edit/:id", authJwt, adminOnly, PostController.updatePost);

/**
 * Route: GET /api/post/delete/:id
 * Role: Admin
 * Description: Deletes a post record.
 */
router.get("/delete/:id", authJwt, adminOnly, PostController.deletePost);

/**
 * Route: POST /api/post/change-status
 * Role: Admin
 * Description: Toggles post active/inactive status.
 */
router.post("/change-status", authJwt, adminOnly, PostController.changeStatus);

/**
 * Route: GET /api/post/interests/:id
 * Role: Shared
 * Description: Retrieves interests/applications list for a specific post.
 */
router.get("/interests/:id", getPostInterests);

/**
 * Route: POST /api/post/myPost
 * Role: Business Admin
 * Description: Lists posts created by the authenticated business.
 */
router.post("/myPost", authJwt, PostController.myPost);

/**
 * Route: POST /api/post/postPaymentStatus
 * Role: Business Admin
 * Description: Updates the payment status of a post (post-checkout).
 */
router.post(
  "/postPaymentStatus",
  authJwt, 
  PostController.postPaymentStatus
);

/**
 * Route: POST /api/post/getPostApplicationList
 * Role: Shared
 * Description: Retrieves detailed application list for a post.
 */
router.post(
  "/getPostApplicationList",
  authJwt, 
  PostController.getPostApplicationList
);

/**
 * Route: POST /api/post/postInterest
 * Role: Creator
 * Description: Creator expresses interest/applies to a post.
 */
router.post(
  "/postInterest",
  authJwt, 
  postInterest
);

/**
 * Route: POST /api/post/postReportRequest
 * Role: Creator
 * Description: Creator reports a fraudulent or inappropriate post.
 */
router.post(
  "/postReportRequest",
  authJwt, 
  postReportRequest
);

export default router;
