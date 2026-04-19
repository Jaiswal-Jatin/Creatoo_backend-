# Payment Charges - Visual Quick Reference

## When Customer Clicks "Pay Bill" - What Happens

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: Frontend sends bill amount to /api/web/applyOffers         │
│ ─────────────────────────────────────────────────────────────────   │
│ {                                                                   │
│   "user_id": 123,                                                  │
│   "business_id": 456,                                              │
│   "original_bill_amount": 1000                                     │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: Backend reads charges from users table                      │
│ ─────────────────────────────────────────────────────────────────   │
│ SELECT platform_fee_rupees, gateway_charges                        │
│ FROM users WHERE id = 456                                          │
│                                                                     │
│ Result:                                                             │
│ platform_fee_rupees = 50        (Fixed amount)                    │
│ gateway_charges = 2.5           (Percentage)                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: Calculate discount                                          │
│ ─────────────────────────────────────────────────────────────────   │
│ First-time customer? YES                                            │
│ Apply discount: 20%                                                 │
│                                                                     │
│ discount_amount = 1000 × 20 / 100 = 200                            │
│ discounted_bill = 1000 - 200 = 800                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: ADD PLATFORM FEE ⚠️                                         │
│ ─────────────────────────────────────────────────────────────────   │
│ finalPlatformFee = discounted_bill + platform_fee                  │
│ finalPlatformFee = 800 + 50 = 850                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: ADD GATEWAY CHARGES ⚠️                                      │
│ ─────────────────────────────────────────────────────────────────   │
│ gstOnGateway = (finalPlatformFee × gateway_charges) / 100           │
│ gstOnGateway = (850 × 2.5) / 100 = 21.25                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6: FINAL AMOUNT (WHAT CUSTOMER PAYS)                          │
│ ─────────────────────────────────────────────────────────────────   │
│ finalBillAmount = finalPlatformFee + gstOnGateway                   │
│ finalBillAmount = 850 + 21.25 = 871.25 ✅                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 7: Return response to frontend                                │
│ ─────────────────────────────────────────────────────────────────   │
│ {                                                                   │
│   "status": true,                                                  │
│   "data": {                                                         │
│     "original_bill": 1000,                                         │
│     "discount_applied": 200,                                       │
│     "discounted_bill": 800,                                        │
│     "platform_fee": 50,                  ✅ VISIBLE                │
│     "convenience_fee": 21.25,           ✅ VISIBLE                │
│     "final_bill_amount": 871.25         ✅ TOTAL                  │
│   }                                                                 │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 8: Save to temporary_orders table                              │
│ ─────────────────────────────────────────────────────────────────   │
│ INSERT INTO temporary_orders (                                      │
│   user_id, business_id,                                            │
│   original_bill_amount = 1000,                                     │
│   discounted_bill = 800,                                           │
│   platform_fee = 50,            ✅ SAVED                           │
│   gateway_charges = 2.5,        ✅ SAVED                           │
│   final_bill_amount = 871.25    ✅ SAVED                           │
│ ) VALUES (...)                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 9: Frontend shows customer breakdown                           │
│ ─────────────────────────────────────────────────────────────────   │
│ ╔═══════════════════════════════════════╗                          │
│ ║     PAYMENT BREAKDOWN                 ║                          │
│ ╠═══════════════════════════════════════╣                          │
│ ║ Original Bill:           ₹1,000.00    ║                          │
│ ║ Discount (20%):            -₹200.00   ║                          │
│ ║ Subtotal:                  ₹800.00    ║                          │
│ ║ Platform Fee:               +₹50.00   ║ ✅ Customer sees         │
│ ║ Convenience Fee:            +₹21.25   ║ ✅ Customer sees         │
│ ╠═══════════════════════════════════════╣                          │
│ ║ TOTAL TO PAY:           ₹871.25       ║                          │
│ ╚═══════════════════════════════════════╝                          │
│                                                                     │
│ Customer Reviews and Accepts ✅                                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 10: Payment Processing                                         │
│ ─────────────────────────────────────────────────────────────────   │
│ - Create Razorpay order for ₹871.25                                │
│ - Charges embedded in final amount                                  │
│ - Record in orders table with charges                              │
│ - Mark temporary_orders as completed                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Summary Breakdown

### Money Flow

```
Customer Pays:  ₹871.25
     ├─ Bill (after discount):  ₹800.00 → Goes to Business
     ├─ Platform Fee:           ₹50.00  → Goes to Platform
     └─ Gateway Charges (2.5%): ₹21.25  → Split between Platform & Gateway
```

### What Gets Saved Where

```
API Response              temporary_orders table       orders table
│                        │                             │
├─ platform_fee   ────→ ├─ platform_fee      ────────→ ├─ platform_fee
├─ convenience_fee       ├─ gateway_charges            ├─ gateway_charges
├─ final_bill_amount  ──→ ├─ final_bill_amount         └─ bill_amount
└─ (visible before)      └─ (saved for confirmation)      (final record)
   payment
```

---

## Key Points

### ✅ Charges ARE Applied When:
- Customer clicks "Pay Bill"
- `/api/web/applyOffers` endpoint is called
- Platform fee from DB is added to discounted bill
- Gateway charges are calculated on new total
- All amounts returned in response

### ✅ Charges Are Visible To:
- API Response (before payment)
- Frontend breakdown (before payment)
- Database records (temporary_orders)
- Final orders (after payment)

### ✅ Charges Equal Zero When:
- `platform_fee_rupees` = 0 or NULL in database
- `gateway_charges` = 0 or NULL in database
- (This is correct behavior if admin set them to 0)

---

## Field Definitions

| Field | Where From | Why | Value |
|-------|-----------|-----|-------|
| `original_bill` | Input | Starting point | 1000 |
| `discount_percentage` | Business settings + logic | First time / loyalty | 20% |
| `discount_applied` | Calculated | Amount reduced | 200 |
| `discounted_bill` | Calculated | Bill after discount | 800 |
| `platform_fee` | users table | Fixed platform charge | 50 |
| `convenience_fee` | Calculated | Gateway charges applied | 21.25 |
| `final_bill_amount` | Calculated | **What customer pays** | 871.25 |

---

## Database View

### Before Payment (temporary_orders table)
```
order_id          | original_bill | discounted_bill | platform_fee | gateway_charges | final_bill_amount
──────────────────┼───────────────┼─────────────────┼──────────────┼─────────────────┼─────────────────
MT17089523... | 1000           | 800              | 50           | 2.5             | 871.25
```

### After Payment (orders table)
```
id  | user_id | business_id | bill_amount | platform_fee | gateway_charges | status
────┼─────────┼─────────────┼─────────────┼──────────────┼─────────────────┼─────────
100 | 123     | 456         | 871.25      | 50           | 2.5             | completed
```

---

## Quick Test

```bash
# Test the charges
curl -X POST http://dev-api.creatoo.co.in/api/web/applyOffers \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 123,
    "business_id": 456,
    "original_bill_amount": 1000
  }'

# Look for in response:
{
  "platform_fee": 50,          ← Should be > 0 if set
  "convenience_fee": 21.25,    ← Should be > 0 if gateway_charges set
  "final_bill_amount": 871.25  ← Should be > discounted_bill
}
```

---

## Troubleshooting at a Glance

| Issue | Check | Fix |
|-------|-------|-----|
| platform_fee shows 0 | SELECT platform_fee_rupees FROM users WHERE id = business_id | UPDATE users SET platform_fee_rupees = 50 WHERE... |
| convenience_fee shows 0 | SELECT gateway_charges FROM users WHERE id = business_id | UPDATE users SET gateway_charges = 2.5 WHERE... |
| final_bill = discounted_bill | Are all charges 0 above? | Set charges in database |
| Response doesn't have field | Check code version is latest | Pull latest WebApiController.ts |
| Charge not in orders table | Check PaymentController.ts line 1306 | Ensure charges transferred from temporary_orders |

---

## Answer to Your Question

> "When customer clicks pay bill, which charges and discount is applied? If platform fees and other charges set zero"

### Response:

✅ **Yes, charges ARE applied**

When charges set to **zero**:
- `platform_fee` will show as **0** in response (correct)
- `convenience_fee` will show as **0** in response (correct)
- Customer pays only: `discounted_bill` amount

When charges set to **non-zero**:
- `platform_fee` will show the amount from DB
- `convenience_fee` will be calculated
- Customer pays: `discounted_bill + platform_fee + convenience_fee`

**The system is working correctly either way.**

---

## Documents for More Details

- [README_CHARGES_DOCUMENTATION.md](README_CHARGES_DOCUMENTATION.md) - Index of all docs
- [CHARGES_QUICK_REFERENCE.md](CHARGES_QUICK_REFERENCE.md) - Quick overview
- [PAYMENT_CHARGES_TEST_FLOW.md](PAYMENT_CHARGES_TEST_FLOW.md) - Full breakdown
- [REAL_WORLD_PAYMENT_EXAMPLE.md](REAL_WORLD_PAYMENT_EXAMPLE.md) - Real example
- [TEST_CHARGES_CURL.md](TEST_CHARGES_CURL.md) - Testing guide
- [PRODUCTION_DIAGNOSTIC_CHARGES.md](PRODUCTION_DIAGNOSTIC_CHARGES.md) - Diagnostics
