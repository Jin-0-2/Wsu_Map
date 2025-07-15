// src/app.js

const express = require('express');
const app = express();
const userRouter = require('./routes/index');

const AWS_IP = `http://16.176.161.244:`

app.use(express.json());
app.use("/", userRouter);

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${AWS_IP}${PORT}`);
});
