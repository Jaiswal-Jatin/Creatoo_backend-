"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Opportunity Routes. Discovery endpoints for creators to find gigs.
 * Used By: User Mobile App
 * API Connected: /api/opportunity/*
 * Database Model: Post
 * Critical: Yes
 */
const express_1 = require("express");
const OpportunityController_1 = __importDefault(require("../controllers/OpportunityController"));
const authJwt_1 = require("../middleware/authJwt");
const router = (0, express_1.Router)();
/**
 * Route: POST /api/opportunity/getOpportunityDetails
 * Role: Creator
 * Description: Fetches full details for a specific gig, including application status.
 */
router.post("/getOpportunityDetails", authJwt_1.authJwt, (req, res) => OpportunityController_1.default.getOpportunityDetails(req, res));
/**
 * Route: POST /api/opportunity/getAllOpportunities
 * Role: Creator
 * Description: Fetches list of opportunities based on search key (all, applied, ongoing, completed).
 */
router.post("/getAllOpportunities", authJwt_1.authJwt, (req, res) => OpportunityController_1.default.getAllOpportunities(req, res));
exports.default = router;
