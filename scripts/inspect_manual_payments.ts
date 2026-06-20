import databaseManager from '../src/config/database';
import { QueryTypes } from 'sequelize';

const sequelize = databaseManager.getSequelize();

async function run() {
  await sequelize.authenticate();
  console.log('DB connected');

  console.log('\n--- SCHEMA FOR manual_payments ---');
  const schema = await sequelize.query('DESCRIBE manual_payments', { type: QueryTypes.SELECT });
  console.log(schema);

  console.log('\n--- RECENT MANUAL PAYMENTS ---');
  const payments = await sequelize.query('SELECT * FROM manual_payments ORDER BY id DESC LIMIT 5', { type: QueryTypes.SELECT });
  console.log(payments);

  if (payments.length > 0) {
    const payment = payments[0] as any;
    console.log('\n--- ASSOCIATED USER (user_id) ---');
    const user = await sequelize.query(`SELECT id, name, mobile, role_id, business_name, business_image FROM users WHERE id = ${payment.user_id}`, { type: QueryTypes.SELECT });
    console.log(user);

    console.log('\n--- ASSOCIATED BUSINESS (business_id) ---');
    const businessUser = await sequelize.query(`SELECT id, name, mobile, role_id, business_name, business_image FROM users WHERE id = ${payment.business_id}`, { type: QueryTypes.SELECT });
    console.log('From users table:', businessUser);

    const businessTable = await sequelize.query(`SELECT id, name, business_name, business_image FROM businesses WHERE id = ${payment.business_id}`, { type: QueryTypes.SELECT });
    console.log('From businesses table:', businessTable);
  }
}

run().catch(console.error);
