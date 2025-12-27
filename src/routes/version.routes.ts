// src/routes/version.ts
import { Router } from "express";
import VersionController from "../controllers/VersionController";
import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";  

const router = Router();


router.post("/verify", (req, res) =>
  VersionController.verify(req, res)
);

router.get("/latest", (req, res) =>
  VersionController.latest(req, res)
);

router.post("/", authJwt, adminOnly, (req, res) =>
  VersionController.create(req as any, res)
);

router.put("/:id", authJwt, adminOnly, (req, res) =>
  VersionController.update(req as any, res)
);

export default router;
