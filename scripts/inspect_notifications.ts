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

    // Query last 10 notifications
    const [rows]: any = await connection.execute('SELECT * FROM new_user_notifications ORDER BY id DESC LIMIT 20');
    console.log('\n--- LAST 20 NOTIFICATIONS ---');
    console.log(JSON.stringify(rows, null, 2));

    await connection.end();
}

run().catch(err => {
    console.error('Error running check', err);
    process.exit(1);
});
