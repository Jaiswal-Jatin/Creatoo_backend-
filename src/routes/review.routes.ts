// src/routes/review.ts
import { Router } from "express";
import ReviewController from "../controllers/ReviewController";
import { authJwt } from "../middleware/authJwt";

const router = Router();

router.post("/reviewSubmit", authJwt, (req, res) =>
  ReviewController.reviewSubmit(req, res)
);

router.post("/skipReview", authJwt, (req, res) =>
  ReviewController.skipReview(req, res)
);

router.post("/ListOfAllReview", authJwt, (req, res) =>
  ReviewController.listOfAllReview(req, res)
);

router.post("/business-reviews", authJwt, (req, res) =>
  ReviewController.getBusinessReviews(req, res)
);

export default router;
