import sequelize from '../src/db/sequelize';
import User from '../src/models/User';
import Business from '../src/models/Business';

async function diagnose() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection established successfully.');

    // Count by roles in users table
    const [userRoles]: any = await sequelize.query('SELECT COUNT(*) as cnt, role_id FROM users GROUP BY role_id');
    console.log('\n--- Count by role_id in users table ---');
    console.log(userRoles);

    // Count in businesses table
    const [bizCount]: any = await sequelize.query('SELECT COUNT(*) as cnt FROM businesses');
    console.log('\n--- Count in businesses table ---');
    console.log(bizCount);

    // Get table structure of businesses
    const [bizColumns]: any = await sequelize.query('DESCRIBE businesses');
    console.log('\n--- Columns in businesses table ---');
    console.log(bizColumns.map((c: any) => `${c.Field} (${c.Type})`));

    // Check one business record
    const [bizSample]: any = await sequelize.query('SELECT id, business_name, business_category, category_attributes FROM businesses LIMIT 1');
    console.log('\n--- Sample Business record ---');
    console.log(bizSample);

    process.exit(0);
  } catch (error) {
    console.error('Error diagnosing:', error);
    process.exit(1);
  }
}

diagnose();
