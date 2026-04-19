import sequelize from './src/db/sequelize';

async function inspectSchema() {
  try {
    await sequelize.authenticate();
    console.log('--- posts table ---');
    const [postsSchema]: any = await sequelize.query('SHOW CREATE TABLE posts');
    console.log(postsSchema[0]['Create Table']);
    
    console.log('\n--- post_interests table ---');
    const [interestsSchema]: any = await sequelize.query('SHOW CREATE TABLE post_interests');
    console.log(interestsSchema[0]['Create Table']);
    
    process.exit(0);
  } catch (error) {
    console.error('Error inspecting schema:', error);
    process.exit(1);
  }
}

inspectSchema();
