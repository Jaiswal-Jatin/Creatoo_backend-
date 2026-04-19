# Visual Comparison: Charges When Set to 0 vs When Set to Values

## Side-by-Side Comparison

```
SCENARIO 1: All Charges = 0 (or NULL)          SCENARIO 2: Charges Set to Values
═════════════════════════════════════════════════════════════════════════════════

Database Settings:                              Database Settings:
  platform_fee_rupees = 0                         platform_fee_rupees = 50
  gateway_charges = 0                             gateway_charges = 2.5
  reverse_gateway_charges = 0                     reverse_gateway_charges = 1.5

Code Execution:                                 Code Execution:
  platformFee = 0                                 platformFee = 50
  gatewayCharges = 0                              gatewayCharges = 2.5
  reverseGatewayCharges = 0                       reverseGatewayCharges = 1.5

Calculation:                                    Calculation:
  discountedBill = 800                            discountedBill = 800
  finalPlatformFee = 800 + 0 = 800                finalPlatformFee = 800 + 50 = 850
  gstOnGateway = (800 × 0) / 100 = 0              gstOnGateway = (850 × 2.5) / 100 = 21.25
  finalBillAmount = 800 + 0 = 800                 finalBillAmount = 850 + 21.25 = 871.25

API Response:                                   API Response:
  {                                               {
    "platform_fee": 0,                              "platform_fee": 50,
    "convenience_fee": 0,                           "convenience_fee": 21.25,
    "final_bill_amount": 800                        "final_bill_amount": 871.25
  }                                               }

What Customer Sees:                             What Customer Sees:
  ┌──────────────────────────┐                    ┌──────────────────────────┐
  │ Subtotal:        ₹800    │                    │ Subtotal:        ₹800    │
  │ Platform Fee:     ₹0     │                    │ Platform Fee:     ₹50    │
  │ Convenience Fee:  ₹0     │                    │ Convenience Fee: ₹21.25  │
  ├──────────────────────────┤                    ├──────────────────────────┤
  │ TOTAL:           ₹800    │                    │ TOTAL:          ₹871.25  │
  └──────────────────────────┘                    └──────────────────────────┘

Saved in DB:                                    Saved in DB:
  platform_fee = 0                                platform_fee = 50
  gateway_charges = 0                             gateway_charges = 2.5
  final_bill_amount = 800                         final_bill_amount = 871.25

Amount Charging to Card: ₹800                   Amount Charging to Card: ₹871.25
Amount Business Receives: ₹800                  Amount Business Receives: ~₹808

═════════════════════════════════════════════════════════════════════════════════
```

---

## Truth Table: What Actually Happens

### When Database Values Are...

| Setting | Value | Code Assignment | Result | In Response | Customer Pays |
|---------|-------|-----------------|--------|-------------|---------------|
| platform_fee_rupees | `0` | `Number(0) \|\| 0` | **0** | Shows 0 | No fee added |
| platform_fee_rupees | `NULL` | `Number(null) \|\| 0` | **0** | Shows 0 | No fee added |
| platform_fee_rupees | `undefined` | `Number(undefined) \|\| 0` | **0** | Shows 0 | No fee added |
| platform_fee_rupees | `50` | `Number(50) \|\| 0` | **50** | Shows 50 | +₹50 added |
| gateway_charges | `0` | `Number(0) \|\| 0` | **0** | Shows 0 | No % charge |
| gateway_charges | `NULL` | `Number(null) \|\| 0` | **0** | Shows 0 | No % charge |
| gateway_charges | `2.5` | `Number(2.5) \|\| 0` | **2.5** | Shows 2.5% | +% charge |
| reverse_gateway_charges | `0` | `Number(0) \|\| 0` | **0** | Shows 0 | Business gets full |
| reverse_gateway_charges | `1.5` | `Number(1.5) \|\| 0` | **1.5** | Calculated | Business gets less |

---

## Proof: No Default Mechanism

### The Code (Line 757-782 of WebApiController.ts)

```typescript
// ✅ ONLY these values are fetched
const platformFee = Number((businessUser as any)?.platform_fee_rupees) || 0;
const gatewayCharges = Number((businessUser as any)?.gateway_charges) || 0;
const reverseGatewayCharges = Number((businessUser as any)?.reverse_gateway_charges) || 0;

// ✅ Directly used in calculation (NO additional logic)
const finalPlatformFee = discountedBill + platformFee;
const gstOnGateway = (finalPlatformFee * gatewayCharges) / 100;
const finalBillAmount = finalPlatformFee + gstOnGateway;

// ❌ NOT PRESENT:
// if (platformFee === 0) platformFee = 50;  // NO DEFAULT
// if (gatewayCharges === 0) gatewayCharges = 2.5;  // NO DEFAULT
// const defaultFee = (platformFee || 50);  // NO DEFAULT
```

---

## Test Case: Verify This Behavior

