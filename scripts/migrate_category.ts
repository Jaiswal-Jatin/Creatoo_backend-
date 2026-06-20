import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    console.log('Connecting to DB at', process.env.DB_HOST);
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT) || 3306,
    });

    console.log('Connected to DB');
    
    // First alter the table to include turf
    await connection.execute(`ALTER TABLE businesses MODIFY COLUMN business_category ENUM('restaurant', 'salon', 'turf') DEFAULT 'restaurant'`);
    console.log('Altered column to include turf');
    
    // Then set all existing businesses to restaurant if null or something else
    await connection.execute(`UPDATE businesses SET business_category = 'restaurant' WHERE business_category IS NULL OR business_category NOT IN ('restaurant', 'salon', 'turf')`);
    console.log('Updated existing records to restaurant');
    
    await connection.end();
}

run().catch(err => {
    console.error('Error running migration', err);
    process.exit(1);
});
