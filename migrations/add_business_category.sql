-- Migration: Add business_category column and set default values
-- Purpose: Add category field (restaurant, salon, other) to track business types
-- Date: 2024

-- Step 1: Add the business_category column to businesses table
ALTER TABLE businesses ADD COLUMN business_category ENUM('restaurant', 'salon', 'traf') DEFAULT 'restaurant' AFTER business_type_id;

-- Step 2: Update all existing businesses to 'restaurant' category (default)
UPDATE businesses SET business_category = 'restaurant' WHERE business_category IS NULL OR business_category = '';

-- Done! All existing businesses are now in the 'restaurant' category
