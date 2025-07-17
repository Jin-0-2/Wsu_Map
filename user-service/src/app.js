// src/app.js

const express = require('express');
const session = require('express-session');
const app = express();
const userRouter = require('./routes/index');
const con = require('./core/db')

const AWS_IP = `http://16.176.161.244:`

app.use(express.json());

// ⭐️ 세션 등록은 라우터 등록(=app.use("/")) "이전"에! ⭐️
app.use(session({
  secret: 'YJB_20250711',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 60 * 1000 } // 30분
}));

app.use("/", userRouter);

// ▼ 자동 로그아웃 배치 (필요시)
setInterval(async () => {
  const N_MIN = 10; // 10분
  const sql = `
    UPDATE "User"
    SET "Is_Login" = false
    WHERE "Is_Login" = true
    AND "Last_Location_Time" < NOW() - INTERVAL '${N_MIN} minutes'
  `;
  con.query(sql);
}, 10 * 60 * 1000);

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${AWS_IP}${PORT}`);
});
