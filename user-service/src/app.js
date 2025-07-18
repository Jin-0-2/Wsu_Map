// src/app.js

const express = require('express');
const app = express();
const userRouter = require('./routes/index');
const con = require('./core/db')

const AWS_IP = `http://54.252.215.95:`

app.use(express.json());
app.use("/", userRouter);

const PORT = 3001;

setInterval(async () => {
  const N_MIN = 1; // 1분
  const sql = `
UPDATE "User"
SET "Is_Login" = false
WHERE "Is_Login" = true
AND "Last_Location_Time" < NOW() - INTERVAL '${N_MIN} minutes'
RETURNING "Name"
`;
  try {
    const res = await con.query(sql);
    const updatedNames = res.rows.map(row => row.Name);
    if (updatedNames.length > 0) {
      console.log('로그아웃 처리된 유저 이름들:', updatedNames);
    }
    else
      console.log('로그아웃 처리된 유저가 없습니다');
  } catch (err) {
console.error('로그아웃 쿼리 실패:', err);
  }
}, 5 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${AWS_IP}${PORT}`);
});
