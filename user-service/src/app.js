// src/app.js

const express = require('express');
const app = express();
const userRouter = require('./routes/index');

const AWS_IP = `http://16.176.161.244:`

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
`;
con.query(sql);
}, 5 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${AWS_IP}${PORT}`);
});
