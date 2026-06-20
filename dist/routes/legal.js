"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/legal.ts
const express_1 = require("express");
const router = (0, express_1.Router)();
/* ---------------------------------------------------------
   PRIVACY POLICY HTML
--------------------------------------------------------- */
const privacyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="shortcut icon" href="imgpsh_fullsize_anim.png" />
  <title>Privacy Policy - Creatoo</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; color: #333; }
    .container { max-width: 800px; margin: auto; padding: 20px; }
    h1, h2 { color: #2c3e50; }
    h1 { text-align: center; margin-bottom: 20px; }
    p { margin: 10px 0; }
    ul { margin: 10px 0 10px 20px; }
    @media (max-width: 600px) {
      .container { padding: 10px; }
      h1 { font-size: 24px; }
      h2 { font-size: 18px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Privacy Policy</h1>

    <h2>1. Introduction</h2>
    <p>
      At <strong>Creatoo</strong>, we value your privacy and are committed to
      protecting your personal data. This Privacy Policy outlines how we
      collect, use, and share information when you use our platform.
    </p>

    <h2>2. Data Collection</h2>
    <ul>
      <li><strong>Personal Information:</strong> Name, email, phone number, and payment details.</li>
      <li><strong>Transactional Data:</strong> Purchase history, discounts availed, and payment details.</li>
      <li><strong>Device Information:</strong> IP address, browser type, and mobile device details.</li>
    </ul>

    <h2>3. How We Use Your Data</h2>
    <ul>
      <li>Processing payments and transactions.</li>
      <li>Enhancing user experience and providing personalized recommendations.</li>
      <li>Improving security and fraud prevention.</li>
      <li>Sending promotional offers and updates (users can opt out).</li>
    </ul>

    <h2>4. Data Sharing and Disclosure</h2>
    <ul>
      <li>We do not sell user data to third parties.</li>
      <li>Data may be shared with payment gateways, legal authorities, and businesses for order verification.</li>
    </ul>

    <h2>5. Data Security</h2>
    <ul>
      <li>We use industry-standard security measures to protect your data.</li>
      <li>Users must keep their account credentials confidential.</li>
    </ul>

    <h2>6. Data Retention and Deletion</h2>
    <ul>
      <li>Data is retained as required for legal and transactional purposes.</li>
      <li>Users may request deletion, except where retention is legally mandatory.</li>
    </ul>

    <h2>7. Your Rights</h2>
    <ul>
      <li>Access and modify their data.</li>
      <li>Opt out of marketing communication.</li>
      <li>Request account deletion.</li>
    </ul>

    <h2>8. Changes to Policy</h2>
    <p>
      We may update this Privacy Policy anytime. Continue usage implies acceptance.
    </p>

    <p>
      Contact: <a href="mailto:support@creatoo.co.in">support@creatoo.co.in</a>
    </p>
  </div>
</body>
</html>`;
/* ---------------------------------------------------------
   REFUND POLICY HTML
--------------------------------------------------------- */
const refundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="shortcut icon" href="imgpsh_fullsize_anim.png" />
  <title>Refund Policy - Creatoo</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; color: #333; }
    .container { max-width: 800px; margin: auto; padding: 20px; }
    h1, h2 { color: #2c3e50; }
    h1 { text-align: center; margin-bottom: 20px; }
    p { margin: 10px 0; }
    ul { margin: 10px 0; padding-left: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Refund Policy</h1>

    <h2>1. General Policy</h2>
    <p>
      All discounts and offers are controlled by the business. Creatoo does not process refunds unless
      explicitly stated in the offer or under exceptional conditions.
    </p>

    <h2>2. Eligibility for Refunds</h2>
    <ul>
      <li>Incorrectly processed payments due to technical issues.</li>
      <li>Wrong or duplicated charges.</li>
      <li>Business failed to deliver the promised service or product.</li>
    </ul>

    <h2>3. Refund Request Process</h2>
    <ul>
      <li>Request must be submitted within <strong>48 hours</strong> of the transaction.</li>
      <li>Refund approvals depend on Creatoo and the respective business.</li>
      <li>Refunds (if approved) take <strong>5-7 business days</strong> to reflect.</li>
    </ul>

    <h2>4. Non-Refundable Transactions</h2>
    <ul>
      <li>Discount already redeemed.</li>
      <li>Services/products already delivered.</li>
      <li>Requests made beyond 48 hours.</li>
    </ul>
  </div>
</body>
</html>`;
/* ---------------------------------------------------------
   TERMS & CONDITIONS HTML
--------------------------------------------------------- */
const termsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="shortcut icon" href="imgpsh_fullsize_anim.png" />
  <title>Terms & Conditions - Creatoo</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; color: #333; }
    .container { max-width: 800px; margin: auto; padding: 20px; }
    h1, h2 { color: #2c3e50; }
    h1 { text-align: center; margin-bottom: 20px; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Terms & Conditions</h1>

    <h2>1. Introduction</h2>
    <p>
      Creatoo connects businesses and users offering discounts and services. These Terms form a 
      legally binding agreement between Users and Crenologies Hub Private Limited.
    </p>

    <h2>2. User Responsibilities</h2>
    <ul>
      <li>Provide correct registration details.</li>
      <li>Businesses manage their own offers/discounts.</li>
      <li>Transactions are final; users must review offers before paying.</li>
      <li>Fraud or abuse leads to account suspension.</li>
    </ul>

    <h2>3. Payments</h2>
    <ul>
      <li>Users pay directly via the app.</li>
      <li>Payouts to businesses occur in 1–2 working days.</li>
      <li>Refunds only as per Refund Policy.</li>
    </ul>

    <h2>4. Restrictions</h2>
    <ul>
      <li>No illegal or fraudulent behaviour.</li>
      <li>Violators may face termination.</li>
    </ul>

    <h2>5. Liability</h2>
    <ul>
      <li>Creatoo acts as an intermediary.</li>
      <li>Platform is not responsible for disputes between users and businesses.</li>
    </ul>

    <h2>6. Modifications</h2>
    <ul>
      <li>Terms may be updated anytime.</li>
      <li>Users should review periodically.</li>
    </ul>

    <p><strong>Powered by: CRENOLOGIES HUB PRIVATE LIMITED</strong></p>
  </div>
</body>
</html>`;
/* ---------------------------------------------------------
   ROUTES
--------------------------------------------------------- */
router.get("/Privacy-Policy.html", (req, res) => {
    res.status(200).type("html").send(privacyHtml);
});
router.get("/Refund-Policy.html", (req, res) => {
    res.status(200).type("html").send(refundHtml);
});
router.get("/Terms-And-Conditions.html", (req, res) => {
    res.status(200).type("html").send(termsHtml);
});
exports.default = router;
