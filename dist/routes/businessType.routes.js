"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/businessType.routes.ts
const express_1 = require("express");
const BusinessTypeController_1 = __importDefault(require("../controllers/BusinessTypeController"));
const upload_1 = require("../middleware/upload");
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
router.get('/getBusinessTypes', BusinessTypeController_1.default.getBusinessTypes);
router.get('/all', authJwt_1.authJwt, adminOnly_1.adminOnly, BusinessTypeController_1.default.getAll);
router.post('/add', authJwt_1.authJwt, adminOnly_1.adminOnly, upload_1.uploadImage, BusinessTypeController_1.default.add);
router.get('/edit/:id', authJwt_1.authJwt, adminOnly_1.adminOnly, BusinessTypeController_1.default.getEdit);
router.post('/edit/:id', authJwt_1.authJwt, adminOnly_1.adminOnly, upload_1.uploadImage, BusinessTypeController_1.default.update);
router.get('/delete/:id', authJwt_1.authJwt, adminOnly_1.adminOnly, BusinessTypeController_1.default.delete);
router.post('/change-status', authJwt_1.authJwt, adminOnly_1.adminOnly, BusinessTypeController_1.default.changeStatus);
exports.default = router;
