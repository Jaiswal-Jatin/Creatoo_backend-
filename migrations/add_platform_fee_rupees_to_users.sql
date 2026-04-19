-- Add platform_fee_rupees column to users table
-- This migration adds a new field to store platform fee in rupees (fixed amount)
-- as an alternative to platform_fee_percent which stores percentage

ALTER TABLE `users` 
ADD COLUMN `platform_fee_rupees` FLOAT NULL DEFAULT NULL 
AFTER `platform_fee_percent`;

-- Add index for better query performance if needed
CREATE INDEX `idx_users_platform_fee_rupees` ON `users` (`platform_fee_rupees`);
