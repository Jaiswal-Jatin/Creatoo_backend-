import dotenv from "dotenv";
dotenv.config();

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;

  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASS: string;

  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  INSTAGRAM_CLIENT_ID: string;
  INSTAGRAM_CLIENT_SECRET: string;
  INSTAGRAM_REDIRECT_URI: string;

  UPLOAD_DIR: string;
  PUBLIC_BASE_URL: string;
  APP_URL: string;

  MSG91_AUTHKEY: string;
  MSG91_TEMPLATE_ID_LOGIN: string;
  MSG91_SENDER_ID: string;

  // S3 / DigitalOcean Spaces
  S3_BUCKET: string;
  S3_REGION: string;
  S3_ENDPOINT: string;
  S3_BASE_URL: string;

  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;

  // ⭐ Razorpay
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
}

const env: EnvConfig = {
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
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || "http://localhost:3000",
  APP_URL: process.env.APP_URL || "http://localhost:3000",

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

export default env;
