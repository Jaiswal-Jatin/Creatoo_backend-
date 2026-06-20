import databaseManager from './src/config/database';
import { QueryTypes } from 'sequelize';

const sequelize = databaseManager.getSequelize();

sequelize.authenticate()
  .then(async () => {
    console.log('Successfully connected to database.\n');

    console.log('--- RECENT BOOKINGS ---');
    const bookings = await sequelize.query<any[]>(
      `SELECT id, user_id, business_id, business_category, booking_date, status, advance_amount, advance_payment_status, razorpay_payment_id, created_at 
       FROM bookings 
       ORDER BY created_at DESC 
       LIMIT 10`, 
      { type: QueryTypes.SELECT }
    );
    console.table(bookings);

    console.log('\n--- RECENT WALLET TRANSACTIONS ---');
    const walletTransactions = await sequelize.query<any[]>(
      `SELECT id, user_id, amount, credit_debit, remark, settlement_status, source_type, created_at 
       FROM wallet_transactions 
       ORDER BY created_at DESC 
       LIMIT 10`, 
      { type: QueryTypes.SELECT }
    );
    console.table(walletTransactions);

    console.log('\n--- SEARCHING SPECIFIC AMOUNTS (50, 68) IN BOOKINGS ---');
    const bookingsAmountSearch = await sequelize.query<any[]>(
      `SELECT id, user_id, business_id, booking_date, status, advance_amount, advance_payment_status, razorpay_payment_id, created_at 
       FROM bookings 
       WHERE advance_amount = 50 OR advance_amount = 68 
       ORDER BY created_at DESC`, 
      { type: QueryTypes.SELECT }
    );
    console.table(bookingsAmountSearch);

    console.log('\n--- SEARCHING SPECIFIC AMOUNTS (50, 68) IN WALLET TRANSACTIONS ---');
    const walletAmountSearch = await sequelize.query<any[]>(
      `SELECT id, user_id, amount, credit_debit, remark, settlement_status, source_type, created_at 
       FROM wallet_transactions 
       WHERE amount = 50 OR amount = 68 OR amount = 50.00 OR amount = 68.00
       ORDER BY created_at DESC`, 
      { type: QueryTypes.SELECT }
    );
    console.table(walletAmountSearch);

    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err);
    process.exit(1);
  });
