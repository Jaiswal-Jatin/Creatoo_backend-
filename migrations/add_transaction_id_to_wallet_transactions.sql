-- Add transaction_id column to wallet_transactions table
-- This will allow storing order IDs for better tracking

ALTER TABLE wallet_transactions 
ADD COLUMN transaction_id VARCHAR(255) NULL AFTER remark;

-- Add index for better performance
CREATE INDEX idx_wallet_transactions_transaction_id ON wallet_transactions(transaction_id);
