// src/routes/auth.ts
import { Router, Request } from "express";
import multer, { StorageEngine } from "multer";
import AuthController from "../controllers/AuthController";
import env from "../config/env";
import { authJwt } from "../middleware/authJwt";
import { userController } from "../controllers/UserController";
import { adminOnly } from "../middleware/adminOnly";

// ------------------------
// Multer Storage
// ------------------------
const storage: StorageEngine = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) =>
    cb(null, env.UPLOAD_DIR),
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const router = Router();

// ------------------------
// CREATOR AUTH
// ------------------------
router.post("/creatorLogin", AuthController.creatorLogin);

router.post(
  "/creatorRegister",
  upload.single("user_image"),
  AuthController.creatorRegister
);

router.post("/verifyCreatorOtp", AuthController.verifyCreatorOtp);
router.post("/resendCreatorOtp", AuthController.resendCreatorOtp);

// ------------------------
// BUSINESS AUTH
// ------------------------
router.post("/businessLogin", AuthController.businessLogin);

router.post(
  "/businessRegister",
  upload.single("business_image"),
  AuthController.businessRegister
);

router.post("/verifyBusinessOtp", AuthController.verifyBusinessOtp);
router.post("/resendBusinessOtp", AuthController.resendBusinessOtp);

// ------------------------
// INSTAGRAM VERIFICATION
// ------------------------
router.post(
  "/submitInstaVerification",
  upload.single("profile_image"),
  AuthController.submitInstaVerification
);

// ------------------------
// LOGOUT
// ------------------------
router.post("/logout", authJwt, AuthController.logout);

// ------------------------
// VIEW PROFILE
// ------------------------
router.post(
  "/viewProfile",
  authJwt,
  (req, res) => userController.viewProfile(req, res)
);

// ------------------------
// EDIT BUSINESS PROFILE (Laravel: editBusinessProfile)
// ------------------------
router.post(
  "/editBusinessProfile",
  authJwt,
  upload.single("business_image"),
  AuthController.editBusinessProfile
);

// ------------------------
// EDIT CREATOR PROFILE (Laravel: editCreatorProfile)
// ------------------------
router.post(
  "/editCreatorProfile",
  authJwt,
  upload.single("user_image"),
  AuthController.editCreatorProfile
);

// All routes here are admin-only
router.get(
  "/list",
  authJwt,
  adminOnly,
  AuthController.listBusinessUsers
);

router.post(
  "/change-status",
  authJwt,
  adminOnly,
  AuthController.changeBusinessActiveStatus
);

// CREATE business user (admin-side registration)
router.post(
  "/create",
  authJwt,
  adminOnly,
  upload.single("business_image"),
  AuthController.createBusiness
)
export default router;