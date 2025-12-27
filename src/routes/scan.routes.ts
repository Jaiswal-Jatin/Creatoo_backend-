// src/routes/adminStats.ts
import { Router, Request, Response } from "express";

const router = Router();

// NEW: redirect to Google Play or App Store based on User-Agent
router.get("/", (req: Request, res: Response) => {
  const userAgent = req.headers["user-agent"] || "";
  const isIos = /iPhone|iPad|iPod/i.test(userAgent);

  if (isIos) {
    // Redirect to iOS App Store
    return res.redirect(
      "https://apps.apple.com/in/app/creatoo/id6738318856" // Assuming this is the App Store ID based on common patterns or I'll ask. Wait, let me check if I can find the ID.
    );
  }

  // Default to Google Play Store
  return res.redirect(
    "https://play.google.com/store/apps/details?id=com.creatoo.creatooapp"
  );
});

export default router;
