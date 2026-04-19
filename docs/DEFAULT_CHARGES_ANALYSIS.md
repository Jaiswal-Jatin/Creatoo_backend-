# Default Charges Analysis: What Happens When All Charges = 0?

## ✅ Short Answer

**NO default charges are applied.**

If `platform_fee_rupees` and `gateway_charges` are set to **0 or NULL**, the customer pays **ONLY the discounted bill amount** with **NO additional charges**.

---

## Code Proof

### Location: WebApiController.ts Lines 757-794

```typescript
// Fetch charges from business user (users table)
const businessUser = await User.findByPk(businessIdNum, {
  attributes: [
    "platform_fee_rupees",
    "gateway_charges", 
    "reverse_gateway_charges",
  ] as any,
});

// ⚠️ NO DEFAULT VALUES - Only || 0 fallback
const platformFee = 
  Number((businessUser as any)?.platform_fee_rupees) || 0;
  
const gatewayCharges = 
  Number((businessUser as any)?.gateway_charges) || 0;
  
const reverseGatewayCharges = 
  Number((businessUser as any)?.reverse_gateway_charges) || 0;

// NO hardcoded defaults like:
// const platformFee = (businessUser?.platform_fee_rupees) || 50;  ❌ NOT HERE
// const gatewayCharges = (businessUser?.gateway_charges) || 2.5;  ❌ NOT HERE

// Direct calculation with these values
const finalPlatformFee = discountedBill + platformFee;           // If platformFee=0, then just discountedBill
const gstOnGateway = (finalPlatformFee * gatewayCharges) / 100;  // If gatewayCharges=0, then = 0
const finalBillAmount = finalPlatformFee + gstOnGateway;         // Results in just discountedBill
```

---

## What This Means

### Scenario 1: Charges Set to 0

**Database:**
```
platform_fee_rupees = 0
gateway_charges = 0
reverse_gateway_charges = 0
```

**Code Execution:**
```javascript
platformFee = Number(0) || 0 = 0
gatewayCharges = Number(0) || 0 = 0
reverseGatewayCharges = Number(0) || 0 = 0

finalPlatformFee = 800 + 0 = 800
gstOnGateway = (800 × 0) / 100 = 0
finalBillAmount = 800 + 0 = 800
```

**Customer Pays:** ₹800 (discounted bill only)

---

### Scenario 2: Charges Set to NULL

**Database:**
```
platform_fee_rupees = NULL
gateway_charges = NULL
reverse_gateway_charges = NULL
```

**Code Execution:**
```javascript
platformFee = Number(null) || 0 = 0  (NaN becomes 0)
gatewayCharges = Number(null) || 0 = 0
reverseGatewayCharges = Number(null) || 0 = 0

finalPlatformFee = 800 + 0 = 800
gstOnGateway = (800 × 0) / 100 = 0
finalBillAmount = 800 + 0 = 800
```

**Customer Pays:** ₹800 (discounted bill only)

---

### Scenario 3: Charges Set to Actual Values

**Database:**
```
platform_fee_rupees = 50
gateway_charges = 2.5
reverse_gateway_charges = 1.5
```

**Code Execution:**
```javascript
platformFee = Number(50) || 0 = 50
gatewayCharges = Number(2.5) || 0 = 2.5
reverseGatewayCharges = Number(1.5) || 0 = 1.5

finalPlatformFee = 800 + 50 = 850
gstOnGateway = (850 × 2.5) / 100 = 21.25
finalBillAmount = 850 + 21.25 = 871.25
```

**Customer Pays:** ₹871.25 (includes charges)

---

## Why No Defaults?

### Search Results: No Hardcoded Charge Values

Looking through the entire codebase:

```
❌ No hardcoded values like:
   const defaultPlatformFee = 50;
   const defaultGatewayCharges = 2.5;

❌ No conditional fallback like:
   const platformFee = user?.platform_fee_rupees || 50;

✅ Only || 0 pattern which treats NULL/undefined as 0:
   const platformFee = Number(...) || 0;
```

### Settings Table NOT Used for Charges

The `settings` table HAS fields for charges:
```sql
--  settings table:
--  platform_fee_percent FLOAT
--  gateway_charges FLOAT
--  reverse_gateway_charges FLOAT
```

**BUT** applyOffers endpoint **DOES NOT** query settings table for charges.

It **ONLY** fetches from the business user (users table):
- ✅ Fetches from: `users` table → `platform_fee_rupees`
- ❌ Does NOT fetch from: `settings` table → `platform_fee_percent`

---

## Complete Charge Calculation Code

Here's the FULL charge calculation from WebApiController.ts (lines 757-795):

