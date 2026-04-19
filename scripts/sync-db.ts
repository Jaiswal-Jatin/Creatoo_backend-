import sequelize from './src/db/sequelize';
import './src/models/User'; // Import models to ensure they are registered with Sequelize

async function syncDb() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully with { alter: true }.');
    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

syncDb();
