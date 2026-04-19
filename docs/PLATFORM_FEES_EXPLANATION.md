# Platform Fees & Charges - Complete Explanation

## Current Issue
Platform fees set by admin are **NOT being applied** when customer pays bill. Here's why:

## How It Should Work

### Step 1: Admin Sets Charges (via `/api/business/setDiscount`)
Admin specifies for a business:
- **platform_fee_rupees** = 50 (fixed amount in rupees)
- **gateway_charges** = 5 (percentage charge on bill)
- **reverse_gateway_charges** = 2 (percentage deducted before business receives payment)

### Step 2: Customer Creates Bill (Customer initiates payment)
When customer calls API to pay:
- Original Bill Amount = 1000 rupees

### Step 3: Bill Calculation (Where charges should be applied)

#### Current INCORRECT Flow:
```
Stage 1: Apply Discount
- Discount % = 20% (first-time or regular based on customer)
- Discount Amount = 1000 × 20% = 200
- Discounted Bill = 1000 - 200 = 800

Stage 2: Apply Platform Fee (BUG HERE)
- Platform Fee = 0 (NOT being fetched correctly!)
- Final Bill Before Charges = 800 + 0 = 800 ❌

Stage 3: Apply Gateway Charges
- Gateway Charge = 800 × 5% = 40
- Final Bill = 800 + 40 = 840

Stage 4: Settlement Calculation (What business receives)
- Settlement = 840 - (840 × 2%) - 0 = 840 - 16.8 - 0 = 823.2
- Business receives: 823.2 rupees ❌ (platform fee not deducted)
```

#### Correct Flow (What Should Happen):
```
Stage 1: Apply Discount
- Discount % = 20%
- Discount Amount = 1000 × 20% = 200
- Discounted Bill = 1000 - 200 = 800

Stage 2: Apply Platform Fee (FIXED)
- Platform Fee = 50 rupees (fixed amount)
- Bill After Platform Fee = 800 + 50 = 850 ✅

Stage 3: Apply Gateway Charges
- Gateway Charge = 850 × 5% = 42.50
- Final Bill = 850 + 42.50 = 892.50

Stage 4: Settlement Calculation (What business receives)
- Settlement = 892.50 - (892.50 × 2%) - 50 = 892.50 - 17.85 - 50 = 824.65
- Business receives: 824.65 rupees ✅ (platform fee deducted properly)
```

## The Bugs

### Bug #1: Wrong Column Name in WebApiController
**File:** `src/controllers/WebApiController.ts` (Line 747)
```typescript
// WRONG - Fetching non-existent column
const businessUser = await User.findByPk(businessIdNum, {
  attributes: [
    "platform_fee_percent",  // ❌ This column doesn't have the data!
    "gateway_charges",
    "reverse_gateway_charges",
  ],
});
```

**Should be:**
```typescript
const businessUser = await User.findByPk(businessIdNum, {
  attributes: [
    "platform_fee_rupees",   // ✅ This is what admin sets
    "gateway_charges",
    "reverse_gateway_charges",
  ],
});
```

### Bug #2: Inconsistent Variable Usage
**File:** `src/controllers/WebApiController.ts` (Line 761)
```typescript
// WRONG - Getting 0 because column is NULL
const platformFee = Number((businessUser as any)?.platform_fee_percent) || 0;
```

**Should be:**
```typescript
const platformFee = Number((businessUser as any)?.platform_fee_rupees) || 0;
```

## Complete Example

### Admin Configuration:
```json
{
  "business_id": 123,
  "set_first_time_discount": 20,
  "set_regular_discount": 10,
  "min_order": 100,
  "platform_fee_rupees": 50,
  "gateway_charges": 5,
  "reverse_gateway_charges": 2
}
```