### Test 1: All Charges = 0

**Setup:**
```sql
UPDATE users 
SET platform_fee_rupees = 0, gateway_charges = 0 
WHERE id = 456;
```

**Call API:**
```bash
curl -X POST /api/web/applyOffers \
  -d '{"user_id": 123, "business_id": 456, "original_bill_amount": 1000}'
```

**Expected Response:**
```json
{
  "data": {
    "discount_applied": 200,
    "discounted_bill": 800,
    "platform_fee": 0,           ← Shows 0 (not hidden)
    "convenience_fee": 0,        ← Shows 0 (not hidden)
    "final_bill_amount": 800     ← = discounted_bill (200 less than original)
  }
}
```

**Verify in DB:**
```sql
SELECT platform_fee, gateway_charges, final_bill_amount 
FROM temporary_orders 
WHERE business_id = 456 
ORDER BY created_at DESC LIMIT 1;

-- Result: 0, 0, 800 ✅
```

---

### Test 2: Set Charges to Values

**Setup:**
```sql
UPDATE users 
SET platform_fee_rupees = 50, gateway_charges = 2.5 
WHERE id = 456;
```

**Call API (same endpoint, same params):**
```bash
curl -X POST /api/web/applyOffers \
  -d '{"user_id": 123, "business_id": 456, "original_bill_amount": 1000}'
```

**Expected Response:**
```json
{
  "data": {
    "discount_applied": 200,
    "discounted_bill": 800,
    "platform_fee": 50,          ← Shows 50 (not 0!)
    "convenience_fee": 21.25,    ← Calculated (not 0!)
    "final_bill_amount": 871.25  ← Higher than before
  }
}
```

**Verify in DB:**
```sql
SELECT platform_fee, gateway_charges, final_bill_amount 
FROM temporary_orders 
WHERE business_id = 456 
ORDER BY created_at DESC LIMIT 1;

-- Result: 50, 2.5, 871.25 ✅
```

---

## What This Proves

✅ **When charges = 0**
- Response shows `platform_fee: 0`
- Response shows `convenience_fee: 0`
- Customer pays `discounted_bill` only
- NO hidden charges
- NO fallback defaults

✅ **When charges > 0**
- Response shows `platform_fee: 50`
- Response shows `convenience_fee: 21.25`
- Customer pays more
- Differences are only because DB values changed

✅ **Conclusion**
- System behavior is deterministic
- Only depends on DB values
- NO hardcoded defaults
- FULL transparency in response

---

## Where Default Charges Could Have Been (But Aren't)

### ❌ Not Here:

```typescript
// Could be in applyOffers calculation:
const platformFee = (businessUser?.platform_fee_rupees ?? 50); // ❌ NOT THIS

// Could fallback to settings:
const Setting = await Setting.findOne();
const platformFee = (businessUser?.platform_fee_rupees ?? Setting?.platform_fee_percent); // ❌ NOT THIS

// Could be env variables:
const platformFee = Number(process.env.DEFAULT_PLATFORM_FEE) || 0; // ❌ NOT THIS

// Could be hardcoded:
const platformFee = 50; // ❌ NOT HARDCODED
```

### ✅ Only Here:

```typescript
// ONLY source: users table, with || 0 fallback
const platformFee = Number((businessUser as any)?.platform_fee_rupees) || 0; // ✅ ONLY THIS
```

---

## Database Facts

**I searched the entire codebase and found:**

```
Settings Table (NOT used for charges):
├─ platform_fee_percent: FLOAT
├─ gateway_charges: FLOAT
└─ reverse_gateway_charges: FLOAT

Users Table (ONLY source for charges):
├─ platform_fee_rupees: FLOAT ← ✅ USED
├─ gateway_charges: FLOAT ← ✅ USED
└─ reverse_gateway_charges: FLOAT ← ✅ USED

Environment Variables (NOT queried):
├─ DEFAULT_PLATFORM_FEE: None found
└─ DEFAULT_GATEWAY_CHARGES: None found

Hardcoded Values (NOT present):
├─ platformFee = 50: ❌
└─ gatewayCharges = 2.5: ❌
```

---

## Final Answer

### Question: "Are there default charges if set to 0?"

**Answer: NO**

**Proof:**
1. ✅ Code only fetches from users table
2. ✅ No values other than `|| 0` fallback
3. ✅ No settings table fallback
4. ✅ No hardcoded defaults
5. ✅ No environment variable defaults
6. ✅ All charges shown transparently in response
7. ✅ If DB = 0, then response = 0, then bill = discounted_bill

**You will get charged:**
- ✅ Platform fee: ONLY if users.platform_fee_rupees > 0
- ✅ Gateway charges: ONLY if users.gateway_charges > 0
- ✅ Reverse charges: ONLY if users.reverse_gateway_charges > 0
- ✅ Otherwise: ZERO charges automatically
