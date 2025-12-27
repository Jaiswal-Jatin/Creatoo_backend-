// src/routes/cart.ts
import { Router } from "express";
import CartController from "../controllers/CartController";
import { authJwt } from "../middleware/authJwt";

const router = Router();

router.post("/addCart", authJwt, (req, res) =>
  CartController.addCart(req, res)
);

router.post("/addShortlist", authJwt, (req, res) =>
  CartController.addShortlist(req, res)
);

export default router;
