# Test Cases: Payment Charges & Discounts

## Quick Test with curl

### Setup Required
Before running tests, ensure:
1. Your backend is running on `http://dev-api.creatoo.co.in`
2. You have a test business with specific charge settings
3. You have a test user

### Copy-Paste Ready curl Commands

#### Test 1: All Charges Zero
```bash
curl -X POST http://dev-api.creatoo.co.in/api/web/applyOffers \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "business_id": 2,
    "original_bill_amount": 1000
  }' | jq .
```

**Expected:**
- `platform_fee`: 0
- `convenience_fee`: 0
- `final_bill_amount`: 800 (or discounted amount only)

---

#### Test 2: Platform Fee Only (50 rupees)
```bash
curl -X POST http://dev-api.creatoo.co.in/api/web/applyOffers \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "business_id": 2,
    "original_bill_amount": 1000
  }' | jq .
```

**Expected (if business has platform_fee_rupees=50):**
- `platform_fee`: 50
- `convenience_fee`: 0
- `final_bill_amount`: 850 (800 + 50)

---

#### Test 3: All Charges Enabled
```bash
curl -X POST http://dev-api.creatoo.co.in/api/web/applyOffers \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "business_id": 2,
    "original_bill_amount": 1000
  }' | jq .
```

**Expected (if business has):**
- `platform_fee_rupees`: 50
- `gateway_charges`: 2.5%
- `convenience_fee`: 21.25
- `final_bill_amount`: 871.25 (800 + 50 + 21.25)

---

#### Test 4: Different Bill Amounts
```bash
# Test with 500 bill
curl -X POST http://dev-api.creatoo.co.in/api/web/applyOffers \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "business_id": 2,
    "original_bill_amount": 500
  }' | jq .

# Test with 5000 bill
curl -X POST http://dev-api.creatoo.co.in/api/web/applyOffers \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "business_id": 2,
    "original_bill_amount": 5000
  }' | jq .
```

---

## Full Response Field Descriptions

When you call `/applyOffers`, you'll get:

```json
{
  "status": true,
  "message": "Points calculated successfully",
  "data": {
    "order_id": "MT1708952...",          // Razorpay order ID
    "original_bill": 1000,                // Initial bill amount
    "is_first_visit": true,               // First time customer?
    "discount_percentage": 20,            // Discount % applied
    "discount_applied": 200,              // Actual ₹ discount
    "discounted_bill": 800,               // Bill after discount
    
    // ⚠️ IMPORTANT: Platform & Gateway Charges
    "platform_fee": 50,                   // ✅ Platform fee in ₹
    "convenience_fee": 21.25,             // ✅ Gateway charges calculated
    "final_bill_amount": 871.25,          // ✅ Total customer pays
    
    // Loyalty Points
    "total_points_for_business": 0,       // Unused points
    "points_redeemed_here": 0,            // Points used for discount
    "points_you_will_earn": 0             // New points from this order
  }
}
```

---

## To Verify In Production

### 1. Check Business Settings
```sql
SELECT 
  id,
  name,
  platform_fee_rupees,   -- Should be 50 (or your set value)
  gateway_charges,       -- Should be 2.5 (or your set value)
  reverse_gateway_charges -- Should be 1.5 (or your set value)
FROM users 
WHERE role = 'business' AND id = 456;
```

If all values are NULL or 0, that's why no charges are applied.

### 2. Test the Endpoint
```bash
curl -X POST https://your-production-url/api/web/applyOffers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": 123,
    "business_id": 456,
    "original_bill_amount": 1000
  }' | jq '.data | {
    original_bill,
    discount_applied,
    discounted_bill,
    platform_fee,
    convenience_fee,
    final_bill_amount
  }'
```

### 3. Verify in Database
```sql
-- Check if charges were recorded in temporary orders
SELECT 
  user_id,
  business_id,
  original_bill_amount,
  discounted_bill,
  platform_fee,
  gateway_charges,
  final_bill_amount,
  created_at
FROM temporary_orders 
WHERE business_id = 456 
  AND DATE(created_at) = DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY created_at DESC 
LIMIT 5;
```

Look for:
- ✅ `platform_fee` column has value (not 0 or NULL)
- ✅ `gateway_charges` column has value
- ✅ `final_bill_amount = discounted_bill + platform_fee + (gateway charges)`

---

## Common Issues & Solutions

### Issue: Platform Fee Shows as 0
**Cause:** Business user's `platform_fee_rupees` is NULL or 0

**Solution:**
```sql
UPDATE users 
SET platform_fee_rupees = 50 
WHERE id = <business_id>;
```

### Issue: Convenience Fee (Gateway Charges) Shows as 0
**Cause:** Business user's `gateway_charges` is 0

**Solution:**
```sql
UPDATE users 
SET gateway_charges = 2.5 
WHERE id = <business_id>;
```

### Issue: Final Bill Not Reflecting Charges
**Check:**
1. Is the business_id correct?
2. Are charges NULL in the database?
3. Run the applyOffers test above

---

## Expected Behavior Summary

| Scenario | Result |
|----------|--------|
| All charges = 0 | customer_pays = discounted_bill |
| platform_fee = 50 only | customer_pays = discounted_bill + 50 |
| gateway_charges = 2.5% only | customer_pays = discounted_bill + (discount × 2.5%) |
| All charges enabled | customer_pays = discounted_bill + platform_fee + gateway_charges |

Every charge is **visible in the response** before payment is made.
