"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.ts
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const AuthController_1 = __importDefault(require("../controllers/AuthController"));
const env_1 = __importDefault(require("../config/env"));
const authJwt_1 = require("../middleware/authJwt");
const UserController_1 = require("../controllers/UserController");
const adminOnly_1 = require("../middleware/adminOnly");
// ------------------------
// Multer Storage
// ------------------------
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, env_1.default.UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `${unique}-${file.originalname}`);
    },
});
const upload = (0, multer_1.default)({ storage });
const router = (0, express_1.Router)();
// ------------------------
// CREATOR AUTH
// ------------------------
router.post("/creatorLogin", AuthController_1.default.creatorLogin);
router.post("/creatorRegister", upload.single("user_image"), AuthController_1.default.creatorRegister);
router.post("/verifyCreatorOtp", AuthController_1.default.verifyCreatorOtp);
router.post("/resendCreatorOtp", AuthController_1.default.resendCreatorOtp);
// ------------------------
// BUSINESS AUTH
// ------------------------
router.post("/businessLogin", AuthController_1.default.businessLogin);
router.post("/businessRegister", upload.single("business_image"), AuthController_1.default.businessRegister);
router.post("/verifyBusinessOtp", AuthController_1.default.verifyBusinessOtp);
router.post("/resendBusinessOtp", AuthController_1.default.resendBusinessOtp);
// ------------------------
// INSTAGRAM VERIFICATION
// ------------------------
router.post("/submitInstaVerification", upload.single("profile_image"), AuthController_1.default.submitInstaVerification);
// ------------------------
// LOGOUT
// ------------------------
router.post("/logout", authJwt_1.authJwt, AuthController_1.default.logout);
// ------------------------
// VIEW PROFILE
// ------------------------
router.post("/viewProfile", authJwt_1.authJwt, (req, res) => UserController_1.userController.viewProfile(req, res));
// ------------------------
// EDIT BUSINESS PROFILE (Laravel: editBusinessProfile)
// ------------------------
router.post("/editBusinessProfile", authJwt_1.authJwt, upload.single("business_image"), AuthController_1.default.editBusinessProfile);
// ------------------------
// EDIT CREATOR PROFILE (Laravel: editCreatorProfile)
// ------------------------
router.post("/editCreatorProfile", authJwt_1.authJwt, upload.single("user_image"), AuthController_1.default.editCreatorProfile);
// All routes here are admin-only
router.get("/list", authJwt_1.authJwt, adminOnly_1.adminOnly, AuthController_1.default.listBusinessUsers);
router.post("/change-status", authJwt_1.authJwt, adminOnly_1.adminOnly, AuthController_1.default.changeBusinessActiveStatus);
exports.default = router;
