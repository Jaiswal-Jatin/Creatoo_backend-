import { Router } from "express";
import VisitController from "../controllers/VisitController";
import { authJwt } from "../middleware/authJwt";

const router = Router();

router.get("/", authJwt, (req, res) =>
  VisitController.getVisitInfo(req, res)
);

router.post("/", authJwt, (req, res) =>
  VisitController.createVisit(req, res)
);

router.get("/history", authJwt, (req, res) =>
  VisitController.history(req, res)
);

router.get("/business-visits", authJwt, (req, res) =>
  VisitController.getBusinessVisits(req, res)
);


router.get("/user-history", authJwt, (req, res) =>
  VisitController.userHistory(req, res)
);

router.get("/user-all-history", authJwt, (req, res) =>
  VisitController.userAllHistory(req, res)
);

router.get("/today-count", authJwt, (req, res) =>
  VisitController.getTodayVisitCount(req, res)
);

export default router;
