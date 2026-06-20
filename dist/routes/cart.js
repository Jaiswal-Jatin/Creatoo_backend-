"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/cart.ts
const express_1 = require("express");
const CartController_1 = __importDefault(require("../controllers/CartController"));
const authJwt_1 = require("../middleware/authJwt");
const router = (0, express_1.Router)();
router.post("/addCart", authJwt_1.authJwt, (req, res) => CartController_1.default.addCart(req, res));
router.post("/addShortlist", authJwt_1.authJwt, (req, res) => CartController_1.default.addShortlist(req, res));
exports.default = router;
