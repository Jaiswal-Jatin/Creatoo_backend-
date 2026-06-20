import sequelize from '../src/db/sequelize';

async function fix() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection established successfully.');
    
    console.log('Altering businesses category_attributes column to JSON type...');
    await sequelize.query('ALTER TABLE businesses MODIFY COLUMN category_attributes JSON NULL');
    console.log('✅ Column altered successfully to JSON type.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing database column:', error);
    process.exit(1);
  }
}

fix();