```typescript
// Charges source: Only from users (business) table
const businessUser = await User.findByPk(businessIdNum, {
  attributes: [
    "platform_fee_rupees",          // ← Only source
    "gateway_charges",              // ← Only source
    "reverse_gateway_charges",      // ← Only source
  ] as any,
});

// Get values or default to 0 (NO OTHER DEFAULTS)
const platformFee = 
  Number((businessUser as any)?.platform_fee_rupees) || 0;
const gatewayCharges = 
  Number((businessUser as any)?.gateway_charges) || 0;
const reverseGatewayCharges = 
  Number((businessUser as any)?.reverse_gateway_charges) || 0;

// Calculate with these values (whatever they are)
const finalPlatformFee = discountedBill + platformFee;
const gstOnGateway = (finalPlatformFee * gatewayCharges) / 100;
const finalBillAmount = finalPlatformFee + gstOnGateway;

// Result: If all charges = 0, then finalBillAmount = discountedBill only
```

---

## API Response When All Charges = 0

```json
{
  "status": true,
  "message": "Points calculated successfully",
  "data": {
    "original_bill": 1000,
    "discount_percentage": 20,
    "discount_applied": 200,
    "discounted_bill": 800,
    
    "platform_fee": 0,                 ← Shows 0 (not hidden)
    "convenience_fee": 0,              ← Shows 0 (not hidden)
    
    "final_bill_amount": 800,          ← = discounted_bill only
    "total_points_for_business": 0,
    "points_redeemed_here": 0,
    "points_you_will_earn": 32
  }
}
```

**Customer sees:** Platform fee = 0, Convenience fee = 0, Total = 800

---

## Database: What Gets Saved

### temporary_orders Table
When charges are 0:

```sql
INSERT INTO temporary_orders (
  original_bill_amount = 1000,
  discounted_bill = 800,
  platform_fee = 0,              ← Saved as 0
  gateway_charges = 0,           ← Saved as 0
  final_bill_amount = 800        ← No charges added
) ...
```

### After Payment - orders Table
```sql
INSERT INTO orders (
  bill_amount = 800,             ← Final amount (no charges)
  platform_fee = 0,              ← Saved as 0
  gateway_charges = 0            ← Saved as 0
) ...
```

---

## Test: Verify No Default Charges

### Database Query
```sql
-- Check what's configured
SELECT 
  platform_fee_rupees,
  gateway_charges,
  reverse_gateway_charges
FROM users 
WHERE id = <business_id>;

-- If all show 0 or NULL: ✅ No charges applied
-- If any shows > 0: ✅ That charge applied
```

### API Test
```bash
# Even if charges are 0, they show in response
curl -X POST /api/web/applyOffers \
  -d '{"user_id": 123, "business_id": 456, "original_bill_amount": 1000}'

# Check response:
# "platform_fee": 0,          ← Transparency: shows 0
# "convenience_fee": 0,       ← Transparency: shows 0
# "final_bill_amount": 800    ← No charges added
```

### Before vs After

**Before Payment:**
- API shows charges = 0 ✅
- Customer sees total = 800 ✅
- Transparency: Fully visible ✅

**Final Payment:**
- Customer pays: 800 ✅
- No surprise charges ✅
- Database records: charges = 0 ✅

---

## FAQ

### Q: Could there be hardcoded defaults somewhere else?
**A:** No, searched entire codebase:
- ❌ No hardcoded charge values
- ❌ No fallback to settings table
- ✅ Only `|| 0` pattern

### Q: Does settings table affect charges?
**A:** Only for discount `min_threshold`, NOT for charge amounts.
- Settings table is NOT queried for charges
- Only users table is queried

### Q: What if both database and settings have charges?
**A:** It doesn't matter because:
- Only users table (business) is queried
- Settings table charges are IGNORED
- There is NO fallback logic

### Q: Are charges hidden somewhere?
**A:** No, they're completely transparent:
- Shown in API response
- Shown in temporary_orders table
- Shown in final orders table
- Customer sees them before payment

---

## Summary Table

| Scenario | platform_fee | gateway_charges | final_bill_amount | Customer Pays |
|----------|--------------|-----------------|-------------------|---------------|
| All = 0 | 0 | 0 | discounted_bill | discounted_bill |
| All = NULL | 0 | 0 | discounted_bill | discounted_bill |
| platform_fee=50 only | 50 | 0 | 800+50+0 = 850 | 850 |
| Both set | 50 | 2.5% | 800+50+21.25 = 871.25 | 871.25 |

---

## Conclusion

✅ **NO DEFAULT CHARGES** are applied to any order.

The system works as designed:
1. **Read charges** from users table for that business
2. **If NULL/0** → treat as 0 (no charge)
3. **If value > 0** → apply that charge
4. **Show to customer** in response (full transparency)
5. **Save to database** for audit trail

**There is NO hidden logic, NO fallback defaults, NO secret charges.**

If customer pays `discounted_bill + 0`, it's because:
- ✅ Business admin set charges to 0
- ✅ OR charges were never configured (NULL defaults to 0)
- ✅ Both are legitimate business decisions
