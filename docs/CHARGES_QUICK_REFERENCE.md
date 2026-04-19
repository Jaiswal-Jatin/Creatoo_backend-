# Quick Reference: Charges & Discounts Flow

## When Customer Clicks "Pay Bill" - What Happens

```
POST /api/web/applyOffers
│
├─ Get original bill amount from customer
│
├─ Check if first-time customer
│  ├─ YES → Apply first_time_discount rate
│  └─ NO → Apply regular_discount rate (or partial with points)
│
├─ Calculate discount amount
│  Example: 1000 × 20% = 200 discount
│           1000 - 200 = 800 discounted_bill
│
├─ Get charges from business settings
│  ├─ platform_fee_rupees (e.g., 50)
│  ├─ gateway_charges (%) (e.g., 2.5)
│  └─ reverse_gateway_charges (%) (e.g., 1.5)
│
├─ ADD PLATFORM FEE
│  finalPlatformFee = 800 + 50 = 850
│
├─ CALCULATE GATEWAY CHARGES (on platform fee included amount)
│  convenience_fee = 850 × 2.5% = 21.25
│
├─ FINAL AMOUNT CUSTOMER PAYS
│  final_bill_amount = 850 + 21.25 = 871.25
│
└─ Return response with all charges visible
```

---

## Response Field Mapping

```json
{
  "data": {
    "original_bill": 1000,              // Input amount
    "discount_percentage": 20,          // % applied
    "discount_applied": 200,            // Actual ₹ discount
    "discounted_bill": 800,             // After discount
    
    "platform_fee": 50,                 // ⚠️ CHARGE 1: Fixed fee
    "convenience_fee": 21.25,           // ⚠️ CHARGE 2: Gateway charges
    
    "final_bill_amount": 871.25         // ✅ TOTAL CUSTOMER PAYS = 800 + 50 + 21.25
  }
}
```

---

## Proof That Charges ARE Applied

### In Code (WebApiController.ts Lines 757-784)

```typescript
// ✅ NEW CODE - FIXED (using platform_fee_rupees which is set by admin)
const businessUser = await User.findByPk(businessIdNum, {
  attributes: [
    "platform_fee_rupees",          // ← Gets platform fee
    "gateway_charges",              // ← Gets gateway charges
    "reverse_gateway_charges",
  ] as any,
});

const platformFee = 
  Number((businessUser as any)?.platform_fee_rupees) || 0;
const gatewayCharges = 
  Number((businessUser as any)?.gateway_charges) || 0;

// ⭐ HERE THE CHARGES ARE CALCULATED AND ADDED
const finalPlatformFee = discountedBill + platformFee;        // ADD PLATFORM FEE

const gstOnGateway = 
  (finalPlatformFee * gatewayCharges) / 100;                  // CALCULATE GATEWAY CHARGES

const finalBillAmount = 
  finalPlatformFee + gstOnGateway;                            // TOTAL WITH ALL CHARGES
```

### In Response (WebApiController.ts Lines 970-985)

```typescript
return res.status(200).json({
  status: true,
  message: "Points calculated successfully",
  data: {
    order_id: tempOrder.order_id,
    original_bill: originalBillAmount,
    is_first_visit: isFirstVisit,
    discount_percentage: Number((Number(discountPercentage) || 0).toFixed(2)),
    discount_applied: Number(discountAmount.toFixed(2)),
    discounted_bill: Number(discountedBill.toFixed(2)),
    
    platform_fee: platformFee,                                // ✅ CHARGE SHOWN
    convenience_fee: gstOnGateway,                            // ✅ CHARGE SHOWN
    
    final_bill_amount: Number(finalBillAmount.toFixed(2)),    // ✅ INCLUDES ALL CHARGES
    
    total_points_for_business: balanceForBusiness,
    points_redeemed_here: pointsRedeemedHere,
    points_you_will_earn: loyaltyPointsEarned,
  },
});
```

---

## Why Charges Might Show as 0

