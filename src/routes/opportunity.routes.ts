/**
 * Module: Backend (API Server)
 * File Purpose: Opportunity Routes. Discovery endpoints for creators to find gigs.
 * Used By: User Mobile App
 * API Connected: /api/opportunity/*
 * Database Model: Post
 * Critical: Yes
 */
import { Router } from "express";
import OpportunityController from "../controllers/OpportunityController";
import { authJwt } from "../middleware/authJwt";

const router = Router();

/**
 * Route: POST /api/opportunity/getOpportunityDetails
 * Role: Creator
 * Description: Fetches full details for a specific gig, including application status.
 */
router.post("/getOpportunityDetails", authJwt, (req, res) =>
  OpportunityController.getOpportunityDetails(req, res)
);

/**
 * Route: POST /api/opportunity/getAllOpportunities
 * Role: Creator
 * Description: Fetches list of opportunities based on search key (all, applied, ongoing, completed).
 */
router.post("/getAllOpportunities", authJwt, (req, res) =>
  OpportunityController.getAllOpportunities(req, res)
);

export default router;
