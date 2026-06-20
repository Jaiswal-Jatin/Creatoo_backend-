const { Sequelize } = require('sequelize');
require('dotenv').config();

// Simple database check
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false
  }
);

sequelize.authenticate()
  .then(async () => {
    console.log('Connected to database');
    
    // Check users count
    const [usersResult] = await sequelize.query('SELECT COUNT(*) as count FROM users');
    const usersCount = usersResult[0]['count'];
    
    // Check businesses count
    const [businessesResult] = await sequelize.query('SELECT COUNT(*) as count FROM businesses');
    const businessesCount = businessesResult[0]['count'];
    
    // Check posts count
    const [postsResult] = await sequelize.query('SELECT COUNT(*) as count FROM posts');
    const postsCount = postsResult[0]['count'];
    
    console.log(`Users: ${usersCount}, Businesses: ${businessesCount}, Posts: ${postsCount}`);
    
    // Describe the posts table to see its columns
    console.log('\nDescribing posts table:');
    const [postsColumns] = await sequelize.query('DESCRIBE posts');
    console.log(postsColumns);
    
    // Show some sample data from posts (adjust column names based on describe output)
    console.log('\nSample posts:');
    const [posts] = await sequelize.query('SELECT id FROM posts LIMIT 3');
    console.log(posts);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err);
    process.exit(1);
  });