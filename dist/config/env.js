"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const env = {
    PORT: Number(process.env.PORT) || 3000,
    NODE_ENV: process.env.NODE_ENV || "development",
    DB_HOST: process.env.DB_HOST || "localhost",
    DB_PORT: Number(process.env.DB_PORT) || 3306,
    DB_NAME: process.env.DB_NAME || "creatoo",
    DB_USER: process.env.DB_USER || "root",
    DB_PASS: process.env.DB_PASS || "",
    JWT_SECRET: process.env.JWT_SECRET || "supersecret",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
    INSTAGRAM_CLIENT_ID: process.env.INSTAGRAM_CLIENT_ID || "",
    INSTAGRAM_CLIENT_SECRET: process.env.INSTAGRAM_CLIENT_SECRET || "",
    INSTAGRAM_REDIRECT_URI: process.env.INSTAGRAM_REDIRECT_URI || "",
    UPLOAD_DIR: process.env.UPLOAD_DIR || "public",
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || "http://dev-api.creatoo.co.in",
    APP_URL: process.env.APP_URL || "http://dev-api.creatoo.co.in",
    MSG91_AUTHKEY: process.env.MSG91_AUTHKEY || "",
    MSG91_TEMPLATE_ID_LOGIN: process.env.MSG91_TEMPLATE_ID_LOGIN || "",
    MSG91_SENDER_ID: process.env.MSG91_SENDER_ID || "",
    S3_BUCKET: process.env.S3_BUCKET || "",
    S3_REGION: process.env.S3_REGION || "",
    S3_ENDPOINT: process.env.S3_ENDPOINT || "",
    S3_BASE_URL: process.env.S3_BASE_URL || "",
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || "",
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || "",
    // Razorpay
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
};
exports.default = env;