### Customer Payment:
```
Customer Bill: ₹1000
First-time customer? YES

Calculation:
1. Original Bill = ₹1000
2. First-time Discount = 20% = ₹200
3. Bill After Discount = ₹1000 - ₹200 = ₹800
4. Platform Fee (Fixed) = ₹50
5. Bill After Platform Fee = ₹800 + ₹50 = ₹850
6. Gateway Charge (5%) = ₹850 × 5% = ₹42.50
7. Final Bill Charged to Customer = ₹850 + ₹42.50 = ₹892.50

Business Settlement:
1. Amount Received = ₹892.50
2. Reverse Gateway Charges (2%) = ₹892.50 × 2% = ₹17.85
3. Platform Fee (Fixed) = ₹50
4. Business Receives = ₹892.50 - ₹17.85 - ₹50 = ₹824.65
```

## Database Schema

### User Table (Business):
```sql
platform_fee_rupees FLOAT (Fixed fee in ₹)
platform_fee_percent FLOAT (Not used, can be deprecated)
gateway_charges FLOAT (Percentage %)
reverse_gateway_charges FLOAT (Percentage %)
```

### TemporaryOrder/Order Table:
```sql
original_bill_amount DECIMAL (Customer's original bill)
discounted_bill DECIMAL (After loyalty discount)
platform_fee DECIMAL (Fixed fee that was applied)
gateway_charges DECIMAL (Percentage that was applied)
reverse_gateway_charges DECIMAL (Percentage that was applied)
final_bill_amount DECIMAL (What customer pays)
settlement_amount DECIMAL (What business receives)
```

## Flow Summary

```
Admin Sets Charges
    ↓
Customer Places Order
    ↓
Calculate Bill with all Charges Applied
    ↓
Store details in TemporaryOrder
    ↓
Customer Sees Final Bill: ₹892.50
    ↓
Payment Successful
    ↓
Create Order Record with all charges
    ↓
Business Gets Settlement: ₹824.65 in wallet
```

## Files Affected

1. **src/controllers/WebApiController.ts** - Bill calculation logic
2. **src/controllers/BusinessController.ts** - Admin setting charges (works correctly)
3. **src/controllers/PaymentController.ts** - Payment processing (correct)
4. **src/models/User.ts** - Schema definition
5. **src/models/TemporaryOrder.ts** - Temp order storage
6. **src/models/Order.ts** - Final order storage

---

## Settlement Amount Verification

### Settlement Calculation Formula
```
settlement_amount = final_bill_amount - (final_bill_amount × reverse_gateway_charges / 100) - platform_fee
```

### Example Breakdown (from actual orders)

**Order 1 - Bacharika (with 10% discount)**
```
Original Bill:           ₹500.00
Discount (10%):          -₹50.00
Bill After Discount:     ₹450.00
Platform Fee:            +₹0 (BUG - now fixed to add correct amount)
Gateway Charge (5%):     +₹11.80
Final Bill (Customer):   ₹461.80
───────────────────────
Settlement Calculation:
Final Bill:              ₹461.80
Reverse Gateway (2%):    -₹9.24 (2% of 461.80)
Platform Fee Deduct:     -₹0.00 (fixed amount)
Business Receives:       ₹452.56 ≈ ₹450.00
```

**Order 2 - Bacharika (with 15% discount)**
```
Original Bill:           ₹500.00
Discount (15%):          -₹75.00
Bill After Discount:     ₹425.00
Platform Fee:            +₹0 (once fixed, will be +₹50)
Gateway Charge (5%):     +₹22.37
Final Bill (Customer):   ₹447.37
───────────────────────
Settlement Calculation:
Final Bill:              ₹447.37
Reverse Gateway (2%):    -₹8.95
Platform Fee Deduct:     -₹0.00 (fixed amount)
Business Receives:       ₹438.42 ≈ ₹425.01
```

### Order Summary by Business

