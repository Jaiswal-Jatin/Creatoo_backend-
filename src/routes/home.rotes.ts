// src/routes/home.ts
import { Router } from "express";
import HomeController from "../controllers/HomeController";
import { authJwt } from "../middleware/authJwt";

const router = Router();

router.post("/getHomeData", authJwt, (req, res) =>
  HomeController.getHomeData(req, res)
);

router.post("/getCreatorHome", authJwt, (req, res) =>
  HomeController.getCreatorHome(req, res)
);

router.post("/getCreatorContact", authJwt, (req, res) =>
  HomeController.getCreatorContact(req, res)
);

export default router;
