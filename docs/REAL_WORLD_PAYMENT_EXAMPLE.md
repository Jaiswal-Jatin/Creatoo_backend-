# Real-World Example: Step-by-Step Payment Flow

## Complete Example: Customer Paying a Bill

### Scenario Setup
```
Business Settings:
- Name: "Tech Cafe"
- ID: 456
- first_time_discount: 20%
- regular_discount: 10%
- platform_fee_rupees: 50
- gateway_charges: 2.5%
- reverse_gateway_charges: 1.5%

Customer:
- ID: 123
- Status: First time customer at this business
- Loyalty points: 0
```

---

## Step 1: Customer Views Menu & Adds Items to Cart

Customer orders items totaling **₹1000**.

---

## Step 2: Customer Clicks "Pay Bill" Button

**API Call:**
```bash
curl -X POST http://dev-api.creatoo.co.in/api/web/applyOffers \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 123,
    "business_id": 456,
    "original_bill_amount": 1000
  }'
```

---

## Step 3: Backend Processes

### 3a. Check Customer Status
```
Is customer 123 a first-time customer at business 456?
→ YES (no previous orders)
→ Apply first_time_discount: 20%
```

### 3b. Calculate Discount
```
discount_amount = 1000 × 20 / 100 = 200
discounted_bill = 1000 - 200 = 800
```

### 3c. Get Business Charges
```
Query User (business_id=456):
  platform_fee_rupees = 50
  gateway_charges = 2.5
  reverse_gateway_charges = 1.5
```

### 3d. Calculate Final Amounts

**Step 1: Add Platform Fee**
```
finalPlatformFee = discounted_bill + platform_fee
finalPlatformFee = 800 + 50 = 850
```

**Step 2: Calculate Gateway Charges**
```
gstOnGateway = (finalPlatformFee × gateway_charges) / 100
gstOnGateway = (850 × 2.5) / 100 = 21.25
```

**Step 3: Final Amount Customer Pays**
```
finalBillAmount = finalPlatformFee + gstOnGateway
finalBillAmount = 850 + 21.25 = 871.25
```

**Step 4: Settlement Amount (What Business Gets)**
```
settlementAmount = finalBillAmount - (finalBillAmount × reverse_gateway_charges / 100) - platform_fee
settlementAmount = 871.25 - (871.25 × 1.5 / 100) - 50
settlementAmount = 871.25 - 13.07 - 50
settlementAmount = 808.18
```

---

## Step 4: Backend Returns Response to Frontend

**Response:**
```json
{
  "status": true,
  "message": "Points calculated successfully",
  "data": {
    "order_id": "MT1708952340ABC",
    "original_bill": 1000,
    "is_first_visit": true,
    "discount_percentage": 20,
    "discount_applied": 200,
    "discounted_bill": 800,
    
    "platform_fee": 50,
    "convenience_fee": 21.25,
    
    "final_bill_amount": 871.25,
    "total_points_for_business": 0,
    "points_redeemed_here": 0,
    "points_you_will_earn": 32
  }
}
```

### What Frontend Shows to Customer:

```
╔═══════════════════════════════════════╗
║     PAYMENT SUMMARY                   ║
╠═══════════════════════════════════════╣
║ Bill Amount:              ₹1,000.00   ║
║ First-Time Discount (20%):  -₹200.00  ║
╠═══════════════════════════════════════╣
║ Subtotal:                   ₹800.00   ║
║ Platform Fee:                +₹50.00  ║
║ Convenience Fee (2.5%):      +₹21.25  ║
╠═══════════════════════════════════════╣
║ TOTAL TO PAY:             ₹871.25    ║
╚═══════════════════════════════════════╝

✓ You will earn: 32 loyalty points
✓ Order ID: MT1708952340ABC
```

---

## Step 5: Customer Sees Charges & Proceeds to Payment

Customer sees:
- ✅ Original bill: ₹1000
- ✅ Discount applied: ₹200
- ✅ Platform fee: ₹50 (clearly visible)
- ✅ Convenience fee: ₹21.25 (clearly visible)
- ✅ Final amount: ₹871.25 (includes all charges)

---

## Comparison: Different Scenario

### If Business Had 0 Charges Set