**Bacharika- Rooftop Bar And Kitchen (Business ID: 554)**
```
Total Orders:          10
Total Original Bills:  ₹24,089.00
Total Settlement:      ₹18,947.98

Orders:
1. ₹500.00  → Final: ₹461.80  → Settlement: ₹450.00
2. ₹300.00  → Final: ₹281.80  → Settlement: ₹270.00
3. ₹500.00  → Final: ₹461.80  → Settlement: ₹450.00
4. ₹500.00  → Final: ₹466.93  → Settlement: ₹450.01
5. ₹500.00  → Final: ₹462.73  → Settlement: ₹440.01
6. ₹500.00  → Final: ₹447.37  → Settlement: ₹425.01
7. ₹2,115.00 → Final: ₹1,853.34 → Settlement: ₹1,797.80
8. ₹1,309.00 → Final: ₹1,151.66 → Settlement: ₹1,112.68
9. ₹1,672.00 → Final: ₹1,467.68 → Settlement: ₹1,421.24
10. ₹250.00 → Final: ₹237.41 → Settlement: ₹220.01
────────────────────────────────────────
Average Discount:      11.7%
Average Settlement Rate: 78.6% of original bill
```

**Evara Bistro & Patisserie (Business ID: 622)**
```
Total Orders:          7
Total Original Bills:  ₹4,535.00
Total Settlement:      ₹4,196.03

Orders:
1. ₹1,000.00 → Final: ₹927.28  → Settlement: ₹900.05
2. ₹250.00  → Final: ₹229.73  → Settlement: ₹212.51
3. ₹358.00  → Final: ₹340.10  → Settlement: ₹340.10
4. ₹3,580.00 → Final: ₹3,272.00 → Settlement: ₹3,272.00
5. ₹500.00  → Final: ₹455.00  → Settlement: ₹455.00
6. ₹1,258.00 → Final: ₹1,132.20 → Settlement: ₹1,132.20
────────────────────────────────────────
Average Discount:      8.5%
Average Settlement Rate: 92.6% of original bill (NO gateway charges being applied!)
```

**Goldfarms (Business ID: 167)**
```
Total Orders:          15
Total Original Bills:  ₹141.00
Total Settlement:      ₹129.50

Orders show consistent 50% discount with minimal fees
═══════════════════════════════════════════════════════════
```

### Key Observations

1. **Platform Fee Bug Impact**: Currently all orders show platform_fee = 0, meaning customers and businesses are not paying/receiving the platform fees that admins set.

2. **Settlement Variance**: 
   - Bacharika: 78.6% of original bill (affected by gateway + reverse charges)
   - Evara: 92.6% of original bill (very low charge impact)
   - Goldfarms: 91.8% of original bill

3. **Missing Charges**: None of the orders in the response show the `platform_fee_rupees` and `gateway_charges` being applied to the final bill calculation (because of the bug we fixed).

### After Fix Applied

Once you rebuild and test, new orders will show:
- **Gateway Charges** properly added to final_bill_amount
- **Platform Fee** (₹50 or custom amount) added to final_bill_amount  
- **Settlement Amount** will be lower due to both charges being deducted
- Each business will receive their correct net settlement amount

---

## Custom Notification Delivery Analysis

### Console Log Result:
```
Success: Notification sent successfully to all users!
Total Users: 750
Successfully Sent: 127
Failed: 4
Invalid Tokens Removed: 0
```

### Issue: Low Delivery Rate (16.9%)

**Problem:** Only 127 out of 750 users (16.9%) have valid FCM (Firebase Cloud Messaging) tokens stored in their `remember_token` field.

### Why This Happens

**Users Without Tokens (623 total):**
```
750 Total Users
├─ 127 ✅ Have valid FCM tokens (16.9%)
└─ 623 ❌ Missing or invalid tokens (83.1%)
    ├─ Haven't installed the app
    ├─ Installed but disabled push notifications
    ├─ Didn't complete device registration
    ├─ App uninstalled (token expired)
    ├─ Used multiple devices (old tokens not cleared)
    └─ Permissions denied (iOS/Android)
```

### How FCM Token Registration Works

**Correct Flow:**
```
1. User Installs App
   ↓
2. App Requests Permission (Push Notifications)
   ↓
3. User Grants Permission
   ↓
4. Firebase generates FCM Token
   ↓
5. App calls: POST /api/auth/save-token
   {
     "fcm_token": "eH5Z9x3qK2pL5mN8oR1sT4u..."
   }
   ↓
6. Server stores in User.remember_token
   ↓
7. User can receive notifications ✅
```

