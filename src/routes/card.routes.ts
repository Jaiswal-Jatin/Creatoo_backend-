// src/routes/card.ts
import { Router } from "express";
import CardController from "../controllers/CardController";
import { authJwt } from "../middleware/authJwt";
import { adminOnly } from '../middleware/adminOnly';

const router = Router();



router.post("/verify", authJwt, (req, res) =>
  CardController.verify(req, res)
);

router.get("/info", authJwt, (req, res) =>
  CardController.info(req, res)
);

router.get("/info/number/:number", authJwt,adminOnly, (req, res) =>
  CardController.infoByNumber(req, res)
);

router.get("/check", authJwt, (req, res) =>
  CardController.checkUserCard(req, res)
);

router.post("/reset/:number", authJwt,adminOnly, (req, res) =>
  CardController.resetByNumber(req, res)
);


router.post("/add", authJwt,adminOnly, (req, res) =>
  CardController.addCards(req, res)
);

router.post("/auto-assign", authJwt, (req, res) =>
  CardController.autoAssign(req, res)
);

export default router;
