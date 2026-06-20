"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/review.ts
const express_1 = require("express");
const ReviewController_1 = __importDefault(require("../controllers/ReviewController"));
const authJwt_1 = require("../middleware/authJwt");
const router = (0, express_1.Router)();
router.post("/reviewSubmit", authJwt_1.authJwt, (req, res) => ReviewController_1.default.reviewSubmit(req, res));
router.post("/skipReview", authJwt_1.authJwt, (req, res) => ReviewController_1.default.skipReview(req, res));
router.post("/ListOfAllReview", authJwt_1.authJwt, (req, res) => ReviewController_1.default.listOfAllReview(req, res));
router.post("/business-reviews", authJwt_1.authJwt, (req, res) => ReviewController_1.default.getBusinessReviews(req, res));
exports.default = router;
