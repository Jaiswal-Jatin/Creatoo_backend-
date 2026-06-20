-- Migration: Add category_attributes JSON column to businesses table
-- Purpose: Support dynamic category-specific profile specifications

ALTER TABLE businesses ADD COLUMN category_attributes JSON NULL AFTER business_category;
