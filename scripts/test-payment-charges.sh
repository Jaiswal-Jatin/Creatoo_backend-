#!/bin/bash

# Payment Charges Test Suite
# This script tests different charge scenarios for the /applyOffers endpoint

API_URL="http://dev-api.creatoo.co.in/api/web/applyOffers"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Payment Charges & Discount Test Suite${NC}"
echo -e "${YELLOW}========================================${NC}\n"

# Test Case 1: All charges set to zero
echo -e "${YELLOW}Test Case 1: All charges = 0${NC}"
echo "Setup: platform_fee_rupees=0, gateway_charges=0, reverse_gateway_charges=0"
echo "Request:"
cat << 'EOF'
{
  "user_id": 123,
  "business_id": 456,
  "original_bill_amount": 1000
}
EOF

echo -e "\n${YELLOW}Expected Response:${NC}"
cat << 'EOF'
{
  "original_bill": 1000,
  "discount_applied": 200,
  "discounted_bill": 800,
  "platform_fee": 0,
  "convenience_fee": 0,
  "final_bill_amount": 800
}
EOF

echo -e "\n${YELLOW}Key Observation:${NC}"
echo "- No additional charges added"
echo "- Customer pays only discounted amount: 800"
echo -e "\n---\n"

# Test Case 2: Only platform fee
echo -e "${YELLOW}Test Case 2: Only platform_fee_rupees=50${NC}"
echo "Setup: platform_fee_rupees=50, gateway_charges=0, reverse_gateway_charges=0"
echo "Request: Same as above"

echo -e "\n${YELLOW}Expected Response:${NC}"
cat << 'EOF'
{
  "original_bill": 1000,
  "discount_applied": 200,
  "discounted_bill": 800,
  "platform_fee": 50,
  "convenience_fee": 0,
  "final_bill_amount": 850
}
EOF

echo -e "\n${YELLOW}Key Observation:${NC}"
echo "- Platform fee added: 800 + 50 = 850"
echo "- No gateway charges calculated"
echo -e "\n---\n"

# Test Case 3: Platform fee + Gateway charges
echo -e "${YELLOW}Test Case 3: Full charges applied${NC}"
echo "Setup: platform_fee_rupees=50, gateway_charges=2.5%, reverse_gateway_charges=1.5%"
echo "Request: Same as above"

echo -e "\n${YELLOW}Expected Response:${NC}"
cat << 'EOF'
{
  "original_bill": 1000,
  "discount_applied": 200,
  "discounted_bill": 800,
  "platform_fee": 50,
  "convenience_fee": 21.25,
  "final_bill_amount": 871.25
}
EOF

echo -e "\n${YELLOW}Calculation Breakdown:${NC}"
echo "1. Discount: 1000 × 20% = 200"
echo "2. Discounted bill: 1000 - 200 = 800"
echo "3. Add platform fee: 800 + 50 = 850"
echo "4. Gateway charges: 850 × 2.5% = 21.25"
echo "5. Final: 850 + 21.25 = 871.25"
echo -e "\n---\n"

# Test Case 4: No discount (returning customer with no points)
echo -e "${YELLOW}Test Case 4: Returning customer with 0% discount${NC}"
echo "Setup: No unused loyalty points, discount = 0%"
echo "Request: Same (but returning customer)"

echo -e "\n${YELLOW}Expected Response:${NC}"
cat << 'EOF'
{
  "original_bill": 1000,
  "discount_percentage": 0,
  "discount_applied": 0,
  "discounted_bill": 1000,
  "platform_fee": 50,
  "convenience_fee": 26.25,
  "final_bill_amount": 1076.25
}
EOF

echo -e "\n${YELLOW}Calculation Breakdown:${NC}"
echo "1. No discount: 1000 × 0% = 0"
echo "2. Discounted bill: 1000 - 0 = 1000"
echo "3. Add platform fee: 1000 + 50 = 1050"
echo "4. Gateway charges: 1050 × 2.5% = 26.25"
echo "5. Final: 1050 + 26.25 = 1076.25"
echo -e "\n---\n"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}How to Run These Tests:${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo "1. Set up your test business with specific charge values in the admin panel"
echo "2. Note the business_id and a test user_id"
echo "3. Make curl request:"
echo ""
echo -e "${YELLOW}curl -X POST http://dev-api.creatoo.co.in/api/web/applyOffers \\${NC}"
echo -e "${YELLOW}  -H 'Content-Type: application/json' \\${NC}"
echo -e "${YELLOW}  -d '{${NC}"
echo -e "${YELLOW}    \"user_id\": 123,${NC}"
echo -e "${YELLOW}    \"business_id\": 456,${NC}"
echo -e "${YELLOW}    \"original_bill_amount\": 1000${NC}"
echo -e "${YELLOW}  }'${NC}\n"

echo "4. Compare response fields with expected values above"
echo ""
echo -e "${GREEN}Verification Checklist:${NC}"
echo "✓ platform_fee matches DB value"
echo "✓ convenience_fee = (discounted_bill + platform_fee) × gateway_charges / 100"
echo "✓ final_bill_amount = discounted_bill + platform_fee + convenience_fee"
echo "✓ All amounts are numbers (not null)"
echo ""
