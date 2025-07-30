// src/app.js

const express = require('express');
const app = express();
const userRouter = require('./routes/index');
const con = require('./core/db')
const { requestLogger } = require('./core/logger');

const AWS_IP = `http://54.252.215.95:`

app.use(express.json());
app.use(requestLogger);
app.use("/", userRouter);

const PORT = 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${AWS_IP}${PORT}`);
});
