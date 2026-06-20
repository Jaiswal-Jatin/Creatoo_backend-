"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/admin.routes.ts
const express_1 = require("express");
const AdminController_1 = __importDefault(require("../controllers/AdminController"));
const authJwt_1 = require("../middleware/authJwt");
const router = (0, express_1.Router)();
router.post('/login', AdminController_1.default.login);
router.post('/change-password', authJwt_1.authJwt, AdminController_1.default.changePassword);
router.get('/me', authJwt_1.authJwt, AdminController_1.default.me);
exports.default = router;
