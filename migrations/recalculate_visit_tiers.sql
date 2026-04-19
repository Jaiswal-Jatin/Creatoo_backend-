-- Migration: Recalculate visit tiers based on previous visit history
-- This fixes the issue where tier wasn't being upgraded when customers visited associate businesses

-- Add a helper procedure to calculate tier based on days elapsed
DELIMITER //
CREATE PROCEDURE CalculateTierForDays(IN days INT, OUT result VARCHAR(20))
BEGIN
  IF days IS NULL THEN
    SET result = 'new';
  ELSEIF days <= 7 THEN
    SET result = 'premium';
  ELSEIF days <= 15 THEN
    SET result = 'elite';
  ELSE
    SET result = 'core';
  END IF;
END//
DELIMITER ;

-- Create temporary table to store processed visits
CREATE TEMPORARY TABLE IF NOT EXISTS visit_tier_update AS
SELECT DISTINCT 
  v.id,
  v.card_number,
  v.business_id,
  v.time,
  COALESCE(
    FLOOR(DATEDIFF(v.time, prev_visit.time)),
    NULL
  ) as days_since_last_visit
FROM visits v
LEFT JOIN (
  SELECT 
    v1.id,
    v1.card_number,
    v1.time,
    MAX(v2.time) as prev_visit_time
  FROM visits v1
  LEFT JOIN visits_network vn ON v1.business_id = vn.business_id
  LEFT JOIN visits v2 ON v2.card_number = v1.card_number 
    AND v2.business_id IN (SELECT business_id FROM visits_network WHERE parent_id = vn.parent_id)
    AND v2.time < v1.time
  GROUP BY v1.id, v1.card_number, v1.time
) prev_visit ON v.id = prev_visit.id
ORDER BY v.id;

-- Note: This is a template. The actual migration needs to:
-- 1. Create a visits_network helper view that maps all siblings in the network
-- 2. For each visit, find the most recent visit to ANY business in the network
-- 3. Calculate tier based on the time difference
-- 4. Update the tier field

-- Alternative approach: Run this from Node.js using the VisitController's calculateTier logic
-- This ensures consistency with the application code
