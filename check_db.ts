import databaseManager from './src/config/database';
import { QueryTypes } from 'sequelize';

const sequelize = databaseManager.getSequelize();

interface CountResult {
  count: number;
}

sequelize.authenticate()
  .then(async () => {
    console.log('Connected to database');
    
    // Check users count
    const usersResult = await sequelize.query<CountResult[]>('SELECT COUNT(*) as count FROM users', { type: QueryTypes.SELECT });
    const usersCount = usersResult[0].count;
    
    // Check businesses count
    const businessesResult = await sequelize.query<CountResult[]>('SELECT COUNT(*) as count FROM businesses', { type: QueryTypes.SELECT });
    const businessesCount = businessesResult[0].count;
    
    // Check posts count
    const postsResult = await sequelize.query<CountResult[]>('SELECT COUNT(*) as count FROM posts', { type: QueryTypes.SELECT });
    const postsCount = postsResult[0].count;
    
    console.log(`Users: ${usersCount}, Businesses: ${businessesCount}, Posts: ${postsCount}`);
    
    // Show some sample data
    console.log('\nSample users:');
    const users = await sequelize.query<{id: number, name: string | null, email: string | null}[]>('SELECT id, name, email FROM users LIMIT 3', { type: QueryTypes.SELECT });
    console.log(users);
    
    console.log('\nSample businesses:');
    const businesses = await sequelize.query<{id: number, name: string | null, email: string | null}[]>('SELECT id, name, email FROM businesses LIMIT 3', { type: QueryTypes.SELECT });
    console.log(businesses);
    
    console.log('\nSample posts:');
    const posts = await sequelize.query<{id: number, title: string | null}[]>('SELECT id, title FROM posts LIMIT 3', { type: QueryTypes.SELECT });
    console.log(posts);
  })
  .catch(err => {
    console.error('Connection failed:', err);
  });