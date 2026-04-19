// src/routes/scan.routes.ts
// Deep link scan route - handles QR code redirects for Android and iOS
import { Router, Request, Response } from "express";

const router = Router();

// App Store URLs - UPDATE the iOS URL when you have the App Store ID
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.creatoo.app";
const APP_STORE_URL = "https://apps.apple.com/app/creatoo/id000000000"; // TODO: Replace with actual App Store ID

/**
 * Deep Link Scan Route
 * 
 * This route handles QR code scans for bill payments.
 * 
 * Flow:
 * 1. User scans QR code with camera or browser
 * 2. Link format: http://dev-api.creatoo.co.in/api/scan?businessId=XXX
 * 3. If app is installed: App opens directly via App Links/Universal Links
 * 4. If app NOT installed: Browser hits this route → redirects to appropriate store
 * 
 * The Android App Links and iOS Universal Links are configured in:
 * - Android: AndroidManifest.xml (intent-filter with android:autoVerify="true")
 * - iOS: Runner.entitlements (associated-domains) + apple-app-site-association file
 * 
 * When app IS installed, this route is never hit - the app intercepts the link.
 * This route only handles the fallback when app is NOT installed.
 */
router.get("/", (req: Request, res: Response) => {
  const userAgent = req.headers["user-agent"] || "";
  const businessId = req.query.businessId;
  
  // Log for debugging
  console.log(`[SCAN] User-Agent: ${userAgent}`);
  console.log(`[SCAN] businessId: ${businessId}`);
  
  // Detect iOS devices
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  // Detect Mac (Safari on Mac can also trigger this)
  const isMac = /Macintosh/i.test(userAgent) && !/iPhone|iPad|iPod/i.test(userAgent);
  // Detect Android devices
  const isAndroid = /Android/i.test(userAgent);
  
  console.log(`[SCAN] Device detection - iOS: ${isIOS}, Mac: ${isMac}, Android: ${isAndroid}`);
  
  if (isIOS) {
    // Redirect to App Store for iOS devices
    console.log(`[SCAN] Redirecting to App Store`);
    return res.redirect(APP_STORE_URL);
  } else if (isMac) {
    // For Mac browsers, show a message or redirect to website
    // Since it's a desktop, they can't install mobile app
    console.log(`[SCAN] Mac detected - showing message`);
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Creatoo - Download App</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                   display: flex; justify-content: center; align-items: center; height: 100vh; 
                   margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .card { background: white; padding: 40px; border-radius: 20px; text-align: center; 
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 400px; }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; margin-bottom: 20px; }
            .stores { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
            a { display: inline-block; padding: 12px 24px; border-radius: 10px; text-decoration: none; 
                color: white; font-weight: 600; }
            .android { background: #3ddc84; }
            .ios { background: #000; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>📱 Creatoo App</h1>
            <p>Please open this link on your mobile device to download the app and pay your bill.</p>
            <div class="stores">
              <a href="${PLAY_STORE_URL}" class="android">Google Play</a>
              <a href="${APP_STORE_URL}" class="ios">App Store</a>
            </div>
          </div>
        </body>
      </html>
    `);
  } else {
    // Default to Play Store (Android and unknown devices)
    console.log(`[SCAN] Redirecting to Play Store`);
    return res.redirect(PLAY_STORE_URL);
  }
});

export default router;
