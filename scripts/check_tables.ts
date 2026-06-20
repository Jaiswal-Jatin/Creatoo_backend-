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

    // Describe users table
    const [usersCols] = await connection.execute('DESCRIBE users');
    console.log('\n--- USERS TABLE COLUMNS ---');
    console.log(usersCols);

    // Describe businesses table
    const [businessesCols] = await connection.execute('DESCRIBE businesses');
    console.log('\n--- BUSINESSES TABLE COLUMNS ---');
    console.log(businessesCols);

    await connection.end();
}

run().catch(err => {
    console.error('Error running check', err);
    process.exit(1);
});
