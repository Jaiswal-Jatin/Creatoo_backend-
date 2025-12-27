import { Router } from "express";
import * as OrderController from "../controllers/OrderController";
import { authJwt } from "../middleware/authJwt";        
import { adminOnly } from "../middleware/adminOnly";    

const router = Router();


router.get(
  "/all",
  authJwt,
  adminOnly,
  OrderController.index
);

router.get(
  "/details/:order_id",
  authJwt,
  adminOnly,
  OrderController.showDetails
);

export default router;
