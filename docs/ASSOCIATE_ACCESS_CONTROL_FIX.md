# Associate Business Access Control Fix

## Issue Identified

When calling `/api/visit/history`, **associate restaurants were incorrectly seeing visits from all restaurants in their network**, when they should only see visits to their own location.

**Example Problem:**
- Annapurna Mess 3 (business 944) is an **associate** of Annapurna Mess (business 942)
- When Annapurna Mess 3 calls `/api/visit/history`, it was seeing visits from Mess, Mess 2, Mess 3, and Testing
- It **should only** see visits to Mess 3

## Root Cause

The method determining if a business is "main" or "associate" was flawed:

### Old Logic (Broken)
```typescript
const networkIds = await this.getAssociateNetwork(businessId);
const isMainBusiness = networkIds.length > 1;  // ❌ WRONG
```

This checks if the business is **part of any network** (networkIds > 1), not whether it **HAS associates**:
- Main business → has associates → should see network-wide data ✓
- Associate business → is associated to a parent → should only see own data ✗
- Both would show `isMainBusiness = true` if they had any network connection!

### New Logic (Fixed)
```typescript
private async isMainBusiness(businessId: number): Promise<boolean> {
  const associates = await BusinessAssociate.findOne({
    where: { parent_business_id: businessId },
  });
  return !!associates;  // ✓ CORRECT
}
```

Now it checks if the business **OWNS associates** (is a parent):
- Business 942 (parent) → has associates (942, 943, 944) → `isMainBusiness = true` → sees all network visits ✓
- Business 944 (associate) → has no associates → `isMainBusiness = false` → sees only own visits ✓

## Changes Made

### 1. Added `isMainBusiness()` helper method
**File:** [src/controllers/VisitController.ts](src/controllers/VisitController.ts) (lines 45-52)

```typescript
private async isMainBusiness(businessId: number): Promise<boolean> {
  const associates = await BusinessAssociate.findOne({
    where: { parent_business_id: businessId },
  });
  return !!associates;
}
```

### 2. Updated `history()` endpoint
**File:** [src/controllers/VisitController.ts](src/controllers/VisitController.ts) (lines 410-432)

Now uses the proper check:
```typescript
const main = await this.isMainBusiness(businessId);

if (main) {
  // Main business gets all visits from their network
  const networkIds = await this.getAssociateNetwork(businessId);
  businessIds = networkIds;
  visits = await Visit.findAll({
    where: { business_id: { [Op.in]: businessIds } },
  });
} else {
  // Associate business gets only their own visits
  businessIds = [businessId];
  visits = await Visit.findAll({
    where: { business_id: businessId },
  });
}
```

### 3. Updated `getVisitInfo()` endpoint  
**File:** [src/controllers/VisitController.ts](src/controllers/VisitController.ts) (lines 198-225)

Same proper business type check for the individual visit info endpoint.

## How It Works Now

### Main Business (e.g., business_id = 942)
- Calls `GET /api/visit/history`
- `isMainBusiness(942)` → finds associates where parent_id=942 → returns `true`
- Queries visits with `business_id IN (942, 943, 944, 853, 857)`
- Response includes:
  ```json
  {
    "is_main_business": true,
    "network_businesses": [
      { "business_id": 942, "business_name": "Annapurna Mess" },
      { "business_id": 943, "business_name": "Annapurna Mess 2" },
      { "business_id": 944, "business_name": "Annapurna Mess 3" },
      ...
    ],
    "days": [ /* visits from all 5 businesses */ ]
  }
  ```

### Associate Business (e.g., business_id = 944)
- Calls `GET /api/visit/history`
- `isMainBusiness(944)` → finds no associates where parent_id=944 → returns `false`
- Queries visits with `business_id = 944` only
- Response includes:
  ```json
  {
    "is_main_business": false,
    "network_businesses": [
      { "business_id": 944, "business_name": "Annapurna Mess 3" }
    ],
    "days": [ /* visits to business 944 only */ ]
  }
  ```

## Access Control Summary

| User Type | Call `GET /api/visit/history` | Sees Visits From | is_main_business |
|-----------|------|-------|------|
| Main Business (942) | ✓ | All network businesses | `true` |
| Associate (944) | ✓ | Only own location (944) | `false` |
| Standalone (no associates) | ✓ | Only own location | `false` |

## Testing

### Test 1: Main Business Should See Network Visits
```
POST /api/visit with token from business 942
→ GET /api/visit/history
→ Should see visits from 942, 943, 944, 853, 857
→ is_main_business: true ✓
```

### Test 2: Associate Business Should See Own Visits Only
```
POST /api/visit with token from business 944
→ GET /api/visit/history
→ Should see visits from 944 ONLY
→ is_main_business: false ✓
```

### Test 3: Single Card Lookup
```
GET /api/visit?card_number=4173 with token from business 944
→ Returns only visits to business 944, not other associates ✓
```

## Files Modified

- ✅ [src/controllers/VisitController.ts](src/controllers/VisitController.ts)
  - Added `isMainBusiness()` method (lines 45-52)
  - Updated `history()` method (lines 410-432)
  - Updated `getVisitInfo()` method (lines 198-225)

## Security Impact

✅ **Proper Access Control Enforced**
- Each business can only see their own visit history (unless they're a parent/main business)
- Associate businesses cannot spy on each other's customer data
- Token-based authentication ensures only authorized businesses can access data
