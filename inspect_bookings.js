require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'creatoo',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
    timezone: '+05:30',
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
      timezone: '+05:30'
    }
  }
);

sequelize.authenticate()
  .then(async () => {
    console.log('Successfully connected to database.\n');

    console.log('--- RECENT BOOKINGS (Last 10) ---');
    const bookings = await sequelize.query(
      `SELECT id, user_id, business_id, business_category, booking_date, status, advance_amount, advance_payment_status, razorpay_payment_id, created_at 
       FROM bookings 
       ORDER BY created_at DESC 
       LIMIT 10`, 
      { type: QueryTypes.SELECT }
    );
    console.table(bookings);

    console.log('\n--- RECENT WALLET TRANSACTIONS (Last 10) ---');
    const walletTransactions = await sequelize.query(
      `SELECT id, user_id, amount, credit_debit, remark, settlement_status, source_type, created_at 
       FROM wallet_transactions 
       ORDER BY created_at DESC 
       LIMIT 10`, 
      { type: QueryTypes.SELECT }
    );
    console.table(walletTransactions);

    console.log('\n--- SEARCHING SPECIFIC BOOKINGS (50, 68) ---');
    const bookingsAmountSearch = await sequelize.query(
      `SELECT id, user_id, business_id, booking_date, status, advance_amount, advance_payment_status, razorpay_payment_id, created_at 
       FROM bookings 
       WHERE advance_amount = 50 OR advance_amount = 68 OR advance_amount = 50.00 OR advance_amount = 68.00
       ORDER BY created_at DESC`, 
      { type: QueryTypes.SELECT }
    );
    console.table(bookingsAmountSearch);

    console.log('\n--- SEARCHING WALLET TRANSACTIONS (50, 68) ---');
    const walletAmountSearch = await sequelize.query(
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
