require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env')});
const { Client } = require('pg');

const client = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false}
});

client.connect()
  .then(() => console.log('DB 연결 성공!'))
  .catch(err => console.log('DB 연결 실패:', err));

module.exports = client;
