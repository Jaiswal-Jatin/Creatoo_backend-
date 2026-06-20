-- Fix "Data truncated for column 'via'" error for advance_payment wallet transactions
-- The via column was likely an ENUM or had insufficient length; change to VARCHAR(255) to match model

ALTER TABLE wallet_transactions MODIFY COLUMN via VARCHAR(255) DEFAULT NULL;
