import { Router } from "express";
import ReferrerController from "../controllers/ReferrerController";
import { authJwt } from "../middleware/authJwt";        
import { adminOnly } from "../middleware/adminOnly";    

const router = Router();


router.get(
  "/all",
  authJwt,
  adminOnly,
  (req, res) => ReferrerController.index(req, res)
);

router.get(
  "/add",
  authJwt,
  adminOnly,
  (req, res) => ReferrerController.create(req, res)
);

router.post(
  "/add",
  authJwt,
  adminOnly,
  (req, res) => ReferrerController.store(req, res)
);

router.get(
  "/edit/:id",
  authJwt,
  adminOnly,
  (req, res) => ReferrerController.edit(req, res)
);

router.post(
  "/update/:id",
  authJwt,
  adminOnly,
  (req, res) => ReferrerController.update(req, res)
);

export default router;
