# Payment Charges & Discount Test Flow

## Endpoint
**POST** `/api/web/applyOffers`

This is the endpoint that calculates all charges and discounts when customer clicks "pay bill".

---

## Complete Calculation Flow

### Step 1: Input Parameters
```json
{
  "user_id": 123,
  "business_id": 456,
  "original_bill_amount": 1000
}
```

### Step 2: Get Business Discount Settings
From `Business` table:
- `set_first_time_discount` - for first visit customers
- `set_regular_discount` - for returning customers
- `min_order` - minimum order value

Example:
```
set_first_time_discount = 20% (first time)
set_regular_discount = 10% (regular customers)
min_order = 100
```

### Step 3: Determine if First Visit
Check if user has any previous orders for this business.
- **If first visit**: Apply `set_first_time_discount` (20%)
- **If returning**: Apply `set_regular_discount` with loyalty points logic (10% or partial)

### Step 4: Calculate Discount
```
discount_amount = original_bill_amount × discount_percentage / 100
discounted_bill = original_bill_amount - discount_amount
```

**Example (First Visit with 20% discount):**
```
discount_amount = 1000 × 20 / 100 = 200
discounted_bill = 1000 - 200 = 800
```

### Step 5: Get Platform Charges From Business User
Fetch from `User` table (business record) the following:
```
platform_fee_rupees = Fixed amount in ₹ (e.g., 50)
gateway_charges = Percentage (%) (e.g., 2.5)
reverse_gateway_charges = Percentage (%) (e.g., 1.5)
```

### Step 6: Calculate Final Amount with All Charges

**Formula 1: Add Platform Fee to Discounted Bill**
```
finalPlatformFee = discounted_bill + platform_fee_rupees
```

**Formula 2: Calculate Gateway Charges (GST) on Final Amount**
```
gstOnGateway = (finalPlatformFee × gateway_charges) / 100
```

**Formula 3: Final Bill Amount (What Customer Pays)**
```
finalBillAmount = finalPlatformFee + gstOnGateway
```

**Formula 4: Settlement Amount (What Business Receives)**
```
settlementAmount = finalBillAmount - (finalBillAmount × reverse_gateway_charges) / 100 - platform_fee_rupees
```

---

## Complete Example Calculation

### Given:
- **original_bill**: 1000
- **platform_fee_rupees**: 50
- **gateway_charges**: 2.5%
- **reverse_gateway_charges**: 1.5%
- **discount** (first visit): 20%

### Calculation:

```
Step 1: Calculate discount
discount_amount = 1000 × 20 / 100 = 200
discounted_bill = 1000 - 200 = 800

Step 2: Add platform fee
finalPlatformFee = 800 + 50 = 850

Step 3: Calculate gateway charges
gstOnGateway = (850 × 2.5) / 100 = 21.25

Step 4: Final amount customer pays
finalBillAmount = 850 + 21.25 = 871.25

Step 5: Settlement amount for business
settlementAmount = 871.25 - (871.25 × 1.5 / 100) - 50
                 = 871.25 - 13.07 - 50
                 = 808.18
```

### API Response:
```json
{
  "status": true,
  "message": "Points calculated successfully",
  "data": {
    "order_id": "MT...",
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
    "points_you_will_earn": 0
  }
}
```

---

## Testing Scenarios

### Scenario 1: Charges Set to Zero
If admin sets:
- `platform_fee_rupees = 0`
- `gateway_charges = 0`
- `reverse_gateway_charges = 0`

**Calculation:**
```
discounted_bill = 800
finalPlatformFee = 800 + 0 = 800
gstOnGateway = (800 × 0) / 100 = 0
finalBillAmount = 800 + 0 = 800
settlementAmount = 800 - 0 - 0 = 800
```

**Response:**
```json
{
  "original_bill": 1000,
  "discount_applied": 200,
  "discounted_bill": 800,
  "platform_fee": 0,
  "convenience_fee": 0,
  "final_bill_amount": 800
}
```

### Scenario 2: Only Platform Fee
- `platform_fee_rupees = 50`
- `gateway_charges = 0`
- `reverse_gateway_charges = 0`

**Calculation:**
```
finalPlatformFee = 800 + 50 = 850
gstOnGateway = (850 × 0) / 100 = 0
finalBillAmount = 850
```

### Scenario 3: Only Gateway Charges
- `platform_fee_rupees = 0`
- `gateway_charges = 2.5`
- `reverse_gateway_charges = 1.5`

**Calculation:**
```
finalPlatformFee = 800 + 0 = 800
gstOnGateway = (800 × 2.5) / 100 = 20
finalBillAmount = 820
```

---

## Key Fields in Response

| Field | Description | In Production |
|-------|-------------|----------------|
| `original_bill` | Initial bill amount | Shown |
| `discount_percentage` | % discount applied | Shown |
| `discount_applied` | Actual rupees discount | Shown |
| `discounted_bill` | Bill after discount | Shown |
| `platform_fee` | Fixed platform fee in ₹ | ✅ Applied Here |
| `convenience_fee` | Gateway charges (gstOnGateway) | ✅ Applied Here |
| `final_bill_amount` | **What customer pays** | ✅ Applied Here |

---

## Code Flow in WebApiController.ts

```typescript
// Lines 746-776: Get charges from business user
const businessUser = await User.findByPk(businessIdNum, {
  attributes: ["platform_fee_rupees", "gateway_charges", "reverse_gateway_charges"]
});

const platformFee = Number((businessUser as any)?.platform_fee_rupees) || 0;
const gatewayCharges = Number((businessUser as any)?.gateway_charges) || 0;

// Lines 777-784: Calculate final amount
const finalPlatformFee = discountedBill + platformFee;
const gstOnGateway = (finalPlatformFee * gatewayCharges) / 100;
const finalBillAmount = finalPlatformFee + gstOnGateway;

// Lines 904-969: Return response with all charges
return res.status(200).json({
  data: {
    platform_fee: platformFee,
    convenience_fee: gstOnGateway,
    final_bill_amount: finalBillAmount,
    // ... other fields
  }
});
```

---

## Production Verification Steps

1. **Check Admin Settings for Business:**
   ```sql
   SELECT 
     id, 
     name,
     platform_fee_rupees, 
     gateway_charges, 
     reverse_gateway_charges
   FROM users 
   WHERE id = <business_id> AND role = 'business';
   ```

2. **Test with Sample Request:**
   ```json
   POST /api/web/applyOffers
   {
     "user_id": 123,
     "business_id": 456,
     "original_bill_amount": 1000
   }
   ```

3. **Verify Response Fields:**
   - ✅ `platform_fee` - should match DB value
   - ✅ `convenience_fee` - should be calculated
   - ✅ `final_bill_amount` - should include all charges

4. **Check Temporary Order in DB:**
   ```sql
   SELECT 
     original_bill_amount,
     discounted_bill,
     platform_fee,
     gateway_charges,
     final_bill_amount
   FROM temporary_orders 
   WHERE user_id = 123 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

---

## Summary

✅ **Charges ARE being applied** during the `/applyOffers` call
- Platform fee is added to the discounted bill
- Gateway charges are calculated as percentage of (discounted_bill + platform_fee)
- All amounts are visible in the API response
- The `final_bill_amount` is what the customer actually pays

If charges show as 0 in production, check:
1. Business user's `platform_fee_rupees` = NULL or 0
2. Business user's `gateway_charges` = 0
3. Business user's `reverse_gateway_charges` = 0