**Same customer, same bill, but:**
```
platform_fee_rupees = 0
gateway_charges = 0
reverse_gateway_charges = 0
```

**Response:**
```json
{
  "data": {
    "original_bill": 1000,
    "discount_percentage": 20,
    "discount_applied": 200,
    "discounted_bill": 800,
    
    "platform_fee": 0,          // ← No charge
    "convenience_fee": 0,       // ← No charge
    
    "final_bill_amount": 800    // ← No charges added
  }
}
```

**What Frontend Shows:**
```
╔═══════════════════════════════════════╗
║     PAYMENT SUMMARY                   ║
╠═══════════════════════════════════════╣
║ Bill Amount:              ₹1,000.00   ║
║ First-Time Discount (20%):  -₹200.00  ║
╠═══════════════════════════════════════╣
║ TOTAL TO PAY:              ₹800.00    ║
╚═══════════════════════════════════════╝
```

---

## Verification: What Gets Saved in Database

### temporary_orders Table
```sql
INSERT INTO temporary_orders (
  user_id, business_id, order_id,
  original_bill_amount, discounted_bill,
  loyalty_points_used_discount_amount,
  platform_fee, gateway_charges,
  discount_percentage, final_bill_amount,
  loyalty_points_will_earn, status
) VALUES (
  123, 456, 'MT1708952340ABC',
  1000, 800,
  200,
  50, 2.5,
  20, 871.25,
  32, 'applyoffers'
);
```

### Verification Query
```sql
SELECT 
  user_id,
  business_id,
  original_bill_amount,
  loyalty_points_used_discount_amount as discount,
  discounted_bill,
  platform_fee,
  gateway_charges,
  final_bill_amount,
  created_at
FROM temporary_orders 
WHERE order_id = 'MT1708952340ABC';
```

**Result:**
```
user_id | business_id | original_bill | discount | discounted | platform_fee | gateway_charges | final_bill | timestamp
--------|-------------|---------------|----------|------------|--------------|-----------------|------------|----------------------------
123     | 456         | 1000          | 200      | 800        | 50           | 2.5             | 871.25     | 2024-02-26 10:30:45
```

---

## Breakdown: Where Every Rupee Goes

```
Customer Pays: ₹871.25

Split as:
├─ Original Bill Portion: ₹800.00
│  ├─ Restaurant keeps: ₹800.00 × (100% - 1.5% reverse gateway)
│  │  = ₹787.93
│  └─ Gateway takes: ₹800.00 × 1.5% = ₹12.00
│
├─ Platform Fee: ₹50.00
│  └─ Platform keeps: ₹50.00
│
└─ Gateway Charges: ₹21.25
   └─ Gateway takes: ₹21.25

Total Received by Restaurant (Settlement): ₹808.18
Total Received by Platform: ₹63.07 (50 platform fee + gateway share)
```

---

## Testing This Flow

### To Test Locally:

1. **Setup Business with Charges:**
   ```sql
   UPDATE users 
   SET 
     platform_fee_rupees = 50,
     gateway_charges = 2.5,
     reverse_gateway_charges = 1.5,
     set_first_time_discount = 20,
     set_regular_discount = 10
   WHERE id = 456;
   ```

2. **Call API:**
   ```bash
   curl -X POST http://dev-api.creatoo.co.in/api/web/applyOffers \
     -H "Content-Type: application/json" \
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

3. **Expected Output:**
   ```json
   {
     "original_bill": 1000,
     "discount_applied": 200,
     "discounted_bill": 800,
     "platform_fee": 50,
     "convenience_fee": 21.25,
     "final_bill_amount": 871.25
   }
   ```

4. **Verify in Database:**
   ```sql
   SELECT 
     original_bill_amount,
     discounted_bill,
     platform_fee,
     final_bill_amount
   FROM temporary_orders 
   WHERE user_id = 123 AND business_id = 456
   ORDER BY created_at DESC LIMIT 1;
   ```

---

## Key Takeaway

✅ **When customer clicks "Pay Bill":**
1. Discount is calculated and subtracted
2. Platform fee is added
3. Gateway charges are calculated on the new total
4. All charges are **visible to customer before payment**
5. All amounts are **saved to database**
6. Customer pays the **final_bill_amount** (includes all charges)

If any charges show as 0, it means admin set them to 0 in the business profile.
