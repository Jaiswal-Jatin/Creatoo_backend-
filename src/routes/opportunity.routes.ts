// src/routes/opportunity.ts
import { Router } from "express";
import OpportunityController from "../controllers/OpportunityController";
import { authJwt } from "../middleware/authJwt";

const router = Router();


router.post("/getOpportunityDetails", authJwt, (req, res) =>
  OpportunityController.getOpportunityDetails(req, res)
);

router.post("/getAllOpportunities", authJwt, (req, res) =>
  OpportunityController.getAllOpportunities(req, res)
);

export default router;
