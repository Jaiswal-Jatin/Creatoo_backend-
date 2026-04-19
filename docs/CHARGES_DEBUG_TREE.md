# Charges Debugging Tree: Quick Decision Guide

## When Customer Clicks "Pay Bill"

```
START
│
├─ Check: Do you see "platform_fee" and "convenience_fee" in API response?
│  │
│  ├─ YES ✅
│  │  │
│  │  └─ Are the values > 0?
│  │     │
│  │     ├─ YES ✅ EVERYTHING WORKING
│  │     │  └─ Charges ARE being applied correctly
│  │     │  └─ Verify in DB: SELECT final_bill_amount FROM temporary_orders
│  │     │
│  │     └─ NO (Values = 0)
│  │        │
│  │        └─ Expected Behavior ✅
│  │           └─ Business admin set charges to 0
│  │           └─ Query: SELECT platform_fee_rupees FROM users WHERE id = business_id
│  │              Should return: 0, NULL, or empty
│  │
│  └─ NO ❌
│     │
│     └─ Response Format Issue
│        ├─ Check if using latest code
│        ├─ Verify business_id is correct
│        └─ Check: Are response fields spelled correctly?
│           - Should be: platform_fee, convenience_fee
│           - Check: final_bill_amount field exists
│
│
├─ QUESTION 2: What charges do you want applied?
│  │
│  ├─ Fixed fee (Platform Fee) only?
│  │  │
│  │  └─ Set: UPDATE users SET platform_fee_rupees = 50 WHERE id = business_id
│  │
│  ├─ Percentage fee (Gateway Charges) only?
│  │  │
│  │  └─ Set: UPDATE users SET gateway_charges = 2.5 WHERE id = business_id
│  │
│  ├─ Both fixed + percentage?
│  │  │
│  │  └─ Set both:
│  │     UPDATE users SET 
│  │       platform_fee_rupees = 50,
│  │       gateway_charges = 2.5
│  │     WHERE id = business_id
│  │
│  └─ No charges?
│     │
│     └─ Set all to 0:
│        UPDATE users SET 
│          platform_fee_rupees = 0,
│          gateway_charges = 0
│        WHERE id = business_id
│
│
├─ QUESTION 3: After paying, do charges appear in Order?
│  │
│  ├─ YES ✅ PERFECT
│  │  └─ Complete flow working
│  │  └─ Query: SELECT bill_amount, platform_fee FROM orders
│  │           platform_fee should match temporary_orders
│  │
│  └─ NO ❌
│     │
│     └─ Check PaymentController.ts
│        - Line 1306: Verify finalBillAmount being used
│        - Line 1307: Check netAmountReceived calculation
│        - Ensure charges from temporary_orders transferred to orders
│
│
└─ FINAL VERIFICATION
   │
   ├─ Endpoint: POST /api/web/applyOffers
   │  └─ Should return: platform_fee, convenience_fee, final_bill_amount
   │
   ├─ Database: temporary_orders
   │  └─ Should have: platform_fee, gateway_charges, final_bill_amount
   │
   ├─ Database: orders
   │  └─ Should reference: platform_fee from temporary_orders
   │
   └─ Customer sees before payment:
      ├─ Original bill
      ├─ Discount
      ├─ Platform fee ✅
      ├─ Convenience fee ✅
      └─ Final amount (includes all) ✅
```

---

## Quick Debug Flowchart

### "Charges Are Showing as 0"

```
Q: Is phone_fee_rupees = 0 in DB?
├─ YES → WORKING CORRECTLY (admin set to 0)
└─ NO → Check code in applyOffers endpoint


Q: Is gateway_charges = 0 in DB?
├─ YES → WORKING CORRECTLY (admin set to 0)  
└─ NO → Check if being fetched correctly


Q: Is finalBillAmount correct in response?
├─ YES → All charges are included
└─ NO → Check final_bill_amount calculation:
        Should equal: discounted_bill + platform_fee + gateway_charges
```

### "Charges Aren't Applied in Production"

```
Step 1: Run this query
SELECT platform_fee_rupees, gateway_charges 
FROM users 
WHERE id = <business_id>;

Result:
├─ Got 0 or NULL → Set charges:
│  UPDATE users SET 
│    platform_fee_rupees = 50,
│    gateway_charges = 2.5
│  WHERE id = <business_id>;
│
└─ Got values → Should be working, test API


Step 2: Call API
curl -X POST /api/web/applyOffers \
  -d '{"user_id": 123, "business_id": 456, "original_bill_amount": 1000}'

Result:
├─ Returns platform_fee > 0 → WORKING ✅
├─ Returns platform_fee = 0 → Wrong business_id OR
│                             Charges set to 0
└─ Field missing → Code issue


Step 3: Check database
SELECT final_bill_amount, platform_fee 
FROM temporary_orders 
WHERE business_id = 456 
ORDER BY created_at DESC LIMIT 1;

Result:
├─ Has platform_fee → Saved correctly ✅
└─ platform_fee = 0 → Check step 2 above
```

---

## Formula Verification

When customer clicks pay, formula is:

```
1. Discounted Bill = Original Bill - (Original Bill × Discount% / 100)
2. Platform Fee Added = Discounted Bill + Platform Fee (₹)
3. Gateway Charges = (Platform Fee Added) × Gateway% / 100
4. Final Bill = Platform Fee Added + Gateway Charges
```

**Test with actual numbers:**

```
Original: 1000
Discount: 20%
Platform Fee: 50
Gateway: 2.5%

Step by step:
Discount = 1000 × 20 / 100 = 200
Discounted = 1000 - 200 = 800
With Platform = 800 + 50 = 850
Gateway Amount = 850 × 2.5 / 100 = 21.25
FINAL = 850 + 21.25 = 871.25

If your response matches: ✅ WORKING
If different: ❌ Check calculation
```

---

## File Locations for Verification

| What | Where | Lines |
|------|-------|-------|
| Charge calculation | `WebApiController.ts` | 757-794 |
| Response sent | `WebApiController.ts` | 970-992 |
| Saved to DB | `WebApiController.ts` | 930-960 |
| Used in Payment | `PaymentController.ts` | 1306-1307 |
| Wallet checks | `WalletTransactionController.ts` | 721-722 |

---

## One-Minute Test

```bash
# 1. Get business charges
sqlite> SELECT platform_fee_rupees, gateway_charges FROM users WHERE id = 456;

# 2. Make API call
curl -X POST http://dev-api.creatoo.co.in/api/web/applyOffers \
  -H "Content-Type: application/json" \
  -d '{"user_id": 123, "business_id": 456, "original_bill_amount": 1000}'

# 3. Check response for:
# "platform_fee": <should match step 1>
# "convenience_fee": <should be calculated>
# "final_bill_amount": <should be > discounted_bill>

# 4. Query DB
sqlite> SELECT platform_fee, final_bill_amount FROM temporary_orders 
        WHERE business_id = 456 ORDER BY created_at DESC LIMIT 1;

# 5. Verify:
# - platform_fee matches step 1
# - final_bill_amount > discounted_bill
```

---

## Conclusion

✅ **Charges ARE correctly applied when customer clicks "Pay Bill"**

The flow is:
1. charge values fetched from `users` table ← Verify here if showing 0
2. charges calculated in applyOffers ← Code does this
3. charges returned in response ← Should see in API response
4. charges saved to temporary_orders ← Verify in DB
5. charges transferred to final orders ← Check after payment

**If showing 0:** Check step 1 (DB values) first
**If not showing:** Check response format (step 3)
**If saved wrong:** Check formula (step 2)
