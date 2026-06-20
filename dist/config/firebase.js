"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebaseStatus = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const serviceAccountPath = path_1.default.join(__dirname, "firebaseServiceAccount.json");
if (!fs_1.default.existsSync(serviceAccountPath)) {
    throw new Error("❌ firebaseServiceAccount.json not found in src/config/");
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require(serviceAccountPath);
exports.firebaseStatus = { status: false, message: "Not Initialized" };
if (!firebase_admin_1.default.apps.length) {
    try {
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(serviceAccount),
        });
        exports.firebaseStatus = { status: true, message: "Initialized" };
    }
    catch (err) {
        exports.firebaseStatus = { status: false, message: String(err) };
    }
}
exports.default = firebase_admin_1.default;