### Reason 1: Database Values Are 0 or NULL
```sql
SELECT 
  platform_fee_rupees,      -- NULL or 0 = No platform fee
  gateway_charges,          -- NULL or 0 = No gateway charges
  reverse_gateway_charges
FROM users 
WHERE id = <business_id>;
```

### Reason 2: Calculation Working Correctly
If charges are 0, it means admin set them to 0:
- Response will show `platform_fee: 0`
- Response will show `convenience_fee: 0`
- This is **CORRECT** behavior

---

## Test With Different Charge Values

### Scenario A: All Charges Set to 50/50
**Business with:**
- `platform_fee_rupees` = 50
- `gateway_charges` = 2.5%
- Bill: 1000, Discount: 20%

**Result:**
```
1. Discount: 1000 - (1000×20%) = 800
2. Platform fee added: 800 + 50 = 850
3. Gateway charges: 850 × 2.5% = 21.25
4. Customer pays: 850 + 21.25 = 871.25
```

### Scenario B: All Charges Zero
**Business with:**
- `platform_fee_rupees` = 0 (or NULL)
- `gateway_charges` = 0
- Bill: 1000, Discount: 20%

**Result:**
```
1. Discount: 1000 - (1000×20%) = 800
2. No platform fee: 800 + 0 = 800
3. No gateway charges: 800 × 0% = 0
4. Customer pays: 800 + 0 = 800
```

---

## Database Schema

```sql
-- charges stored in users table

Column Name                  Type      Current Production Value
─────────────────────────────────────────────────────────────────
platform_fee_rupees         FLOAT     [admin sets this]
gateway_charges             FLOAT     [admin sets this]
reverse_gateway_charges     FLOAT     [admin sets this]

-- charges recorded in temporary_orders table

Column Name                  Type      Purpose
─────────────────────────────────────────────────────────────────
original_bill_amount        FLOAT     Initial bill
discounted_bill            FLOAT     After discount applied
platform_fee               FLOAT     Platform fee for this order
gateway_charges            FLOAT     Gateway charges %
final_bill_amount          FLOAT     What customer paid
```

---

## Verification Checklist

To confirm charges are being applied in your production:

- [ ] Go to `/applyOffers` endpoint
- [ ] Check `platform_fee` field in response
- [ ] Check `convenience_fee` field in response
- [ ] Check `final_bill_amount` calculation
- [ ] Query DB: `SELECT platform_fee_rupees FROM users WHERE id = <business_id>`
- [ ] If value is NULL/0 → Admin needs to set it
- [ ] If value is > 0 → Check if it's showing in response

---

## Summary Table

| Setting | In DB | In Response | Effect |
|---------|-------|-------------|--------|
| `platform_fee_rupees = 50` | ✅ 50 | ✅ Shows as `platform_fee: 50` | Bill increases by 50 |
| `gateway_charges = 2.5` | ✅ 2.5 | ✅ Calculated and shown | Bill increases by calculated % |
| Set to 0 | ✅ 0 | ✅ Shows as 0 | No charge applied |
| NULL in DB | ✅ NULL | ✅ Treated as 0 | No charge applied |

**Conclusion:** ✅ **Charges ARE being applied correctly in the code. If they don't show in production, check the admin settings for that business.**

---

## Next Steps

1. **Identify which business in production has 0 charges**
   ```sql
   SELECT id, name, platform_fee_rupees, gateway_charges 
   FROM users 
   WHERE role = 'business' 
   AND (platform_fee_rupees = 0 OR platform_fee_rupees IS NULL);
   ```

2. **Update the charges if needed**
   ```sql
   UPDATE users 
   SET 
     platform_fee_rupees = 50,
     gateway_charges = 2.5,
     reverse_gateway_charges = 1.5
   WHERE id = <business_id>;
   ```

3. **Test with a new order after update**
   - Call `/applyOffers` with updated business_id
   - Verify `platform_fee` and `convenience_fee` are > 0

4. **Check temporary_orders table**
   ```sql
   SELECT 
     platform_fee, 
     gateway_charges, 
     final_bill_amount
   FROM temporary_orders 
   WHERE business_id = <business_id> 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
