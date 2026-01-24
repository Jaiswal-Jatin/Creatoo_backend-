import admin from "firebase-admin";
import path from "path";
import fs from "fs";

const serviceAccountPath = path.join(__dirname, "firebaseServiceAccount.json");

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error("❌ firebaseServiceAccount.json not found in src/config/");
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require(serviceAccountPath);

export let firebaseStatus = { status: false, message: "Not Initialized" };

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseStatus = { status: true, message: "Initialized" };
  } catch (err) {
    firebaseStatus = { status: false, message: String(err) };
  }
}

export default admin;
