// src/routes/post.ts
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

router.get("/all", authJwt, adminOnly, PostController.getAllPostService);

router.post("/add", authJwt, PostController.addPost);

router.get("/add", authJwt, adminOnly, PostController.postView);

router.get("/edit/:id", authJwt, adminOnly, PostController.getEditPost);

router.post("/edit/:id", authJwt, adminOnly, PostController.updatePost);

router.get("/delete/:id", authJwt, adminOnly, PostController.deletePost);

router.post("/change-status", authJwt, adminOnly, PostController.changeStatus);

router.get("/interests/:id", getPostInterests);

router.post("/myPost", authJwt, PostController.myPost);

router.post(
  "/postPaymentStatus",
  authJwt, 
  PostController.postPaymentStatus
);

router.post(
  "/getPostApplicationList",
  authJwt, 
  PostController.getPostApplicationList
);

router.post(
  "/postInterest",
  authJwt, 
  postInterest
);

router.post(
  "/postReportRequest",
  authJwt, 
  postReportRequest
);

export default router;
