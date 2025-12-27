import { Router } from "express";
import {
  addWithdrawRequest,
  getWithdrawRequest,
  getAllWithdrawRequest,
  updateTransaction,
  changeStatusToRejected,
} from "../controllers/WithdrawRequestController";

import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

router.post(
  "/add",
  authJwt,
  addWithdrawRequest
);


router.get(
  "/list",
  authJwt,
  getWithdrawRequest
);

router.get(
  "/all",
  authJwt,
  adminOnly,
  getAllWithdrawRequest
);

router.post(
  "/update-transaction",
  authJwt,
  adminOnly,
  updateTransaction
);

router.post(
  "/reject",
  authJwt,
  adminOnly,
  changeStatusToRejected
);

export default router;
