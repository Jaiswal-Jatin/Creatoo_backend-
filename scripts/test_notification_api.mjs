import jwt from 'jsonwebtoken';
import axios from 'axios';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: '159.89.161.185', user: 'root', password: 'Creatoo@2025', database: 'creatoo', port: 3306
});

const [biz989] = await conn.execute('SELECT id, business_name, role_id, remember_token FROM businesses WHERE id = 989');
console.log('=== BUSINESS 989 ===');
console.log(JSON.stringify(biz989, null, 2));

const secret = 'creatoo_super_secret_jwt_key_2025_secure_auth_token';
const token = jwt.sign({ id: 989, role_id: 2 }, secret, { expiresIn: '1h' });

try {
  const resp = await axios.post('http://localhost:3000/api/web/NewNotificationList?page=1',
    { user_id: 989, role_id: 2 },
    { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }
  );
  console.log('API Response:', JSON.stringify(resp.data, null, 2));
} catch (err) {
  console.error('API Error:', err.response?.data || err.message);
}

await conn.end();
