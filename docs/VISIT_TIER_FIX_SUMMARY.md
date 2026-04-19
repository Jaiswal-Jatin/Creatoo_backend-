# Visit Tier Upgrade Issue - Analysis & Fix

## Problem Identified

**Issue:** Customer tier was not being upgraded when visiting different restaurants in the associate network.

**Example:**
- Akash (card #4173) visited Annapurna Mess 2 (business 943) on 2026-02-05 → tier: "new" ✓
- Akash visited Annapurna Mess 3 (business 944) on 2026-02-25 → tier: "new" ✗
- **Expected:** "core" tier (20 days since last visit, which is >15 days)

## Root Cause

The `getAssociateNetwork()` method in [VisitController.ts](src/controllers/VisitController.ts) had a **limited network discovery** algorithm:

### Old Logic (Broken)
```
For business 944:
1. Find direct associates where 944 is parent → []
2. Find direct parents where 944 is associate → [942]
3. Return: [944, 942]
Result: Misses 943 (sibling associate)
```

When calculating the tier for a visit to business 944, the system only looked at visits to businesses in [944, 942], missing visits to **business 943** (the previous visit location). So the previous visit wasn't found, tier stayed as "new".

### New Logic (Fixed)
```
For business 944:
1. Visited = {944}
2. Find all associates of 944 → []
3. Find all parents of 944 → [942]
4. Add 942 to queue
5. Process 942:
   - Find associates of 942 → [943, 944, etc.]
   - Find parents of 942 → []
6. Final result: {944, 942, 943, ...}
Result: Includes all siblings in the network ✓
```

Now it uses **recursive/iterative traversal** to find the entire connected network, not just direct relationships.

## Changes Made

### 1. Fixed `getAssociateNetwork()` method
**File:** [src/controllers/VisitController.ts](src/controllers/VisitController.ts) (lines 45-79)

Changed from simple parent/child lookup to **breadth-first search (BFS)** that discovers:
- Direct associates
- Direct parents
- Parents of associates
- Associates of parents
- And recursively continues until all connected businesses are found

### 2. How the Tier Fix Works

When a new visit is recorded via `POST /api/visit`:
1. ✓ Calls `createVisit()` → calculates tier using `calculateAssociateTier()`
2. ✓ `calculateAssociateTier()` now gets the **correct full network** via fixed `getAssociateNetwork()`
3. ✓ Finds the last visit to ANY business in the network (not just the current one)
4. ✓ Calculates tier based on days since that visit:
   - 0-7 days → "premium"
   - 8-15 days → "elite"
   - >15 days → "core"
   - No history → "new"

## Tier Calculation Rule
```
Days since last visit | Tier
─────────────────────────────
No previous visit     | new
0-7 days             | premium
8-15 days            | elite
>15 days             | core
```

## Fixing Historical Data

The fix applies to **all new visits going forward**. For historical visits that were recorded with incorrect tiers, you can run:

```bash
npm run build
ts-node recalculate-tiers.ts
```

This script will:
1. Load all visits from the database
2. For each business, determine its network
3. Recalculate the correct tier for each visit based on previous visit history
4. Update tiers in the database
5. Log all changes made

**Example output:**
```
Processing business 944 (network size: 5)
  Card 4173: new -> core (20 days since last visit)
  Card 7758: elite -> premium (3 days since last visit)
...
✓ Tier recalculation complete. Updated 45 visits across 5 businesses.
```

## Testing

To verify the fix works:

1. **Create a test visit:**
   ```
   POST /api/visit
   Body: { "card_number": 4173 }
   ```

2. **Check the response:**
   - The tier should now correctly reflect the days since the last visit (across all network businesses)
   - Visit by same card to different business in network should show updated tier

3. **Check visit history:**
   ```
   GET /api/visit/history
   ```
   - New visits will have correct tiers
   - Old visits will reflect what was recorded (before you run the recalculate script)

## Files Modified

- ✓ [src/controllers/VisitController.ts](src/controllers/VisitController.ts) - Fixed `getAssociateNetwork()` method
- ✓ [recalculate-tiers.ts](recalculate-tiers.ts) - New utility script for fixing historical data
- ✓ [migrations/recalculate_visit_tiers.sql](migrations/recalculate_visit_tiers.sql) - Reference SQL approach

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Network discovery | Direct relationships only | Entire connected network |
| Tier for revisits to sibling business | "new" ❌ | Correct tier based on days ✓ |
| Visits across 944→943 network | Calculated separately ❌ | Treated as unified network ✓ |
