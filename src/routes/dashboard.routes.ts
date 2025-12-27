import { Router } from "express";
import { getCounts } from "../controllers/DashboardController";
import { authJwt } from "../middleware/authJwt";        
import { adminOnly } from "../middleware/adminOnly";    

const router = Router();

router.get(
  "/data-counts",
  authJwt,
  adminOnly,
  getCounts
);

export default router;