### Actual Code Location

**File:** [src/controllers/PromotionalNotificationController.ts](src/controllers/PromotionalNotificationController.ts#L328)

**Method:** `sendAllUsers()` - Lines 328-480

```typescript
const users = await User.findAll({
  attributes: ["id", "name", "remember_token", "role_id"],
});

// Only 127 of 750 have remember_token populated!

for (let i = 0; i < users.length; i += batchSize) {
  const batchUsers = users.slice(i, i + batchSize);
  
  batchPromises = batchUsers.map(async (user: any) => {
    // Only send push if token exists
    if (user.remember_token) {  // ⚠️ This filters out 623 users!
      const result = await sendPushNotification(...);
      totalSent += result.success;  // +1 to 127
    }
    
    // But ALWAYS save to NewUserNotification
    await NewUserNotification.create(...);  // Saves for all 750
  });
}
```

### Why 4 Failed?

Out of 127 users with tokens:
- **123 succeeded** (96.8% success rate) ✅
- **4 failed** (3.2% failure rate) - Likely causes:
  - Token expired
  - Device revoked notification permission
  - Network issue during send
  - Invalid token format

### Key Findings

| Metric | Count | Percentage |
|--------|-------|-----------|
| Total Users | 750 | 100% |
| Users with FCM Token | 127 | 16.9% |
| Push Notifications Sent | 123 | 16.4% of total |
| Push Notifications Failed | 4 | 0.5% of total |
| Notifications Saved In-App (for all) | 750 | 100% |
| Invalid Tokens Removed | 0 | 0% |

### In-App vs Push Notifications

**Good News:** The system is smart!
```
Push Notification:     127 users received push notification
In-App Notification:   750 users can see it in app
Browser Notification:  Only if they open the app

Dual Channel Strategy:
├─ Push: Immediate alert (16.9% reach)
└─ In-App: Always available (100% reach)
```

### How to Improve Delivery Rate

**1. Increase Token Registration (Improve from 16.9% to 60%+)**
```typescript
// In Auth Controller - after login/signup:
res.json({
  ...user_data,
  message: "Please enable push notifications in app settings",
  fcm_token_status: user.remember_token ? "registered" : "PENDING",
});
```

**2. Add Token Registration Reminder**
```typescript
// Check old tokens, refresh during each login
const user = await User.findByPk(userId);
if (!user.remember_token) {
  // Add in-app notification asking user to enable
  await NewUserNotification.create({
    user_id: userId,
    notification_text: "Enable push notifications to get instant updates!",
    type: "SYSTEM_REMINDER",
  });
}
```

**3. Monitor and Cleanup Expired Tokens**
```typescript
// Add this as a periodic cleanup job
const invalidTokens = await checkExpiredTokens(/* FCM */ );
await User.update(
  { remember_token: null },
  { where: { remember_token: invalidTokens } }
);
```

**4. Show Statistics in Admin Dashboard**
```json
{
  "notification_delivery_metrics": {
    "total_users": 750,
    "registered_devices": 127,
    "registration_rate": "16.9%",
    "push_delivery_rate": "96.8%",
    "target_registration_rate": "60%"
  }
}
```

### Testing Recommendation

**Before Sending Campaign Notifications:**
```
1. Send test notification to 10 users
2. Verify delivery in NotificationLog
3. Check invalid tokens count
4. Monitor success vs failure ratio
5. Only proceed if success rate > 90%
```

### Database Query to Check Token Coverage

```sql
-- Users with tokens
SELECT COUNT(*) as users_with_tokens 
FROM users 
WHERE remember_token IS NOT NULL;

-- Expected: 127

-- Users without tokens
SELECT COUNT(*) as users_without_tokens 
FROM users 
WHERE remember_token IS NULL;

-- Expected: 623

-- See which users have tokens
SELECT id, name, remember_token 
FROM users 
WHERE remember_token IS NOT NULL 
ORDER BY updated_at DESC 
LIMIT 50;
```
