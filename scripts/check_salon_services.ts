import databaseManager from '../src/config/database';
import { QueryTypes } from 'sequelize';

const sequelize = databaseManager.getSequelize();

sequelize.authenticate()
  .then(async () => {
    console.log('Connected to database');
    
    console.log('\n--- Salons in users table ---');
    const userSalons = await sequelize.query<any[]>('SELECT id, name, business_name, business_category, category_attributes FROM users WHERE business_category = "salon"', { type: QueryTypes.SELECT });
    console.log(JSON.stringify(userSalons, null, 2));
    
    console.log('\n--- Salons in businesses table ---');
    const businessSalons = await sequelize.query<any[]>('SELECT id, name, business_name, business_category, category_attributes FROM businesses WHERE business_category = "salon"', { type: QueryTypes.SELECT });
    console.log(JSON.stringify(businessSalons, null, 2));

    console.log('\n--- All categories in users table ---');
    const userCats = await sequelize.query<any[]>('SELECT DISTINCT business_category FROM users', { type: QueryTypes.SELECT });
    console.log(userCats);

    console.log('\n--- All categories in businesses table ---');
    const businessCats = await sequelize.query<any[]>('SELECT DISTINCT business_category FROM businesses', { type: QueryTypes.SELECT });
    console.log(businessCats);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err);
    process.exit(1);
  });
